import { db } from '@/lib/db';
import { LogCategory, LogLevel, SystemLog } from '@/types';

type LogListener = (log: SystemLog) => void;

class LogBroadcaster {
  private listeners: Set<LogListener> = new Set();

  public subscribe(listener: LogListener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  public emit(log: SystemLog): void {
    for (const listener of this.listeners) {
      try {
        listener(log);
      } catch (err) {
        console.error('[LogBroadcaster] Listener error:', err);
      }
    }
  }

  public get activeListenerCount(): number {
    return this.listeners.size;
  }
}

declare global {
  // eslint-disable-next-line no-var
  var __logBroadcaster: LogBroadcaster | undefined;
}

export const logBroadcaster = global.__logBroadcaster || new LogBroadcaster();
if (process.env.NODE_ENV !== 'production') {
  global.__logBroadcaster = logBroadcaster;
}

export function logEvent(
  level: LogLevel,
  category: LogCategory,
  message: string,
  meta?: { pageId?: string; jobId?: string; metadata?: any }
): SystemLog {
  const log = db.addLog({
    level,
    category,
    message,
    pageId: meta?.pageId,
    jobId: meta?.jobId,
    metadata: meta?.metadata,
  });

  // Broadcast to all active SSE streaming subscribers
  logBroadcaster.emit(log);

  // Also print clean formatted line to server console
  const colorCode =
    level === 'SUCCESS' ? '\x1b[32m' :
    level === 'WARNING' ? '\x1b[33m' :
    level === 'ERROR' ? '\x1b[31m' : '\x1b[36m';
  console.log(`${colorCode}[${log.timestamp.slice(11, 19)}] [${level}] [${category}] ${message}\x1b[0m`);

  return log;
}
