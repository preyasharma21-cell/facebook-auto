'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Settings,
  Shield,
  Clock,
  HardDrive,
  Facebook,
  Sliders,
  CheckCircle2,
  Save,
  Globe,
  SlidersHorizontal,
  KeyRound
} from 'lucide-react';

export default function PlatformSettingsPage() {
  const [settings, setSettings] = useState<any>({
    demoMode: true,
    timezone: 'Asia/Karachi',
    defaultPresetId: 'preset-01',
    defaultPostingDelayMinutes: 60,
    defaultRetryCount: 3,
    maxConcurrentJobs: 3,
    storageProvider: 'local',
    metaAppId: '',
    metaAppSecret: '',
  });

  const [presets, setPresets] = useState<any[]>([]);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    fetch('/api/settings')
      .then(r => r.json())
      .then(d => {
        if (d.settings) setSettings(d.settings);
      });

    fetch('/api/presets')
      .then(r => r.json())
      .then(d => {
        if (d.presets) setPresets(d.presets);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(settings),
    });
    setIsSaving(false);
    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 4000);
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
            Platform Settings & Integrations
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            System-wide configuration, Meta developer credentials, background worker limits, and scheduling rules.
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={isSaving}
          className="btn btn-primary"
        >
          <Save size={15} />
          <span>{isSaving ? 'Saving Changes...' : 'Save Settings'}</span>
        </button>
      </div>

      {saveSuccess && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--success)',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>Platform settings updated and persisted successfully!</span>
        </div>
      )}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '24px', maxWidth: '900px' }}>
        {/* General & Mode Section */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Globe size={18} color="var(--primary)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>General & Execution Mode</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Platform Operating Mode
              </label>
              <select
                value={settings.demoMode ? 'true' : 'false'}
                onChange={e => setSettings({ ...settings, demoMode: e.target.value === 'true' })}
                className="input-control"
              >
                <option value="true">Demo Simulator Mode (Safe mock publishing & testing)</option>
                <option value="false">Live Meta Graph API Mode (Real Facebook Page publishing)</option>
              </select>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                System Timezone (Scheduling Reference)
              </label>
              <select
                value={settings.timezone}
                onChange={e => setSettings({ ...settings, timezone: e.target.value })}
                className="input-control"
              >
                <option value="Asia/Karachi">Asia/Karachi (PKT, UTC+5)</option>
                <option value="UTC">UTC (Universal Coordinated Time)</option>
                <option value="America/New_York">America/New_York (EST/EDT)</option>
                <option value="Europe/London">Europe/London (GMT/BST)</option>
                <option value="Asia/Dubai">Asia/Dubai (GST, UTC+4)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Worker & Automation Constraints */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <SlidersHorizontal size={18} color="var(--accent)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Background Worker & Queues</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Max Concurrent Jobs
              </label>
              <input
                type="number"
                value={settings.maxConcurrentJobs}
                onChange={e => setSettings({ ...settings, maxConcurrentJobs: Number(e.target.value) })}
                className="input-control"
                min="1"
                max="10"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Default Max Retries
              </label>
              <input
                type="number"
                value={settings.defaultRetryCount}
                onChange={e => setSettings({ ...settings, defaultRetryCount: Number(e.target.value) })}
                className="input-control"
                min="0"
                max="10"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Default Delay (Minutes)
              </label>
              <input
                type="number"
                value={settings.defaultPostingDelayMinutes}
                onChange={e => setSettings({ ...settings, defaultPostingDelayMinutes: Number(e.target.value) })}
                className="input-control"
                min="5"
                max="1440"
              />
            </div>
          </div>
        </div>

        {/* Meta / Facebook API Credentials */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <Facebook size={18} color="#3b82f6" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Meta Developer Application (Live Mode)</h2>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Meta App ID
              </label>
              <input
                type="text"
                placeholder="e.g. 19283746592837"
                value={settings.metaAppId || ''}
                onChange={e => setSettings({ ...settings, metaAppId: e.target.value })}
                className="input-control font-mono"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Meta App Secret
              </label>
              <input
                type="password"
                placeholder="••••••••••••••••••••••••••••••••"
                value={settings.metaAppSecret || ''}
                onChange={e => setSettings({ ...settings, metaAppSecret: e.target.value })}
                className="input-control font-mono"
              />
            </div>
          </div>

          <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '12px' }}>
            Configured OAuth Redirect URI: <code className="font-mono" style={{ color: 'var(--primary)' }}>http://localhost:3000/api/facebook/callback</code>
          </p>
        </div>

        {/* Storage Provider */}
        <div className="glass-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '16px' }}>
            <HardDrive size={18} color="var(--success)" />
            <h2 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>Media Storage Architecture</h2>
          </div>

          <div style={{ maxWidth: '400px' }}>
            <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
              Storage Engine
            </label>
            <select
              value={settings.storageProvider}
              onChange={e => setSettings({ ...settings, storageProvider: e.target.value })}
              className="input-control"
            >
              <option value="local">Local Filesystem Storage (./uploads)</option>
              <option value="s3">Amazon S3 / Cloudflare R2 Object Storage</option>
            </select>
          </div>
        </div>
      </form>
    </AppShell>
  );
}
