import { NextRequest, NextResponse } from 'next/server';
import { getAuthTokenFromRequest, verifySessionToken } from '@/lib/auth';

export async function GET(req: NextRequest) {
  const token = getAuthTokenFromRequest(req);
  const user = verifySessionToken(token);

  if (!user) {
    return NextResponse.json({ authenticated: false, user: null }, { status: 401 });
  }

  return NextResponse.json({
    authenticated: true,
    user: {
      id: user.id,
      username: user.username,
    },
  });
}
