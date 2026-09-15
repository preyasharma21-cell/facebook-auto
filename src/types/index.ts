export type UserRole = 'OWNER' | 'USER';

export interface User {
  id: string;
  username: string;
  passwordHash: string;
  role?: UserRole;
  twoFactorSecret?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  expiresAt: string;
  createdAt: string;
}

export interface FacebookAccount {
  id: string;
  userId: string;
  fbUserId: string;
  name: string;
  accessTokenEnc: string;
  tokenExpiresAt?: string | null;
  status: 'CONNECTED' | 'EXPIRED' | 'DISCONNECTED';
  createdAt: string;
  updatedAt: string;
}

export interface FacebookPage {
  id: string;
  userId?: string;
  accountId: string;
  pageId: string;
  pageName: string;
  category: string;
  pictureUrl: string;
  accessTokenEnc: string;
  status: 'ACTIVE' | 'PAUSED' | 'DISCONNECTED' | 'TOKEN_EXPIRED';
  dailyLimit: number;
  hourlyLimit: number;
  minGapMinutes: number;
  todayPostsCount: number;
  lastSyncAt: string;
  createdAt: string;
}

export interface PageGroup {
  id: string;
  userId?: string;
  name: string;
  description: string;
  color: string;
  pageIds: string[];
  createdAt: string;
}

export type MediaSourceType = 'LOCAL_UPLOAD' | 'FOLDER_UPLOAD' | 'INSTAGRAM' | 'TIKTOK' | 'YOUTUBE' | 'BULK_URL';

export interface MediaAsset {
  id: string;
  userId?: string;
  filename: string;
  filePath: string;
  thumbnailPath: string;
  fileSize: number;
  duration: number; // in seconds
  resolution: string;
  aspectRatio: string;
  fps: number;
  sourceType: MediaSourceType;
  sourceUrl?: string;
  captionDefault: string;
  hashtagsDefault: string;
  status: 'UPLOADING' | 'PROCESSING' | 'READY' | 'ERROR';
  createdAt: string;
  updatedAt: string;
}

export interface ProcessingPreset {
  id: string;
  name: string;
  resolution: string; // e.g., '1080x1920', '1920x1080', '1080x1080'
  aspectRatio: string; // '9:16' | '16:9' | '1:1'
  videoBitrate: string; // e.g., '4500k'
  fps: number;
  audioBitrate: string; // e.g., '192k'
  volume: number; // 0.1 to 2.0
  speed: number; // 0.5 to 2.0
  watermarkEnabled: boolean;
  watermarkPath?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface CaptionTemplate {
  id: string;
  name: string;
  templateText: string;
  hashtagText: string;
  pageId?: string;
  isDefault: boolean;
  createdAt: string;
}

export interface PostingQueue {
  id: string;
  userId?: string;
  pageId: string;
  isPaused: boolean;
  currentPosition: number;
  createdAt: string;
  updatedAt: string;
}

export type JobStatus = 
  | 'PENDING'
  | 'QUEUED' 
  | 'PROCESSING' 
  | 'PUBLISHING' 
  | 'PUBLISHED' 
  | 'FAILED' 
  | 'CANCELLED';

export interface PostingJob {
  id: string;
  userId?: string;
  queueId: string;
  pageId: string;
  mediaId: string;
  presetId?: string;
  caption: string;
  hashtags: string;
  position: number;
  scheduledFor: string; // ISO 8601
  status: JobStatus;
  retryCount: number;
  maxRetries: number;
  lastError?: string | null;
  lockedAt?: string | null;
  lockedBy?: string | null;
  publishedPostId?: string | null;
  publishedAt?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface PostingHistory {
  id: string;
  userId?: string;
  jobId: string;
  pageId: string;
  mediaId: string;
  postId?: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  publishedAt: string;
  errorMessage?: string;
  responsePayload?: any;
}

export interface ScheduleRule {
  id: string;
  pageId: string;
  scheduleType: 'ONCE' | 'RECURRING';
  startTime: string; // '09:00'
  endTime: string; // '21:00'
  postsPerDay: number;
  intervalMinutes: number;
  daysOfWeek: number[]; // 1=Mon .. 7=Sun
  isActive: boolean;
  createdAt: string;
}

export type LogLevel = 'INFO' | 'SUCCESS' | 'WARNING' | 'ERROR';
export type LogCategory = 'AUTH' | 'FACEBOOK' | 'UPLOAD' | 'FFMPEG' | 'SCHEDULER' | 'WORKER' | 'SYSTEM' | 'IMPORT';

export interface SystemLog {
  id: string;
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  pageId?: string;
  jobId?: string;
  message: string;
  metadata?: any;
}

export interface SystemSettings {
  demoMode: boolean;
  timezone: string;
  defaultPresetId: string;
  defaultPostingDelayMinutes: number;
  defaultRetryCount: number;
  maxConcurrentJobs: number;
  storageProvider: 'local' | 's3';
  metaAppId?: string;
  metaAppSecret?: string;
  updatedAt: string;
}

export interface DashboardStats {
  connectedPages: number;
  totalVideos: number;
  queued: number;
  scheduledToday: number;
  publishedToday: number;
  failed: number;
  currentlyProcessing: number;
  successRate: number;
  publishingActivity: { date: string; published: number; failed: number }[];
  videosByPage: { pageName: string; count: number }[];
  videosBySource: { source: string; count: number }[];
}
