import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { logEvent } from '@/lib/logger';
import { mediaProcessor } from '@/lib/ffmpeg';
import { bgQueueWorker } from '@/lib/queue/worker';
import { extractKwaiVideo } from './extractors/kwai';
import { extractRedNoteVideo } from './extractors/rednote';
import { youtubeResolverService, extractYouTubeVideoId } from './extractors/youtube';

export interface DownloadJobResult {
  url: string;
  success: boolean;
  mediaId?: string;
  filename?: string;
  title?: string;
  error?: string;
  scheduledJobId?: string;
}

export class VideoDownloaderService {
  private uploadsDir: string;

  constructor() {
    this.uploadsDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(this.uploadsDir)) {
      fs.mkdirSync(this.uploadsDir, { recursive: true });
    }
  }

  // Detect platform name from URL
  getPlatformFromUrl(url: string): string {
    const lower = url.toLowerCase();
    if (lower.includes('youtube.com') || lower.includes('youtu.be')) return 'YOUTUBE';
    if (lower.includes('tiktok.com')) return 'TIKTOK';
    if (lower.includes('instagram.com')) return 'INSTAGRAM';
    if (
      lower.includes('kuaishou.com') ||
      lower.includes('kwai.com') ||
      lower.includes('kwai-video.com') ||
      lower.includes('kw.ai') ||
      lower.includes('gifshow.com')
    ) return 'KUAISHOU';
    if (
      lower.includes('xiaohongshu.com') ||
      lower.includes('xhslink.com') ||
      lower.includes('xhscdn.com') ||
      lower.includes('rednote')
    ) return 'REDNOTE';
    if (lower.includes('snapchat.com')) return 'SNAPCHAT';
    if (lower.includes('twitter.com') || lower.includes('x.com')) return 'TWITTER';
    return 'BULK_URL';
  }

  async downloadVideo(
    videoUrl: string,
    options: {
      userId?: string;
      destinationPageId?: string;
      publishMode?: 'SCHEDULE' | 'POST_NOW' | 'LIBRARY_ONLY';
      scheduleTime?: string;
      caption?: string;
      hashtags?: string;
    }
  ): Promise<DownloadJobResult> {
    const platform = this.getPlatformFromUrl(videoUrl);
    const timestamp = Date.now();
    const safeBaseName = `social_${platform.toLowerCase()}_${timestamp}`;
    const targetMp4Path = path.join(this.uploadsDir, `${safeBaseName}.mp4`);
    const outputTemplate = path.join(this.uploadsDir, `${safeBaseName}.%(ext)s`);

    logEvent('INFO', 'IMPORT', `Initiating automated video download from ${platform}: ${videoUrl}`);

    // Check for user-connected session cookies for this platform
    const cookiesDir = path.join(process.cwd(), 'data', 'cookies');
    if (!fs.existsSync(cookiesDir)) {
      fs.mkdirSync(cookiesDir, { recursive: true });
    }

    const platformKey = platform.toLowerCase();
    const userCookiePath = options.userId ? path.join(cookiesDir, `${options.userId}_${platformKey}.txt`) : '';
    const fallbackCookiePath = path.join(cookiesDir, `default_${platformKey}.txt`);

    let cookieToUse = '';
    let cookieText = '';

    if (userCookiePath && fs.existsSync(userCookiePath)) {
      cookieToUse = userCookiePath;
      try { cookieText = fs.readFileSync(userCookiePath, 'utf-8'); } catch {}
    } else if (options.userId) {
      // Auto-restore cookies from DB if container restarted
      const account = db.getPlatformAccount(options.userId, platform as any);
      if (account?.cookiesData) {
        fs.writeFileSync(userCookiePath, account.cookiesData, 'utf-8');
        cookieToUse = userCookiePath;
        cookieText = account.cookiesData;
        logEvent('INFO', 'AUTH', `Restored ${platform} session cookies from database onto container disk`);
      }
    }

    if (!cookieToUse && fs.existsSync(fallbackCookiePath)) {
      cookieToUse = fallbackCookiePath;
      try { cookieText = fs.readFileSync(fallbackCookiePath, 'utf-8'); } catch {}
    }

    // -------------------------------------------------------------
    // Route 1: Dedicated Kwai / Kuaishou Extractor
    // -------------------------------------------------------------
    if (platform === 'KUAISHOU') {
      const kwaiRes = await extractKwaiVideo(videoUrl, targetMp4Path);
      if (kwaiRes.success && kwaiRes.videoPath) {
        return this.finishSuccessfulDownload(
          targetMp4Path,
          safeBaseName,
          videoUrl,
          platform,
          kwaiRes.title || 'Kwai Video',
          kwaiRes.thumbnailUrl,
          kwaiRes.duration || 30.0,
          options
        );
      }
      logEvent('WARNING', 'IMPORT', `Dedicated Kwai extractor failed (${kwaiRes.error}), falling back to yt-dlp...`);
    }

    // -------------------------------------------------------------
    // Route 2: Dedicated RedNote / Xiaohongshu Extractor
    // -------------------------------------------------------------
    if (platform === 'REDNOTE') {
      const rednoteRes = await extractRedNoteVideo(videoUrl, targetMp4Path, cookieText);
      if (rednoteRes.success && rednoteRes.videoPath) {
        return this.finishSuccessfulDownload(
          targetMp4Path,
          safeBaseName,
          videoUrl,
          platform,
          rednoteRes.title || 'RedNote Video',
          rednoteRes.thumbnailUrl,
          rednoteRes.duration || 30.0,
          options
        );
      }
      logEvent('WARNING', 'IMPORT', `Dedicated RedNote extractor failed (${rednoteRes.error}), falling back to yt-dlp...`);
    }

    // -------------------------------------------------------------
    // Route 3: Smart YouTube Downloader with Bot Bypass & Fallbacks
    // -------------------------------------------------------------
    if (platform === 'YOUTUBE') {
      const primaryClient = cookieToUse ? 'web,mweb,android' : 'ios,android';
      logEvent('INFO', 'IMPORT', `Attempting YouTube download with client '${primaryClient}'...`);

      const ytRes1 = await youtubeResolverService.downloadWithYtDlp(
        videoUrl,
        outputTemplate,
        cookieToUse,
        primaryClient
      );

      if (ytRes1.success) {
        return this.finishSuccessfulDownload(
          targetMp4Path,
          safeBaseName,
          videoUrl,
          platform,
          ytRes1.title || 'YouTube Video',
          ytRes1.thumbnail,
          ytRes1.duration || 45.0,
          options
        );
      }

      logEvent('WARNING', 'IMPORT', `Primary YouTube client failed: ${ytRes1.error?.slice(0, 150)}`);

      // Fallback A: Try mweb client
      logEvent('INFO', 'IMPORT', `Attempting YouTube fallback with 'mweb' client...`);
      const ytRes2 = await youtubeResolverService.downloadWithYtDlp(
        videoUrl,
        outputTemplate,
        cookieToUse,
        'mweb'
      );

      if (ytRes2.success) {
        return this.finishSuccessfulDownload(
          targetMp4Path,
          safeBaseName,
          videoUrl,
          platform,
          ytRes2.title || 'YouTube Video',
          ytRes2.thumbnail,
          ytRes2.duration || 45.0,
          options
        );
      }

      // Fallback B: Public Stream Resolvers (Invidious / Piped)
      const ytId = extractYouTubeVideoId(videoUrl);
      if (ytId) {
        logEvent('INFO', 'IMPORT', `Attempting YouTube public stream resolver for ID: ${ytId}...`);
        const streamRes = await youtubeResolverService.downloadViaPublicStreamResolver(ytId, targetMp4Path);
        if (streamRes.success) {
          return this.finishSuccessfulDownload(
            targetMp4Path,
            safeBaseName,
            videoUrl,
            platform,
            streamRes.title || 'YouTube Video',
            streamRes.thumbnail,
            streamRes.duration || 45.0,
            options
          );
        }
      }

      return {
        url: videoUrl,
        success: false,
        error: ytRes1.error || 'YouTube download blocked by bot detection. Connect an updated YouTube session in Import page.',
      };
    }

    // -------------------------------------------------------------
    // Route 4: General yt-dlp Engine (TikTok, Instagram, etc.)
    // -------------------------------------------------------------
    return new Promise((resolve) => {
      const args = [
        '-m', 'yt_dlp',
        '--no-playlist',
        '--no-warnings',
        '--impersonate', 'chrome',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--write-info-json',
      ];

      if (cookieToUse) {
        args.push('--cookies', cookieToUse);
        logEvent('INFO', 'IMPORT', `Applying connected ${platform} user session cookies for download`);
      }

      args.push(videoUrl);

      const isWin = process.platform === 'win32';
      const pathSep = isWin ? ';' : ':';
      const extraPaths = isWin
        ? 'C:\\Users\\My PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0-full_build\\bin;C:\\Users\\My PC\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python313\\Scripts'
        : '/opt/venv/bin:/usr/local/bin:/usr/bin:/bin';

      const pythonBin = !isWin && process.env.VIRTUAL_ENV
        ? `${process.env.VIRTUAL_ENV}/bin/python`
        : 'python';

      const proc = spawn(pythonBin, args, {
        env: {
          ...process.env,
          PATH: `${extraPaths}${pathSep}${process.env.PATH || ''}`,
        },
      });

      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (data) => { stdout += data.toString(); });
      proc.stderr.on('data', (data) => { stderr += data.toString(); });

      proc.on('close', async (code) => {
        if (code !== 0) {
          const errMsg = stderr || stdout || `Download failed with exit code ${code}`;
          logEvent('ERROR', 'IMPORT', `Download failed for ${videoUrl}: ${errMsg.slice(0, 200)}`);
          return resolve({
            url: videoUrl,
            success: false,
            error: errMsg.slice(0, 300),
          });
        }

        // Read info json if present
        const infoJsonPath = path.join(this.uploadsDir, `${safeBaseName}.info.json`);
        let extractedTitle = `${platform} Video ${timestamp}`;
        let videoDuration = 45.0;
        let remoteThumbUrl = '';

        if (fs.existsSync(infoJsonPath)) {
          try {
            const infoData = JSON.parse(fs.readFileSync(infoJsonPath, 'utf-8'));
            if (infoData.title) extractedTitle = String(infoData.title).trim();
            if (infoData.duration) videoDuration = Number(infoData.duration) || 45.0;
            if (infoData.thumbnail) remoteThumbUrl = String(infoData.thumbnail);
          } catch {}
        }

        const result = await this.finishSuccessfulDownload(
          targetMp4Path,
          safeBaseName,
          videoUrl,
          platform,
          extractedTitle,
          remoteThumbUrl,
          videoDuration,
          options
        );
        resolve(result);
      });
    });
  }

  private async finishSuccessfulDownload(
    targetFilePath: string,
    safeBaseName: string,
    videoUrl: string,
    platform: string,
    extractedTitle: string,
    remoteThumbUrl: string | undefined,
    videoDuration: number,
    options: {
      userId?: string;
      destinationPageId?: string;
      publishMode?: 'SCHEDULE' | 'POST_NOW' | 'LIBRARY_ONLY';
      scheduleTime?: string;
      caption?: string;
      hashtags?: string;
    }
  ): Promise<DownloadJobResult> {
    try {
      // Confirm file exists on disk (or check matching prefix)
      let finalFilePath = targetFilePath;
      if (!fs.existsSync(finalFilePath)) {
        const matching = fs.readdirSync(this.uploadsDir).filter(
          f => f.startsWith(safeBaseName) && !f.endsWith('.jpg') && !f.endsWith('.part') && !f.endsWith('.json')
        );
        if (matching.length > 0) {
          finalFilePath = path.join(this.uploadsDir, matching[0]);
        }
      }

      if (!fs.existsSync(finalFilePath)) {
        logEvent('ERROR', 'IMPORT', `Downloaded file not found on disk: ${safeBaseName}`);
        return {
          url: videoUrl,
          success: false,
          error: 'Downloaded file not found on server filesystem.',
        };
      }

      const actualFilename = path.basename(finalFilePath);
      const fileStats = fs.statSync(finalFilePath);

      // Generate thumbnail
      const thumbFilename = `thumb_${safeBaseName}.jpg`;
      const thumbPath = path.join(this.uploadsDir, thumbFilename);
      let finalThumbUrl = `/api/media/stream?file=${thumbFilename}`;

      try {
        await mediaProcessor.generateThumbnail(finalFilePath, thumbPath, 1);
        if (!fs.existsSync(thumbPath)) {
          finalThumbUrl = remoteThumbUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';
        }
      } catch {
        finalThumbUrl = remoteThumbUrl || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500';
      }

      // Build clean caption
      const caption = options.caption
        ? options.caption.replace('{title}', extractedTitle).replace('{filename}', extractedTitle)
        : extractedTitle;

      // Create Media Asset in Database
      const media = db.createMediaAsset({
        userId: options.userId,
        filename: actualFilename,
        filePath: `uploads/${actualFilename}`,
        thumbnailPath: finalThumbUrl,
        fileSize: fileStats.size,
        duration: videoDuration,
        resolution: '1080x1920',
        aspectRatio: '9:16',
        fps: 30,
        sourceType: platform as any,
        sourceUrl: videoUrl,
        captionDefault: caption,
        hashtagsDefault: options.hashtags || '#reels #viral #trending',
        status: 'READY',
      });

      logEvent('SUCCESS', 'IMPORT', `Downloaded video successfully: "${extractedTitle}" (${(fileStats.size / 1024 / 1024).toFixed(1)} MB)`);

      let scheduledJobId = undefined;

      // Auto-Schedule or Post-Now to Destination Facebook Page
      if (options.destinationPageId) {
        const targetPage = db.getPageById(options.destinationPageId);
        if (targetPage) {
          const isPostNow = options.publishMode === 'POST_NOW';
          const scheduledFor = isPostNow
            ? new Date(Date.now() - 1000).toISOString()
            : (options.scheduleTime || new Date(Date.now() + 1800000).toISOString());

          const job = db.createPostingJob({
            userId: options.userId,
            queueId: `queue-${targetPage.id}`,
            pageId: targetPage.id,
            mediaId: media.id,
            presetId: 'preset-01',
            caption: media.captionDefault,
            hashtags: media.hashtagsDefault,
            position: 1,
            scheduledFor,
            status: 'QUEUED',
            retryCount: 0,
            maxRetries: 3,
            lastError: null,
          });

          scheduledJobId = job.id;

          if (isPostNow) {
            logEvent('INFO', 'WORKER', `Immediately publishing downloaded video to Page "${targetPage.pageName}"`);
            bgQueueWorker.tick().catch(() => {});
          } else {
            logEvent('SUCCESS', 'SCHEDULER', `Auto-scheduled downloaded video to Page "${targetPage.pageName}" at ${scheduledFor}`);
          }
        }
      }

      return {
        url: videoUrl,
        success: true,
        mediaId: media.id,
        filename: actualFilename,
        title: extractedTitle,
        scheduledJobId,
      };
    } catch (err: any) {
      logEvent('ERROR', 'IMPORT', `Post-download processing error: ${err.message}`);
      return {
        url: videoUrl,
        success: false,
        error: err.message,
      };
    }
  }
}

export const videoDownloaderService = new VideoDownloaderService();
