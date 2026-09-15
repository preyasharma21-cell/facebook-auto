import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const history = db.getHistoryForUser(auth.user.id);
  const pages = db.getFacebookPagesForUser(auth.user.id);
  const mediaList = db.getMediaAssetsForUser(auth.user.id);

  const enriched = history.map(h => ({
    ...h,
    page: pages.find(p => p.id === h.pageId || p.pageId === h.pageId),
    media: mediaList.find(m => m.id === h.mediaId),
  }));

  return NextResponse.json({ history: enriched });
}
