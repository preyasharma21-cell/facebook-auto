import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const groups = db.getPageGroups();
  return NextResponse.json({ groups });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { name, description, color, pageIds } = body;

    if (!name) {
      return NextResponse.json({ error: 'Group name is required' }, { status: 400 });
    }

    const group = db.createPageGroup({
      name,
      description: description || '',
      color: color || '#06b6d4',
      pageIds: Array.isArray(pageIds) ? pageIds : [],
    });

    logEvent('SUCCESS', 'FACEBOOK', `Created Page Group: "${group.name}" with ${group.pageIds.length} Pages`);
    return NextResponse.json({ success: true, group });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { id, name, description, color, pageIds } = body;

    if (!id) {
      return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
    }

    const updated = db.updatePageGroup(id, {
      ...(name && { name }),
      ...(description !== undefined && { description }),
      ...(color && { color }),
      ...(pageIds && { pageIds }),
    });

    if (!updated) {
      return NextResponse.json({ error: 'Group not found' }, { status: 404 });
    }

    return NextResponse.json({ success: true, group: updated });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  if (!id) {
    return NextResponse.json({ error: 'Group ID is required' }, { status: 400 });
  }

  const deleted = db.deletePageGroup(id);
  return NextResponse.json({ success: deleted });
}
