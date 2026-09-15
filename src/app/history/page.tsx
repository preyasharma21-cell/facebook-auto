'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  History,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  ExternalLink,
  Filter,
  RefreshCw,
  Search
} from 'lucide-react';

export default function PostingHistoryPage() {
  const [history, setHistory] = useState<any[]>([]);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [message, setMessage] = useState('');

  const loadHistory = () => {
    fetch('/api/history')
      .then(res => res.json())
      .then(data => {
        if (data.history) setHistory(data.history);
      });
  };

  useEffect(() => {
    loadHistory();
  }, []);

  const handleRetryAllFailed = async () => {
    setMessage('Triggering immediate retry on all failed jobs...');
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry_all_failed' }),
    });
    loadHistory();
    setTimeout(() => setMessage(''), 4000);
  };

  const handleRetrySingle = async (jobId: string) => {
    setMessage(`Retrying job [${jobId}]...`);
    await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'retry', jobId }),
    });
    loadHistory();
    setTimeout(() => setMessage(''), 4000);
  };

  const filtered = history.filter(item => {
    if (statusFilter !== 'ALL' && item.status !== statusFilter) return false;
    if (search && !item.media?.filename?.toLowerCase().includes(search.toLowerCase()) && !item.page?.pageName?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
            Publishing History & Diagnostics
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Comprehensive post audit trail, Facebook post IDs, response telemetry, and failure retries.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button onClick={loadHistory} className="btn btn-secondary">
            <RefreshCw size={15} />
            <span>Refresh</span>
          </button>
          <button onClick={handleRetryAllFailed} className="btn btn-primary">
            <RotateCcw size={15} />
            <span>Retry All Failed</span>
          </button>
        </div>
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

      {/* Filter toolbar */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search by video or Page..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-control"
            style={{ paddingLeft: '36px', height: '38px' }}
          />
        </div>

        <select
          value={statusFilter}
          onChange={e => setStatusFilter(e.target.value)}
          className="input-control"
          style={{ width: '160px', height: '38px' }}
        >
          <option value="ALL">All Statuses</option>
          <option value="SUCCESS">Success Only</option>
          <option value="FAILED">Failed Only</option>
        </select>
      </div>

      {/* History Table */}
      <div className="data-table-wrapper">
        <table className="data-table">
          <thead>
            <tr>
              <th>Video</th>
              <th>Destination Page</th>
              <th>Post ID / Reference</th>
              <th>Published At</th>
              <th>Status</th>
              <th>Diagnostics / Error</th>
              <th style={{ textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(item => (
              <tr key={item.id}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <img
                      src={item.media?.thumbnailPath || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=100'}
                      alt="thumb"
                      style={{ width: '38px', height: '48px', borderRadius: '4px', objectFit: 'cover' }}
                    />
                    <div style={{ fontWeight: 600, color: '#ffffff', maxWidth: '240px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.media?.filename || 'Video Asset'}
                    </div>
                  </div>
                </td>
                <td>
                  <span style={{ fontWeight: 600, color: 'var(--text-secondary)' }}>
                    {item.page?.pageName || 'Daily Motivation'}
                  </span>
                </td>
                <td>
                  {item.postId ? (
                    <a
                      href={`https://facebook.com/${item.page?.pageId || 'fb'}/posts/${item.postId}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      style={{ color: 'var(--primary)', display: 'inline-flex', alignItems: 'center', gap: '4px', textDecoration: 'none', fontFamily: 'JetBrains Mono, monospace', fontSize: '12px' }}
                    >
                      <span>{item.postId}</span>
                      <ExternalLink size={12} />
                    </a>
                  ) : (
                    <span style={{ color: 'var(--text-muted)' }}>None</span>
                  )}
                </td>
                <td>
                  <span style={{ fontSize: '12.5px', color: 'var(--text-secondary)' }}>
                    {new Date(item.publishedAt).toLocaleString()}
                  </span>
                </td>
                <td>
                  <span className={`badge ${item.status === 'SUCCESS' ? 'badge-success' : 'badge-danger'}`}>
                    {item.status}
                  </span>
                </td>
                <td>
                  {item.errorMessage ? (
                    <span style={{ color: '#fca5a5', fontSize: '12px' }}>{item.errorMessage}</span>
                  ) : (
                    <span style={{ color: 'var(--success)', fontSize: '12px' }}>Verified Graph API Receipt</span>
                  )}
                </td>
                <td style={{ textAlign: 'right' }}>
                  {item.status === 'FAILED' && (
                    <button
                      onClick={() => handleRetrySingle(item.jobId)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '12px' }}
                    >
                      <RotateCcw size={13} />
                      <span>Retry</span>
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </AppShell>
  );
}
