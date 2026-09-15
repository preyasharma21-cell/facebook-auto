'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  SlidersHorizontal,
  Plus,
  CheckCircle2,
  Cpu,
  Sparkles,
  Layers,
  Film
} from 'lucide-react';

export default function VideoProcessingPage() {
  const [presets, setPresets] = useState<any[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [name, setName] = useState('');
  const [resolution, setResolution] = useState('1080x1920');
  const [aspectRatio, setAspectRatio] = useState('9:16');
  const [videoBitrate, setVideoBitrate] = useState('4500k');
  const [fps, setFps] = useState(30);
  const [audioBitrate, setAudioBitrate] = useState('192k');
  const [message, setMessage] = useState('');

  const loadPresets = () => {
    fetch('/api/presets')
      .then(res => res.json())
      .then(d => {
        if (d.presets) setPresets(d.presets);
      });
  };

  useEffect(() => {
    loadPresets();
  }, []);

  const handleCreatePreset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;

    await fetch('/api/presets', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        resolution,
        aspectRatio,
        videoBitrate,
        fps,
        audioBitrate,
      }),
    });

    setMessage(`Processing preset "${name}" created!`);
    setShowModal(false);
    setName('');
    loadPresets();
    setTimeout(() => setMessage(''), 4000);
  };

  return (
    <AppShell>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
            Video Processing & FFmpeg Presets
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Configure server-side video transcoding, aspect ratio scaling, audio normalization, and Reel encoding profiles.
          </p>
        </div>

        <button onClick={() => setShowModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>New Processing Preset</span>
        </button>
      </div>

      {message && (
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
          <span>{message}</span>
        </div>
      )}

      {/* Preset Cards Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '20px' }}>
        {presets.map(preset => (
          <div key={preset.id} className="glass-card interactive-card" style={{ padding: '20px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff' }}>{preset.name}</h3>
              {preset.isDefault && (
                <span className="badge badge-success" style={{ fontSize: '10.5px' }}>DEFAULT</span>
              )}
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', fontSize: '13px', color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Target Resolution:</span>
                <strong style={{ color: '#ffffff' }}>{preset.resolution}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Aspect Ratio:</span>
                <strong style={{ color: 'var(--primary)' }}>{preset.aspectRatio}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Video Bitrate:</span>
                <strong style={{ color: '#ffffff' }}>{preset.videoBitrate}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Framerate:</span>
                <strong style={{ color: '#ffffff' }}>{preset.fps} FPS</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Audio Bitrate:</span>
                <strong style={{ color: '#ffffff' }}>{preset.audioBitrate}</strong>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '14px', borderTop: '1px solid var(--border-subtle)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>libx264 + aac faststart</span>
              <span className="badge badge-neutral" style={{ fontSize: '11px' }}>Ready</span>
            </div>
          </div>
        ))}
      </div>

      {/* New Preset Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.7)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 100,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '480px', padding: '28px', background: '#0e131f' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Create FFmpeg Processing Preset
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Define encoding constraints for automatic video optimization prior to posting.
            </p>

            <form onSubmit={handleCreatePreset} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Preset Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ultra HD Vertical Reel"
                  value={name}
                  onChange={e => setName(e.target.value)}
                  className="input-control"
                  required
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Resolution
                  </label>
                  <select value={resolution} onChange={e => setResolution(e.target.value)} className="input-control">
                    <option value="1080x1920">1080x1920 (Vertical)</option>
                    <option value="1920x1080">1920x1080 (Landscape)</option>
                    <option value="1080x1080">1080x1080 (Square)</option>
                    <option value="720x1280">720x1280 (HD Vertical)</option>
                  </select>
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Aspect Ratio
                  </label>
                  <select value={aspectRatio} onChange={e => setAspectRatio(e.target.value)} className="input-control">
                    <option value="9:16">9:16 (Reel / Shorts)</option>
                    <option value="16:9">16:9 (Landscape)</option>
                    <option value="1:1">1:1 (Square)</option>
                  </select>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Video Bitrate
                  </label>
                  <input
                    type="text"
                    value={videoBitrate}
                    onChange={e => setVideoBitrate(e.target.value)}
                    className="input-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Target FPS
                  </label>
                  <input
                    type="number"
                    value={fps}
                    onChange={e => setFps(Number(e.target.value))}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Preset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
