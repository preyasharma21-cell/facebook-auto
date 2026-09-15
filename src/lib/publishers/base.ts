import { FacebookPage, MediaAsset, PostingJob } from '@/types';

export interface PublishResult {
  success: boolean;
  postId?: string;
  postUrl?: string;
  errorMessage?: string;
  rawResponse?: any;
  retryable?: boolean;
}

export interface SocialPublisher {
  platformName: string;
  isConnected(): Promise<boolean>;
  getAuthorizedAccounts(): Promise<any[]>;
  publishVideo(params: {
    page: FacebookPage;
    media: MediaAsset;
    job: PostingJob;
    caption: string;
  }): Promise<PublishResult>;
}
