import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const pages = db.getFacebookPages();
  const accounts = db.getFacebookAccounts();
  const groups = db.getPageGroups();
  const queues = db.getQueues();
  const jobs = db.getJobs();

  const enrichedPages = pages.map(p => {
    const pageJobs = jobs.filter(j => j.pageId === p.id);
    const nextJob = pageJobs.find(j => j.status === 'QUEUED');
    const queue = queues.find(q => q.pageId === p.id);

    return {
      ...p,
      isPaused: queue ? queue.isPaused : false,
      queuedCount: pageJobs.filter(j => j.status === 'QUEUED').length,
      nextScheduledPost: nextJob ? nextJob.scheduledFor : null,
      groups: groups.filter(g => g.pageIds.includes(p.id)).map(g => ({ id: g.id, name: g.name, color: g.color })),
    };
  });

  return NextResponse.json({
    pages: enrichedPages,
    accounts,
  });
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { id, dailyLimit, hourlyLimit, minGapMinutes, status } = body;

    const page = db.getPageById(id);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const updated = db.upsertFacebookPage({
      ...page,
      dailyLimit: dailyLimit !== undefined ? Number(dailyLimit) : page.dailyLimit,
      hourlyLimit: hourlyLimit !== undefined ? Number(hourlyLimit) : page.hourlyLimit,
      minGapMinutes: minGapMinutes !== undefined ? Number(minGapMinutes) : page.minGapMinutes,
      status: status !== undefined ? status : page.status,
    });

    logEvent('INFO', 'FACEBOOK', `Updated configuration for Page "${page.pageName}"`);
    return NextResponse.json({ success: true, page: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { pageName, pageId, category, pictureUrl, accessToken, dailyLimit, hourlyLimit, minGapMinutes } = body;

    if (!pageName || !pageId) {
      return NextResponse.json({ error: 'Page Name and Page ID are required' }, { status: 400 });
    }

    const accounts = db.getFacebookAccounts();
    const accountId = accounts.length > 0 ? accounts[0].id : 'fb-acc-custom';

    const newPage = db.createFacebookPage({
      accountId,
      pageId,
      pageName,
      category: category || 'Media / Publishing',
      pictureUrl: pictureUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      accessTokenEnc: accessToken || 'PAGE_ACCESS_TOKEN_' + pageId,
      status: 'ACTIVE',
      dailyLimit: dailyLimit ? Number(dailyLimit) : 10,
      hourlyLimit: hourlyLimit ? Number(hourlyLimit) : 2,
      minGapMinutes: minGapMinutes ? Number(minGapMinutes) : 60,
      todayPostsCount: 0,
      lastSyncAt: new Date().toISOString(),
    });

    logEvent('SUCCESS', 'FACEBOOK', `Connected new Facebook Page: "${newPage.pageName}" (ID: ${newPage.pageId})`);
    return NextResponse.json({ success: true, page: newPage });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
  }

  if (id === 'all') {
    db.clearAllFacebookPages();
    logEvent('WARNING', 'FACEBOOK', 'Owner cleared all Facebook Pages from platform');
    return NextResponse.json({ success: true, message: 'All Facebook Pages removed' });
  }

  const page = db.getPageById(id);
  const deleted = db.deleteFacebookPage(id);

  if (deleted) {
    logEvent('INFO', 'FACEBOOK', `Removed Facebook Page "${page?.pageName || id}"`);
    return NextResponse.json({ success: true, message: 'Page removed successfully' });
  }

  return NextResponse.json({ error: 'Page not found' }, { status: 404 });
}

