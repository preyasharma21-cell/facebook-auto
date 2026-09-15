import fs from 'fs';
import path from 'path';
import { SocialPublisher, PublishResult } from './base';
import { FacebookPage, MediaAsset, PostingJob } from '@/types';
import { logEvent } from '@/lib/logger';
import { db } from '@/lib/db';

export class FacebookPublisher implements SocialPublisher {
  public platformName = 'Facebook';

  async isConnected(): Promise<boolean> {
    const settings = db.getSettings();
    if (settings.demoMode) return true;
    const accounts = db.getFacebookAccounts();
    return accounts.some(a => a.status === 'CONNECTED');
  }

  async getAuthorizedAccounts(): Promise<any[]> {
    return db.getFacebookAccounts();
  }

  async publishVideo(params: {
    page: FacebookPage;
    media: MediaAsset;
    job: PostingJob;
    caption: string;
  }): Promise<PublishResult> {
    const { page, media, job, caption } = params;
    const settings = db.getSettings();

    logEvent('INFO', 'FACEBOOK', `Initiating publish request for job [${job.id}] on Page: "${page.pageName}" (${page.pageId})`, {
      pageId: page.id,
      jobId: job.id,
    });

    // Check daily and hourly post limit constraints
    if (page.todayPostsCount >= page.dailyLimit) {
      const err = `Posting limit reached for Page "${page.pageName}" (${page.todayPostsCount}/${page.dailyLimit} today)`;
      logEvent('WARNING', 'FACEBOOK', err, { pageId: page.id, jobId: job.id });
      return {
        success: false,
        errorMessage: err,
        retryable: true,
      };
    }

    // ==========================================
    // DEMO MODE EXECUTION
    // ==========================================
    if (settings.demoMode || page.accessTokenEnc?.startsWith('DEMO_')) {
      // Simulate realistic network round-trip & Graph API encoding handshake
      await new Promise(resolve => setTimeout(resolve, 1800));

      // Check if job intentionally forced failure for testing retry flow
      if (job.caption?.includes('[SIMULATE_FAIL]')) {
        const errorMsg = 'Graph API Error #190: Access token expired or invalidated by owner';
        logEvent('ERROR', 'FACEBOOK', `[DEMO] Publishing simulated failure: ${errorMsg}`, {
          pageId: page.id,
          jobId: job.id,
        });
        return {
          success: false,
          errorMessage: errorMsg,
          retryable: true,
        };
      }

      const mockPostId = `fb_${page.pageId}_${Date.now()}`;
      const mockPostUrl = `https://facebook.com/${page.pageId}/posts/${mockPostId}`;

      logEvent('SUCCESS', 'FACEBOOK', `[DEMO] Video published successfully to "${page.pageName}". Post ID: ${mockPostId}`, {
        pageId: page.id,
        jobId: job.id,
        metadata: { postId: mockPostId, url: mockPostUrl },
      });

      // Update page daily post count
      db.upsertFacebookPage({
        ...page,
        todayPostsCount: page.todayPostsCount + 1,
        lastSyncAt: new Date().toISOString(),
      });

      return {
        success: true,
        postId: mockPostId,
        postUrl: mockPostUrl,
        rawResponse: { id: mockPostId, success: true, mode: 'demo_simulated' },
      };
    }

    // ==========================================
    // LIVE META GRAPH API v20+ EXECUTION
    // ==========================================
    try {
      const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0';
      const pageAccessToken = page.accessTokenEnc;

      if (!pageAccessToken) {
        throw new Error(`No access token stored for Page ${page.pageName} (${page.pageId})`);
      }

      const fullMediaPath = path.isAbsolute(media.filePath) 
        ? media.filePath 
        : path.join(process.cwd(), media.filePath);

      if (!fs.existsSync(fullMediaPath)) {
        throw new Error(`Media file not found on server filesystem: ${media.filePath}`);
      }

      // Graph API Video Publishing
      const fileBuffer = fs.readFileSync(fullMediaPath);
      const formData = new FormData();
      const blob = new Blob([fileBuffer], { type: 'video/mp4' });
      formData.append('source', blob, media.filename);
      formData.append('description', caption);
      formData.append('access_token', pageAccessToken);

      const endpoint = `https://graph.facebook.com/${graphVersion}/${page.pageId}/videos`;
      const response = await fetch(endpoint, {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        const fbError = data.error?.message || `HTTP ${response.status} from Meta API`;
        const errorCode = data.error?.code;

        // Classify retryability: Rate limits (#32, #4) are retryable; bad permissions (#200) or expired (#190) require reconnection
        const retryable = errorCode === 32 || errorCode === 4 || response.status >= 500;

        if (errorCode === 190) {
          db.upsertFacebookPage({
            ...page,
            status: 'TOKEN_EXPIRED',
            lastSyncAt: new Date().toISOString(),
          });
        }

        logEvent('ERROR', 'FACEBOOK', `Graph API Video Publish Error: ${fbError} (Code: ${errorCode})`, {
          pageId: page.id,
          jobId: job.id,
          metadata: data.error,
        });

        return {
          success: false,
          errorMessage: errorCode === 190 
            ? `Meta Token Expired: Session expired for Page "${page.pageName}". Please reconnect or update your developer token in Facebook Pages.`
            : `Meta Graph API: ${fbError}`,
          retryable,
          rawResponse: data,
        };
      }

      const livePostId = data.id;
      const livePostUrl = `https://facebook.com/${page.pageId}/videos/${livePostId}`;

      logEvent('SUCCESS', 'FACEBOOK', `Published to Facebook Page "${page.pageName}". Post ID: ${livePostId}`, {
        pageId: page.id,
        jobId: job.id,
        metadata: { postId: livePostId, url: livePostUrl },
      });

      db.upsertFacebookPage({
        ...page,
        todayPostsCount: page.todayPostsCount + 1,
        lastSyncAt: new Date().toISOString(),
      });

      return {
        success: true,
        postId: livePostId,
        postUrl: livePostUrl,
        rawResponse: data,
      };
    } catch (err: any) {
      const message = err.message || 'Unknown network error publishing to Facebook';
      logEvent('ERROR', 'FACEBOOK', `Publish Exception: ${message}`, {
        pageId: page.id,
        jobId: job.id,
      });

      return {
        success: false,
        errorMessage: message,
        retryable: true,
      };
    }
  }
}

export const facebookPublisher = new FacebookPublisher();
