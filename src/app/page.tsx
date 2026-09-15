'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import {
  Facebook,
  Film,
  ListOrdered,
  CalendarCheck,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  TrendingUp,
  Clock,
  ArrowUpRight,
  UploadCloud,
  Play,
  RefreshCw,
  Sliders,
  ChevronRight
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = () => {
    fetch('/api/dashboard/stats')
      .then(res => {
        if (res.status === 401) {
          window.location.href = '/login';
          return;
        }
        return res.json();
      })
      .then(d => {
        if (d) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    fetchDashboard();
    const interval = setInterval(fetchDashboard, 6000);
    return () => clearInterval(interval);
  }, []);

  const stats = data?.stats || {
    connectedPages: 4,
    totalVideos: 3,
    queued: 2,
    scheduledToday: 2,
    publishedToday: 2,
    failed: 0,
    currentlyProcessing: 0,
    successRate: 100,
    publishingActivity: [
      { date: '09/08', published: 4, failed: 0 },
      { date: '09/09', published: 6, failed: 0 },
      { date: '09/10', published: 8, failed: 1 },
      { date: '09/11', published: 5, failed: 0 },
      { date: '09/12', published: 7, failed: 0 },
      { date: '09/13', published: 9, failed: 0 },
      { date: '09/14', published: 3, failed: 0 },
    ],
    videosByPage: [
      { pageName: 'Daily Motivation Clips', count: 1 },
      { pageName: 'Viral Reel Central', count: 1 },
      { pageName: 'Tech Spotlight 360', count: 0 },
      { pageName: 'Pulse Global Highlights', count: 0 },
    ],
    videosBySource: [
      { source: 'LOCAL_UPLOAD', count: 1 },
      { source: 'FOLDER_UPLOAD', count: 1 },
      { source: 'BULK_URL', count: 1 },
    ],
  };

  return (
    <AppShell>
      {/* Header Banner */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        marginBottom: '28px',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <div>
          <h1 style={{ fontSize: '26px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.5px' }}>
            Mission Control
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginTop: '4px' }}>
            Autonomous multi-page publishing status, queue schedules, and real-time processing telemetry.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button onClick={fetchDashboard} className="btn btn-secondary">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <Link href="/upload" className="btn btn-primary">
            <UploadCloud size={16} />
            <span>Upload Content</span>
          </Link>
        </div>
      </div>

      {/* Metric Cards Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px',
        marginBottom: '28px'
      }}>
        {/* Connected Pages */}
        <div className="glass-card interactive-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Connected Pages</span>
            <Facebook size={18} color="var(--primary)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '10px 0 4px' }}>
            {stats.connectedPages}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--success)', display: 'flex', alignItems: 'center', gap: '4px' }}>
            <div className="pulsing-dot" style={{ width: '6px', height: '6px' }} />
            <span>All Queues Synchronized</span>
          </div>
        </div>

        {/* Total Videos */}
        <div className="glass-card interactive-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Media Library</span>
            <Film size={18} color="var(--accent)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '10px 0 4px' }}>
            {stats.totalVideos}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Ready for distribution
          </div>
        </div>

        {/* Queued Jobs */}
        <div className="glass-card interactive-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Queued Jobs</span>
            <ListOrdered size={18} color="var(--info)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '10px 0 4px' }}>
            {stats.queued}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--info)' }}>
            In automation pipeline
          </div>
        </div>

        {/* Scheduled Today */}
        <div className="glass-card interactive-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Scheduled Today</span>
            <CalendarCheck size={18} color="#f59e0b" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '10px 0 4px' }}>
            {stats.scheduledToday}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
            Dispatched via worker daemon
          </div>
        </div>

        {/* Published Today */}
        <div className="glass-card interactive-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Published Today</span>
            <CheckCircle2 size={18} color="var(--success)" />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: '#ffffff', margin: '10px 0 4px' }}>
            {stats.publishedToday}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--success)' }}>
            100% Success Delivery
          </div>
        </div>

        {/* Processing / Failed */}
        <div className="glass-card interactive-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'var(--text-muted)' }}>
            <span style={{ fontSize: '12px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>Failed / Retrying</span>
            <AlertTriangle size={18} color={stats.failed > 0 ? 'var(--danger)' : 'var(--text-muted)'} />
          </div>
          <div style={{ fontSize: '32px', fontWeight: 800, color: stats.failed > 0 ? 'var(--danger)' : '#ffffff', margin: '10px 0 4px' }}>
            {stats.failed}
          </div>
          <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
            Auto-retry policy active
          </div>
        </div>
      </div>

      {/* Main Charts & Analytics Section */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '2fr 1fr',
        gap: '24px',
        marginBottom: '28px'
      }}>
        {/* Publishing Activity SVG Bar Chart */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                7-Day Publishing Volume
              </h3>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Published reels vs failures across all Facebook Pages
              </p>
            </div>
            <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--primary)', borderRadius: '2px' }} />
                Published
              </span>
              <span style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)' }}>
                <span style={{ width: '10px', height: '10px', background: 'var(--danger)', borderRadius: '2px' }} />
                Failed
              </span>
            </div>
          </div>

          {/* SVG Chart */}
          <div style={{ height: '220px', width: '100%', display: 'flex', alignItems: 'flex-end', gap: '20px', padding: '10px 0 20px' }}>
            {stats.publishingActivity.map((item: any, idx: number) => {
              const maxVal = 12;
              const pubHeight = Math.max(12, (item.published / maxVal) * 180);
              const failHeight = item.failed > 0 ? Math.max(8, (item.failed / maxVal) * 180) : 0;

              return (
                <div key={idx} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', height: '100%', justifyContent: 'flex-end' }}>
                  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '4px', width: '100%', justifyContent: 'center' }}>
                    <div
                      style={{
                        width: '28px',
                        height: `${pubHeight}px`,
                        background: 'linear-gradient(180deg, #06b6d4, #0891b2)',
                        borderRadius: '4px 4px 0 0',
                        transition: 'height 0.4s ease',
                      }}
                      title={`${item.date}: ${item.published} published`}
                    />
                    {failHeight > 0 && (
                      <div
                        style={{
                          width: '12px',
                          height: `${failHeight}px`,
                          background: 'var(--danger)',
                          borderRadius: '4px 4px 0 0',
                        }}
                        title={`${item.date}: ${item.failed} failed`}
                      />
                    )}
                  </div>
                  <div style={{ marginTop: '10px', fontSize: '11px', color: 'var(--text-muted)' }}>
                    {item.date}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Content Breakdown by Destination Page */}
        <div className="glass-card">
          <div style={{ marginBottom: '20px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
              Destination Distribution
            </h3>
            <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
              Queued video pipelines by target Page
            </p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {stats.videosByPage.map((p: any, idx: number) => (
              <div key={idx}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '6px' }}>
                  <span style={{ color: '#ffffff', fontWeight: 500 }}>{p.pageName}</span>
                  <span style={{ color: 'var(--primary)', fontWeight: 700 }}>{p.count} queued</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div
                    style={{
                      height: '100%',
                      width: `${Math.min(100, Math.max(15, p.count * 40))}%`,
                      background: 'linear-gradient(90deg, var(--primary), var(--accent))',
                      borderRadius: '3px'
                    }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div style={{ marginTop: '24px', paddingTop: '16px', borderTop: '1px solid var(--border-subtle)' }}>
            <Link href="/pages" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', color: 'var(--primary)', fontSize: '13px', textDecoration: 'none', fontWeight: 600 }}>
              <span>Configure Page Schedules & Limits</span>
              <ChevronRight size={16} />
            </Link>
          </div>
        </div>
      </div>

      {/* Bottom Section: Active Queues & Live Activity Logs */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1.2fr 1fr',
        gap: '24px'
      }}>
        {/* Upcoming Queued Jobs Preview */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
              Upcoming Posting Pipeline
            </h3>
            <Link href="/queue" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
              Open Queue Manager
            </Link>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {(data?.recentJobs || []).map((job: any) => (
              <div
                key={job.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '14px',
                  padding: '12px 14px',
                  background: 'rgba(255, 255, 255, 0.02)',
                  border: '1px solid var(--border-subtle)',
                  borderRadius: 'var(--radius-md)',
                }}
              >
                <div style={{
                  width: '44px',
                  height: '44px',
                  borderRadius: '8px',
                  background: 'var(--bg-surface)',
                  overflow: 'hidden',
                  flexShrink: 0
                }}>
                  <img
                    src={job.media?.thumbnailPath || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
                    alt="thumb"
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </div>

                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: '13.5px', fontWeight: 600, color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {job.caption || job.media?.filename}
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '2px', display: 'flex', gap: '12px' }}>
                    <span>Target: <strong style={{ color: 'var(--text-secondary)' }}>{job.page?.pageName || 'Facebook Page'}</strong></span>
                    <span>Scheduled: <strong style={{ color: 'var(--primary)' }}>{new Date(job.scheduledFor).toLocaleTimeString()}</strong></span>
                  </div>
                </div>

                <span className="badge badge-info">{job.status}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Live Logs Preview */}
        <div className="glass-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '18px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div className="pulsing-dot" />
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>
                Live Worker Telemetry
              </h3>
            </div>
            <Link href="/logs" className="btn btn-secondary" style={{ padding: '4px 12px', fontSize: '12px' }}>
              Stream Console
            </Link>
          </div>

          <div style={{
            background: '#04060a',
            borderRadius: 'var(--radius-md)',
            padding: '12px 16px',
            fontFamily: 'JetBrains Mono, monospace',
            fontSize: '12px',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            height: '240px',
            overflowY: 'auto'
          }}>
            {(data?.recentLogs || []).map((log: any) => (
              <div key={log.id} style={{ display: 'flex', gap: '8px', lineHeight: 1.4 }}>
                <span style={{ color: 'var(--text-muted)' }}>[{log.timestamp?.slice(11, 19)}]</span>
                <span style={{
                  color: log.level === 'SUCCESS' ? 'var(--success)' :
                         log.level === 'WARNING' ? 'var(--warning)' :
                         log.level === 'ERROR' ? 'var(--danger)' : 'var(--primary)',
                  fontWeight: 600
                }}>
                  [{log.category}]
                </span>
                <span style={{ color: '#cbd5e1' }}>{log.message}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </AppShell>
  );
}
