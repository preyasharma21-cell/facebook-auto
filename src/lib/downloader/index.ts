import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { db } from '@/lib/db';
import { logEvent } from '@/lib/logger';
import { mediaProcessor } from '@/lib/ffmpeg';
import { bgQueueWorker } from '@/lib/queue/worker';

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
    if (lower.includes('kuaishou.com') || lower.includes('kwai.com')) return 'KUAISHOU';
    if (lower.includes('xiaohongshu.com') || lower.includes('xhslink.com') || lower.includes('rednote')) return 'REDNOTE';
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
    const outputTemplate = path.join(this.uploadsDir, `${safeBaseName}.%(ext)s`);

    logEvent('INFO', 'IMPORT', `Initiating automated video download from ${platform}: ${videoUrl}`);

    return new Promise((resolve) => {
      // Check for user-connected session cookies for this platform
      const cookiesDir = path.join(process.cwd(), 'data', 'cookies');
      const platformKey = platform.toLowerCase();
      const userCookiePath = options.userId ? path.join(cookiesDir, `${options.userId}_${platformKey}.txt`) : '';
      const fallbackCookiePath = path.join(cookiesDir, `default_${platformKey}.txt`);

      let cookieToUse = '';
      if (userCookiePath && fs.existsSync(userCookiePath)) {
        cookieToUse = userCookiePath;
      } else if (fs.existsSync(fallbackCookiePath)) {
        cookieToUse = fallbackCookiePath;
      }

      // Determine appropriate extractor args based on whether cookies are available
      let ytClient = 'android,ios';
      if (cookieToUse && platform === 'YOUTUBE') {
        ytClient = 'web,mweb,android';
      }

      // Execute python -m yt_dlp with bot-bypass flags
      const args = [
        '-m', 'yt_dlp',
        '--no-playlist',
        '--no-warnings',
        '--impersonate', 'chrome',
        '--extractor-args', `youtube:player_client=${ytClient}`,
        '--js-runtimes', 'node',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--write-info-json',
      ];

      if (cookieToUse) {
        args.push('--cookies', cookieToUse);
        logEvent('INFO', 'IMPORT', `Applying connected ${platform} user session cookies for authenticated download`);
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

      proc.stdout.on('data', (data) => {
        stdout += data.toString();
      });

      proc.stderr.on('data', (data) => {
        stderr += data.toString();
      });

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

        try {
          // Identify the downloaded file on disk
          let finalFilePath = path.join(this.uploadsDir, `${safeBaseName}.mp4`);
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
            return resolve({
              url: videoUrl,
              success: false,
              error: 'Downloaded file not found on server filesystem.',
            });
          }

          const actualFilename = path.basename(finalFilePath);
          const fileStats = fs.statSync(finalFilePath);

          // Read metadata from .info.json if available
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
            } catch {
              // Ignore json read error
            }
          }

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
            duration: 45.0,
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

          resolve({
            url: videoUrl,
            success: true,
            mediaId: media.id,
            filename: actualFilename,
            title: extractedTitle,
            scheduledJobId,
          });
        } catch (err: any) {
          resolve({
            url: videoUrl,
            success: false,
            error: err.message,
          });
        }
      });
    });
  }
}

export const videoDownloaderService = new VideoDownloaderService();
