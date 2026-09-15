import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const category = searchParams.get('category') || undefined;
  const level = searchParams.get('level') || undefined;
  const limit = searchParams.get('limit') ? Number(searchParams.get('limit')) : 100;

  const logs = db.getLogs(limit, category, level);
  return NextResponse.json({ logs });
}
