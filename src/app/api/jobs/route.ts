import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';
import { bgQueueWorker } from '@/lib/queue/worker';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const pageId = searchParams.get('pageId') || undefined;
  const status = searchParams.get('status') || undefined;

  const jobs = db.getJobs({ pageId, status });
  const mediaList = db.getMediaAssets();
  const pages = db.getFacebookPages();

  const enriched = jobs.map(j => ({
    ...j,
    media: mediaList.find(m => m.id === j.mediaId),
    page: pages.find(p => p.id === j.pageId),
  }));

  return NextResponse.json({ jobs: enriched });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { action, jobId, pageId, mediaId, presetId, caption, hashtags, scheduledFor } = body;

    // Retry single failed job
    if (action === 'retry' && jobId) {
      const job = db.getJobById(jobId);
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

      db.updatePostingJob(job.id, {
        status: 'QUEUED',
        scheduledFor: new Date().toISOString(),
        lastError: null,
      });

      logEvent('INFO', 'WORKER', `Retrying posting job [${job.id}] immediately`, { pageId: job.pageId, jobId: job.id });
      bgQueueWorker.tick().catch(() => {});
      return NextResponse.json({ success: true, message: 'Job queued for immediate retry' });
    }

    // Retry all failed jobs
    if (action === 'retry_all_failed') {
      const failedJobs = db.getJobs().filter(j => j.status === 'FAILED');
      for (const j of failedJobs) {
        db.updatePostingJob(j.id, {
          status: 'QUEUED',
          scheduledFor: new Date().toISOString(),
          lastError: null,
        });
      }
      logEvent('INFO', 'WORKER', `Queued ${failedJobs.length} previously failed jobs for retry`);
      bgQueueWorker.tick().catch(() => {});
      return NextResponse.json({ success: true, count: failedJobs.length });
    }

    // "Post Now" action
    if (action === 'post_now' && jobId) {
      const job = db.getJobById(jobId);
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });

      db.updatePostingJob(job.id, {
        status: 'QUEUED',
        scheduledFor: new Date(Date.now() - 1000).toISOString(),
      });

      logEvent('INFO', 'WORKER', `Triggered immediate publish for job [${job.id}]`, { pageId: job.pageId, jobId: job.id });
      bgQueueWorker.tick().catch(() => {});
      return NextResponse.json({ success: true, message: 'Publishing triggered' });
    }

    // Create a new posting job
    if (!pageId || !mediaId) {
      return NextResponse.json({ error: 'pageId and mediaId are required' }, { status: 400 });
    }

    const targetPage = db.getPageById(pageId);
    if (!targetPage) return NextResponse.json({ error: 'Destination Page not found' }, { status: 404 });

    const targetMedia = db.getMediaById(mediaId);
    if (!targetMedia) return NextResponse.json({ error: 'Media Asset not found' }, { status: 404 });

    const job = db.createPostingJob({
      queueId: `queue-${targetPage.id}`,
      pageId: targetPage.id,
      mediaId: targetMedia.id,
      presetId: presetId || 'preset-01',
      caption: caption || targetMedia.captionDefault || targetMedia.filename,
      hashtags: hashtags || targetMedia.hashtagsDefault || '',
      position: 1,
      scheduledFor: scheduledFor || new Date(Date.now() + 60000).toISOString(),
      status: 'QUEUED',
      retryCount: 0,
      maxRetries: 3,
      lastError: null,
    });

    logEvent('SUCCESS', 'SCHEDULER', `New job created for "${targetPage.pageName}" scheduled for ${job.scheduledFor}`, {
      pageId: targetPage.id,
      jobId: job.id,
    });

    return NextResponse.json({ success: true, job });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });

  db.deletePostingJob(id);
  logEvent('INFO', 'SCHEDULER', `Cancelled posting job [${id}]`);
  return NextResponse.json({ success: true, message: 'Job cancelled' });
}
