'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Search, Bell, LogOut, CheckCircle2, AlertTriangle, Shield, Sparkles } from 'lucide-react';

export function Topbar() {
  const router = useRouter();
  const [isDemoMode, setIsDemoMode] = useState(true);
  const [connectedCount, setConnectedCount] = useState(4);
  const [showNotifications, setShowNotifications] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(res => res.json())
      .then(data => {
        if (data.settings) {
          setIsDemoMode(data.settings.demoMode);
        }
      })
      .catch(() => {});

    fetch('/api/facebook/pages')
      .then(res => res.json())
      .then(data => {
        if (data.pages) {
          setConnectedCount(data.pages.filter((p: any) => p.status === 'ACTIVE').length);
        }
      })
      .catch(() => {});
  }, []);

  const toggleDemoMode = async () => {
    const nextState = !isDemoMode;
    setIsDemoMode(nextState);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ demoMode: nextState }),
    });
    router.refresh();
  };

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    router.push('/login');
  };

  return (
    <header style={{
      height: 'var(--topbar-height)',
      background: 'rgba(14, 19, 31, 0.85)',
      backdropFilter: 'blur(16px)',
      borderBottom: '1px solid var(--border-subtle)',
      position: 'sticky',
      top: 0,
      zIndex: 40,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 32px',
    }}>
      {/* Search Bar */}
      <div style={{ position: 'relative', width: '380px' }}>
        <Search
          size={16}
          color="var(--text-muted)"
          style={{ position: 'absolute', left: '14px', top: '50%', transform: 'translateY(-50%)' }}
        />
        <input
          type="text"
          placeholder="Search videos, pages, schedules, queues..."
          className="input-control"
          style={{ paddingLeft: '40px', height: '40px', background: 'rgba(7, 9, 14, 0.6)' }}
        />
      </div>

      {/* Right Controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
        {/* Demo Mode Toggle Badge */}
        <div
          onClick={toggleDemoMode}
          style={{
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '6px 12px',
            borderRadius: '20px',
            background: isDemoMode ? 'rgba(139, 92, 246, 0.15)' : 'rgba(16, 185, 129, 0.15)',
            border: `1px solid ${isDemoMode ? 'rgba(139, 92, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`,
            transition: 'all 0.2s ease'
          }}
          title="Click to toggle Demo Mode / Live Meta API Mode"
        >
          <Sparkles size={14} color={isDemoMode ? 'var(--accent)' : 'var(--success)'} />
          <span style={{
            fontSize: '12px',
            fontWeight: 700,
            color: isDemoMode ? '#c4b5fd' : '#6ee7b7'
          }}>
            {isDemoMode ? 'DEMO SIMULATOR' : 'LIVE META GRAPH API'}
          </span>
          <span style={{
            fontSize: '10px',
            padding: '1px 6px',
            background: 'rgba(255,255,255,0.1)',
            borderRadius: '10px'
          }}>
            TOGGLE
          </span>
        </div>

        {/* Facebook Connection Status */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          padding: '6px 14px',
          background: 'var(--bg-surface-elevated)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-subtle)',
          fontSize: '12.5px'
        }}>
          <div className="pulsing-dot" />
          <span style={{ color: 'var(--text-secondary)' }}>Pages:</span>
          <strong style={{ color: '#ffffff' }}>{connectedCount} Connected</strong>
        </div>

        {/* Notifications Icon */}
        <button
          onClick={() => setShowNotifications(!showNotifications)}
          style={{
            width: '38px',
            height: '38px',
            borderRadius: 'var(--radius-md)',
            background: 'var(--bg-surface-elevated)',
            border: '1px solid var(--border-subtle)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            color: 'var(--text-secondary)'
          }}
        >
          <Bell size={18} />
        </button>

        {/* Owner Profile & Logout */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', borderLeft: '1px solid var(--border-subtle)', paddingLeft: '16px' }}>
          <div style={{
            width: '34px',
            height: '34px',
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #06b6d4, #3b82f6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontWeight: 700,
            fontSize: '13px',
            color: '#fff'
          }}>
            A
          </div>
          <div>
            <div style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff' }}>admin (Owner)</div>
            <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>Private Console</div>
          </div>

          <button
            onClick={handleLogout}
            title="Sign out of owner session"
            style={{
              background: 'transparent',
              border: 'none',
              color: 'var(--text-muted)',
              cursor: 'pointer',
              padding: '6px',
              marginLeft: '6px',
              borderRadius: 'var(--radius-sm)'
            }}
          >
            <LogOut size={16} />
          </button>
        </div>
      </div>
    </header>
  );
}
