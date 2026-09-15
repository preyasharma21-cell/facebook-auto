import { SocialPublisher, PublishResult } from './base';
import { FacebookPage, MediaAsset, PostingJob } from '@/types';
import { logEvent } from '@/lib/logger';

export class InstagramPublisher implements SocialPublisher {
  public platformName = 'Instagram';

  async isConnected(): Promise<boolean> {
    return false;
  }

  async getAuthorizedAccounts(): Promise<any[]> {
    return [];
  }

  async publishVideo(params: {
    page: FacebookPage;
    media: MediaAsset;
    job: PostingJob;
    caption: string;
  }): Promise<PublishResult> {
    logEvent('WARNING', 'SYSTEM', `Instagram integration requires linked Instagram Business Account authorization via Meta Developer Console.`);
    return {
      success: false,
      errorMessage: 'Instagram publishing requires linked Instagram Professional Account with Graph API instagram_content_publish permission.',
      retryable: false,
    };
  }
}

export class TikTokPublisher implements SocialPublisher {
  public platformName = 'TikTok';

  async isConnected(): Promise<boolean> {
    return false;
  }

  async getAuthorizedAccounts(): Promise<any[]> {
    return [];
  }

  async publishVideo(params: {
    page: FacebookPage;
    media: MediaAsset;
    job: PostingJob;
    caption: string;
  }): Promise<PublishResult> {
    return {
      success: false,
      errorMessage: 'This operation requires TikTok Content Posting API authorization or is not supported by the connected API.',
      retryable: false,
    };
  }
}

export class YouTubePublisher implements SocialPublisher {
  public platformName = 'YouTube';

  async isConnected(): Promise<boolean> {
    return false;
  }

  async getAuthorizedAccounts(): Promise<any[]> {
    return [];
  }

  async publishVideo(params: {
    page: FacebookPage;
    media: MediaAsset;
    job: PostingJob;
    caption: string;
  }): Promise<PublishResult> {
    return {
      success: false,
      errorMessage: 'YouTube publishing requires Google OAuth 2.0 with youtube.upload permission.',
      retryable: false,
    };
  }
}

export const instagramPublisher = new InstagramPublisher();
export const tiktokPublisher = new TikTokPublisher();
export const youtubePublisher = new YouTubePublisher();
