import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { bgQueueWorker } from '@/lib/queue/worker';
import { mediaProcessor } from '@/lib/ffmpeg';

export const dynamic = 'force-dynamic';

export async function GET() {
  const ffmpegOk = await mediaProcessor.isAvailable();
  const workerStatus = bgQueueWorker.getStatus();
  const settings = db.getSettings();
  const accounts = db.getFacebookAccounts();

  const isFbConnected = settings.demoMode || accounts.some(a => a.status === 'CONNECTED');

  return NextResponse.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds: Math.floor(process.uptime()),
    components: {
      api: { status: 'up' },
      database: { status: 'up', provider: process.env.DATABASE_URL ? 'postgresql' : 'sqlite_json' },
      worker: { status: workerStatus.isRunning ? 'running' : 'stopped', ...workerStatus },
      ffmpeg: { status: ffmpegOk ? 'available' : 'unavailable' },
      facebook: {
        status: isFbConnected ? 'connected' : 'disconnected',
        mode: settings.demoMode ? 'demo' : 'live',
      },
    },
  });
}
