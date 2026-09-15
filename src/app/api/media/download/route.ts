import { NextRequest, NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { videoDownloaderService } from '@/lib/downloader';
import { logEvent } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { urls, destinationPageId, publishMode, intervalMinutes, caption, hashtags } = body;

    if (!urls || !Array.isArray(urls) || urls.length === 0) {
      return NextResponse.json({ error: 'At least one video URL is required' }, { status: 400 });
    }

    logEvent('INFO', 'IMPORT', `Received batch download request for ${urls.length} video URL(s)`);

    const gapMinutes = Number(intervalMinutes) || 60;
    const now = Date.now();
    const results = [];

    for (let i = 0; i < urls.length; i++) {
      const url = urls[i].trim();
      if (!url) continue;

      // Stagger scheduled times: 1st video at +30m, 2nd at +90m, 3rd at +150m, etc.
      const scheduleTime = new Date(now + (i + 1) * gapMinutes * 60000).toISOString();

      const result = await videoDownloaderService.downloadVideo(url, {
        userId: auth.user.id,
        destinationPageId,
        publishMode: publishMode || 'SCHEDULE',
        scheduleTime,
        caption,
        hashtags,
      });

      results.push(result);
    }

    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;

    logEvent(
      successful > 0 ? 'SUCCESS' : 'WARNING',
      'IMPORT',
      `Batch downloader finished: ${successful} downloaded & scheduled, ${failed} failed`
    );

    return NextResponse.json({
      success: true,
      total: urls.length,
      successful,
      failed,
      results,
    });
  } catch (err: any) {
    logEvent('ERROR', 'IMPORT', `Batch downloader exception: ${err.message}`);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
