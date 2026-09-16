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

function normalizeToNetscape(rawText: string, platform: string): string {
  const defaultDomain =
    platform === 'YOUTUBE' ? '.youtube.com' :
    platform === 'TIKTOK' ? '.tiktok.com' :
    platform === 'INSTAGRAM' ? '.instagram.com' :
    platform === 'SNAPCHAT' ? '.snapchat.com' :
    platform === 'KUAISHOU' ? '.kuaishou.com' :
    platform === 'REDNOTE' ? '.xiaohongshu.com' : '.twitter.com';

  const trimmed = rawText.trim();

  // 1. Try parsing JSON (from extensions like Cookie-Editor / EditThisCookie)
  try {
    if (trimmed.startsWith('[') || trimmed.startsWith('{')) {
      const parsed = JSON.parse(trimmed);
      const list = Array.isArray(parsed) ? parsed : [parsed];
      const lines = ['# Netscape HTTP Cookie File', `# AutoPilot Pro Converted for ${platform}`];
      for (const item of list) {
        const domain = item.domain || defaultDomain;
        const flag = domain.startsWith('.') ? 'TRUE' : 'FALSE';
        const path = item.path || '/';
        const secure = item.secure ? 'TRUE' : 'FALSE';
        const exp = item.expirationDate ? Math.floor(item.expirationDate).toString() : '2147483647';
        const name = item.name;
        const value = item.value || '';
        if (name) {
          lines.push(`${domain}\t${flag}\t${path}\t${secure}\t${exp}\t${name}\t${value}`);
        }
      }
      return lines.join('\n') + '\n';
    }
  } catch {}

  // 2. Check if already Netscape format (tab-separated lines with 7 columns)
  const lines = trimmed.split('\n').map(l => l.trim()).filter(Boolean);
  const netscapeLines = lines.filter(l => !l.startsWith('#') && l.split('\t').length >= 7);
  if (netscapeLines.length > 0) {
    if (!trimmed.startsWith('# Netscape HTTP Cookie File')) {
      return `# Netscape HTTP Cookie File\n${trimmed}\n`;
    }
    return trimmed + '\n';
  }

  // 3. Fallback: Parse semicolon-delimited key=value header string (e.g. document.cookie or Cookie header)
  const netscapeOutput = ['# Netscape HTTP Cookie File', `# AutoPilot Pro Converted for ${platform}`];
  const pairs = trimmed.replace(/[\r\n]+/g, ' ').split(';');
  for (const pair of pairs) {
    const eqIdx = pair.indexOf('=');
    if (eqIdx > 0) {
      const name = pair.slice(0, eqIdx).trim();
      const val = pair.slice(eqIdx + 1).trim();
      if (name) {
        netscapeOutput.push(`${defaultDomain}\tTRUE\t/\tTRUE\t2147483647\t${name}\t${val}`);
      }
    }
  }
  return netscapeOutput.join('\n') + '\n';
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

    // Convert any cookie format (Netscape, JSON, Header string) to valid Netscape format for yt-dlp
    const cleanCookies = normalizeToNetscape(cookiesText, platform);

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
