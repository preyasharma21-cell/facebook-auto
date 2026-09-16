import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { Readable } from 'stream';
import { logEvent } from '@/lib/logger';

export interface KwaiExtractionResult {
  success: boolean;
  videoPath?: string;
  title?: string;
  thumbnailUrl?: string;
  duration?: number;
  error?: string;
}

export async function extractKwaiVideo(
  url: string,
  outputFilePath: string
): Promise<KwaiExtractionResult> {
  logEvent('INFO', 'IMPORT', `Starting dedicated Kwai/Kuaishou extractor for: ${url}`);

  try {
    const mobileUA = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1';
    const desktopUA = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

    // 1. Follow redirects with mobile User-Agent
    const res1 = await fetch(url, {
      headers: {
        'User-Agent': mobileUA,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      redirect: 'follow',
    });

    let html = await res1.text();
    const finalUrl = res1.url || url;

    // 2. If mobile html doesn't seem to contain video, try desktop
    if (!html.includes('.mp4') && !html.includes('mainMvUrls') && !html.includes('playUrls')) {
      try {
        const res2 = await fetch(finalUrl, {
          headers: {
            'User-Agent': desktopUA,
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          },
          redirect: 'follow',
        });
        const desktopText = await res2.text();
        html += '\n' + desktopText;
      } catch {
        // Continue with mobile HTML
      }
    }

    // 3. Extract direct MP4 stream URL
    let videoUrl = '';
    let videoTitle = 'Kwai Video';
    let videoThumb = '';

    // Strategy A: JSON in window.INIT_STATE or window.playcard or window.pageData
    const jsonMatch = html.match(/window\.(?:INIT_STATE|playcard|pageData|__INITIAL_STATE__)\s*=\s*(\{.+?\});/s);
    if (jsonMatch && jsonMatch[1]) {
      try {
        const state = JSON.parse(jsonMatch[1]);
        const stateStr = JSON.stringify(state);
        const urlMatches = stateStr.match(/https?:\/\/[^"'\s\\]+\.mp4[^"'\s\\]*/g);
        if (urlMatches && urlMatches.length > 0) {
          videoUrl = urlMatches[0].replace(/\\u002F/g, '/').replace(/\\/g, '');
        }
      } catch {}
    }

    // Strategy B: OpenGraph meta tags
    if (!videoUrl) {
      const ogVideoMatch = html.match(/<meta\s+property=["']og:video(?::url|:secure_url)?["']\s+content=["']([^"']+)["']/i)
        || html.match(/<meta\s+content=["']([^"']+)["']\s+property=["']og:video(?::url|:secure_url)?["']/i);
      if (ogVideoMatch && ogVideoMatch[1]) {
        videoUrl = ogVideoMatch[1].replace(/&amp;/g, '&');
      }
    }

    // Strategy C: HTML5 video tag
    if (!videoUrl) {
      const videoTagMatch = html.match(/<video[^>]+src=["']([^"']+)["']/i);
      if (videoTagMatch && videoTagMatch[1]) {
        videoUrl = videoTagMatch[1].replace(/&amp;/g, '&');
      }
    }

    // Strategy D: CDN Regex for mp4 URLs
    if (!videoUrl) {
      const cdnRegex = /https?:\/\/(?:[a-zA-Z0-9-]+\.)*(?:yximgs\.com|kwaicdn\.com|kwai\.net|gifshow\.com|kwimgs\.com)\/[^"'\s<>]+\.mp4[^"'\s<>]*/gi;
      const cdnMatches = html.match(cdnRegex);
      if (cdnMatches && cdnMatches.length > 0) {
        videoUrl = cdnMatches[0].replace(/&amp;/g, '&');
      }
    }

    // Strategy E: Any valid mp4 URL in the HTML
    if (!videoUrl) {
      const genericMp4 = html.match(/https?:\/\/[^"'\s<>]+\.mp4(?:\?[^"'\s<>]*)?/gi);
      if (genericMp4 && genericMp4.length > 0) {
        videoUrl = genericMp4[0].replace(/&amp;/g, '&');
      }
    }

    // Extract Title & Thumbnail
    const titleMatch = html.match(/<title>([^<]+)<\/title>/i)
      || html.match(/<meta\s+property=["']og:title["']\s+content=["']([^"']+)["']/i);
    if (titleMatch && titleMatch[1]) {
      videoTitle = titleMatch[1].replace(/ - Kwai.*$/i, '').trim();
    }

    const thumbMatch = html.match(/<meta\s+property=["']og:image["']\s+content=["']([^"']+)["']/i);
    if (thumbMatch && thumbMatch[1]) {
      videoThumb = thumbMatch[1];
    }

    if (!videoUrl) {
      return {
        success: false,
        error: 'Could not extract direct video stream from Kwai/Kuaishou URL. The video may be private or deleted.',
      };
    }

    logEvent('INFO', 'IMPORT', `Downloading extracted Kwai stream: ${videoUrl.slice(0, 80)}...`);

    // Download stream to output file using native fetch
    const streamRes = await fetch(videoUrl, {
      headers: {
        'User-Agent': mobileUA,
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

    logEvent('SUCCESS', 'IMPORT', `Kwai video saved successfully: ${path.basename(outputFilePath)} (${(stats.size / 1024 / 1024).toFixed(2)} MB)`);

    return {
      success: true,
      videoPath: outputFilePath,
      title: videoTitle,
      thumbnailUrl: videoThumb,
      duration: 30.0,
    };
  } catch (err: any) {
    logEvent('ERROR', 'IMPORT', `Kwai extraction failed: ${err.message}`);
    return {
      success: false,
      error: err.message || 'Kwai video extraction error',
    };
  }
}
