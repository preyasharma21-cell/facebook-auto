import { NextRequest } from 'next/server';
import { logBroadcaster } from '@/lib/logger';
import { SystemLog } from '@/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      // Send initial keepalive
      controller.enqueue(encoder.encode(`event: connected\ndata: {"status":"connected"}\n\n`));

      const unsubscribe = logBroadcaster.subscribe((log: SystemLog) => {
        try {
          const payload = `data: ${JSON.stringify(log)}\n\n`;
          controller.enqueue(encoder.encode(payload));
        } catch {
          unsubscribe();
        }
      });

      // Heartbeat every 20 seconds to prevent timeout
      const heartbeat = setInterval(() => {
        try {
          controller.enqueue(encoder.encode(`: heartbeat\n\n`));
        } catch {
          clearInterval(heartbeat);
          unsubscribe();
        }
      }, 20000);

      req.signal.addEventListener('abort', () => {
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      });
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
    },
  });
}
