'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  DownloadCloud,
  Youtube,
  Instagram,
  CheckCircle2,
  AlertCircle,
  Clock,
  Send,
  FolderPlus,
  Layers,
  Sparkles,
  ExternalLink,
  RefreshCw,
  Sliders,
  PlayCircle
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
              Paste links from YouTube, TikTok, Instagram Reels, Kuaishou, RedNote (Xiaohongshu), X, or direct MP4 URLs. The server downloads the media files and automatically schedules or posts them directly to your Facebook Pages.
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

        {/* Supported Platforms Badges */}
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '16px' }}>
          <div className="badge" style={{ background: 'rgba(255, 0, 0, 0.12)', color: '#ff4d4d', border: '1px solid rgba(255, 0, 0, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            🔴 YouTube (Shorts & Videos)
          </div>
          <div className="badge" style={{ background: 'rgba(0, 242, 254, 0.12)', color: '#38bdf8', border: '1px solid rgba(0, 242, 254, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            ⚫ TikTok (No Watermark)
          </div>
          <div className="badge" style={{ background: 'rgba(225, 48, 108, 0.12)', color: '#f472b6', border: '1px solid rgba(225, 48, 108, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            🟣 Instagram (Reels & Clips)
          </div>
          <div className="badge" style={{ background: 'rgba(255, 80, 0, 0.12)', color: '#fb923c', border: '1px solid rgba(255, 80, 0, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            🟠 Kuaishou (快手)
          </div>
          <div className="badge" style={{ background: 'rgba(255, 36, 66, 0.12)', color: '#f87171', border: '1px solid rgba(255, 36, 66, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            📕 RedNote (小红书 Xiaohongshu)
          </div>
          <div className="badge" style={{ background: 'rgba(29, 161, 242, 0.12)', color: '#60a5fa', border: '1px solid rgba(29, 161, 242, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            🐦 X / Twitter
          </div>
          <div className="badge" style={{ background: 'rgba(16, 185, 129, 0.12)', color: '#34d399', border: '1px solid rgba(16, 185, 129, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 600 }}>
            🌐 Direct MP4 / Video Links
          </div>
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
            Enter one video URL per line. You can mix links from YouTube, TikTok, Instagram, Kuaishou, RedNote, etc.
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
                        {page.pageName} ({page.category || 'Facebook Page'}) {page.status === 'TOKEN_EXPIRED' ? '⚠️ [TOKEN EXPIRED]' : ''}
                      </option>
                    ))}
                  </select>

                  {pages.find(p => p.id === targetPageId)?.status === 'TOKEN_EXPIRED' && (
                    <div style={{ marginTop: '8px', padding: '10px 14px', borderRadius: 'var(--radius-sm)', background: 'rgba(239, 68, 68, 0.12)', border: '1px solid rgba(239, 68, 68, 0.3)', fontSize: '12px', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '8px' }}>
                      <span>⚠️ <strong>Meta Token Expired:</strong> Videos will download to Library, but Facebook will reject posting until you update your token.</span>
                      <a href="/pages" style={{ color: '#ffffff', background: 'var(--danger)', padding: '4px 8px', borderRadius: '4px', textDecoration: 'none', fontWeight: 600, fontSize: '11px', whiteSpace: 'nowrap' }}>
                        Update Token →
                      </a>
                    </div>
                  )}
                </>
              ) : (
                <div style={{ padding: '12px', borderRadius: 'var(--radius-sm)', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid rgba(245, 158, 11, 0.3)', fontSize: '12.5px', color: '#fde68a', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <span>No Facebook Pages connected yet.</span>
                  <a href="/pages" style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'underline' }}>
                    Connect Page →
                  </a>
                </div>
              )}
            </div>

            {/* Publishing Mode Selection */}
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '8px' }}>
                Publishing Action:
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <button
                  type="button"
                  onClick={() => setPublishMode('SCHEDULE')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${publishMode === 'SCHEDULE' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    background: publishMode === 'SCHEDULE' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}>
                    <Clock size={15} color="var(--primary)" />
                    <span>Auto-Schedule</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Queue with intervals
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishMode('POST_NOW')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${publishMode === 'POST_NOW' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    background: publishMode === 'POST_NOW' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}>
                    <Send size={15} color="#10b981" />
                    <span>Post Immediately</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Post right after download
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setPublishMode('LIBRARY_ONLY')}
                  style={{
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: `1.5px solid ${publishMode === 'LIBRARY_ONLY' ? 'var(--primary)' : 'var(--border-subtle)'}`,
                    background: publishMode === 'LIBRARY_ONLY' ? 'rgba(59, 130, 246, 0.15)' : 'var(--bg-surface)',
                    color: '#ffffff',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.2s',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 700, fontSize: '13px' }}>
                    <FolderPlus size={15} color="#f59e0b" />
                    <span>Library Only</span>
                  </div>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px' }}>
                    Save without scheduling
                  </div>
                </button>
              </div>
            </div>

            {/* Schedule Interval (if Auto-Schedule selected) */}
            {publishMode === 'SCHEDULE' && (
              <div style={{ background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                  <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                    Posting Interval Gap:
                  </label>
                  <span style={{ fontSize: '12px', color: 'var(--primary)', fontWeight: 700 }}>
                    Every {intervalMinutes} minutes
                  </span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  {[15, 30, 45, 60, 120, 240].map(mins => (
                    <button
                      key={mins}
                      type="button"
                      onClick={() => setIntervalMinutes(mins)}
                      className={`btn ${intervalMinutes === mins ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, padding: '6px 0', fontSize: '11.5px', height: '32px' }}
                    >
                      {mins < 60 ? `${mins}m` : `${mins / 60}h`}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* URL Input Box */}
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px' }}>
                <label style={{ fontSize: '12.5px', fontWeight: 600, color: 'var(--text-secondary)' }}>
                  Video Links (one per line):
                </label>
                <span style={{ fontSize: '11.5px', color: parsedUrls.length > 0 ? 'var(--primary)' : 'var(--text-muted)', fontWeight: 600 }}>
                  {parsedUrls.length} valid URL(s) detected
                </span>
              </div>
              <textarea
                rows={7}
                placeholder={`https://www.youtube.com/shorts/dQw4w9WgXcQ
https://www.tiktok.com/@creator/video/1234567890
https://www.instagram.com/reel/C8xyz123/
https://www.kuaishou.com/short-video/xyz
https://www.xiaohongshu.com/discovery/item/xyz
https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4`}
                value={urlsInput}
                onChange={e => setUrlsInput(e.target.value)}
                className="input-control font-mono"
                style={{ fontSize: '12px', lineHeight: 1.6 }}
              />
            </div>

            {/* Optional Captions & Tags */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Custom Caption Override (Optional)
                </label>
                <input
                  type="text"
                  placeholder="Leave empty to use source video title"
                  value={caption}
                  onChange={e => setCaption(e.target.value)}
                  className="input-control"
                  style={{ fontSize: '12px' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>
                  Hashtags
                </label>
                <input
                  type="text"
                  placeholder="#reels #viral #trending"
                  value={hashtags}
                  onChange={e => setHashtags(e.target.value)}
                  className="input-control"
                  style={{ fontSize: '12px' }}
                />
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isProcessing || parsedUrls.length === 0 || (publishMode !== 'LIBRARY_ONLY' && !targetPageId)}
              className="btn btn-primary"
              style={{ height: '46px', fontSize: '14px', fontWeight: 700 }}
            >
              {isProcessing ? (
                <>
                  <RefreshCw size={18} className="animate-spin" />
                  <span>Downloading & Processing Videos ({parsedUrls.length})...</span>
                </>
              ) : (
                <>
                  <DownloadCloud size={18} />
                  <span>
                    {publishMode === 'SCHEDULE' && `Download & Auto-Schedule (${parsedUrls.length} Videos)`}
                    {publishMode === 'POST_NOW' && `Download & Post Immediately (${parsedUrls.length} Videos)`}
                    {publishMode === 'LIBRARY_ONLY' && `Download to Library Only (${parsedUrls.length} Videos)`}
                  </span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Live Execution & Results Tracker Right */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {/* Telemetry Stats */}
          <div className="glass-card">
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '12px' }}>
              Ingestion Telemetry
            </h3>

            {batchStats ? (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '10px' }}>
                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Total Submitted</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: '#ffffff', marginTop: '2px' }}>
                    {batchStats.total}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(16, 185, 129, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--success)' }}>Successful</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--success)', marginTop: '2px' }}>
                    {batchStats.successful}
                  </div>
                </div>

                <div style={{ padding: '12px', background: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid rgba(239, 68, 68, 0.2)', textAlign: 'center' }}>
                  <div style={{ fontSize: '11px', color: 'var(--danger)' }}>Failed</div>
                  <div style={{ fontSize: '22px', fontWeight: 800, color: 'var(--danger)', marginTop: '2px' }}>
                    {batchStats.failed}
                  </div>
                </div>
              </div>
            ) : (
              <div style={{ padding: '24px 16px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '13px' }}>
                {isProcessing ? (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                    <RefreshCw size={24} color="var(--primary)" className="animate-spin" />
                    <span>Executing yt-dlp & FFmpeg pipeline on server...</span>
                  </div>
                ) : (
                  <span>Paste video links on the left and start download to see real-time progress.</span>
                )}
              </div>
            )}
          </div>

          {/* Results List */}
          <div className="glass-card" style={{ flex: 1, minHeight: '340px', overflowY: 'auto' }}>
            <h3 style={{ fontSize: '15px', fontWeight: 700, color: '#ffffff', marginBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Download & Queue Status</span>
              {results.length > 0 && (
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                  {results.length} processed
                </span>
              )}
            </h3>

            {results.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)', fontSize: '13px' }}>
                <PlayCircle size={36} color="var(--border-subtle)" style={{ margin: '0 auto 12px' }} />
                No downloads executed in this session yet.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {results.map((res, idx) => {
                  const plat = getPlatformInfo(res.url);
                  return (
                    <div
                      key={idx}
                      style={{
                        padding: '12px 14px',
                        background: 'var(--bg-surface)',
                        borderRadius: 'var(--radius-md)',
                        border: `1px solid ${res.success ? 'var(--border-subtle)' : 'rgba(239, 68, 68, 0.3)'}`,
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '4px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontSize: '13px' }}>{plat.icon}</span>
                          <span style={{ fontSize: '11px', fontWeight: 700, color: plat.color }}>
                            {plat.name}
                          </span>
                        </div>

                        {res.success ? (
                          <span className="badge badge-success" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <CheckCircle2 size={12} />
                            {publishMode === 'SCHEDULE' ? 'Scheduled' : publishMode === 'POST_NOW' ? 'Publishing' : 'In Library'}
                          </span>
                        ) : (
                          <span className="badge badge-danger" style={{ fontSize: '11px', display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <AlertCircle size={12} />
                            Failed
                          </span>
                        )}
                      </div>

                      <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                        {res.title || res.filename || res.url}
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
    </AppShell>
  );
}
