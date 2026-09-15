'use client';

import React, { useState, useEffect, useRef } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Terminal,
  Filter,
  Trash2,
  Download,
  Wifi,
  WifiOff,
  Search,
  CheckCircle2,
  AlertTriangle,
  Info
} from 'lucide-react';

export default function LiveLogsPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [connected, setConnected] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [levelFilter, setLevelFilter] = useState('ALL');
  const [search, setSearch] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);

  const logsEndRef = useRef<HTMLDivElement>(null);

  // Initial load of historical logs
  useEffect(() => {
    fetch('/api/logs?limit=150')
      .then(res => res.json())
      .then(data => {
        if (data.logs) setLogs(data.logs);
      });
  }, []);

  // SSE Live Event Stream Connection
  useEffect(() => {
    const eventSource = new EventSource('/api/logs/stream');

    eventSource.onopen = () => {
      setConnected(true);
    };

    eventSource.onmessage = (event) => {
      try {
        const newLog = JSON.parse(event.data);
        if (newLog.id) {
          setLogs(prev => [newLog, ...prev]);
        }
      } catch {}
    };

    eventSource.onerror = () => {
      setConnected(false);
    };

    return () => {
      eventSource.close();
    };
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  const filteredLogs = logs.filter(log => {
    if (categoryFilter !== 'ALL' && log.category !== categoryFilter) return false;
    if (levelFilter !== 'ALL' && log.level !== levelFilter) return false;
    if (search && !log.message?.toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
              Real-Time Telemetry & Live Logs
            </h1>
            <span className={`badge ${connected ? 'badge-success' : 'badge-danger'}`} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              {connected ? <Wifi size={13} /> : <WifiOff size={13} />}
              <span>{connected ? 'SSE Stream Active' : 'Disconnected'}</span>
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Live background worker daemon events, publishing requests, FFmpeg transcode progress, and API responses.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setLogs([])}
            className="btn btn-secondary"
          >
            <Trash2 size={14} />
            <span>Clear Console</span>
          </button>
        </div>
      </div>

      {/* Filter toolbar */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: '20px', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', width: '280px' }}>
          <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
          <input
            type="text"
            placeholder="Search log messages..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="input-control"
            style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
          />
        </div>

        <select
          value={categoryFilter}
          onChange={e => setCategoryFilter(e.target.value)}
          className="input-control"
          style={{ width: '160px', height: '38px', fontSize: '13px' }}
        >
          <option value="ALL">All Categories</option>
          <option value="FACEBOOK">FACEBOOK</option>
          <option value="WORKER">WORKER</option>
          <option value="SCHEDULER">SCHEDULER</option>
          <option value="FFMPEG">FFMPEG</option>
          <option value="UPLOAD">UPLOAD</option>
          <option value="AUTH">AUTH</option>
          <option value="SYSTEM">SYSTEM</option>
        </select>

        <select
          value={levelFilter}
          onChange={e => setLevelFilter(e.target.value)}
          className="input-control"
          style={{ width: '140px', height: '38px', fontSize: '13px' }}
        >
          <option value="ALL">All Levels</option>
          <option value="INFO">INFO</option>
          <option value="SUCCESS">SUCCESS</option>
          <option value="WARNING">WARNING</option>
          <option value="ERROR">ERROR</option>
        </select>

        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '12.5px', color: 'var(--text-secondary)', marginLeft: 'auto' }}>
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={e => setAutoScroll(e.target.checked)}
          />
          <span>Auto-Scroll</span>
        </label>
      </div>

      {/* Terminal View */}
      <div style={{
        background: '#04060a',
        border: '1px solid var(--border-subtle)',
        borderRadius: 'var(--radius-lg)',
        padding: '20px',
        fontFamily: 'JetBrains Mono, monospace',
        fontSize: '12.5px',
        height: '600px',
        overflowY: 'auto',
        display: 'flex',
        flexDirection: 'column',
        gap: '6px',
        boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
      }}>
        {filteredLogs.map(log => {
          const levelColor =
            log.level === 'SUCCESS' ? 'var(--success)' :
            log.level === 'WARNING' ? 'var(--warning)' :
            log.level === 'ERROR' ? 'var(--danger)' : 'var(--primary)';

          return (
            <div key={log.id} style={{ display: 'flex', gap: '10px', lineHeight: 1.5 }}>
              <span style={{ color: 'var(--text-muted)', flexShrink: 0 }}>
                {log.timestamp ? log.timestamp.slice(11, 19) : '--:--:--'}
              </span>
              <span style={{ color: levelColor, fontWeight: 700, width: '75px', flexShrink: 0 }}>
                [{log.level}]
              </span>
              <span style={{ color: '#94a3b8', width: '90px', flexShrink: 0, fontWeight: 600 }}>
                [{log.category}]
              </span>
              <span style={{ color: '#e2e8f0', wordBreak: 'break-word', flex: 1 }}>
                {log.message}
              </span>
            </div>
          );
        })}
        <div ref={logsEndRef} />
      </div>
    </AppShell>
  );
}
