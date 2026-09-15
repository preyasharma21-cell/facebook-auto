import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const currentUserId = auth.user.id;
  const stats = db.getDashboardStats(currentUserId);
  const recentLogs = db.getLogs(6);
  const recentJobs = db.getJobsForUser(currentUserId).slice(0, 5);

  return NextResponse.json({
    stats,
    recentLogs,
    recentJobs,
  });
}
