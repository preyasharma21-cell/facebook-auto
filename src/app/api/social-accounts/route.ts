import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';
import { SocialPlatformType } from '@/types';

const COOKIES_DIR = path.join(process.cwd(), 'data', 'cookies');

function ensureCookiesDir() {
  if (!fs.existsSync(COOKIES_DIR)) {
    fs.mkdirSync(COOKIES_DIR, { recursive: true });
  }
}

export async function GET(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const connectedAccounts = db.getPlatformAccountsForUser(auth.user.id);
  const platforms: SocialPlatformType[] = ['YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'SNAPCHAT', 'KUAISHOU', 'REDNOTE', 'TWITTER'];

  const result = platforms.map(p => {
    const acc = connectedAccounts.find(a => a.platform === p);
    return {
      platform: p,
      status: acc?.status || 'DISCONNECTED',
      accountName: acc?.accountName || null,
      hasCookies: acc?.hasCookies || false,
      updatedAt: acc?.updatedAt || null,
    };
  });

  return NextResponse.json({
    platforms: result,
  });
}

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { platform, accountName, cookiesText } = body;

    if (!platform) {
      return NextResponse.json({ error: 'Platform identifier is required' }, { status: 400 });
    }

    if (!cookiesText || typeof cookiesText !== 'string' || cookiesText.trim().length < 10) {
      return NextResponse.json({ error: 'Valid cookies or session data is required' }, { status: 400 });
    }

    ensureCookiesDir();
    const cookieFileName = `${auth.user.id}_${platform.toLowerCase()}.txt`;
    const cookieFilePath = path.join(COOKIES_DIR, cookieFileName);

    // Write cookies file in standard Netscape format
    let cleanCookies = cookiesText.trim();
    if (!cleanCookies.startsWith('# Netscape HTTP Cookie File')) {
      cleanCookies = `# Netscape HTTP Cookie File\n# AutoPilot Pro Session for ${platform}\n\n${cleanCookies}`;
    }

    fs.writeFileSync(cookieFilePath, cleanCookies, 'utf-8');

    const account = db.savePlatformAccount({
      userId: auth.user.id,
      platform: platform as SocialPlatformType,
      accountName: accountName?.trim() || `${platform} User Session`,
      hasCookies: true,
      status: 'CONNECTED',
    });

    logEvent('SUCCESS', 'AUTH', `User '${auth.user.username}' connected ${platform} account session with active cookies`);

    return NextResponse.json({
      success: true,
      account,
      message: `${platform} account connected successfully! Bot challenges will be bypassed.`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  const { searchParams } = new URL(req.url);
  const platform = searchParams.get('platform') as SocialPlatformType;

  if (!platform) {
    return NextResponse.json({ error: 'Platform identifier is required' }, { status: 400 });
  }

  ensureCookiesDir();
  const cookieFileName = `${auth.user.id}_${platform.toLowerCase()}.txt`;
  const cookieFilePath = path.join(COOKIES_DIR, cookieFileName);

  if (fs.existsSync(cookieFilePath)) {
    try {
      fs.unlinkSync(cookieFilePath);
    } catch {}
  }

  db.disconnectPlatformAccount(auth.user.id, platform);
  logEvent('INFO', 'AUTH', `User '${auth.user.username}' disconnected ${platform} account`);

  return NextResponse.json({
    success: true,
    message: `${platform} account disconnected successfully`,
  });
}
