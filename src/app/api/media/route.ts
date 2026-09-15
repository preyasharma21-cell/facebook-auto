import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const search = searchParams.get('search')?.toLowerCase();
  const source = searchParams.get('source');
  const status = searchParams.get('status');

  let media = db.getMediaAssetsForUser(auth.user.id);

  if (search) {
    media = media.filter(m => 
      m.filename.toLowerCase().includes(search) || 
      m.captionDefault.toLowerCase().includes(search)
    );
  }

  if (source && source !== 'ALL') {
    media = media.filter(m => m.sourceType === source);
  }

  if (status && status !== 'ALL') {
    media = media.filter(m => m.status === status);
  }

  return NextResponse.json({
    media,
    total: media.length,
  });
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Media ID is required' }, { status: 400 });
  }

  const media = db.getMediaById(id);
  if (!media) {
    return NextResponse.json({ error: 'Media not found' }, { status: 404 });
  }

  if (media.userId && media.userId !== auth.user.id && auth.user.role !== 'OWNER') {
    return NextResponse.json({ error: 'Unauthorized to delete this media asset' }, { status: 403 });
  }

  // Safety check: Never delete a file still referenced by an active posting job
  const activeJobs = db.getJobsForUser(auth.user.id).filter(j => j.mediaId === id && (j.status === 'QUEUED' || j.status === 'PUBLISHING'));
  if (activeJobs.length > 0) {
    return NextResponse.json(
      { error: `Cannot delete media: It is currently scheduled in ${activeJobs.length} active posting job(s)` },
      { status: 400 }
    );
  }

  db.deleteMediaAsset(id);
  logEvent('INFO', 'UPLOAD', `Deleted media asset: ${media.filename}`);
  return NextResponse.json({ success: true, message: 'Media asset removed' });
}
