import { db } from '@/lib/db';
import { logEvent } from '@/lib/logger';
import { facebookPublisher } from '@/lib/publishers/facebook';
import { PostingJob } from '@/types';

class BackgroundQueueWorker {
  private isRunning: boolean = false;
  private intervalId: NodeJS.Timeout | null = null;
  private activeLocks: Set<string> = new Set();
  private workerId: string = `worker-${Math.random().toString(36).substring(2, 7)}`;

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    logEvent('INFO', 'WORKER', `Background posting daemon initialized (${this.workerId})`);

    // Run scheduler check every 5 seconds
    this.intervalId = setInterval(() => {
      this.tick().catch(err => {
        console.error('[Worker Tick Error]', err);
      });
    }, 5000);

    // Run an immediate tick on start
    this.tick().catch(() => {});
  }

  public stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
    this.isRunning = false;
    logEvent('INFO', 'WORKER', 'Background posting worker stopped');
  }

  public getStatus() {
    return {
      isRunning: this.isRunning,
      workerId: this.workerId,
      activeLocksCount: this.activeLocks.size,
      activeLocks: Array.from(this.activeLocks),
    };
  }

  public async tick(): Promise<void> {
    const settings = db.getSettings();
    const queues = db.getQueues();
    const now = new Date();

    // Scan jobs that are due for posting
    const allJobs = db.getJobs();
    const dueJobs = allJobs.filter(j => {
      if (j.status !== 'QUEUED') return false;
      const scheduledTime = new Date(j.scheduledFor);
      return scheduledTime <= now;
    });

    if (dueJobs.length === 0) return;

    for (const job of dueJobs) {
      // Check concurrent limit
      if (this.activeLocks.size >= settings.maxConcurrentJobs) {
        break;
      }

      // Check if page queue is paused
      const queue = queues.find(q => q.pageId === job.pageId);
      if (queue?.isPaused) {
        continue;
      }

      // Idempotency: skip if already locked by active process
      if (this.activeLocks.has(job.id)) {
        continue;
      }

      // Lock and process job
      await this.processJob(job);
    }
  }

  public async processJob(job: PostingJob): Promise<void> {
    this.activeLocks.add(job.id);

    try {
      // 1. Lock job in database
      db.updatePostingJob(job.id, {
        status: 'PUBLISHING',
        lockedAt: new Date().toISOString(),
        lockedBy: this.workerId,
      });

      const page = db.getPageById(job.pageId);
      if (!page) {
        throw new Error(`Facebook Page [${job.pageId}] not found in database`);
      }

      if (page.status !== 'ACTIVE') {
        throw new Error(`Facebook Page "${page.pageName}" is currently ${page.status}. Publishing paused.`);
      }

      const media = db.getMediaById(job.mediaId);
      if (!media) {
        throw new Error(`Media Asset [${job.mediaId}] not found`);
      }

      // Compile Caption & Hashtags
      const fullCaption = job.hashtags ? `${job.caption}\n\n${job.hashtags}` : job.caption;

      // 2. Publish through SocialPublisher
      const result = await facebookPublisher.publishVideo({
        page,
        media,
        job,
        caption: fullCaption,
      });

      if (result.success && result.postId) {
        // Success flow
        db.updatePostingJob(job.id, {
          status: 'PUBLISHED',
          publishedPostId: result.postId,
          publishedAt: new Date().toISOString(),
          lockedAt: null,
          lockedBy: null,
        });

        // Record history
        db.createHistoryEntry({
          jobId: job.id,
          pageId: page.id,
          mediaId: media.id,
          postId: result.postId,
          status: 'SUCCESS',
          publishedAt: new Date().toISOString(),
          responsePayload: result.rawResponse,
        });

        logEvent('SUCCESS', 'WORKER', `Posting job [${job.id}] completed successfully. Post ID: ${result.postId}`, {
          pageId: page.id,
          jobId: job.id,
        });
      } else {
        // Failure flow & Retry handling
        const currentRetry = (job.retryCount || 0) + 1;
        const maxRetries = job.maxRetries || 3;
        const isRetryable = result.retryable && currentRetry <= maxRetries;

        if (isRetryable) {
          // Exponential backoff: 2min, 4min, 8min
          const backoffMinutes = Math.pow(2, currentRetry);
          const nextAttempt = new Date(Date.now() + backoffMinutes * 60000).toISOString();

          db.updatePostingJob(job.id, {
            status: 'QUEUED',
            retryCount: currentRetry,
            scheduledFor: nextAttempt,
            lastError: result.errorMessage,
            lockedAt: null,
            lockedBy: null,
          });

          logEvent('WARNING', 'WORKER', `Job [${job.id}] failed. Retrying (Attempt ${currentRetry}/${maxRetries}) at ${nextAttempt}. Reason: ${result.errorMessage}`, {
            pageId: page.id,
            jobId: job.id,
          });
        } else {
          // Exhausted retries or non-retryable error
          db.updatePostingJob(job.id, {
            status: 'FAILED',
            retryCount: currentRetry,
            lastError: result.errorMessage,
            lockedAt: null,
            lockedBy: null,
          });

          db.createHistoryEntry({
            jobId: job.id,
            pageId: page.id,
            mediaId: media.id,
            status: 'FAILED',
            publishedAt: new Date().toISOString(),
            errorMessage: result.errorMessage,
          });

          logEvent('ERROR', 'WORKER', `Job [${job.id}] permanently FAILED after ${currentRetry} attempts. Error: ${result.errorMessage}`, {
            pageId: page.id,
            jobId: job.id,
          });
        }
      }
    } catch (err: any) {
      const errorMsg = err.message || 'Unexpected worker execution error';
      logEvent('ERROR', 'WORKER', `Fatal error processing job [${job.id}]: ${errorMsg}`, {
        pageId: job.pageId,
        jobId: job.id,
      });

      db.updatePostingJob(job.id, {
        status: 'FAILED',
        lastError: errorMsg,
        lockedAt: null,
        lockedBy: null,
      });
    } finally {
      this.activeLocks.delete(job.id);
    }
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __bgQueueWorker: BackgroundQueueWorker | undefined;
}

export const bgQueueWorker = global.__bgQueueWorker || new BackgroundQueueWorker();
if (process.env.NODE_ENV !== 'production') {
  global.__bgQueueWorker = bgQueueWorker;
}

// Auto-start worker on module import
bgQueueWorker.start();
