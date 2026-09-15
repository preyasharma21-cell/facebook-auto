'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { AppShell } from '@/components/layout/AppShell';
import {
  Film,
  Search,
  Filter,
  Grid,
  List,
  Trash2,
  CalendarPlus,
  Play,
  UploadCloud,
  CheckCircle2,
  X
} from 'lucide-react';

export default function ContentLibraryPage() {
  const [mediaList, setMediaList] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [search, setSearch] = useState('');
  const [sourceFilter, setSourceFilter] = useState('ALL');
  const [pages, setPages] = useState<any[]>([]);
  const [selectedMedia, setSelectedMedia] = useState<any>(null);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [schedulePageId, setSchedulePageId] = useState('');
  const [scheduleTime, setScheduleTime] = useState('');
  const [actionSuccess, setActionSuccess] = useState('');

  const loadMedia = async () => {
    try {
      const url = `/api/media?search=${encodeURIComponent(search)}&source=${sourceFilter}`;
      const [mediaRes, pagesRes] = await Promise.all([
        fetch(url).then(r => r.json()),
        fetch('/api/facebook/pages').then(r => r.json()),
      ]);

      if (mediaRes.media) setMediaList(mediaRes.media);
      if (pagesRes.pages) {
        setPages(pagesRes.pages);
        if (pagesRes.pages.length > 0 && !schedulePageId) {
          setSchedulePageId(pagesRes.pages[0].id);
        }
      }
    } catch {}
  };

  useEffect(() => {
    loadMedia();
  }, [search, sourceFilter]);

  const handleDelete = async (id: string, filename: string) => {
    if (!confirm(`Delete media asset "${filename}"?`)) return;
    const res = await fetch(`/api/media?id=${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (!res.ok) {
      alert(data.error || 'Failed to delete');
      return;
    }
    loadMedia();
  };

  const handleQueueMedia = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMedia || !schedulePageId) return;

    const res = await fetch('/api/jobs', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId: schedulePageId,
        mediaId: selectedMedia.id,
        caption: selectedMedia.captionDefault,
        hashtags: selectedMedia.hashtagsDefault,
        scheduledFor: scheduleTime || new Date(Date.now() + 1800000).toISOString(),
      }),
    });

    if (res.ok) {
      setActionSuccess('Added to queue successfully!');
      setShowScheduleModal(false);
      setTimeout(() => setActionSuccess(''), 4000);
    }
  };

  return (
    <AppShell>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
            Central Content Library
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Browse, preview, filter, and assign videos to Facebook publishing queues.
          </p>
        </div>

        <Link href="/upload" className="btn btn-primary">
          <UploadCloud size={16} />
          <span>Upload New Content</span>
        </Link>
      </div>

      {actionSuccess && (
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
          <span>{actionSuccess}</span>
        </div>
      )}

      {/* Filter & View Toolbar */}
      <div className="glass-card" style={{ padding: '14px 18px', marginBottom: '24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '16px', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: '260px' }}>
          <div style={{ position: 'relative', width: '100%', maxWidth: '320px' }}>
            <Search size={15} color="var(--text-muted)" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
            <input
              type="text"
              placeholder="Search filename or caption..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="input-control"
              style={{ paddingLeft: '36px', height: '38px', fontSize: '13px' }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={14} color="var(--text-muted)" />
            <select
              value={sourceFilter}
              onChange={e => setSourceFilter(e.target.value)}
              className="input-control"
              style={{ height: '38px', width: '160px', fontSize: '13px' }}
            >
              <option value="ALL">All Sources</option>
              <option value="LOCAL_UPLOAD">Local Files</option>
              <option value="FOLDER_UPLOAD">Folder Uploads</option>
              <option value="BULK_URL">Bulk URLs</option>
            </select>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            onClick={() => setViewMode('grid')}
            className={`btn ${viewMode === 'grid' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px' }}
          >
            <Grid size={15} />
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`btn ${viewMode === 'table' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '6px 12px' }}
          >
            <List size={15} />
          </button>
        </div>
      </div>

      {/* Content Rendering */}
      {viewMode === 'grid' ? (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '20px',
        }}>
          {mediaList.map(item => (
            <div key={item.id} className="glass-card interactive-card" style={{ padding: '12px', display: 'flex', flexDirection: 'column' }}>
              {/* Thumbnail Container */}
              <div style={{
                position: 'relative',
                width: '100%',
                aspectRatio: '9/16',
                maxHeight: '280px',
                borderRadius: 'var(--radius-md)',
                overflow: 'hidden',
                background: '#04060a',
                marginBottom: '12px'
              }}>
                <img
                  src={item.thumbnailPath}
                  alt={item.filename}
                  style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                />
                <span style={{
                  position: 'absolute',
                  top: '8px',
                  right: '8px',
                  background: 'rgba(0,0,0,0.7)',
                  padding: '2px 8px',
                  borderRadius: '12px',
                  fontSize: '11px',
                  fontWeight: 600,
                  color: '#ffffff'
                }}>
                  {item.duration}s
                </span>
                <span style={{
                  position: 'absolute',
                  bottom: '8px',
                  left: '8px',
                  background: 'rgba(6, 182, 212, 0.85)',
                  padding: '2px 8px',
                  borderRadius: '4px',
                  fontSize: '10px',
                  fontWeight: 700,
                  color: '#ffffff'
                }}>
                  {item.resolution}
                </span>
              </div>

              {/* Title & Details */}
              <div style={{ flex: 1, minWidth: 0, marginBottom: '12px' }}>
                <div style={{ fontWeight: 700, fontSize: '13.5px', color: '#ffffff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {item.filename}
                </div>
                <div style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px', overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {item.captionDefault}
                </div>
              </div>

              {/* Card Actions */}
              <div style={{ display: 'flex', gap: '8px', borderTop: '1px solid var(--border-subtle)', paddingTop: '10px' }}>
                <button
                  onClick={() => {
                    setSelectedMedia(item);
                    setShowScheduleModal(true);
                  }}
                  className="btn btn-primary"
                  style={{ flex: 1, padding: '6px', fontSize: '12px' }}
                >
                  <CalendarPlus size={14} />
                  <span>Queue</span>
                </button>
                <button
                  onClick={() => handleDelete(item.id, item.filename)}
                  className="btn btn-danger"
                  style={{ padding: '6px 10px' }}
                  title="Delete media"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th>Video</th>
                <th>Source</th>
                <th>Duration</th>
                <th>Resolution</th>
                <th>File Size</th>
                <th>Added Date</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {mediaList.map(item => (
                <tr key={item.id}>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={item.thumbnailPath}
                        alt="thumb"
                        style={{ width: '40px', height: '54px', borderRadius: '6px', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 600, color: '#ffffff' }}>{item.filename}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)', maxWidth: '300px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {item.captionDefault}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td><span className="badge badge-neutral">{item.sourceType}</span></td>
                  <td>{item.duration}s</td>
                  <td>{item.resolution}</td>
                  <td>{(item.fileSize / 1024 / 1024).toFixed(1)} MB</td>
                  <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '8px' }}>
                      <button
                        onClick={() => {
                          setSelectedMedia(item);
                          setShowScheduleModal(true);
                        }}
                        className="btn btn-secondary"
                        style={{ padding: '4px 10px', fontSize: '12px' }}
                      >
                        <CalendarPlus size={13} />
                        <span>Queue</span>
                      </button>
                      <button
                        onClick={() => handleDelete(item.id, item.filename)}
                        className="btn btn-danger"
                        style={{ padding: '4px 8px' }}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Queue Modal */}
      {showScheduleModal && selectedMedia && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '460px', padding: '28px', background: '#0e131f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Queue for Publishing
              </h3>
              <button onClick={() => setShowScheduleModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleQueueMedia} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Target Facebook Page
                </label>
                <select
                  value={schedulePageId}
                  onChange={e => setSchedulePageId(e.target.value)}
                  className="input-control"
                  required
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.pageName} ({p.category})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Custom Caption
                </label>
                <textarea
                  value={selectedMedia.captionDefault}
                  onChange={e => setSelectedMedia({ ...selectedMedia, captionDefault: e.target.value })}
                  className="input-control"
                  rows={3}
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Schedule Date & Time
                </label>
                <input
                  type="datetime-local"
                  value={scheduleTime}
                  onChange={e => setScheduleTime(e.target.value)}
                  className="input-control"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Leave empty to queue for next available slot in page frequency.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowScheduleModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Confirm Queue
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
