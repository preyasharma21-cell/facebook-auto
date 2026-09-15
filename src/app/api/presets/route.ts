import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const presets = db.getPresets();
  return NextResponse.json({ presets });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { name, resolution, aspectRatio, videoBitrate, fps, audioBitrate, volume, speed } = body;

    if (!name) {
      return NextResponse.json({ error: 'Preset name is required' }, { status: 400 });
    }

    const preset = db.createPreset({
      name,
      resolution: resolution || '1080x1920',
      aspectRatio: aspectRatio || '9:16',
      videoBitrate: videoBitrate || '4500k',
      fps: fps ? Number(fps) : 30,
      audioBitrate: audioBitrate || '192k',
      volume: volume ? Number(volume) : 1.0,
      speed: speed ? Number(speed) : 1.0,
      watermarkEnabled: false,
      isDefault: false,
    });

    logEvent('SUCCESS', 'FFMPEG', `Created new processing preset: "${preset.name}" (${preset.resolution})`);
    return NextResponse.json({ success: true, preset });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
