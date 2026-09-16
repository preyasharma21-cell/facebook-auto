import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { logEvent } from '@/lib/logger';

export interface YouTubeExtractionResult {
  success: boolean;
  videoPath?: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

export function extractYouTubeVideoId(url: string): string | null {
  const regExp = /^.*(youtu.be\/|v\/|u\/\w\/|embed\/|watch\?v=|&v=)([^#&?]*).*/;
  const match = url.match(regExp);
  return (match && match[2].length === 11) ? match[2] : null;
}

export class YouTubeResolverService {
  private getPythonEnv() {
    const isWin = process.platform === 'win32';
    const pathSep = isWin ? ';' : ':';
    const extraPaths = isWin
      ? 'C:\\Users\\My PC\\AppData\\Local\\Microsoft\\WinGet\\Packages\\Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe\\ffmpeg-9.0-full_build\\bin;C:\\Users\\My PC\\AppData\\Local\\Packages\\PythonSoftwareFoundation.Python.3.13_qbz5n2kfra8p0\\LocalCache\\local-packages\\Python313\\Scripts'
      : '/opt/venv/bin:/usr/local/bin:/usr/bin:/bin';

    const pythonBin = !isWin && process.env.VIRTUAL_ENV
      ? `${process.env.VIRTUAL_ENV}/bin/python`
      : 'python';

    return {
      pythonBin,
      env: {
        ...process.env,
        PATH: `${extraPaths}${pathSep}${process.env.PATH || ''}`,
      },
    };
  }

  // Strategy 1: yt-dlp with optimized player clients (no impersonate flag)
  async downloadWithYtDlp(
    url: string,
    outputTemplate: string,
    cookiePath?: string,
    playerClient = 'ios,android'
  ): Promise<{ success: boolean; error?: string; title?: string; duration?: number; thumbnail?: string }> {
    return new Promise((resolve) => {
      const { pythonBin, env } = this.getPythonEnv();

      const args = [
        '-m', 'yt_dlp',
        '--no-playlist',
        '--no-warnings',
        '--extractor-args', `youtube:player_client=${playerClient}`,
        '--js-runtimes', 'node',
        '-f', 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/best[ext=mp4]/best',
        '--merge-output-format', 'mp4',
        '-o', outputTemplate,
        '--write-info-json',
      ];

      if (cookiePath && fs.existsSync(cookiePath)) {
        args.push('--cookies', cookiePath);
      }

      args.push(url);

      const proc = spawn(pythonBin, args, { env });
      let stdout = '';
      let stderr = '';

      proc.stdout.on('data', (d) => { stdout += d.toString(); });
      proc.stderr.on('data', (d) => { stderr += d.toString(); });

      proc.on('close', (code) => {
        if (code === 0) {
          // Read .info.json if available
          const baseName = outputTemplate.replace('.%(ext)s', '');
          const infoPath = `${baseName}.info.json`;
          let title = '';
          let duration = 45;
          let thumbnail = '';

          if (fs.existsSync(infoPath)) {
            try {
              const info = JSON.parse(fs.readFileSync(infoPath, 'utf-8'));
              title = info.title || '';
              duration = Number(info.duration) || 45;
              thumbnail = info.thumbnail || '';
            } catch {}
          }

          resolve({ success: true, title, duration, thumbnail });
        } else {
          resolve({ success: false, error: stderr || stdout || `Exit code ${code}` });
        }
      });
    });
  }

  // Strategy 2: Fallback via Open Piped / Invidious stream APIs
  async downloadViaPublicStreamResolver(
    videoId: string,
    outputFilePath: string
  ): Promise<{ success: boolean; error?: string; title?: string; duration?: number; thumbnail?: string }> {
    const apiEndpoints = [
      `https://pipedapi.kavin.rocks/streams/${videoId}`,
      `https://api.piped.private.coffee/streams/${videoId}`,
      `https://pipedapi.tokhmi.xyz/streams/${videoId}`,
      `https://inv.tux.pizza/api/v1/videos/${videoId}`,
      `https://invidious.nerdvpn.de/api/v1/videos/${videoId}`,
    ];

    for (const endpoint of apiEndpoints) {
      try {
        logEvent('INFO', 'IMPORT', `Attempting YouTube fallback stream resolver via: ${new URL(endpoint).hostname}`);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);

        const res = await fetch(endpoint, {
          signal: controller.signal,
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          },
        });
        clearTimeout(timeoutId);

        if (!res.ok) continue;
        const data: any = await res.json();

        let streamUrl = '';
        let title = data.title || 'YouTube Video';
        let duration = data.duration || 45;
        let thumbnail = data.thumbnailUrl || (data.videoThumbnails && data.videoThumbnails[0]?.url) || '';

        // Piped format
        if (data.videoStreams && Array.isArray(data.videoStreams)) {
          const combined = data.videoStreams.find((s: any) => s.videoOnly === false && s.mimeType?.includes('mp4'));
          const best = combined || data.videoStreams.find((s: any) => s.mimeType?.includes('mp4'));
          if (best?.url) streamUrl = best.url;
        }

        // Invidious format
        if (!streamUrl && data.formatStreams && Array.isArray(data.formatStreams)) {
          const mp4 = data.formatStreams.find((s: any) => s.container === 'mp4' || s.type?.includes('mp4'));
          if (mp4?.url) streamUrl = mp4.url;
        }

        if (streamUrl) {
          logEvent('INFO', 'IMPORT', `Streaming resolved YouTube fallback MP4 to disk...`);
          const streamRes = await fetch(streamUrl);
          if (!streamRes.ok || !streamRes.body) continue;

          const writer = fs.createWriteStream(outputFilePath);
          await pipeline(Readable.fromWeb(streamRes.body as any), writer);

          const stat = fs.statSync(outputFilePath);
          if (stat.size > 50000) {
            logEvent('SUCCESS', 'IMPORT', `YouTube fallback stream saved: ${(stat.size / 1024 / 1024).toFixed(1)} MB`);
            return { success: true, title, duration, thumbnail };
          }
        }
      } catch (err: any) {
        logEvent('WARNING', 'IMPORT', `Resolver endpoint failed (${err.message}), trying next...`);
      }
    }

    return { success: false, error: 'All YouTube stream resolvers were unreachable or rate-limited.' };
  }
}

export const youtubeResolverService = new YouTubeResolverService();
