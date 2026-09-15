'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Facebook,
  Film,
  UploadCloud,
  DownloadCloud,
  CalendarDays,
  ListOrdered,
  History,
  SlidersHorizontal,
  Terminal,
  Settings,
  Cpu,
  ShieldCheck
} from 'lucide-react';

const NAV_ITEMS = [
  { label: 'Dashboard', href: '/', icon: LayoutDashboard },
  { label: 'Facebook Pages', href: '/pages', icon: Facebook },
  { label: 'Content Library', href: '/library', icon: Film },
  { label: 'Upload Videos', href: '/upload', icon: UploadCloud },
  { label: 'Video Downloader', href: '/import', icon: DownloadCloud },
  { label: 'Scheduler', href: '/scheduler', icon: CalendarDays },
  { label: 'Queue Manager', href: '/queue', icon: ListOrdered },
  { label: 'Posting History', href: '/history', icon: History },
  { label: 'Video Processing', href: '/processing', icon: SlidersHorizontal },
  { label: 'Live Logs', href: '/logs', icon: Terminal },
  { label: 'Settings', href: '/settings', icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside style={{
      width: 'var(--sidebar-width)',
      height: '100vh',
      position: 'fixed',
      top: 0,
      left: 0,
      background: 'var(--bg-surface)',
      borderRight: '1px solid var(--border-subtle)',
      display: 'flex',
      flexDirection: 'column',
      zIndex: 50,
      userSelect: 'none'
    }}>
      {/* Brand Header */}
      <div style={{
        padding: '24px 20px',
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        borderBottom: '1px solid var(--border-subtle)'
      }}>
        <div style={{
          width: '38px',
          height: '38px',
          borderRadius: '10px',
          background: 'linear-gradient(135deg, #06b6d4, #8b5cf6)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 0 16px rgba(6, 182, 212, 0.4)'
        }}>
          <ShieldCheck size={22} color="#ffffff" />
        </div>
        <div>
          <div style={{ fontWeight: 800, fontSize: '16px', letterSpacing: '-0.3px', color: '#ffffff' }}>
            AutoPilot <span style={{ color: 'var(--primary)', fontSize: '12px', fontWeight: 600 }}>PRO</span>
          </div>
          <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
            Private FB Automation
          </div>
        </div>
      </div>

      {/* Navigation Links */}
      <nav style={{ flex: 1, padding: '16px 12px', overflowY: 'auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
          {NAV_ITEMS.map(item => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '13.5px',
                  fontWeight: isActive ? 600 : 500,
                  color: isActive ? '#ffffff' : 'var(--text-secondary)',
                  background: isActive ? 'linear-gradient(90deg, rgba(6, 182, 212, 0.15), rgba(139, 92, 246, 0.05))' : 'transparent',
                  borderLeft: isActive ? '3px solid var(--primary)' : '3px solid transparent',
                  textDecoration: 'none',
                  transition: 'all 0.15s ease'
                }}
              >
                <Icon size={18} color={isActive ? 'var(--primary)' : 'var(--text-muted)'} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Engine Status Bottom Panel */}
      <div style={{
        padding: '16px 18px',
        borderTop: '1px solid var(--border-subtle)',
        background: 'rgba(0,0,0,0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
            <Cpu size={14} color="var(--primary)" />
            <span>Worker Engine</span>
          </div>
          <span className="badge badge-success" style={{ padding: '2px 8px', fontSize: '10px' }}>
            ACTIVE
          </span>
        </div>
        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          Timezone: <span style={{ color: 'var(--text-secondary)' }}>Asia/Karachi (UTC+5)</span>
        </div>
      </div>
    </aside>
  );
}
