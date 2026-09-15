'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { AppShell } from '@/components/layout/AppShell';
import {
  UploadCloud,
  FolderUp,
  FileVideo,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  Sparkles,
  MapPin,
  Trash2,
  Loader2
} from 'lucide-react';

export default function UploadContentPage() {
  const router = useRouter();
  const [pages, setPages] = useState<any[]>([]);
  const [uploadMode, setUploadMode] = useState<'files' | 'folder'>('folder');
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [detectedFolders, setDetectedFolders] = useState<string[]>([]);
  const [folderMappings, setFolderMappings] = useState<Record<string, string>>({});
  const [singleTargetPageId, setSingleTargetPageId] = useState<string>('');
  const [defaultCaption, setDefaultCaption] = useState('{filename}');
  const [defaultHashtags, setDefaultHashtags] = useState('#reels #viral #video');
  const [uploadProgress, setUploadProgress] = useState<number | null>(null);
  const [uploadResult, setUploadResult] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/facebook/pages')
      .then(res => res.json())
      .then(data => {
        if (data.pages) {
          setPages(data.pages);
          if (data.pages.length > 0) {
            setSingleTargetPageId(data.pages[0].id);
          }
        }
      });
  }, []);

  const handleFileSelection = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    const files = Array.from(e.target.files).filter(f => 
      f.name.endsWith('.mp4') || f.name.endsWith('.mov') || f.name.endsWith('.webm')
    );

    setSelectedFiles(files);

    // If in folder mode, detect subfolders
    if (uploadMode === 'folder') {
      const folderSet = new Set<string>();
      files.forEach(file => {
        // webkitRelativePath contains "RootFolder/SubFolder/video.mp4"
        const relPath = file.webkitRelativePath || file.name;
        const parts = relPath.split('/');
        if (parts.length > 1) {
          folderSet.add(parts[0]); // First level folder name
        }
      });

      const detected = Array.from(folderSet);
      setDetectedFolders(detected);

      // Auto map folder names if they match page names closely
      const initialMap: Record<string, string> = {};
      detected.forEach(folder => {
        const matchedPage = pages.find(p => 
          p.pageName.toLowerCase().includes(folder.toLowerCase()) ||
          folder.toLowerCase().includes(p.pageName.toLowerCase())
        );
        if (matchedPage) {
          initialMap[folder] = matchedPage.id;
        } else if (pages.length > 0) {
          initialMap[folder] = pages[0].id;
        }
      });
      setFolderMappings(initialMap);
    }
  };

  const handleStartUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(10);

    const formData = new FormData();
    selectedFiles.forEach(file => {
      formData.append('files', file);
    });

    if (uploadMode === 'folder') {
      formData.append('folderMapping', JSON.stringify(folderMappings));
      formData.append('sourceType', 'FOLDER_UPLOAD');
    } else {
      formData.append('destinationPageId', singleTargetPageId);
      formData.append('sourceType', 'LOCAL_UPLOAD');
    }

    formData.append('caption', defaultCaption);
    formData.append('hashtags', defaultHashtags);

    try {
      setUploadProgress(45);
      const res = await fetch('/api/media/upload', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      setUploadProgress(100);
      setIsUploading(false);

      if (res.ok) {
        setUploadResult(`Successfully uploaded and queued ${data.count} videos! Background workers are now actively handling transcoding and scheduling.`);
        setSelectedFiles([]);
        setDetectedFolders([]);
      } else {
        alert(data.error || 'Upload failed');
      }
    } catch {
      setIsUploading(false);
      alert('Upload failed due to network interruption');
    }
  };

  return (
    <AppShell>
      {/* Title */}
      <div style={{ marginBottom: '24px' }}>
        <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
          Computer Video & Folder Upload
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
          Upload individual clips or batch entire folders with automated Page mapping matrices.
        </p>
      </div>

      {uploadResult && (
        <div style={{
          padding: '16px 20px',
          background: 'rgba(16, 185, 129, 0.15)',
          border: '1px solid rgba(16, 185, 129, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--success)',
          marginBottom: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <CheckCircle2 size={20} />
            <span style={{ fontSize: '13.5px' }}>{uploadResult}</span>
          </div>
          <button onClick={() => router.push('/queue')} className="btn btn-primary" style={{ padding: '6px 14px', fontSize: '12px' }}>
            View in Queue
          </button>
        </div>
      )}

      {/* Mode Selector Tabs */}
      <div style={{ display: 'flex', gap: '12px', marginBottom: '24px' }}>
        <button
          onClick={() => { setUploadMode('folder'); setSelectedFiles([]); setDetectedFolders([]); }}
          className={`btn ${uploadMode === 'folder' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 20px', fontSize: '13.5px' }}
        >
          <FolderUp size={16} />
          <span>Batch Folder Upload (Auto Page Mapping)</span>
        </button>
        <button
          onClick={() => { setUploadMode('files'); setSelectedFiles([]); setDetectedFolders([]); }}
          className={`btn ${uploadMode === 'files' ? 'btn-primary' : 'btn-secondary'}`}
          style={{ padding: '10px 20px', fontSize: '13.5px' }}
        >
          <FileVideo size={16} />
          <span>Individual / Multiple Files</span>
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: selectedFiles.length > 0 ? '1.2fr 1fr' : '1fr', gap: '24px' }}>
        {/* Upload Zone Card */}
        <div className="glass-card" style={{ padding: '32px' }}>
          {/* Hidden inputs */}
          <input
            type="file"
            ref={fileInputRef}
            onChange={handleFileSelection}
            multiple
            accept="video/mp4,video/quicktime,video/webm"
            style={{ display: 'none' }}
          />
          <input
            type="file"
            ref={folderInputRef}
            onChange={handleFileSelection}
            // @ts-ignore
            webkitdirectory=""
            directory=""
            multiple
            style={{ display: 'none' }}
          />

          <div
            onClick={() => {
              if (uploadMode === 'folder') folderInputRef.current?.click();
              else fileInputRef.current?.click();
            }}
            style={{
              border: '2px dashed rgba(6, 182, 212, 0.4)',
              borderRadius: 'var(--radius-lg)',
              padding: '50px 24px',
              textAlign: 'center',
              cursor: 'pointer',
              background: 'rgba(6, 182, 212, 0.03)',
              transition: 'all 0.2s ease'
            }}
            onMouseOver={e => (e.currentTarget.style.borderColor = 'var(--primary)')}
            onMouseOut={e => (e.currentTarget.style.borderColor = 'rgba(6, 182, 212, 0.4)')}
          >
            <div style={{
              width: '60px',
              height: '60px',
              borderRadius: '16px',
              background: 'rgba(6, 182, 212, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
            }}>
              {uploadMode === 'folder' ? <FolderUp size={30} color="var(--primary)" /> : <UploadCloud size={30} color="var(--primary)" />}
            </div>

            <h3 style={{ fontSize: '16px', fontWeight: 700, color: '#ffffff', marginBottom: '6px' }}>
              {uploadMode === 'folder' ? 'Click to Select Master Video Folder' : 'Click to Select Videos'}
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '13px', maxWidth: '400px', margin: '0 auto 16px' }}>
              {uploadMode === 'folder'
                ? 'Select a directory with subfolders (e.g. VIDEOS/Page-A/, VIDEOS/Page-B/). Each subfolder is automatically mapped to its Facebook Page.'
                : 'Select one or more MP4, MOV, or WebM files from your computer to queue.'}
            </p>

            <span className="badge badge-info" style={{ padding: '6px 14px' }}>
              Supports MP4 • MOV • WebM (Unlimited files)
            </span>
          </div>

          {/* Form Settings */}
          <div style={{ marginTop: '24px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {uploadMode === 'files' && (
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Target Destination Page
                </label>
                <select
                  value={singleTargetPageId}
                  onChange={e => setSingleTargetPageId(e.target.value)}
                  className="input-control"
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.pageName}</option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Caption Template (Tokens: {'{filename}'}, {'{date}'})
              </label>
              <input
                type="text"
                value={defaultCaption}
                onChange={e => setDefaultCaption(e.target.value)}
                className="input-control"
              />
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                Default Hashtags
              </label>
              <input
                type="text"
                value={defaultHashtags}
                onChange={e => setDefaultHashtags(e.target.value)}
                className="input-control"
              />
            </div>
          </div>
        </div>

        {/* Folder Mapping Matrix & File Staging Review */}
        {selectedFiles.length > 0 && (
          <div className="glass-card" style={{ padding: '24px', display: 'flex', flexDirection: 'column' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h3 style={{ fontSize: '16px', fontWeight: 800, color: '#ffffff' }}>
                Staged Content ({selectedFiles.length} files)
              </h3>
              <button onClick={() => setSelectedFiles([])} className="btn btn-secondary" style={{ padding: '4px 8px' }}>
                <Trash2 size={13} />
              </button>
            </div>

            {/* Folder Mapping Matrix */}
            {uploadMode === 'folder' && detectedFolders.length > 0 && (
              <div style={{ marginBottom: '20px', background: 'var(--bg-surface)', padding: '14px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
                <div style={{ fontSize: '12px', fontWeight: 700, color: 'var(--primary)', marginBottom: '10px', textTransform: 'uppercase', letterSpacing: '0.4px' }}>
                  Subfolder ➔ Destination Facebook Page Mapping
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                  {detectedFolders.map(folder => (
                    <div key={folder} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{ fontSize: '13px', fontWeight: 600, color: '#ffffff', minWidth: '100px' }}>
                        📁 {folder}
                      </span>
                      <ArrowRight size={14} color="var(--text-muted)" />
                      <select
                        value={folderMappings[folder] || ''}
                        onChange={e => setFolderMappings({ ...folderMappings, [folder]: e.target.value })}
                        className="input-control"
                        style={{ height: '36px', fontSize: '12.5px' }}
                      >
                        {pages.map(p => (
                          <option key={p.id} value={p.id}>{p.pageName}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* File List Sample */}
            <div style={{ flex: 1, maxHeight: '240px', overflowY: 'auto', marginBottom: '20px' }}>
              {selectedFiles.slice(0, 10).map((file, i) => (
                <div key={i} style={{ padding: '6px 0', borderBottom: '1px solid var(--border-subtle)', fontSize: '12.5px', color: 'var(--text-secondary)', display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', maxWidth: '240px' }}>
                    {file.name}
                  </span>
                  <span style={{ color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(1)} MB</span>
                </div>
              ))}
              {selectedFiles.length > 10 && (
                <div style={{ fontSize: '11px', color: 'var(--text-muted)', paddingTop: '6px' }}>
                  + {selectedFiles.length - 10} more files...
                </div>
              )}
            </div>

            {/* Upload Button & Progress */}
            {isUploading ? (
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', color: 'var(--primary)', marginBottom: '8px' }}>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Transferring to server filesystem & generating video thumbnails...</span>
                </div>
                <div style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                  <div style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--primary)' }} />
                </div>
              </div>
            ) : (
              <button
                onClick={handleStartUpload}
                className="btn btn-primary"
                style={{ height: '44px', width: '100%', fontSize: '14px' }}
              >
                <span>Confirm & Start Auto-Queue Import</span>
                <ArrowRight size={16} />
              </button>
            )}
          </div>
        )}
      </div>
    </AppShell>
  );
}
