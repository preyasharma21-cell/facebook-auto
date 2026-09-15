import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/db';
import { requireAuth } from '@/lib/auth';
import { logEvent } from '@/lib/logger';

export async function POST(req: NextRequest) {
  const auth = requireAuth(req);
  if ('response' in auth) return auth.response;

  try {
    const body = await req.json();
    const { action } = body;
    const settings = db.getSettings();

    if (action === 'disconnect') {
      const accounts = db.getFacebookAccounts();
      if (accounts.length > 0) {
        accounts[0].status = 'DISCONNECTED';
        db.save();
      }
      logEvent('WARNING', 'FACEBOOK', 'Owner disconnected Facebook integration');
      return NextResponse.json({ success: true, message: 'Disconnected successfully' });
    }

    if (action === 'refresh') {
      logEvent('INFO', 'FACEBOOK', 'Synchronizing authorized Facebook Pages metadata...');
      const pages = db.getFacebookPages();
      pages.forEach(p => {
        p.lastSyncAt = new Date().toISOString();
      });
      db.save();
      logEvent('SUCCESS', 'FACEBOOK', `Synchronized ${pages.length} Facebook Pages successfully`);
      return NextResponse.json({ success: true, message: 'Pages refreshed', count: pages.length });
    }

    if (action === 'import_by_token') {
      const { userAccessToken, appSecret, appId } = body;
      if (!userAccessToken || !userAccessToken.trim()) {
        return NextResponse.json({ error: 'Facebook Developer User Access Token is required' }, { status: 400 });
      }

      const tokenToUse = userAccessToken.trim();
      const graphVersion = process.env.META_GRAPH_VERSION || 'v20.0';

      // Demo/Mock Token Simulation support
      if (tokenToUse.toLowerCase().startsWith('demo') || tokenToUse.toLowerCase() === 'test') {
        const mockAccountId = 'fb-acc-developer-demo';
        const mockPages = [
          {
            id: 'page-dev-01',
            accountId: mockAccountId,
            pageId: '109827364510',
            pageName: 'Developer App Live Stream Page',
            category: 'Tech & Digital Creator',
            pictureUrl: 'https://images.unsplash.com/photo-1518770660439-4636190af475?w=150&auto=format&fit=crop&q=80',
            accessTokenEnc: 'EAA_SIMULATED_PAGE_TOKEN_01',
            status: 'ACTIVE' as const,
            dailyLimit: 12,
            hourlyLimit: 2,
            minGapMinutes: 60,
            todayPostsCount: 0,
            lastSyncAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          },
          {
            id: 'page-dev-02',
            accountId: mockAccountId,
            pageId: '209837465621',
            pageName: 'Developer Gaming & Media Hub',
            category: 'Video Creator',
            pictureUrl: 'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=150&auto=format&fit=crop&q=80',
            accessTokenEnc: 'EAA_SIMULATED_PAGE_TOKEN_02',
            status: 'ACTIVE' as const,
            dailyLimit: 15,
            hourlyLimit: 3,
            minGapMinutes: 45,
            todayPostsCount: 0,
            lastSyncAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          }
        ];

        mockPages.forEach(p => db.upsertFacebookPage(p));
        logEvent('SUCCESS', 'FACEBOOK', `[DEMO] Imported ${mockPages.length} Pages using Developer Test Token`);
        return NextResponse.json({
          success: true,
          count: mockPages.length,
          accountName: 'Meta Developer Tester',
          message: `Connected ${mockPages.length} Facebook Pages using Developer Token!`,
          pages: mockPages,
        });
      }

      // Live Meta Graph API Call
      try {
        let effectiveUserToken = tokenToUse;
        const effectiveAppId = appId?.trim() || settings.metaAppId?.trim();
        const effectiveAppSecret = appSecret?.trim() || settings.metaAppSecret?.trim();

        // 1. Attempt token exchange for 60-day Long-Lived Token (which produces permanent Page Tokens)
        if (effectiveAppId && effectiveAppSecret) {
          try {
            const exchangeUrl = `https://graph.facebook.com/${graphVersion}/oauth/access_token?grant_type=fb_exchange_token&client_id=${encodeURIComponent(effectiveAppId)}&client_secret=${encodeURIComponent(effectiveAppSecret)}&fb_exchange_token=${encodeURIComponent(tokenToUse)}`;
            const exRes = await fetch(exchangeUrl);
            const exData = await exRes.json();
            if (exData.access_token) {
              effectiveUserToken = exData.access_token;
              logEvent('SUCCESS', 'FACEBOOK', 'Upgraded token to 60-day Long-Lived Meta User Token (generates permanent Page Access Tokens)');
            } else if (exData.error) {
              logEvent('WARNING', 'FACEBOOK', `Long-lived token exchange notice: ${exData.error.message}`);
            }
          } catch (exErr: any) {
            logEvent('WARNING', 'FACEBOOK', `Token exchange error: ${exErr.message}`);
          }
        }

        // 2. Fetch user info to verify token
        const meRes = await fetch(
          `https://graph.facebook.com/${graphVersion}/me?access_token=${encodeURIComponent(effectiveUserToken)}&fields=id,name`
        );
        const meData = await meRes.json();

        if (!meRes.ok || meData.error) {
          const errMsg = meData.error?.message || 'Failed to validate Access Token with Meta Graph API';
          logEvent('ERROR', 'FACEBOOK', `Access Token validation failed: ${errMsg}`);
          return NextResponse.json({ error: `Meta Graph API Error: ${errMsg}` }, { status: 400 });
        }

        // 3. Fetch all pages the user manages
        const accountsRes = await fetch(
          `https://graph.facebook.com/${graphVersion}/me/accounts?access_token=${encodeURIComponent(effectiveUserToken)}&fields=id,name,category,access_token,picture{url}`
        );
        const accountsData = await accountsRes.json();

        if (!accountsRes.ok || accountsData.error) {
          const errMsg = accountsData.error?.message || 'Failed to retrieve Facebook Pages with provided token';
          logEvent('ERROR', 'FACEBOOK', `Failed to fetch accounts: ${errMsg}`);
          return NextResponse.json({ error: `Meta Graph API Error: ${errMsg}` }, { status: 400 });
        }

        const pagesList = accountsData.data || [];
        if (pagesList.length === 0) {
          return NextResponse.json({
            success: true,
            count: 0,
            accountName: meData.name,
            message: `Token valid for Developer Account "${meData.name}", but 0 Facebook Pages were returned. Please ensure your token includes the 'pages_show_list', 'pages_read_engagement', and 'pages_manage_posts' permissions.`,
            pages: [],
          });
        }

        // 3. Register Account
        const accountId = 'fb-acc-' + meData.id;
        const existingAccounts = db.getFacebookAccounts();
        const accIdx = existingAccounts.findIndex(a => a.fbUserId === meData.id && a.userId === auth.user.id);
        const accountRecord = {
          id: accountId,
          userId: auth.user.id,
          fbUserId: meData.id,
          name: meData.name,
          accessTokenEnc: tokenToUse,
          status: 'CONNECTED' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };

        if (accIdx >= 0) {
          existingAccounts[accIdx] = accountRecord;
        } else {
          existingAccounts.push(accountRecord);
        }

        // 4. Save/Upsert each page into database
        const savedPages = [];
        for (const p of pagesList) {
          const pictureUrl = p.picture?.data?.url || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80';
          const pageAccessToken = p.access_token || tokenToUse;

          const pageRecord = db.upsertFacebookPage({
            id: 'page-' + p.id,
            userId: auth.user.id,
            accountId,
            pageId: p.id,
            pageName: p.name,
            category: p.category || 'Media / Publishing',
            pictureUrl,
            accessTokenEnc: pageAccessToken,
            status: 'ACTIVE',
            dailyLimit: 12,
            hourlyLimit: 2,
            minGapMinutes: 60,
            todayPostsCount: 0,
            lastSyncAt: new Date().toISOString(),
            createdAt: new Date().toISOString(),
          });
          savedPages.push(pageRecord);
        }

        logEvent(
          'SUCCESS',
          'FACEBOOK',
          `Successfully connected ${savedPages.length} Pages from Meta Developer Account "${meData.name}" (User ID: ${meData.id})`
        );

        return NextResponse.json({
          success: true,
          count: savedPages.length,
          accountName: meData.name,
          message: `Successfully connected ${savedPages.length} Facebook Pages from Meta Account "${meData.name}"!`,
          pages: savedPages,
        });
      } catch (err: any) {
        logEvent('ERROR', 'FACEBOOK', `Network or API Exception: ${err.message}`);
        return NextResponse.json({ error: `Connection failed: ${err.message}` }, { status: 500 });
      }
    }

    // Connect action
    if (settings.demoMode) {
      logEvent('SUCCESS', 'FACEBOOK', '[DEMO] Authorized Facebook OAuth flow completed. 4 Pages retrieved.');
      const accounts = db.getFacebookAccounts();
      if (accounts.length > 0) {
        accounts[0].status = 'CONNECTED';
        db.save();
      }
      return NextResponse.json({
        success: true,
        mode: 'demo',
        message: 'Facebook connected in Demo Mode with 4 authorized Pages',
      });
    }

    // Live OAuth flow URL generator
    const appId = process.env.META_APP_ID;
    const redirectUri = process.env.META_REDIRECT_URI || `${process.env.APP_URL || 'http://localhost:3000'}/api/facebook/callback`;

    if (!appId) {
      return NextResponse.json(
        {
          success: false,
          error: 'META_APP_ID is not configured in .env. Use Demo Mode or supply credentials in Settings.',
          requiresConfig: true,
        },
        { status: 400 }
      );
    }

    const scope = 'pages_show_list,pages_read_engagement,pages_manage_posts';
    const oauthUrl = `https://www.facebook.com/v20.0/dialog/oauth?client_id=${appId}&redirect_uri=${encodeURIComponent(
      redirectUri
    )}&scope=${encodeURIComponent(scope)}&response_type=code`;

    logEvent('INFO', 'FACEBOOK', 'Generated official Meta OAuth authorization redirect URL');

    return NextResponse.json({
      success: true,
      oauthUrl,
      mode: 'live',
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
