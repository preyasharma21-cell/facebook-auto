import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { SESSION_COOKIE_NAME, getAuthTokenFromRequest } from '@/lib/auth';

export async function POST(req: NextRequest) {
  const token = getAuthTokenFromRequest(req);
  if (token) {
    db.deleteSession(token);
  }

  const response = NextResponse.json({ success: true, message: 'Logged out' });
  response.cookies.delete(SESSION_COOKIE_NAME);
  return response;
}
