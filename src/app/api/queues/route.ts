import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const pages = db.getFacebookPages();
  const queues = db.getQueues();
  const allJobs = db.getJobs();
  const allMedia = db.getMediaAssets();

  const enrichedQueues = pages.map(page => {
    let queue = queues.find(q => q.pageId === page.id);
    if (!queue) {
      queue = db.toggleQueuePause(page.id, false);
    }

    const pageJobs = allJobs
      .filter(j => j.pageId === page.id && j.status === 'QUEUED')
      .map(j => {
        const media = allMedia.find(m => m.id === j.mediaId);
        return {
          ...j,
          media,
        };
      });

    return {
      queueId: queue?.id,
      pageId: page.id,
      pageName: page.pageName,
      pictureUrl: page.pictureUrl,
      isPaused: queue?.isPaused || false,
      jobs: pageJobs,
      totalQueued: pageJobs.length,
    };
  });

  return NextResponse.json({ queues: enrichedQueues });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { pageId, action } = body;

    if (!pageId) {
      return NextResponse.json({ error: 'Page ID is required' }, { status: 400 });
    }

    const page = db.getPageById(pageId);
    if (!page) {
      return NextResponse.json({ error: 'Page not found' }, { status: 404 });
    }

    const shouldPause = action === 'pause';
    const queue = db.toggleQueuePause(pageId, shouldPause);

    logEvent(
      shouldPause ? 'WARNING' : 'SUCCESS',
      'SCHEDULER',
      `Queue ${shouldPause ? 'PAUSED' : 'RESUMED'} for Page: "${page.pageName}"`,
      { pageId }
    );

    return NextResponse.json({ success: true, queue });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
