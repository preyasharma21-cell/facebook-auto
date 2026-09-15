-- =============================================================================
-- Facebook Content Automation & Scheduling Platform - PostgreSQL Schema
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users (Owner authentication)
CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    username VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    two_factor_secret VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions
CREATE TABLE IF NOT EXISTS sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token VARCHAR(255) UNIQUE NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 3. Facebook Accounts
CREATE TABLE IF NOT EXISTS facebook_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fb_user_id VARCHAR(100) NOT NULL,
    name VARCHAR(255) NOT NULL,
    access_token_enc TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'CONNECTED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 4. Page Groups
CREATE TABLE IF NOT EXISTS page_groups (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    color VARCHAR(20) DEFAULT '#06b6d4',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 5. Facebook Pages
CREATE TABLE IF NOT EXISTS facebook_pages (
    id VARCHAR(64) PRIMARY KEY,
    account_id VARCHAR(64) REFERENCES facebook_accounts(id) ON DELETE SET NULL,
    page_id VARCHAR(100) UNIQUE NOT NULL,
    page_name VARCHAR(255) NOT NULL,
    category VARCHAR(100),
    picture_url TEXT,
    access_token_enc TEXT,
    status VARCHAR(50) DEFAULT 'ACTIVE',
    daily_limit INT DEFAULT 10,
    hourly_limit INT DEFAULT 2,
    min_gap_minutes INT DEFAULT 60,
    last_sync_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 6. Page Group Members
CREATE TABLE IF NOT EXISTS page_group_members (
    page_id VARCHAR(64) REFERENCES facebook_pages(id) ON DELETE CASCADE,
    group_id VARCHAR(64) REFERENCES page_groups(id) ON DELETE CASCADE,
    PRIMARY KEY (page_id, group_id)
);

-- 7. Media Sources
CREATE TABLE IF NOT EXISTS media_sources (
    id VARCHAR(64) PRIMARY KEY,
    source_type VARCHAR(50) NOT NULL, -- LOCAL_UPLOAD, FOLDER_UPLOAD, INSTAGRAM, TIKTOK, YOUTUBE, BULK_URL
    source_url TEXT,
    external_id VARCHAR(255),
    authorization_status VARCHAR(50) DEFAULT 'AUTHORIZED',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 8. Processing Presets
CREATE TABLE IF NOT EXISTS processing_presets (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    resolution VARCHAR(50) DEFAULT '1080x1920',
    aspect_ratio VARCHAR(20) DEFAULT '9:16',
    video_bitrate VARCHAR(20) DEFAULT '4500k',
    fps INT DEFAULT 30,
    audio_bitrate VARCHAR(20) DEFAULT '192k',
    volume NUMERIC(3, 2) DEFAULT 1.00,
    speed NUMERIC(3, 2) DEFAULT 1.00,
    watermark_enabled BOOLEAN DEFAULT FALSE,
    watermark_path TEXT,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 9. Media Assets
CREATE TABLE IF NOT EXISTS media_assets (
    id VARCHAR(64) PRIMARY KEY,
    source_id VARCHAR(64) REFERENCES media_sources(id) ON DELETE SET NULL,
    filename VARCHAR(255) NOT NULL,
    file_path TEXT NOT NULL,
    thumbnail_path TEXT,
    file_size BIGINT DEFAULT 0,
    duration NUMERIC(10, 2) DEFAULT 0,
    resolution VARCHAR(50),
    aspect_ratio VARCHAR(20),
    fps INT,
    source_type VARCHAR(50) DEFAULT 'LOCAL_UPLOAD',
    caption_default TEXT,
    hashtags_default TEXT,
    status VARCHAR(50) DEFAULT 'READY', -- UPLOADING, PROCESSING, READY, ERROR
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 10. Video Processing Jobs
CREATE TABLE IF NOT EXISTS video_processing_jobs (
    id VARCHAR(64) PRIMARY KEY,
    media_id VARCHAR(64) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    preset_id VARCHAR(64) REFERENCES processing_presets(id) ON DELETE SET NULL,
    status VARCHAR(50) DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
    progress INT DEFAULT 0,
    output_path TEXT,
    error_message TEXT,
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 11. Caption Templates
CREATE TABLE IF NOT EXISTS caption_templates (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    template_text TEXT NOT NULL,
    hashtag_text TEXT,
    page_id VARCHAR(64) REFERENCES facebook_pages(id) ON DELETE CASCADE,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 12. Posting Queues (Per-Page Queue Controls)
CREATE TABLE IF NOT EXISTS posting_queues (
    id VARCHAR(64) PRIMARY KEY,
    page_id VARCHAR(64) UNIQUE NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
    is_paused BOOLEAN DEFAULT FALSE,
    current_position INT DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 13. Posting Jobs
CREATE TABLE IF NOT EXISTS posting_jobs (
    id VARCHAR(64) PRIMARY KEY,
    queue_id VARCHAR(64) REFERENCES posting_queues(id) ON DELETE CASCADE,
    page_id VARCHAR(64) NOT NULL REFERENCES facebook_pages(id) ON DELETE CASCADE,
    media_id VARCHAR(64) NOT NULL REFERENCES media_assets(id) ON DELETE CASCADE,
    preset_id VARCHAR(64) REFERENCES processing_presets(id) ON DELETE SET NULL,
    caption TEXT,
    hashtags TEXT,
    position INT DEFAULT 0,
    scheduled_for TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'QUEUED', -- QUEUED, PROCESSING, PUBLISHING, PUBLISHED, FAILED, RETRYING, CANCELLED
    retry_count INT DEFAULT 0,
    max_retries INT DEFAULT 3,
    last_error TEXT,
    locked_at TIMESTAMP WITH TIME ZONE,
    locked_by VARCHAR(100),
    published_post_id VARCHAR(100),
    published_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 14. Posting History
CREATE TABLE IF NOT EXISTS posting_history (
    id VARCHAR(64) PRIMARY KEY,
    job_id VARCHAR(64) REFERENCES posting_jobs(id) ON DELETE SET NULL,
    page_id VARCHAR(64) REFERENCES facebook_pages(id) ON DELETE CASCADE,
    media_id VARCHAR(64) REFERENCES media_assets(id) ON DELETE SET NULL,
    post_id VARCHAR(100),
    status VARCHAR(50) NOT NULL,
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    error_message TEXT,
    response_payload JSONB
);

-- 15. Schedules (Recurring & Scheduled Rule configurations)
CREATE TABLE IF NOT EXISTS schedules (
    id VARCHAR(64) PRIMARY KEY,
    page_id VARCHAR(64) REFERENCES facebook_pages(id) ON DELETE CASCADE,
    schedule_type VARCHAR(50) DEFAULT 'RECURRING', -- ONCE, RECURRING
    start_time VARCHAR(10) DEFAULT '09:00',
    end_time VARCHAR(10) DEFAULT '21:00',
    posts_per_day INT DEFAULT 5,
    interval_minutes INT DEFAULT 120,
    days_of_week VARCHAR(100) DEFAULT '1,2,3,4,5,6,7',
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 16. Logs (Observability & live streaming)
CREATE TABLE IF NOT EXISTS logs (
    id VARCHAR(64) PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    level VARCHAR(20) NOT NULL, -- INFO, SUCCESS, WARNING, ERROR
    category VARCHAR(50) NOT NULL, -- AUTH, FACEBOOK, UPLOAD, FFmpeg, SCHEDULER, WORKER, SYSTEM
    page_id VARCHAR(64) REFERENCES facebook_pages(id) ON DELETE SET NULL,
    job_id VARCHAR(64) REFERENCES posting_jobs(id) ON DELETE SET NULL,
    message TEXT NOT NULL,
    metadata JSONB
);

-- 17. Settings (Key-Value Platform config)
CREATE TABLE IF NOT EXISTS settings (
    key VARCHAR(100) PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for maximum query performance & queue locking
CREATE INDEX IF NOT EXISTS idx_posting_jobs_due ON posting_jobs (scheduled_for, status) WHERE status IN ('QUEUED', 'RETRYING');
CREATE INDEX IF NOT EXISTS idx_posting_jobs_page ON posting_jobs (page_id, position);
CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON logs (timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_logs_category ON logs (category);
CREATE INDEX IF NOT EXISTS idx_media_assets_status ON media_assets (status);
CREATE INDEX IF NOT EXISTS idx_posting_history_published ON posting_history (published_at DESC);
