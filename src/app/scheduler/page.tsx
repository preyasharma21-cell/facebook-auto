'use client';

import React, { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  CalendarDays,
  Clock,
  Plus,
  ChevronLeft,
  ChevronRight,
  Repeat,
  CheckCircle2,
  Calendar as CalendarIcon,
  Globe
} from 'lucide-react';

export default function SchedulerPage() {
  const [view, setView] = useState<'day' | 'week' | 'month'>('week');
  const [jobs, setJobs] = useState<any[]>([]);
  const [pages, setPages] = useState<any[]>([]);
  const [selectedPageFilter, setSelectedPageFilter] = useState('ALL');
  const [showRecurringModal, setShowRecurringModal] = useState(false);

  // Recurring form state
  const [recurringPageId, setRecurringPageId] = useState('');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('21:00');
  const [postsPerDay, setPostsPerDay] = useState(5);
  const [intervalMinutes, setIntervalMinutes] = useState(90);
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    Promise.all([
      fetch('/api/jobs').then(r => r.json()),
      fetch('/api/facebook/pages').then(r => r.json()),
    ]).then(([jRes, pRes]) => {
      if (jRes.jobs) setJobs(jRes.jobs);
      if (pRes.pages) {
        setPages(pRes.pages);
        if (pRes.pages.length > 0) setRecurringPageId(pRes.pages[0].id);
      }
    });
  }, []);

  const handleCreateRecurring = (e: React.FormEvent) => {
    e.preventDefault();
    setSuccessMsg(`Recurring schedule set for ${postsPerDay} posts/day between ${startTime} and ${endTime} with ${intervalMinutes}m interval.`);
    setShowRecurringModal(false);
    setTimeout(() => setSuccessMsg(''), 5000);
  };

  const filteredJobs = selectedPageFilter === 'ALL'
    ? jobs
    : jobs.filter(j => j.pageId === selectedPageFilter);

  // Days for the current week
  const weekDays = [
    { name: 'Monday', date: 'Sep 14', isToday: true },
    { name: 'Tuesday', date: 'Sep 15' },
    { name: 'Wednesday', date: 'Sep 16' },
    { name: 'Thursday', date: 'Sep 17' },
    { name: 'Friday', date: 'Sep 18' },
    { name: 'Saturday', date: 'Sep 19' },
    { name: 'Sunday', date: 'Sep 20' },
  ];

  return (
    <AppShell>
      {/* Title & Toolbar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '24px', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <h1 style={{ fontSize: '24px', fontWeight: 800, color: '#ffffff', letterSpacing: '-0.4px' }}>
              Posting Calendar & Automated Scheduler
            </h1>
            <span className="badge badge-info" style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <Globe size={12} />
              Asia/Karachi (UTC+5)
            </span>
          </div>
          <p style={{ color: 'var(--text-secondary)', fontSize: '13.5px', marginTop: '4px' }}>
            Visual multi-page calendar view, recurring slots, interval gaps, and publication schedules.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={() => setShowRecurringModal(true)}
            className="btn btn-primary"
          >
            <Repeat size={15} />
            <span>Configure Recurring Engine</span>
          </button>
        </div>
      </div>

      {successMsg && (
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
          <span>{successMsg}</span>
        </div>
      )}

      {/* Calendar Controls */}
      <div className="glass-card" style={{ padding: '14px 20px', marginBottom: '20px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <button className="btn btn-secondary" style={{ padding: '6px 10px' }}><ChevronLeft size={16} /></button>
            <span style={{ fontWeight: 700, fontSize: '15px', color: '#ffffff', minWidth: '130px', textAlign: 'center' }}>
              September 2026
            </span>
            <button className="btn btn-secondary" style={{ padding: '6px 10px' }}><ChevronRight size={16} /></button>
          </div>

          {/* Page Filter */}
          <select
            value={selectedPageFilter}
            onChange={e => setSelectedPageFilter(e.target.value)}
            className="input-control"
            style={{ width: '220px', height: '36px', fontSize: '13px' }}
          >
            <option value="ALL">All Destination Pages</option>
            {pages.map(p => (
              <option key={p.id} value={p.id}>{p.pageName}</option>
            ))}
          </select>
        </div>

        {/* View Switcher */}
        <div style={{ display: 'flex', gap: '6px', background: 'var(--bg-surface)', padding: '4px', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-subtle)' }}>
          <button
            onClick={() => setView('day')}
            className={`btn ${view === 'day' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 14px', fontSize: '12px' }}
          >
            Day
          </button>
          <button
            onClick={() => setView('week')}
            className={`btn ${view === 'week' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 14px', fontSize: '12px' }}
          >
            Week
          </button>
          <button
            onClick={() => setView('month')}
            className={`btn ${view === 'month' ? 'btn-primary' : 'btn-secondary'}`}
            style={{ padding: '4px 14px', fontSize: '12px' }}
          >
            Month
          </button>
        </div>
      </div>

      {/* Week Calendar Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(7, 1fr)',
        gap: '12px',
        minHeight: '480px'
      }}>
        {weekDays.map((day, idx) => (
          <div
            key={idx}
            className="glass-card"
            style={{
              padding: '12px',
              display: 'flex',
              flexDirection: 'column',
              background: day.isToday ? 'rgba(6, 182, 212, 0.05)' : 'var(--bg-card)',
              borderColor: day.isToday ? 'rgba(6, 182, 212, 0.3)' : 'var(--border-subtle)',
            }}
          >
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              borderBottom: '1px solid var(--border-subtle)',
              paddingBottom: '8px',
              marginBottom: '10px'
            }}>
              <div>
                <div style={{ fontSize: '13px', fontWeight: 700, color: day.isToday ? 'var(--primary)' : '#ffffff' }}>
                  {day.name}
                </div>
                <div style={{ fontSize: '11px', color: 'var(--text-muted)' }}>{day.date}</div>
              </div>
              {day.isToday && (
                <span className="badge badge-info" style={{ fontSize: '10px', padding: '1px 6px' }}>
                  TODAY
                </span>
              )}
            </div>

            {/* Scheduled slots in day */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {filteredJobs.slice(0, 3).map((job, jIdx) => (
                <div
                  key={jIdx}
                  style={{
                    padding: '8px 10px',
                    borderRadius: 'var(--radius-sm)',
                    background: 'var(--bg-surface)',
                    borderLeft: '3px solid var(--primary)',
                    border: '1px solid var(--border-subtle)',
                    borderLeftWidth: '3px',
                    fontSize: '11.5px',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: 'var(--primary)', fontWeight: 600, marginBottom: '2px' }}>
                    <Clock size={11} />
                    <span>{new Date(job.scheduledFor).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  <div style={{ fontWeight: 600, color: '#ffffff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {job.caption || job.media?.filename}
                  </div>
                  <div style={{ color: 'var(--text-muted)', fontSize: '10.5px' }}>
                    {job.page?.pageName || 'Daily Motivation'}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Recurring Schedule Modal */}
      {showRecurringModal && (
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
              Create Recurring Posting Schedule
            </h3>
            <p style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '20px' }}>
              Define automated posting frequency, time window, and intervals per Facebook Page.
            </p>

            <form onSubmit={handleCreateRecurring} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                  Target Facebook Page
                </label>
                <select
                  value={recurringPageId}
                  onChange={e => setRecurringPageId(e.target.value)}
                  className="input-control"
                  required
                >
                  {pages.map(p => (
                    <option key={p.id} value={p.id}>{p.pageName}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Window Start Time
                  </label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={e => setStartTime(e.target.value)}
                    className="input-control"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Window End Time
                  </label>
                  <input
                    type="time"
                    value={endTime}
                    onChange={e => setEndTime(e.target.value)}
                    className="input-control"
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Target Posts / Day
                  </label>
                  <input
                    type="number"
                    value={postsPerDay}
                    onChange={e => setPostsPerDay(Number(e.target.value))}
                    className="input-control"
                    min="1"
                    max="50"
                  />
                </div>
                <div>
                  <label style={{ display: 'block', fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '6px' }}>
                    Min Gap (Minutes)
                  </label>
                  <input
                    type="number"
                    value={intervalMinutes}
                    onChange={e => setIntervalMinutes(Number(e.target.value))}
                    className="input-control"
                    min="15"
                    max="360"
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', marginTop: '12px' }}>
                <button type="button" onClick={() => setShowRecurringModal(false)} className="btn btn-secondary" style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                  Activate Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </AppShell>
  );
}
