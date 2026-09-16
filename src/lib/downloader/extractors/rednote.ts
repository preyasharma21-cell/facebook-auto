import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { logEvent } from '@/lib/logger';

export interface RedNoteExtractionResult {
  success: boolean;
  videoPath?: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

export async function extractRedNoteVideo(
  url: string,
  outputFilePath: string,
  cookieText?: string
): Promise<RedNoteExtractionResult> {
  logEvent('INFO', 'IMPORT', `Starting dedicated RedNote/Xiaohongshu extractor for: ${url}`);

  try {
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    const headers: Record<string, string> = {
      'User-Agent': desktopUA,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8',
      'Accept-Language': 'en-US,en;q=0.9,zh-CN;q=0.8,zh;q=0.7',
    };

    if (cookieText) {
      headers['Cookie'] = cookieText;
    }

    // 1. Follow redirects from xhslink.com or share links
    const response = await fetch(url, {
      headers,
      redirect: 'follow',
    });

    const html = await response.text();
    const finalUrl = response.url || url;

    // 2. Extract direct video stream
    let videoUrl = '';
    let videoTitle = 'RedNote Video';
    let videoThumb = '';

    // Strategy A: Parse window.__INITIAL_STATE__
    const stateMatch = html.match(/window\.__INITIAL_STATE__\s*=\s*(\{.+?\})<\/script>/s)
      || html.match(/window\.__INITIAL_SSR_STATE__\s*=\s*(\{.+?\})<\/script>/s);

    if (stateMatch && stateMatch[1]) {
      try {
        const rawJson = stateMatch[1].replace(/undefined/g, 'null');
        const state = JSON.parse(rawJson);
        const stateStr = JSON.stringify(state);

        // Find masterUrl in h264 stream
        const masterUrlMatch = stateStr.match(/"masterUrl":\s*"([^"]+)"/);
        if (masterUrlMatch && masterUrlMatch[1]) {
          videoUrl = masterUrlMatch[1].replace(/\\u002F/g, '/').replace(/\\/g, '');
        }

        // Strategy A2: originVideoKey fallback
        if (!videoUrl) {
          const originKeyMatch = stateStr.match(/"originVideoKey":\s*"([^"]+)"/);
          if (originKeyMatch && originKeyMatch[1]) {
            videoUrl = `https://sns-video-bd.xhscdn.com/${originKeyMatch[1]}`;
          }
        }
      } catch {}
    }

    // Strategy B: CDN Regex for xhscdn.com video URLs
    if (!videoUrl) {
      const cdnRegex = /https?:\/\/sns-video-[a-zA-Z0-9-]+\.xhscdn\.com\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi;
      const cdnMatches = html.match(cdnRegex);
      if (cdnMatches && cdnMatches.length > 0) {
        videoUrl = cdnMatches[0].replace(/&amp;/g, '&');
      }
    }

    // Strategy C: OpenGraph meta tag
    if (!videoUrl) {
      const ogVideoMatch = html.match(/<meta\s+name=["']og:video["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+property=["']og:video["']\s+content=["']([^"']+)["']/i);
      if (ogVideoMatch && ogVideoMatch[1]) {
        videoUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
      }
    }

    // Strategy D: Any mp4 url in HTML
    if (!videoUrl) {
      const mp4Matches = html.match(/https?:\/\/[^"'\s<>]+\.mp4(?:\?[^"'\s<>]*)?/gi);
      if (mp4Matches && mp4Matches.length > 0) {
        videoUrl = mp4Matches[0].replace(/&amp;/g, '&');
      }
    }

    // Extract Title & Thumbnail
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      || html.match(/<meta\s+name=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (titleMatch && titleMatch[1]) {
      videoTitle = titleMatch[1].replace(/ - 小红书.*$/i, '').replace(/ - RedNote.*$/i, '').trim();
    }

    const thumbMatch = html.match(/<meta\s+name=["']og:image["']\s+content=["']([^"']+)["']/i)
      || html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (thumbMatch && thumbMatch[1]) {
      videoThumb = thumbMatch[1];
    }

    if (!videoUrl) {
      return {
        success: false,
        error: 'Could not extract RedNote/Xiaohongshu video stream. The note may be an image gallery or require login.',
      };
    }

    logEvent('INFO', 'IMPORT', `Downloading extracted RedNote stream: ${videoUrl.slice(0, 80)}...`);

    // Download stream to output file using native fetch
    const streamRes = await fetch(videoUrl, {
      headers: {
        'User-Agent': desktopUA,
        'Referer': finalUrl,
      },
    });

    if (!streamRes.ok || !streamRes.body) {
      throw new Error(`Failed to stream video from CDN (status ${streamRes.status})`);
    }

    const fileStream = fs.createWriteStream(outputFilePath);
    await pipeline(Readable.fromWeb(streamRes.body as any), fileStream);

    const stats = fs.statSync(outputFilePath);
    if (stats.size < 1000) {
      throw new Error(`Downloaded file too small (${stats.size} bytes), stream may have failed.`);
    }

    logEvent('SUCCESS', 'IMPORT', `RedNote video saved successfully: ${path.basename(outputFilePath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      success: true,
      videoPath: outputFilePath,
      title: videoTitle,
      thumbnailUrl: videoThumb,
      duration: 30.0,
    };
  } catch (err: any) {
    logEvent('ERROR', 'IMPORT', `RedNote extraction failed: ${err.message}`);
    return {
      success: false,
      error: err.message || 'RedNote video extraction error',
    };
  }
}
