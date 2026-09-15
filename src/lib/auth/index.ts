import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import bcrypt from 'bcryptjs';
import { db } from '@/lib/db';
import { User, UserRole } from '@/types';

export const SESSION_COOKIE_NAME = 'fb_autopilot_session';
const SESSION_DURATION_DAYS = 7;

export async function authenticateUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const cleanUsername = username?.trim() || process.env.OWNER_USERNAME || 'admin';
  const user = db.getUserByUsername(cleanUsername);

  if (!user) {
    return { success: false, error: 'User not found' };
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    db.addLog({
      level: 'WARNING',
      category: 'AUTH',
      message: `Failed login attempt for user '${cleanUsername}'`,
    });
    return { success: false, error: 'Invalid password' };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  const session = db.createSession(user.id, expiresAt);

  db.addLog({
    level: 'INFO',
    category: 'AUTH',
    message: `User '${user.username}' logged in successfully`,
  });

  return {
    success: true,
    user,
    token: session.token,
  };
}

export async function registerUser(
  username: string,
  password: string
): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const cleanUsername = username?.trim().toLowerCase();

  if (!cleanUsername || cleanUsername.length < 3) {
    return { success: false, error: 'Username must be at least 3 characters long' };
  }

  if (!/^[a-zA-Z0-9_-]+$/.test(cleanUsername)) {
    return { success: false, error: 'Username can only contain letters, numbers, hyphens, and underscores' };
  }

  if (!password || password.length < 6) {
    return { success: false, error: 'Password must be at least 6 characters long' };
  }

  const existing = db.getUserByUsername(cleanUsername);
  if (existing) {
    return { success: false, error: 'Username is already taken. Please choose another.' };
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser = db.createUser(cleanUsername, passwordHash, 'USER');

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + SESSION_DURATION_DAYS);
  const session = db.createSession(newUser.id, expiresAt);

  db.addLog({
    level: 'INFO',
    category: 'AUTH',
    message: `New user '${newUser.username}' registered successfully`,
  });

  return {
    success: true,
    user: newUser,
    token: session.token,
  };
}

export async function authenticateOwner(password: string): Promise<{ success: boolean; user?: User; token?: string; error?: string }> {
  const ownerUsername = process.env.OWNER_USERNAME || 'admin';
  return authenticateUser(ownerUsername, password);
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
        { error: 'Unauthorized: User session required' },
        { status: 401 }
      ),
    };
  }

  return { user };
}
