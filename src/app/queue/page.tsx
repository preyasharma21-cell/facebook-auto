'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  ListOrdered,
  Pause,
  Play,
  ArrowUp,
  ArrowDown,
  Trash2,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Facebook
} from 'lucide-react';

export default function QueueManagerPage() {
  const [queues, setQueues] = useState<any[]>([]);
  const [activeQueueIndex, setActiveQueueIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const loadQueues = () => {
    fetch('/api/queues')
      .then(res => res.json())
      .then(data => {
        if (data.queues) {
          setQueues(data.queues);
          setLoading(false);
        }
      })
      .catch(() => setLoading(false));
  };

  useEffect(() => {
    loadQueues();
    const interval = setInterval(loadQueues, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleTogglePause = async (pageId: string, currentPaused: boolean) => {
    await fetch('/api/queues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId,
        action: currentPaused ? 'resume' : 'pause',
      }),
    });
    loadQueues();
  };

  const handlePostNow = async (jobId: string) => {
    setMessage('Publishing job immediately through worker daemon...');
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'post_now', jobId }),
    });
    loadQueues();
    setTimeout(() => setMessage(''), 4000);
  };

  const handleDeleteJob = async (jobId: string) => {
    if (!confirm('Remove this video from queue?')) return;
    await fetch(`/api/jobs?id=${jobId}`, { method: 'DELETE' });
    loadQueues();
  };

  const currentQueue = queues[activeQueueIndex];

  return (
    <AppShell>
      {/* Title */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
            Multi-Page Independent Queues
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Each Facebook Page maintains an isolated posting queue, pause/resume state, and priority sequence.
          </p>
        </div>

        <button onClick={loadQueues} className="btn btn-secondary">
          <RefreshCw size={15} />
          <span>Refresh Queues</span>
        </button>
      </div>

      {message && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--primary)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{message}</span>
        </div>
      )}

      {/* Queue Tabs per Facebook Page */}
      <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '14px', marginBottom: '20px' }}>
        {queues.map((q, idx) => (
          <button
            key={q.pageId}
            onClick={() => setActiveQueueIndex(idx)}
            className={`btn ${activeQueueIndex === idx ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '10px 18px', display: 'flex', alignItems: 'center', gap: '10px', whiteSpace: 'nowrap' }}
          >
            <Facebook size={15} />
            <span>{q.pageName}</span>
            <span style={{
              background: activeQueueIndex === idx ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.1)',
              padding: '2px 8px',
              borderRadius: '10px',
              fontSize: '11px',
              fontWeight: 700
            }}>
              {q.totalQueued}
            </span>
            {q.isPaused && (
              <span style={{ color: 'var(--warning)', fontSize: '11px', fontWeight: 700 }}>PAUSED</span>
            )}
          </button>
        ))}
      </div>

      {currentQueue && (
        <div className="glass-card" style={{ padding: '24px' }}>
          {/* Queue Header Banner */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', paddingBottom: '16px', borderBottom: '1px solid var(--border-subtle)' }}>
            <div>
              <h2 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                {currentQueue.pageName} Queue
              </h2>
              <p style={{ fontSize: '12.5px', color: 'var(--text-muted)' }}>
                {currentQueue.jobs.length} items in pipeline • Status: <strong style={{ color: currentQueue.isPaused ? 'var(--warning)' : 'var(--success)' }}>{currentQueue.isPaused ? 'PAUSED' : 'AUTO-RUNNING'}</strong>
              </p>
            </div>

            <button
              onClick={() => handleTogglePause(currentQueue.pageId, currentQueue.isPaused)}
              className={`btn ${currentQueue.isPaused ? 'btn-primary' : 'btn-secondary'}`}
            >
              {currentQueue.isPaused ? (
                <>
                  <Play size={15} />
                  <span>Resume Automation</span>
                </>
              ) : (
                <>
                  <Pause size={15} />
                  <span>Pause Automation</span>
                </>
              )}
            </button>
          </div>

          {/* Job Items List */}
          {currentQueue.jobs.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '50px 20px', color: 'var(--text-muted)' }}>
              No videos currently queued for this Page. Upload content or import URLs to schedule.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {currentQueue.jobs.map((job: any, index: number) => (
                <div
                  key={job.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    padding: '14px 18px',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-subtle)',
                    borderRadius: 'var(--radius-md)',
                  }}
                >
                  <span style={{
                    fontSize: '14px',
                    fontWeight: 800,
                    color: 'var(--text-muted)',
                    width: '28px',
                    textAlign: 'center'
                  }}>
                    #{index + 1}
                  </span>

                  {/* Thumbnail */}
                  <div style={{ width: '48px', height: '64px', borderRadius: '6px', overflow: 'hidden', flexShrink: 0, background: '#000' }}>
                    <img
                      src={job.media?.thumbnailPath || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150'}
                      alt="thumb"
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {job.caption || job.media?.filename}
                    </div>
                    <div style={{ display: 'flex', gap: '16px', marginTop: '4px', fontSize: '12px', color: 'var(--text-muted)' }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)' }}>
                        <Clock size={13} />
                        Scheduled: <strong>{new Date(job.scheduledFor).toLocaleString()}</strong>
                      </span>
                      <span>Retries: {job.retryCount}/{job.maxRetries}</span>
                      <span>Format: {job.media?.resolution || '1080x1920'}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <button
                      onClick={() => handlePostNow(job.id)}
                      className="btn btn-secondary"
                      style={{ padding: '6px 12px', fontSize: '12px', color: 'var(--primary)' }}
                      title="Post Now (skip waiting for scheduled time)"
                    >
                      <Send size={13} />
                      <span>Post Now</span>
                    </button>
                    <button
                      onClick={() => handleDeleteJob(job.id)}
                      className="btn btn-danger"
                      style={{ padding: '6px 10px' }}
                      title="Remove from queue"
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </AppShell>
  );
}
