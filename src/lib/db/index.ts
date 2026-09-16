import fs from 'fs';
import path from 'path';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import {
  User,
  Session,
  FacebookAccount,
  FacebookPage,
  PageGroup,
  MediaAsset,
  ProcessingPreset,
  CaptionTemplate,
  PostingQueue,
  PostingJob,
  PostingHistory,
  ScheduleRule,
  SystemLog,
  SystemSettings,
  ConnectedPlatformAccount,
  SocialPlatformType
} from '@/types';

interface DatabaseSchema {
  users: User[];
  sessions: Session[];
  facebookAccounts: FacebookAccount[];
  facebookPages: FacebookPage[];
  pageGroups: PageGroup[];
  mediaAssets: MediaAsset[];
  processingPresets: ProcessingPreset[];
  captionTemplates: CaptionTemplate[];
  postingQueues: PostingQueue[];
  postingJobs: PostingJob[];
  postingHistory: PostingHistory[];
  schedules: ScheduleRule[];
  logs: SystemLog[];
  settings: SystemSettings;
  platformAccounts?: ConnectedPlatformAccount[];
}

const DATA_DIR = path.join(process.cwd(), 'data');
const DB_FILE = path.join(DATA_DIR, 'database.json');

function ensureDirectoryExistence(filePath: string) {
  const dirname = path.dirname(filePath);
  if (!fs.existsSync(dirname)) {
    fs.mkdirSync(dirname, { recursive: true });
  }
}

// Initial Seed Generator
function getInitialSeedData(): DatabaseSchema {
  const salt = bcrypt.genSaltSync(10);
  const adminPasswordHash = bcrypt.hashSync('admin123456', salt);

  const ownerUser: User = {
    id: 'user-owner-01',
    username: 'admin',
    passwordHash: adminPasswordHash,
    role: 'OWNER',
    twoFactorSecret: null,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const defaultAccount: FacebookAccount = {
    id: 'fb-acc-01',
    userId: ownerUser.id,
    fbUserId: '109827364519283',
    name: 'Media Publisher Pro (Owner)',
    accessTokenEnc: 'DEMO_ENCRYPTED_ACCESS_TOKEN_EAABsb...',
    tokenExpiresAt: new Date(Date.now() + 60 * 86400000).toISOString(),
    status: 'CONNECTED',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const pages: FacebookPage[] = [];
  const groups: PageGroup[] = [];
  const presets: ProcessingPreset[] = [
    {
      id: 'preset-01',
      name: 'Reel Vertical (9:16 HD)',
      resolution: '1080x1920',
      aspectRatio: '9:16',
      videoBitrate: '4500k',
      fps: 30,
      audioBitrate: '192k',
      volume: 1.0,
      speed: 1.0,
      watermarkEnabled: false,
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'preset-02',
      name: 'Facebook Feed Landscape (16:9 1080p)',
      resolution: '1920x1080',
      aspectRatio: '16:9',
      videoBitrate: '6000k',
      fps: 30,
      audioBitrate: '256k',
      volume: 1.0,
      speed: 1.0,
      watermarkEnabled: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
    },
    {
      id: 'preset-03',
      name: 'Square Feed (1:1 1080p)',
      resolution: '1080x1080',
      aspectRatio: '1:1',
      videoBitrate: '4000k',
      fps: 30,
      audioBitrate: '192k',
      volume: 1.0,
      speed: 1.0,
      watermarkEnabled: false,
      isDefault: false,
      createdAt: new Date().toISOString(),
    },
  ];

  const templates: CaptionTemplate[] = [
    {
      id: 'tmpl-01',
      name: 'Reel Engagement Viral',
      templateText: '{title}\n\nWatch until the end! 👇\nFollow for more daily content!',
      hashtagText: '#reels #viral #trending #facebookreels',
      isDefault: true,
      createdAt: new Date().toISOString(),
    },
  ];

  const queues: PostingQueue[] = [];
  const sampleMedia: MediaAsset[] = [];
  const now = new Date();
  const jobs: PostingJob[] = [];

  const history: PostingHistory[] = [];

  const initialLogs: SystemLog[] = [
    {
      id: 'log-01',
      timestamp: new Date(now.getTime() - 7205000).toISOString(),
      level: 'INFO',
      category: 'WORKER',
      pageId: 'page-01',
      jobId: 'job-past-01',
      message: 'Background posting job locked and verified for Daily Motivation Clips',
    },
    {
      id: 'log-02',
      timestamp: new Date(now.getTime() - 7200000).toISOString(),
      level: 'SUCCESS',
      category: 'FACEBOOK',
      pageId: 'page-01',
      jobId: 'job-past-01',
      message: 'Published video reel to Page ID 102938475610 (Post ID: fb_post_891827364123)',
    },
    {
      id: 'log-03',
      timestamp: new Date(now.getTime() - 3600000).toISOString(),
      level: 'INFO',
      category: 'SYSTEM',
      message: 'Scheduler heartbeat active. Timezone: Asia/Karachi (UTC+5). All 4 Page queues healthy.',
    },
  ];

  const defaultSettings: SystemSettings = {
    demoMode: true,
    timezone: 'Asia/Karachi',
    defaultPresetId: 'preset-01',
    defaultPostingDelayMinutes: 60,
    defaultRetryCount: 3,
    maxConcurrentJobs: 3,
    storageProvider: 'local',
    updatedAt: new Date().toISOString(),
  };

  return {
    users: [ownerUser],
    sessions: [],
    facebookAccounts: [defaultAccount],
    facebookPages: pages,
    pageGroups: groups,
    mediaAssets: sampleMedia,
    processingPresets: presets,
    captionTemplates: templates,
    postingQueues: queues,
    postingJobs: jobs,
    postingHistory: history,
    schedules: [],
    logs: initialLogs,
    settings: defaultSettings,
  };
}

class DatabaseStore {
  private data: DatabaseSchema;
  private isLoaded: boolean = false;

  constructor() {
    this.data = getInitialSeedData();
    this.load();
  }

  private load(): void {
    try {
      ensureDirectoryExistence(DB_FILE);
      if (fs.existsSync(DB_FILE)) {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        this.data = JSON.parse(raw);
        this.isLoaded = true;
      } else {
        this.data = getInitialSeedData();
        this.save();
        this.isLoaded = true;
      }
    } catch (err) {
      console.error('[DatabaseStore] Error loading DB, falling back to seed:', err);
      this.data = getInitialSeedData();
    }
  }

  public save(): void {
    try {
      ensureDirectoryExistence(DB_FILE);
      fs.writeFileSync(DB_FILE, JSON.stringify(this.data, null, 2), 'utf-8');
    } catch (err) {
      console.error('[DatabaseStore] Error writing DB file:', err);
    }
  }

  // Users
  getUserByUsername(username: string): User | undefined {
    return this.data.users.find(u => u.username.toLowerCase() === username.toLowerCase());
  }

  getUserById(id: string): User | undefined {
    return this.data.users.find(u => u.id === id);
  }

  createUser(username: string, passwordHash: string, role: 'OWNER' | 'USER' = 'USER'): User {
    const user: User = {
      id: 'user-' + uuidv4().slice(0, 8),
      username,
      passwordHash,
      role,
      twoFactorSecret: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.users.push(user);
    this.save();
    return user;
  }

  // Scoped queries for Multi-User isolation
  getFacebookPagesForUser(userId: string): FacebookPage[] {
    return this.data.facebookPages.filter(p => {
      if (p.userId) return p.userId === userId;
      return userId === 'user-owner-01';
    });
  }

  getMediaAssetsForUser(userId: string): MediaAsset[] {
    return this.data.mediaAssets.filter(m => {
      if (m.userId) return m.userId === userId;
      return userId === 'user-owner-01';
    });
  }

  getJobsForUser(userId: string): PostingJob[] {
    const userPages = this.getFacebookPagesForUser(userId);
    const pageIds = new Set(userPages.map(p => p.id).concat(userPages.map(p => p.pageId)));
    return this.data.postingJobs.filter(j => {
      if (j.userId) return j.userId === userId;
      return pageIds.has(j.pageId);
    });
  }

  getHistoryForUser(userId: string): PostingHistory[] {
    const userPages = this.getFacebookPagesForUser(userId);
    const pageIds = new Set(userPages.map(p => p.id).concat(userPages.map(p => p.pageId)));
    return this.data.postingHistory.filter(h => {
      if (h.userId) return h.userId === userId;
      return pageIds.has(h.pageId);
    });
  }

  getPageGroupsForUser(userId: string): PageGroup[] {
    return this.data.pageGroups.filter(g => {
      if (g.userId) return g.userId === userId;
      return userId === 'user-owner-01';
    });
  }

  getQueuesForUser(userId: string): PostingQueue[] {
    const userPages = this.getFacebookPagesForUser(userId);
    const pageIds = new Set(userPages.map(p => p.id).concat(userPages.map(p => p.pageId)));
    return this.data.postingQueues.filter(q => {
      if (q.userId) return q.userId === userId;
      return pageIds.has(q.pageId);
    });
  }

  // Sessions
  createSession(userId: string, expiresAt: Date, customToken?: string): Session {
    const session: Session = {
      id: uuidv4(),
      userId,
      token: customToken || (uuidv4() + '-' + uuidv4()),
      expiresAt: expiresAt.toISOString(),
      createdAt: new Date().toISOString(),
    };
    this.data.sessions.push(session);
    this.save();
    return session;
  }

  getSessionByToken(token: string): Session | undefined {
    const session = this.data.sessions.find(s => s.token === token);
    if (!session) return undefined;
    if (new Date(session.expiresAt) < new Date()) {
      this.deleteSession(session.token);
      return undefined;
    }
    return session;
  }

  deleteSession(token: string): void {
    this.data.sessions = this.data.sessions.filter(s => s.token !== token);
    this.save();
  }

  // Connected Social Platform Accounts (YouTube, TikTok, Instagram, Snapchat, etc.)
  getPlatformAccountsForUser(userId: string): ConnectedPlatformAccount[] {
    if (!this.data.platformAccounts) this.data.platformAccounts = [];
    return this.data.platformAccounts.filter(p => p.userId === userId);
  }

  getPlatformAccount(userId: string, platform: SocialPlatformType): ConnectedPlatformAccount | undefined {
    if (!this.data.platformAccounts) this.data.platformAccounts = [];
    return this.data.platformAccounts.find(p => p.userId === userId && p.platform === platform);
  }

  savePlatformAccount(account: Omit<ConnectedPlatformAccount, 'id' | 'updatedAt'>): ConnectedPlatformAccount {
    if (!this.data.platformAccounts) this.data.platformAccounts = [];
    const idx = this.data.platformAccounts.findIndex(p => p.userId === account.userId && p.platform === account.platform);
    const updated: ConnectedPlatformAccount = {
      ...account,
      id: idx >= 0 ? this.data.platformAccounts[idx].id : 'plat-' + uuidv4().slice(0, 8),
      updatedAt: new Date().toISOString(),
    };
    if (idx >= 0) {
      this.data.platformAccounts[idx] = updated;
    } else {
      this.data.platformAccounts.push(updated);
    }
    this.save();
    return updated;
  }

  disconnectPlatformAccount(userId: string, platform: SocialPlatformType): void {
    if (!this.data.platformAccounts) return;
    this.data.platformAccounts = this.data.platformAccounts.filter(p => !(p.userId === userId && p.platform === platform));
    this.save();
  }

  // Facebook Accounts & Pages
  getFacebookAccounts(): FacebookAccount[] {
    return this.data.facebookAccounts;
  }

  getFacebookPages(): FacebookPage[] {
    return this.data.facebookPages;
  }

  getPageById(id: string): FacebookPage | undefined {
    return this.data.facebookPages.find(p => p.id === id || p.pageId === id);
  }

  upsertFacebookPage(page: FacebookPage): FacebookPage {
    const idx = this.data.facebookPages.findIndex(p => p.id === page.id || p.pageId === page.pageId);
    if (idx >= 0) {
      this.data.facebookPages[idx] = { ...this.data.facebookPages[idx], ...page };
    } else {
      this.data.facebookPages.push(page);
    }
    this.save();
    return page;
  }

  createFacebookPage(page: Omit<FacebookPage, 'id' | 'createdAt'>): FacebookPage {
    const newPage: FacebookPage = {
      ...page,
      id: 'page-' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
    };
    this.data.facebookPages.push(newPage);
    this.save();
    return newPage;
  }

  deleteFacebookPage(id: string): boolean {
    const initialLen = this.data.facebookPages.length;
    const page = this.data.facebookPages.find(p => p.id === id || p.pageId === id);
    if (!page) return false;

    // Remove page
    this.data.facebookPages = this.data.facebookPages.filter(p => p.id !== page.id && p.pageId !== page.pageId);

    // Remove page from groups
    this.data.pageGroups.forEach(g => {
      g.pageIds = g.pageIds.filter(pId => pId !== page.id);
    });

    // Remove queues and jobs associated with this page
    this.data.postingQueues = this.data.postingQueues.filter(q => q.pageId !== page.id);
    this.data.postingJobs = this.data.postingJobs.filter(j => j.pageId !== page.id);

    this.save();
    return this.data.facebookPages.length < initialLen;
  }

  clearAllFacebookPages(): void {
    this.data.facebookPages = [];
    this.data.facebookAccounts = [];
    this.data.pageGroups = [];
    this.data.postingQueues = [];
    this.data.postingJobs = [];
    this.save();
  }

  // Page Groups
  getPageGroups(): PageGroup[] {
    return this.data.pageGroups;
  }

  createPageGroup(group: Omit<PageGroup, 'id' | 'createdAt'>): PageGroup {
    const newGroup: PageGroup = {
      ...group,
      id: 'grp-' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
    };
    this.data.pageGroups.push(newGroup);
    this.save();
    return newGroup;
  }

  updatePageGroup(id: string, updates: Partial<PageGroup>): PageGroup | undefined {
    const idx = this.data.pageGroups.findIndex(g => g.id === id);
    if (idx < 0) return undefined;
    this.data.pageGroups[idx] = { ...this.data.pageGroups[idx], ...updates };
    this.save();
    return this.data.pageGroups[idx];
  }

  deletePageGroup(id: string): boolean {
    const initialLen = this.data.pageGroups.length;
    this.data.pageGroups = this.data.pageGroups.filter(g => g.id !== id);
    this.save();
    return this.data.pageGroups.length < initialLen;
  }

  // Media Assets
  getMediaAssets(): MediaAsset[] {
    return this.data.mediaAssets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  getMediaById(id: string): MediaAsset | undefined {
    return this.data.mediaAssets.find(m => m.id === id);
  }

  createMediaAsset(media: Omit<MediaAsset, 'id' | 'createdAt' | 'updatedAt'>): MediaAsset {
    const newMedia: MediaAsset = {
      ...media,
      id: 'media-' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.mediaAssets.unshift(newMedia);
    this.save();
    return newMedia;
  }

  deleteMediaAsset(id: string): boolean {
    const initialLen = this.data.mediaAssets.length;
    this.data.mediaAssets = this.data.mediaAssets.filter(m => m.id !== id);
    this.save();
    return this.data.mediaAssets.length < initialLen;
  }

  // Processing Presets
  getPresets(): ProcessingPreset[] {
    return this.data.processingPresets;
  }

  createPreset(preset: Omit<ProcessingPreset, 'id' | 'createdAt'>): ProcessingPreset {
    const newPreset: ProcessingPreset = {
      ...preset,
      id: 'preset-' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
    };
    this.data.processingPresets.push(newPreset);
    this.save();
    return newPreset;
  }

  // Caption Templates
  getCaptionTemplates(): CaptionTemplate[] {
    return this.data.captionTemplates;
  }

  createCaptionTemplate(tmpl: Omit<CaptionTemplate, 'id' | 'createdAt'>): CaptionTemplate {
    const newTmpl: CaptionTemplate = {
      ...tmpl,
      id: 'tmpl-' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
    };
    this.data.captionTemplates.push(newTmpl);
    this.save();
    return newTmpl;
  }

  // Queues & Jobs
  getQueues(): PostingQueue[] {
    return this.data.postingQueues;
  }

  getQueueByPageId(pageId: string): PostingQueue | undefined {
    return this.data.postingQueues.find(q => q.pageId === pageId);
  }

  toggleQueuePause(pageId: string, pause?: boolean): PostingQueue | undefined {
    let q = this.data.postingQueues.find(queue => queue.pageId === pageId);
    if (!q) {
      q = {
        id: `queue-${pageId}`,
        pageId,
        isPaused: pause ?? true,
        currentPosition: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      this.data.postingQueues.push(q);
    } else {
      q.isPaused = pause !== undefined ? pause : !q.isPaused;
      q.updatedAt = new Date().toISOString();
    }
    this.save();
    return q;
  }

  getJobs(filter?: { pageId?: string; status?: string }): PostingJob[] {
    let result = [...this.data.postingJobs];
    if (filter?.pageId) {
      result = result.filter(j => j.pageId === filter.pageId);
    }
    if (filter?.status) {
      result = result.filter(j => j.status === filter.status);
    }
    return result.sort((a, b) => new Date(a.scheduledFor).getTime() - new Date(b.scheduledFor).getTime());
  }

  getJobById(id: string): PostingJob | undefined {
    return this.data.postingJobs.find(j => j.id === id);
  }

  createPostingJob(job: Omit<PostingJob, 'id' | 'createdAt' | 'updatedAt'>): PostingJob {
    const newJob: PostingJob = {
      ...job,
      id: 'job-' + uuidv4().slice(0, 8),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    this.data.postingJobs.push(newJob);
    this.save();
    return newJob;
  }

  updatePostingJob(id: string, updates: Partial<PostingJob>): PostingJob | undefined {
    const idx = this.data.postingJobs.findIndex(j => j.id === id);
    if (idx < 0) return undefined;
    this.data.postingJobs[idx] = {
      ...this.data.postingJobs[idx],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.postingJobs[idx];
  }

  deletePostingJob(id: string): boolean {
    const initialLen = this.data.postingJobs.length;
    this.data.postingJobs = this.data.postingJobs.filter(j => j.id !== id);
    this.save();
    return this.data.postingJobs.length < initialLen;
  }

  // History
  getHistory(limit: number = 50): PostingHistory[] {
    return this.data.postingHistory
      .sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime())
      .slice(0, limit);
  }

  createHistoryEntry(entry: Omit<PostingHistory, 'id'>): PostingHistory {
    const newEntry: PostingHistory = {
      ...entry,
      id: 'hist-' + uuidv4().slice(0, 8),
    };
    this.data.postingHistory.unshift(newEntry);
    this.save();
    return newEntry;
  }

  // Logs
  getLogs(limit: number = 100, category?: string, level?: string): SystemLog[] {
    let result = [...this.data.logs];
    if (category) {
      result = result.filter(l => l.category === category);
    }
    if (level) {
      result = result.filter(l => l.level === level);
    }
    return result
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, limit);
  }

  addLog(log: Omit<SystemLog, 'id' | 'timestamp'>): SystemLog {
    const newLog: SystemLog = {
      ...log,
      id: 'log-' + uuidv4().slice(0, 8),
      timestamp: new Date().toISOString(),
    };
    this.data.logs.unshift(newLog);
    // Keep max 1000 logs in memory/store
    if (this.data.logs.length > 1000) {
      this.data.logs = this.data.logs.slice(0, 1000);
    }
    this.save();
    return newLog;
  }

  // Settings
  getSettings(): SystemSettings {
    return this.data.settings;
  }

  updateSettings(updates: Partial<SystemSettings>): SystemSettings {
    this.data.settings = {
      ...this.data.settings,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.save();
    return this.data.settings;
  }

  // Dashboard Stats Aggregator
  getDashboardStats(userId?: string): any {
    const pages = userId ? this.getFacebookPagesForUser(userId) : this.data.facebookPages;
    const media = userId ? this.getMediaAssetsForUser(userId) : this.data.mediaAssets;
    const jobs = userId ? this.getJobsForUser(userId) : this.data.postingJobs;
    const history = userId ? this.getHistoryForUser(userId) : this.data.postingHistory;

    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    const scheduledToday = jobs.filter(j => {
      const scheduled = new Date(j.scheduledFor);
      return scheduled >= startOfToday && j.status === 'QUEUED';
    }).length;

    const publishedToday = history.filter(h => {
      return new Date(h.publishedAt) >= startOfToday && h.status === 'SUCCESS';
    }).length;

    const failed = jobs.filter(j => j.status === 'FAILED').length;
    const processing = jobs.filter(j => j.status === 'PROCESSING' || j.status === 'PUBLISHING').length;
    const queued = jobs.filter(j => j.status === 'QUEUED').length;

    const totalPublished = history.filter(h => h.status === 'SUCCESS').length;
    const totalFailed = history.filter(h => h.status === 'FAILED').length;
    const totalRuns = totalPublished + totalFailed;
    const successRate = totalRuns > 0 ? Math.round((totalPublished / totalRuns) * 100) : 100;

    // Last 7 days activity
    const activityMap: Record<string, { published: number; failed: number }> = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const dateKey = d.toISOString().split('T')[0];
      activityMap[dateKey] = { published: 0, failed: 0 };
    }

    history.forEach(h => {
      const dateKey = h.publishedAt.split('T')[0];
      if (activityMap[dateKey]) {
        if (h.status === 'SUCCESS') activityMap[dateKey].published++;
        else if (h.status === 'FAILED') activityMap[dateKey].failed++;
      }
    });

    const publishingActivity = Object.entries(activityMap).map(([date, data]) => ({
      date,
      published: data.published,
      failed: data.failed,
    }));

    const videosByPage = pages.map(p => ({
      pageName: p.pageName,
      count: jobs.filter(j => j.pageId === p.id).length,
    }));

    const sourceCounts: Record<string, number> = {};
    media.forEach(m => {
      sourceCounts[m.sourceType] = (sourceCounts[m.sourceType] || 0) + 1;
    });
    const videosBySource = Object.entries(sourceCounts).map(([source, count]) => ({
      source,
      count,
    }));

    return {
      connectedPages: pages.filter(p => p.status === 'ACTIVE').length,
      totalVideos: media.length,
      queued,
      scheduledToday,
      publishedToday,
      failed,
      currentlyProcessing: processing,
      successRate,
      publishingActivity,
      videosByPage,
      videosBySource,
    };
  }
}

// Global Singleton
declare global {
  // eslint-disable-next-line no-var
  var __dbInstance: DatabaseStore | undefined;
}

export const db = global.__dbInstance || new DatabaseStore();
if (process.env.NODE_ENV !== 'production') {
  global.__dbInstance = db;
}
