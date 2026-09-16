'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  DownloadCloud,
  CheckCircle2,
  AlertCircle,
  Clock,
  Layers,
  Sparkles,
  ExternalLink,
  Key,
  ShieldCheck,
  X,
  FileText,
  Upload,
  Info
} from 'lucide-react';

interface FacebookPage {
  id: string;
  pageName: string;
  category?: string;
  pictureUrl?: string;
  status: string;
}

interface DownloadResult {
  url: string;
  success: boolean;
  mediaId?: string;
  filename?: string;
  title?: string;
  error?: string;
  scheduledJobId?: string;
}

interface PlatformAccountStatus {
  platform: string;
  status: 'CONNECTED' | 'DISCONNECTED';
  accountName: string | null;
  hasCookies: boolean;
  updatedAt: string | null;
}

const PLATFORMS_LIST = [
  { id: 'YOUTUBE', name: 'YouTube', color: '#ff0000', icon: '🔴', hint: 'Bypasses "Sign in to confirm you’re not a bot" on YouTube & Shorts.' },
  { id: 'TIKTOK', name: 'TikTok', color: '#00f2fe', icon: '⚫', hint: 'Bypasses TikTok bot & captcha challenges for 1080p downloads.' },
  { id: 'INSTAGRAM', name: 'Instagram', color: '#e1306c', icon: '🟣', hint: 'Allows downloading private/high-quality Reels & Stories.' },
  { id: 'SNAPCHAT', name: 'Snapchat', color: '#fffc00', icon: '🟡', hint: 'Connect Snapchat session for Spotlight video downloads.' },
  { id: 'KUAISHOU', name: 'Kuaishou (快手)', color: '#ff5000', icon: '🟠', hint: 'Connect session for Kwai / Kuaishou video feeds.' },
  { id: 'REDNOTE', name: 'RedNote (小红书)', color: '#ff2442', icon: '📕', hint: 'Bypasses Xiaohongshu web crawler login gates.' },
  { id: 'TWITTER', name: 'X / Twitter', color: '#1da1f2', icon: '🐦', hint: 'Bypasses rate-limiting on Twitter video posts.' },
];

export default function UniversalDownloaderPage() {
  const [pages, setPages] = useState<FacebookPage[]>([]);
  const [targetPageId, setTargetPageId] = useState<string>('');
  const [urlsInput, setUrlsInput] = useState<string>('');
  const [publishMode, setPublishMode] = useState<'SCHEDULE' | 'POST_NOW' | 'LIBRARY_ONLY'>('SCHEDULE');
  const [intervalMinutes, setIntervalMinutes] = useState<number>(60);
  const [caption, setCaption] = useState<string>('');
  const [hashtags, setHashtags] = useState<string>('#reels #viral #trending #video');
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [results, setResults] = useState<DownloadResult[]>([]);
  const [batchStats, setBatchStats] = useState<{ total: number; successful: number; failed: number } | null>(null);

  // Platform Accounts & Cookies state
  const [platformAccounts, setPlatformAccounts] = useState<PlatformAccountStatus[]>([]);
  const [activeModalPlatform, setActiveModalPlatform] = useState<string | null>(null);
  const [cookiesInput, setCookiesInput] = useState<string>('');
  const [accountNameInput, setAccountNameInput] = useState<string>('');
  const [isSavingCookies, setIsSavingCookies] = useState<boolean>(false);
  const [modalMessage, setModalMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const loadPlatformAccounts = () => {
    fetch('/api/social-accounts')
      .then(res => res.json())
      .then(data => {
        if (data.platforms) setPlatformAccounts(data.platforms);
      })
      .catch(() => {});
  };

  useEffect(() => {
    fetch('/api/facebook/pages')
      .then(res => res.json())
      .then(data => {
        if (data.pages && Array.isArray(data.pages)) {
          setPages(data.pages);
          if (data.pages.length > 0) {
            setTargetPageId(data.pages[0].id);
          }
        }
      })
      .catch(err => console.error('Failed to load pages', err));

    loadPlatformAccounts();
  }, []);

  const parsedUrls = urlsInput
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0 && (line.startsWith('http://') || line.startsWith('https://')));

  const handleStartDownload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (parsedUrls.length === 0) return;

    setIsProcessing(true);
    setResults([]);
    setBatchStats(null);

    try {
      const response = await fetch('/api/media/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          urls: parsedUrls,
          destinationPageId: publishMode !== 'LIBRARY_ONLY' ? targetPageId : undefined,
          publishMode,
          intervalMinutes,
          caption: caption.trim() || undefined,
          hashtags: hashtags.trim() || undefined,
        }),
      });

      if (response.status === 401) {
        alert('Session Expired: Please log in again to continue.');
        window.location.href = '/login';
        return;
      }

      const data = await response.json();

      if (data.results) {
        setResults(data.results);
        setBatchStats({
          total: data.total || parsedUrls.length,
          successful: data.successful || 0,
          failed: data.failed || 0,
        });
      } else if (data.error) {
        alert(`Download Error: ${data.error}`);
      }
    } catch (err: any) {
      alert(`Download request failed: ${err.message}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleConnectPlatform = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeModalPlatform) return;
    setIsSavingCookies(true);
    setModalMessage(null);

    try {
      const res = await fetch('/api/social-accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          platform: activeModalPlatform,
          accountName: accountNameInput || `${activeModalPlatform} User Session`,
          cookiesText: cookiesInput,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        setModalMessage({ type: 'error', text: data.error || 'Failed to save session' });
        setIsSavingCookies(false);
        return;
      }

      setModalMessage({ type: 'success', text: `Connected ${activeModalPlatform} session! Robot checks will be bypassed.` });
      loadPlatformAccounts();
      setTimeout(() => {
        setActiveModalPlatform(null);
        setCookiesInput('');
        setAccountNameInput('');
        setModalMessage(null);
      }, 1500);
    } catch (err: any) {
      setModalMessage({ type: 'error', text: err.message });
    } finally {
      setIsSavingCookies(false);
    }
  };

  const handleDisconnectPlatform = async (platform: string) => {
    if (!confirm(`Disconnect your ${platform} session?`)) return;
    try {
      await fetch(`/api/social-accounts?platform=${platform}`, { method: 'DELETE' });
      loadPlatformAccounts();
    } catch {}
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) setCookiesInput(content);
    };
    reader.readAsText(file);
  };

  const getPlatformInfo = (url: string) => {
    const l = url.toLowerCase();
    if (l.includes('youtube.com') || l.includes('youtu.be')) {
      return { name: 'YouTube', color: '#ff0000', icon: '🔴' };
    }
    if (l.includes('tiktok.com')) {
      return { name: 'TikTok', color: '#00f2fe', icon: '⚫' };
    }
    if (l.includes('instagram.com')) {
      return { name: 'Instagram', color: '#e1306c', icon: '🟣' };
    }
    if (l.includes('snapchat.com')) {
      return { name: 'Snapchat', color: '#fffc00', icon: '🟡' };
    }
    if (l.includes('kuaishou.com') || l.includes('kwai.com')) {
      return { name: 'Kuaishou (快手)', color: '#ff5000', icon: '🟠' };
    }
    if (l.includes('xiaohongshu.com') || l.includes('xhslink.com') || l.includes('rednote')) {
      return { name: 'RedNote (小红书)', color: '#ff2442', icon: '📕' };
    }
    if (l.includes('twitter.com') || l.includes('x.com')) {
      return { name: 'X / Twitter', color: '#1da1f2', icon: '🐦' };
    }
    return { name: 'Direct MP4', color: '#10b981', icon: '🎬' };
  };

  return (
    <AppShell>
      {/* Header Banner */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
          <div>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <DownloadCloud size={26} color="var(--primary)" />
              Universal Video Downloader & Auto-Scheduler
            </h1>
            <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
              Download and auto-schedule videos from YouTube, TikTok, Instagram, Snapchat, Kwai, RedNote, or X directly to your Facebook Pages 24/7.
            </p>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            <a href="/queue" className="btn btn-secondary" style={{ fontSize: '13px' }}>
              <Clock size={15} />
              <span>View Queue</span>
            </a>
            <a href="/library" className="btn btn-secondary" style={{ fontSize: '13px' }}>
              <Layers size={15} />
              <span>Media Library</span>
            </a>
          </div>
        </div>
      </div>

      {/* Connected Social Platforms & Anti-Bot Sessions Vault */}
      <div className="glass-card" style={{
        marginBottom: '24px',
        border: '1px solid rgba(6, 182, 212, 0.25)',
        background: 'linear-gradient(180deg, rgba(6, 182, 212, 0.05) 0%, rgba(15, 23, 42, 0.4) 100%)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '10px', marginBottom: '14px' }}>
          <div>
            <h2 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={18} color="var(--primary)" />
              Connected Social Platforms (Anti-Bot Bypass Vault)
            </h2>
            <p style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Connect your platform accounts/sessions to bypass YouTube "Sign in to confirm you’re not a bot" and TikTok challenges.
            </p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px' }}>
          {PLATFORMS_LIST.map(item => {
            const acc = platformAccounts.find(a => a.platform === item.id);
            const isConnected = acc?.status === 'CONNECTED';

            return (
              <div key={item.id} style={{
                padding: '12px 14px',
                borderRadius: '12px',
                background: isConnected ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                border: isConnected ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.08)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                gap: '10px',
                transition: 'all 0.2s ease'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span>{item.icon}</span>
                    <span>{item.name}</span>
                  </span>
                  <span style={{
                    fontSize: '10.5px',
                    fontWeight: 600,
                    padding: '2px 8px',
                    borderRadius: '10px',
                    background: isConnected ? 'rgba(16, 185, 129, 0.2)' : 'rgba(148, 163, 184, 0.12)',
                    color: isConnected ? '#34d399' : '#94a3b8'
                  }}>
                    {isConnected ? '✓ Connected' : 'Not Connected'}
                  </span>
                </div>

                <div style={{ display: 'flex', gap: '6px' }}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveModalPlatform(item.id);
                      setCookiesInput('');
                      setAccountNameInput(acc?.accountName || '');
                      setModalMessage(null);
                    }}
                    className="btn btn-secondary"
                    style={{ flex: 1, fontSize: '11.5px', padding: '5px 8px', height: '30px', justifyContent: 'center' }}
                  >
                    <Key size={12} />
                    <span>{isConnected ? 'Update Session' : 'Connect Session'}</span>
                  </button>
                  {isConnected && (
                    <button
                      type="button"
                      onClick={() => handleDisconnectPlatform(item.id)}
                      className="btn btn-secondary"
                      style={{ fontSize: '11.5px', padding: '5px 8px', height: '30px', color: '#f87171' }}
                      title="Disconnect Account"
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Main Grid: Form Left, Real-time Tracker Right */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '24px' }}>
        {/* Input Form Card */}
        <div className="glass-card">
          <h2 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', marginBottom: '6px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={18} color="var(--primary)" />
            Paste Links & Configure Automation
          </h2>
          <p style={{ fontSize: '12.5px', color: 'var(--text-muted)', marginBottom: '20px' }}>
            Enter one video URL per line. Mix links from YouTube, TikTok, Instagram, Snapchat, Kuaishou, RedNote, etc.
          </p>

          <form onSubmit={handleStartDownload} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Target Facebook Page */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Target Facebook Page:
              </label>
              {pages.length > 0 ? (
                <>
                  <select
                    value={targetPageId}
                    onChange={e => setTargetPageId(e.target.value)}
                    className="input-control"
                    style={{ height: '42px', fontSize: '13.5px' }}
                  >
                    {pages.map(page => (
                      <option key={page.id} value={page.id}>
                        {page.pageName} ({page.category || 'General'})
                      </option>
                    ))}
                  </select>
                  <p style={{ fontSize: '11.5px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Downloaded videos will be automatically scheduled or posted to this Page.
                  </p>
                </>
              ) : (
                <div style={{ padding: '12px 14px', background: 'rgba(234, 179, 8, 0.12)', border: '1px solid rgba(234, 179, 8, 0.3)', borderRadius: 'var(--radius-md)', color: '#fde047', fontSize: '13px' }}>
                  No active Facebook Pages connected. You can still download to your <strong>Media Library</strong>, or go to <a href="/pages" style={{ textDecoration: 'underline', fontWeight: 700 }}>Facebook Pages</a> to connect one.
                </div>
              )}
            </div>

            {/* Video URLs Input Area */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Video URLs (Bulk Paste Allowed):
                </label>
                <span style={{ fontSize: '11.5px', color: parsedUrls.length > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {parsedUrls.length} valid URL{parsedUrls.length === 1 ? '' : 's'} detected
                </span>
              </div>
              <textarea
                value={urlsInput}
                onChange={e => setUrlsInput(e.target.value)}
                placeholder="https://www.youtube.com/shorts/...&#10;https://www.tiktok.com/@creator/video/...&#10;https://www.instagram.com/reel/...&#10;https://www.kuaishou.com/short-video/..."
                rows={6}
                className="input-control"
                style={{
                  fontFamily: 'monospace',
                  fontSize: '12.5px',
                  lineHeight: '1.6',
                  resize: 'vertical',
                  padding: '12px'
                }}
              />
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '6px', fontSize: '11.5px', color: 'var(--text-muted)' }}>
                <span>One URL per line. Direct downloads from TikTok, Shorts & Reels.</span>
                {urlsInput.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setUrlsInput('')}
                    style={{ background: 'none', border: 'none', color: '#f87171', cursor: 'pointer', fontSize: '11.5px' }}
                  >
                    Clear Links
                  </button>
                )}
              </div>
            </div>

            {/* Publish Mode Options */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Automation Mode:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px' }}>
                <div
                  onClick={() => setPublishMode('SCHEDULE')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: publishMode === 'SCHEDULE' ? '1.5px solid var(--primary)' : '1px solid var(--border-subtle)',
                    background: publishMode === 'SCHEDULE' ? 'rgba(6, 182, 212, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: publishMode === 'SCHEDULE' ? 'var(--primary)' : '#ffffff' }}>
                    Auto-Schedule
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Stagger into queue
                  </div>
                </div>

                <div
                  onClick={() => setPublishMode('POST_NOW')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: publishMode === 'POST_NOW' ? '1.5px solid #10b981' : '1px solid var(--border-subtle)',
                    background: publishMode === 'POST_NOW' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: publishMode === 'POST_NOW' ? '#10b981' : '#ffffff' }}>
                    Post Now
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Publish immediately
                  </div>
                </div>

                <div
                  onClick={() => setPublishMode('LIBRARY_ONLY')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: publishMode === 'LIBRARY_ONLY' ? '1.5px solid #a855f7' : '1px solid var(--border-subtle)',
                    background: publishMode === 'LIBRARY_ONLY' ? 'rgba(168, 85, 247, 0.12)' : 'rgba(255, 255, 255, 0.02)',
                    cursor: 'pointer',
                    textAlign: 'center',
                    transition: 'all 0.2s ease'
                  }}
                >
                  <div style={{ fontSize: '13px', fontWeight: 700, color: publishMode === 'LIBRARY_ONLY' ? '#a855f7' : '#ffffff' }}>
                    Library Only
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '2px' }}>
                    Save without posting
                  </div>
                </div>
              </div>
            </div>

            {/* Stagger Interval (if scheduled) */}
            {publishMode === 'SCHEDULE' && (
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Stagger Interval Between Posts:
                </label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[15, 30, 60, 120, 240].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setIntervalMinutes(mins)}
                      style={{
                        flex: 1,
                        padding: '6px',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: 600,
                        border: intervalMinutes === mins ? '1px solid var(--primary)' : '1px solid var(--border-subtle)',
                        background: intervalMinutes === mins ? 'var(--primary)' : 'transparent',
                        color: intervalMinutes === mins ? '#000000' : 'var(--text-secondary)',
                        cursor: 'pointer'
                      }}
                    >
                      {mins >= 60 ? `${mins / 60}h` : `${mins}m`}
                    </button>
                  ))}
                </div>
                <p style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '6px' }}>
                  1st video scheduled in {intervalMinutes}m, 2nd video in {intervalMinutes * 2}m, etc.
                </p>
              </div>
            )}

            {/* Caption & Hashtags Template */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Default Caption Template:
              </label>
              <input
                type="text"
                value={caption}
                onChange={e => setCaption(e.target.value)}
                placeholder="Leave blank to use original video title"
                className="input-control"
                style={{ height: '38px', fontSize: '13px' }}
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Default Hashtags:
              </label>
              <input
                type="text"
                value={hashtags}
                onChange={e => setHashtags(e.target.value)}
                className="input-control"
                style={{ height: '38px', fontSize: '13px' }}
              />
            </div>

            {/* Action Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || parsedUrls.length === 0}
              className="btn btn-primary"
              style={{
                height: '46px',
                fontSize: '14.5px',
                fontWeight: 700,
                marginTop: '10px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px'
              }}
            >
              {isProcessing ? (
                <>
                  <div className="spinner-border" style={{ width: '16px', height: '16px' }} />
                  <span>Downloading & Processing ({parsedUrls.length} links)...</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={18} />
                  <span>Start Automated Download ({parsedUrls.length} Links)</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Real-Time Processing & Execution Tracker */}
        <div>
          <div className="glass-card" style={{ minHeight: '400px' }}>
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span>Live Batch Progress</span>
              {batchStats && (
                <span style={{ fontSize: '12px', fontWeight: 600, color: batchStats.failed > 0 ? '#fbbf24' : '#34d399' }}>
                  {batchStats.successful} / {batchStats.total} Successful
                </span>
              )}
            </h2>

            {/* Processing Loading Indicator */}
            {isProcessing && (
              <div style={{
                padding: '20px',
                borderRadius: 'var(--radius-md)',
                background: 'rgba(6, 182, 212, 0.08)',
                border: '1px solid rgba(6, 182, 212, 0.25)',
                textAlign: 'center',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '20px', marginBottom: '8px' }}>⚡</div>
                <div style={{ fontSize: '13.5px', fontWeight: 700, color: '#ffffff' }}>
                  Downloading in Background
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  Server is downloading, extracting titles, and merging audio/video streams...
                </div>
              </div>
            )}

            {/* Empty State */}
            {!isProcessing && results.length === 0 && (
              <div style={{
                padding: '50px 20px',
                textAlign: 'center',
                color: 'var(--text-muted)'
              }}>
                <DownloadCloud size={44} color="var(--border-subtle)" style={{ margin: '0 auto 12px' }} />
                <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  No active downloads
                </div>
                <div style={{ fontSize: '12px', marginTop: '4px' }}>
                  Paste URLs on the left and click start to watch live ingestion.
                </div>
              </div>
            )}

            {/* Download Results List */}
            {results.length > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.map((res, index) => {
                  const plat = getPlatformInfo(res.url);

                  return (
                    <div
                      key={index}
                      style={{
                        padding: '12px 14px',
                        borderRadius: 'var(--radius-md)',
                        background: res.success ? 'rgba(16, 185, 129, 0.06)' : 'rgba(239, 68, 68, 0.06)',
                        border: res.success ? '1px solid rgba(16, 185, 129, 0.25)' : '1px solid rgba(239, 68, 68, 0.25)',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#ffffff', minWidth: 0 }}>
                          <span>{plat.icon}</span>
                          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {res.title || res.filename || res.url}
                          </span>
                        </div>

                        {res.success ? (
                          <span style={{ fontSize: '11px', color: '#34d399', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                            <CheckCircle2 size={13} />
                            <span>Done</span>
                          </span>
                        ) : (
                          <span style={{ fontSize: '11px', color: '#f87171', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
                            <AlertCircle size={13} />
                            <span>Failed</span>
                          </span>
                        )}
                      </div>

                      {res.error && (
                        <div style={{ fontSize: '11px', color: 'var(--danger)', marginTop: '4px', wordBreak: 'break-all' }}>
                          {res.error}
                        </div>
                      )}

                      {res.success && (
                        <div style={{ display: 'flex', gap: '10px', marginTop: '6px', fontSize: '11.5px' }}>
                          {res.scheduledJobId && (
                            <a href="/queue" style={{ color: 'var(--primary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '3px' }}>
                              <span>View in Schedule Queue</span>
                              <ExternalLink size={10} />
                            </a>
                          )}
                          <a href="/library" style={{ color: 'var(--text-secondary)', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '3px' }}>
                            <span>Open in Library</span>
                            <ExternalLink size={10} />
                          </a>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Platform Connect Modal */}
      {activeModalPlatform && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0, 0, 0, 0.75)',
          backdropFilter: 'blur(6px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <div className="glass-card" style={{
            width: '100%',
            maxWidth: '520px',
            padding: '28px',
            border: '1px solid rgba(255, 255, 255, 0.15)',
            boxShadow: '0 25px 60px rgba(0, 0, 0, 0.8)'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '18px' }}>
              <h3 style={{ fontSize: '17px', fontWeight: 700, color: '#ffffff', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Key size={18} color="var(--primary)" />
                Connect {activeModalPlatform} Account Session
              </h3>
              <button
                type="button"
                onClick={() => setActiveModalPlatform(null)}
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}
              >
                <X size={20} />
              </button>
            </div>

            {modalMessage && (
              <div style={{
                padding: '10px 14px',
                borderRadius: '8px',
                fontSize: '12.5px',
                marginBottom: '16px',
                background: modalMessage.type === 'success' ? 'rgba(16, 185, 129, 0.15)' : 'rgba(239, 68, 68, 0.15)',
                color: modalMessage.type === 'success' ? '#6ee7b7' : '#fca5a5',
                border: modalMessage.type === 'success' ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(239, 68, 68, 0.3)',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {modalMessage.type === 'success' ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{modalMessage.text}</span>
              </div>
            )}

            <div style={{
              background: 'rgba(6, 182, 212, 0.08)',
              border: '1px solid rgba(6, 182, 212, 0.2)',
              borderRadius: '8px',
              padding: '12px',
              marginBottom: '16px',
              fontSize: '12px',
              color: 'var(--text-secondary)',
              lineHeight: '1.5'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                <Info size={14} />
                <span>How to connect in 15 seconds:</span>
              </div>
              <ol style={{ paddingLeft: '18px', margin: 0 }}>
                <li>Open <strong>{activeModalPlatform}</strong> in your browser (make sure you are logged in).</li>
                <li>Use any free cookie extension (e.g. <em>"Get cookies.txt LOCALLY"</em> or <em>"Cookie-Editor"</em>).</li>
                <li>Click <strong>Export / Copy</strong> and paste the cookies text below, OR upload the <code>cookies.txt</code> file.</li>
              </ol>
            </div>

            <form onSubmit={handleConnectPlatform} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Account Label / Nickname:
                </label>
                <input
                  type="text"
                  value={accountNameInput}
                  onChange={e => setAccountNameInput(e.target.value)}
                  placeholder={`My ${activeModalPlatform} Account`}
                  className="input-control"
                  style={{ height: '38px', fontSize: '13px' }}
                />
              </div>

              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                  <label style={{ fontSize: '12px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Paste Session Cookies (Netscape / Header format):
                  </label>
                  <label style={{ fontSize: '11px', color: 'var(--primary)', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Upload size={12} />
                    <span>Upload .txt file</span>
                    <input type="file" accept=".txt" onChange={handleFileUpload} style={{ display: 'none' }} />
                  </label>
                </div>
                <textarea
                  value={cookiesInput}
                  onChange={e => setCookiesInput(e.target.value)}
                  placeholder="# Netscape HTTP Cookie File&#10;.youtube.com    TRUE    /    TRUE    ...&#10;OR paste raw cookie string here"
                  rows={6}
                  required
                  className="input-control"
                  style={{ fontFamily: 'monospace', fontSize: '11.5px', resize: 'vertical', padding: '10px' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                <button
                  type="button"
                  onClick={() => setActiveModalPlatform(null)}
                  className="btn btn-secondary"
                  style={{ fontSize: '13px' }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingCookies || !cookiesInput.trim()}
                  className="btn btn-primary"
                  style={{ fontSize: '13px', display: 'flex', alignItems: 'center', gap: '6px' }}
                >
                  <Key size={14} />
                  <span>{isSavingCookies ? 'Connecting Session...' : 'Save & Connect Session'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
