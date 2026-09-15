import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const stats = db.getDashboardStats();
  const recentLogs = db.getLogs(6);
  const recentJobs = db.getJobs().slice(0, 5);

  return NextResponse.json({
    stats,
    recentLogs,
    recentJobs,
  });
}
