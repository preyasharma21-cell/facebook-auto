import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { User } from '@/types';

export const SESSION_COOKIE_NAME = 'fb_autopilot_session';
const SESSION_DURATION_DAYS = 7;

export async function authenticateOwner(password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const settings = db.getSettings();
  const ownerUsername = process.env.OWNER_USERNAME || 'admin';
  const owner = db.getUserByUsername(ownerUsername);

  if (!owner) {
    return { success: false, error: 'Owner user not initialized' };
  }

  const isValid = bcrypt.compareSync(password, owner.passwordHash);
  if (!isValid) {
    db.addLog({
      level: 'WARNING',
      category: 'AUTH',
      message: `Failed login attempt for owner '${ownerUsername}'`,
    });
    return { success: false, error: 'Invalid owner password' };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  const session = db.createSession(owner.id, expiresAt);

  db.addLog({
    level: 'INFO',
    category: 'AUTH',
    message: `Owner '${ownerUsername}' logged in successfully`,
  });

  return {
    success: true,
    user: owner,
    token: session.token,
  };
}

export function verifySessionToken(token?: string): User | null {
  if (!token) return null;
  const session = db.getSessionByToken(token);
  if (!session) return null;
  const user = db.getUserById(session.userId);
  return user || null;
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  return verifySessionToken(token);
}

export function getAuthTokenFromRequest(req: NextRequest): string | undefined {
  const cookieToken = req.cookies.get(SESSION_COOKIE_NAME)?.value;
  if (cookieToken) return cookieToken;

  const authHeader = req.headers.get('Authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7).trim();
  }
  return undefined;
}

export function requireAuth(req: NextRequest): { user: User } | { response: NextResponse } {
  const token = getAuthTokenFromRequest(req);
  const user = verifySessionToken(token);

  if (!user) {
    return {
      response: NextResponse.json(
        { error: 'Unauthorized: Owner session required' },
        { status: 401 }
      ),
    };
  }

  return { user };
}
