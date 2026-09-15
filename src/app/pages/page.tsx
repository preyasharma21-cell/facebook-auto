'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Facebook,
  RefreshCw,
  Link2,
  Unlink,
  Layers,
  Settings2,
  Plus,
  CheckCircle2,
  AlertCircle,
  Clock,
  ShieldCheck,
  Pause,
  Play,
  Trash2,
  X,
  KeyRound,
  ExternalLink,
  Sparkles,
  Loader2
} from 'lucide-react';

export default function FacebookPagesManagerPage() {
  const [pages, setPages] = useState<any[]>([]);
  const [groups, setGroups] = useState<any[]>([]);
  const [selectedPages, setSelectedPages] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingPage, setEditingPage] = useState<any>(null);
  const [showGroupModal, setShowGroupModal] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#06b6d4');
  const [actionMessage, setActionMessage] = useState('');

  // Add Single Page Modal state
  const [showAddModal, setShowAddModal] = useState(false);
  const [newPageName, setNewPageName] = useState('');
  const [newPageId, setNewPageId] = useState('');
  const [newPageCategory, setNewPageCategory] = useState('Media / News Company');
  const [newPageToken, setNewPageToken] = useState('');
  const [newPagePicture, setNewPagePicture] = useState('');

  // Developer Token Import Modal state
  const [showTokenModal, setShowTokenModal] = useState(false);
  const [developerToken, setDeveloperToken] = useState('');
  const [tokenAppSecret, setTokenAppSecret] = useState('');
  const [isImportingToken, setIsImportingToken] = useState(false);
  const [tokenImportError, setTokenImportError] = useState('');

  const loadData = async () => {
    try {
      const [pagesRes, groupsRes] = await Promise.all([
        fetch('/api/facebook/pages').then(r => r.json()),
        fetch('/api/groups').then(r => r.json()),
      ]);

      if (pagesRes.pages) setPages(pagesRes.pages);
      if (groupsRes.groups) setGroups(groupsRes.groups);
      setLoading(false);
    } catch {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConnectFacebook = async () => {
    setActionMessage('Connecting Facebook...');
    const res = await fetch('/api/facebook/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'connect' }),
    });
    const data = await res.json();
    if (data.oauthUrl) {
      window.location.href = data.oauthUrl;
    } else {
      setActionMessage(data.message || 'Connected!');
      loadData();
      setTimeout(() => setActionMessage(''), 4000);
    }
  };

  const handleRefreshPages = async () => {
    setActionMessage('Synchronizing Pages from Meta Graph API...');
    const res = await fetch('/api/facebook/connect', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'refresh' }),
    });
    const data = await res.json();
    setActionMessage(data.message || 'Synchronized!');
    loadData();
    setTimeout(() => setActionMessage(''), 3000);
  };

  const handleImportByToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!developerToken.trim()) return;

    setIsImportingToken(true);
    setTokenImportError('');

    try {
      const res = await fetch('/api/facebook/connect', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_by_token',
          userAccessToken: developerToken.trim(),
          appSecret: tokenAppSecret.trim(),
        }),
      });

      const data = await res.json();
      setIsImportingToken(false);

      if (res.ok && data.success) {
        setActionMessage(data.message || `Connected ${data.count} Pages!`);
        setShowTokenModal(false);
        setDeveloperToken('');
        setTokenAppSecret('');
        loadData();
        setTimeout(() => setActionMessage(''), 5000);
      } else {
        setTokenImportError(data.error || 'Failed to import pages with this token.');
      }
    } catch (err: any) {
      setIsImportingToken(false);
      setTokenImportError(err.message || 'Network connection failed.');
    }
  };

  const handleAddPage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPageName || !newPageId) return;

    const res = await fetch('/api/facebook/pages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageName: newPageName,
        pageId: newPageId,
        category: newPageCategory,
        accessToken: newPageToken,
        pictureUrl: newPagePicture || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=150&auto=format&fit=crop&q=80',
      }),
    });

    if (res.ok) {
      setActionMessage(`Connected page "${newPageName}" successfully!`);
      setShowAddModal(false);
      setNewPageName('');
      setNewPageId('');
      setNewPageToken('');
      setNewPagePicture('');
      loadData();
      setTimeout(() => setActionMessage(''), 4000);
    } else {
      const err = await res.json();
      alert(err.error || 'Failed to add page');
    }
  };

  const handleDeletePage = async (id: string, pageName: string) => {
    if (!confirm(`Are you sure you want to remove Facebook Page "${pageName}"? All queued jobs for this page will be removed.`)) return;

    const res = await fetch(`/api/facebook/pages?id=${id}`, { method: 'DELETE' });
    if (res.ok) {
      setActionMessage(`Page "${pageName}" removed.`);
      loadData();
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const handleClearAllPages = async () => {
    if (!confirm('Are you sure you want to remove ALL connected Facebook Pages?')) return;

    const res = await fetch('/api/facebook/pages?id=all', { method: 'DELETE' });
    if (res.ok) {
      setActionMessage('All Facebook Pages removed.');
      loadData();
      setTimeout(() => setActionMessage(''), 3000);
    }
  };

  const toggleSelectAll = () => {
    if (selectedPages.length === pages.length) {
      setSelectedPages([]);
    } else {
      setSelectedPages(pages.map(p => p.id));
    }
  };

  const toggleSelectPage = (id: string) => {
    if (selectedPages.includes(id)) {
      setSelectedPages(selectedPages.filter(pId => pId !== id));
    } else {
      setSelectedPages([...selectedPages, id]);
    }
  };

  const handleSavePageConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPage) return;

    await fetch('/api/facebook/pages', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(editingPage),
    });

    setEditingPage(null);
    loadData();
  };

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGroupName) return;

    await fetch('/api/groups', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: newGroupName,
        color: newGroupColor,
        pageIds: selectedPages,
      }),
    });

    setNewGroupName('');
    setShowGroupModal(false);
    loadData();
  };

  const handleToggleQueuePause = async (pageId: string, currentPaused: boolean) => {
    await fetch('/api/queues', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        pageId,
        action: currentPaused ? 'resume' : 'pause',
      }),
    });
    loadData();
  };

  return (
    <AppShell>
      {/* Title & Action Bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
            Facebook Pages & Channel Management
          </h1>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Connect and manage your Facebook Pages using Developer User Access Tokens, OAuth, or Page IDs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            onClick={() => setShowTokenModal(true)}
            className="btn btn-primary"
            style={{ background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)', boxShadow: '0 4px 14px rgba(139, 92, 246, 0.3)' }}
          >
            <KeyRound size={16} />
            <span>Connect via Developer Token</span>
          </button>
          <button onClick={() => setShowAddModal(true)} className="btn btn-secondary">
            <Plus size={16} />
            <span>Add Single Page</span>
          </button>
          <button onClick={handleConnectFacebook} className="btn btn-secondary">
            <Facebook size={16} />
            <span>Connect via OAuth</span>
          </button>
          <button onClick={handleRefreshPages} className="btn btn-secondary">
            <RefreshCw size={15} />
            <span>Sync Pages</span>
          </button>
          {pages.length > 0 && (
            <button onClick={handleClearAllPages} className="btn btn-secondary" style={{ color: '#fca5a5' }}>
              <Trash2 size={15} />
              <span>Remove All</span>
            </button>
          )}
        </div>
      </div>

      {actionMessage && (
        <div style={{
          padding: '12px 18px',
          background: 'rgba(6, 182, 212, 0.15)',
          border: '1px solid rgba(6, 182, 212, 0.3)',
          borderRadius: 'var(--radius-md)',
          color: 'var(--primary)',
          marginBottom: '20px',
          fontSize: '13.5px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px'
        }}>
          <CheckCircle2 size={18} />
          <span>{actionMessage}</span>
        </div>
      )}

      {/* Meta Token Expired Alert Banner */}
      {pages.some(p => p.status === 'TOKEN_EXPIRED') && (
        <div style={{
          padding: '16px 20px',
          borderRadius: 'var(--radius-md)',
          background: 'rgba(239, 68, 68, 0.12)',
          border: '1px solid rgba(239, 68, 68, 0.35)',
          color: '#ffffff',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
          flexWrap: 'wrap',
          gap: '12px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <AlertCircle size={22} color="var(--danger)" />
            <div>
              <div style={{ fontWeight: 700, fontSize: '14px', color: '#fca5a5' }}>
                Meta Developer Access Token Expired
              </div>
              <div style={{ fontSize: '12.5px', color: 'var(--text-secondary)', marginTop: '2px' }}>
                Facebook rejected publishing because your developer session expired on Meta. Click the button to paste a fresh Developer User Token and re-authorize all pages.
              </div>
            </div>
          </div>
          <button
            onClick={() => setShowTokenModal(true)}
            className="btn btn-primary"
            style={{ background: 'var(--danger)', borderColor: 'var(--danger)', height: '36px', fontSize: '12.5px' }}
          >
            <KeyRound size={14} />
            <span>Update Meta Token Now</span>
          </button>
        </div>
      )}

      {/* Page Groups Strip */}
      {groups.length > 0 && (
        <div className="glass-card" style={{ marginBottom: '24px', padding: '16px 20px' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={16} color="var(--primary)" />
              <span style={{ fontWeight: 700, color: '#ffffff', fontSize: '13.5px' }}>Page Groups</span>
              <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>({groups.length} configured)</span>
            </div>

            <button
              onClick={() => setShowGroupModal(true)}
              className="btn btn-secondary"
              style={{ padding: '4px 12px', fontSize: '12px' }}
            >
              <Plus size={14} />
              <span>New Group</span>
            </button>
          </div>

          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            {groups.map(g => (
              <div
                key={g.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '6px 14px',
                  borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-surface)',
                  border: `1px solid ${g.color || 'var(--border-subtle)'}`,
                  fontSize: '12.5px'
                }}
              >
                <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: g.color || 'var(--primary)' }} />
                <strong style={{ color: '#ffffff' }}>{g.name}</strong>
                <span style={{ color: 'var(--text-muted)', fontSize: '11px' }}>({g.pageIds?.length || 0} Pages)</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Main Pages Table or Empty State */}
      {pages.length === 0 ? (
        <div className="glass-card" style={{ padding: '60px 20px', textAlign: 'center' }}>
          <div style={{
            width: '68px',
            height: '68px',
            borderRadius: '20px',
            background: 'linear-gradient(135deg, rgba(139, 92, 246, 0.2), rgba(6, 182, 212, 0.2))',
            border: '1px solid rgba(139, 92, 246, 0.3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto 16px',
            color: 'var(--primary)'
          }}>
            <KeyRound size={32} color="#c4b5fd" />
          </div>
          <h2 style={{ fontSize: '19px', fontWeight: 800, color: '#ffffff', marginBottom: '8px' }}>
            No Facebook Pages Connected
          </h2>
          <p style={{ color: 'var(--text-muted)', fontSize: '13.5px', maxWidth: '520px', margin: '0 auto 24px', lineHeight: 1.6 }}>
            Paste your Facebook Developer <strong>User Access Token</strong> to automatically retrieve and connect all your Facebook Pages in 1 click, or add pages manually.
          </p>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
            <button
              onClick={() => setShowTokenModal(true)}
              className="btn btn-primary"
              style={{ padding: '10px 24px', background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
            >
              <KeyRound size={16} />
              <span>Connect via Developer Token</span>
            </button>
            <button onClick={() => setShowAddModal(true)} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
              <Plus size={16} />
              <span>Add Single Page</span>
            </button>
            <button onClick={handleConnectFacebook} className="btn btn-secondary" style={{ padding: '10px 20px' }}>
              <Facebook size={16} />
              <span>Connect via OAuth</span>
            </button>
          </div>
        </div>
      ) : (
        <div className="data-table-wrapper">
          <table className="data-table">
            <thead>
              <tr>
                <th style={{ width: '40px' }}>
                  <input
                    type="checkbox"
                    checked={selectedPages.length === pages.length && pages.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th>Page Name & ID</th>
                <th>Status</th>
                <th>Group</th>
                <th>Today&apos;s Posts</th>
                <th>Daily Limit</th>
                <th>Next Scheduled</th>
                <th>Queue Control</th>
                <th style={{ textAlign: 'right' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {pages.map(page => (
                <tr key={page.id}>
                  <td>
                    <input
                      type="checkbox"
                      checked={selectedPages.includes(page.id)}
                      onChange={() => toggleSelectPage(page.id)}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <img
                        src={page.pictureUrl}
                        alt={page.pageName}
                        style={{ width: '38px', height: '38px', borderRadius: '50%', objectFit: 'cover' }}
                      />
                      <div>
                        <div style={{ fontWeight: 700, color: '#ffffff' }}>{page.pageName}</div>
                        <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>ID: {page.pageId} • {page.category}</div>
                      </div>
                    </div>
                  </td>
                  <td>
                    {page.status === 'TOKEN_EXPIRED' ? (
                      <span className="badge" style={{ background: 'rgba(239, 68, 68, 0.2)', border: '1px solid var(--danger)', color: '#f87171', fontWeight: 700, fontSize: '11px' }}>
                        TOKEN EXPIRED
                      </span>
                    ) : (
                      <span className={`badge ${page.status === 'ACTIVE' ? 'badge-success' : 'badge-danger'}`}>
                        {page.status}
                      </span>
                    )}
                  </td>
                  <td>
                    {page.groups?.length > 0 ? (
                      <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                        {page.groups.map((g: any) => (
                          <span key={g.id} className="badge badge-info" style={{ fontSize: '11px', padding: '2px 8px' }}>
                            {g.name}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>None</span>
                    )}
                  </td>
                  <td>
                    <span style={{ fontWeight: 700, color: page.todayPostsCount >= page.dailyLimit ? 'var(--danger)' : '#ffffff' }}>
                      {page.todayPostsCount}
                    </span>
                    <span style={{ color: 'var(--text-muted)' }}> / {page.dailyLimit}</span>
                  </td>
                  <td>
                    <span style={{ color: 'var(--text-secondary)' }}>{page.dailyLimit}/day</span>
                    <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>gap: {page.minGapMinutes}m</div>
                  </td>
                  <td>
                    {page.nextScheduledPost ? (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--primary)' }}>
                        <Clock size={13} />
                        <span style={{ fontSize: '12px' }}>{new Date(page.nextScheduledPost).toLocaleTimeString()}</span>
                      </div>
                    ) : (
                      <span style={{ color: 'var(--text-muted)', fontSize: '12px' }}>Idle / None</span>
                    )}
                  </td>
                  <td>
                    <button
                      onClick={() => handleToggleQueuePause(page.id, page.isPaused)}
                      className="btn btn-secondary"
                      style={{ padding: '4px 10px', fontSize: '11.5px' }}
                    >
                      {page.isPaused ? (
                        <>
                          <Play size={12} color="var(--success)" />
                          <span>Resume</span>
                        </>
                      ) : (
                        <>
                          <Pause size={12} color="var(--warning)" />
                          <span>Pause</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td style={{ textAlign: 'right' }}>
                    <div style={{ display: 'inline-flex', gap: '6px' }}>
                      <button
                        onClick={() => setEditingPage(page)}
                        className="btn btn-secondary"
                        style={{ padding: '5px 10px', fontSize: '12px' }}
                        title="Configure limits"
                      >
                        <Settings2 size={14} />
                      </button>
                      <button
                        onClick={() => handleDeletePage(page.id, page.pageName)}
                        className="btn btn-danger"
                        style={{ padding: '5px 8px' }}
                        title="Delete Page"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Developer Access Token Import Modal */}
      {showTokenModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(0,0,0,0.75)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 110,
          padding: '20px'
        }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '560px', padding: '30px', background: '#0e131f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: 'rgba(139, 92, 246, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <KeyRound size={20} color="#c4b5fd" />
                </div>
                <div>
                  <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                    Connect via Meta Developer Token
                  </h3>
                  <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                    Fetch and connect all authorized Facebook Pages at once
                  </p>
                </div>
              </div>
              <button onClick={() => setShowTokenModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            {tokenImportError && (
              <div style={{
                padding: '12px 14px',
                background: 'rgba(239, 68, 68, 0.15)',
                border: '1px solid rgba(239, 68, 68, 0.3)',
                borderRadius: 'var(--radius-md)',
                color: '#fca5a5',
                fontSize: '13px',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <AlertCircle size={18} />
                <span>{tokenImportError}</span>
              </div>
            )}

            <form onSubmit={handleImportByToken} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px', fontWeight: 600 }}>
                  Facebook Developer User Access Token *
                </label>
                <textarea
                  rows={4}
                  placeholder="Paste your User Access Token here (e.g. EAABsbCS19...)"
                  value={developerToken}
                  onChange={e => setDeveloperToken(e.target.value)}
                  className="input-control font-mono"
                  style={{ fontSize: '12px' }}
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Meta App Secret (Optional - for long-lived token exchange)
                </label>
                <input
                  type="password"
                  placeholder="App Secret from Meta Developer App Dashboard"
                  value={tokenAppSecret}
                  onChange={e => setTokenAppSecret(e.target.value)}
                  className="input-control font-mono"
                />
              </div>

              {/* Instructions Callout */}
              <div style={{
                background: 'rgba(255, 255, 255, 0.03)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-subtle)',
                padding: '12px 14px',
                fontSize: '12px',
                color: 'var(--text-muted)',
                lineHeight: 1.5
              }}>
                <div style={{ fontWeight: 600, color: 'var(--primary)', marginBottom: '4px' }}>
                  💡 How to get your Token from Meta Developer:
                </div>
                1. Open <a href="https://developers.facebook.com/tools/explorer/" target="_blank" rel="noreferrer" style={{ color: '#38bdf8' }}>Graph API Explorer <ExternalLink size={11} style={{ display: 'inline' }} /></a>.<br />
                2. Select your Meta App and click <strong>Generate Access Token</strong>.<br />
                3. Add permissions: <code className="font-mono" style={{ color: '#e2e8f0' }}>pages_show_list</code>, <code className="font-mono" style={{ color: '#e2e8f0' }}>pages_read_engagement</code>, and <code className="font-mono" style={{ color: '#e2e8f0' }}>pages_manage_posts</code>.<br />
                4. Copy the generated token and paste it above.<br />
                <span style={{ color: 'var(--text-secondary)' }}><em>Tip: You can also type &apos;demo&apos; in the token box to test the feature without live Meta credentials.</em></span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '6px' }}>
                <button type="button" onClick={() => setShowTokenModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isImportingToken || !developerToken.trim()}
                  className="btn btn-primary"
                  style={{ flex: 1.5, background: 'linear-gradient(135deg, #8b5cf6, #06b6d4)' }}
                >
                  {isImportingToken ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Querying Meta API...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles size={16} />
                      <span>Fetch & Connect All Pages</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Single Page Modal */}
      {showAddModal && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '28px', background: '#0e131f' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff' }}>
                Add Facebook Page Manually
              </h3>
              <button onClick={() => setShowAddModal(false)} style={{ background: 'transparent', border: 'none', color: 'var(--text-muted)', cursor: 'pointer' }}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddPage} style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Facebook Page Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. My Brand Official"
                  value={newPageName}
                  onChange={e => setNewPageName(e.target.value)}
                  className="input-control"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Facebook Page ID (from Page About or Meta Developer Console) *
                </label>
                <input
                  type="text"
                  placeholder="e.g. 102938475619283"
                  value={newPageId}
                  onChange={e => setNewPageId(e.target.value)}
                  className="input-control font-mono"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Page Category
                </label>
                <input
                  type="text"
                  placeholder="e.g. Entertainment, News, Tech"
                  value={newPageCategory}
                  onChange={e => setNewPageCategory(e.target.value)}
                  className="input-control"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Page Access Token (Permanent or Long-Lived Token)
                </label>
                <input
                  type="password"
                  placeholder="EAAB..."
                  value={newPageToken}
                  onChange={e => setNewPageToken(e.target.value)}
                  className="input-control font-mono"
                />
                <span style={{ fontSize: '11px', color: 'var(--text-muted)', marginTop: '4px', display: 'block' }}>
                  Leave empty if using Demo Simulator or connecting via Meta OAuth.
                </span>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowAddModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save & Connect Page
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Page Configuration Modal */}
      {editingPage && (
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
              Configure {editingPage.pageName}
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Set rate limiting, minimum gaps, and status for this Facebook Page.
            </p>

            <form onSubmit={handleSavePageConfig} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Daily Post Limit (Posts / Day)
                </label>
                <input
                  type="number"
                  value={editingPage.dailyLimit}
                  onChange={e => setEditingPage({ ...editingPage, dailyLimit: e.target.value })}
                  className="input-control"
                  min="1"
                  max="100"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Hourly Post Limit (Posts / Hour)
                </label>
                <input
                  type="number"
                  value={editingPage.hourlyLimit}
                  onChange={e => setEditingPage({ ...editingPage, hourlyLimit: e.target.value })}
                  className="input-control"
                  min="1"
                  max="20"
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Minimum Gap Between Posts (Minutes)
                </label>
                <input
                  type="number"
                  value={editingPage.minGapMinutes}
                  onChange={e => setEditingPage({ ...editingPage, minGapMinutes: e.target.value })}
                  className="input-control"
                  min="5"
                  max="1440"
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setEditingPage(null)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Save Configuration
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create Group Modal */}
      {showGroupModal && (
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
          <div className="glass-card" style={{ width: '100%', maxWidth: '440px', padding: '28px', background: '#0e131f' }}>
            <h3 style={{ fontSize: '18px', fontWeight: 800, color: '#ffffff', marginBottom: '6px' }}>
              Create Page Group
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Assign multiple Pages to a unified category group for bulk scheduling.
            </p>

            <form onSubmit={handleCreateGroup} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Group Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Sports Reels, Global Tech"
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  className="input-control"
                  required
                />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '12.5px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Accent Color
                </label>
                <input
                  type="color"
                  value={newGroupColor}
                  onChange={e => setNewGroupColor(e.target.value)}
                  style={{ width: '100%', height: '40px', background: 'transparent', border: 'none', cursor: 'pointer' }}
                />
              </div>

              <div style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                Pages to include: <strong>{selectedPages.length > 0 ? `${selectedPages.length} selected in table` : 'All selected Pages'}</strong>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowGroupModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Create Group
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
