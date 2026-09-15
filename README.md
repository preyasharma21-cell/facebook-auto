# AutoPilot Pro — Private Multi-Page Facebook Automation & Scheduling Platform

AutoPilot Pro is an enterprise-grade, private, single-owner web application engineered for automating video transcoding and bulk scheduled publishing across multiple Facebook Pages.

---

## 🌟 Key Architecture & Capabilities

- **Single-Owner Security**: Private console with bcrypt password hashing, HTTP-only session cookies, and zero external subscriptions or customer billing bloat.
- **Dual Operating Modes**:
  - **Demo Simulator Mode**: Out-of-the-box sandbox testing with simulated Facebook Graph API, mock accounts, simulated uploads, worker queues, and retry logic without needing Meta app approval.
  - **Live Meta Graph API Mode**: Official OAuth 2.0 and Graph API v20+ video publishing with scoped Page permissions (`pages_show_list`, `pages_read_engagement`, `pages_manage_posts`).
### 🌐 3. Facebook Pages & Channel Management (`/pages`)
- **Clean Production Baseline**: All demo pages have been completely removed. The system starts in a clean state (0 connected pages).
- **Add Facebook Page Modal**: Allows manually adding any real Facebook Page by Page Name, Page ID, Category, and Page Access Token.
- **Connect Facebook OAuth**: Official Meta Graph API v20+ OAuth integration.
- **Delete / Remove Pages**: Per-page delete action and "Remove All Pages" option with queue cleanup.
- **Page Groups**: Create customized categories (e.g. *Entertainment*, *Tech*) to assign videos across multiple pages simultaneously.
- **Per-Page Rate Limits**: Daily limit, hourly limit, and minimum interval gap minutes.
- **Batch Folder Upload with Auto-Mapping**: Select a folder structure (`VIDEOS/Page-A/...`, `VIDEOS/Page-B/...`); AutoPilot automatically detects subfolders and maps them to destination Facebook Pages.
- **FFmpeg Transcoding Engine**: Pre-configured profiles (Reel 9:16 Vertical, HD Landscape 16:9, Square 1:1, 4K) utilizing server-side FFmpeg for faststart MP4 encoding and automatic video thumbnail extraction.
- **Visual Calendar Scheduler**: Day, Week, and Month interactive scheduler with recurring posting rules respecting the owner's configured timezone (default: `Asia/Karachi` PKT, UTC+5).
- **Persistent Background Worker**: Runs continuously in the background on the server even when the owner closes the browser, with job locking, exponential backoff retries, and duplicate post prevention.
- **Real-Time Live Telemetry**: Live log console powered by Server-Sent Events (SSE) broadcasting publishing status, transcode events, and API diagnostics.

---

## 🚀 Quick Start (Local Development)

### 1. Prerequisites
- Node.js 18+ or 20+ (LTS recommended)
- FFmpeg (installed and accessible in system PATH)

### 2. Installation
Clone or navigate to the project directory:
```bash
cd facebook-autopilot
npm install
```

### 3. Environment Setup
Copy the example environment file:
```bash
cp .env.example .env.local
```

Default credentials out of the box:
- **Owner Username**: `admin`
- **Owner Password**: `admin123456`
- **Port**: `3000`
- **Default Timezone**: `Asia/Karachi`

### 4. Run Development Server
```bash
npm run dev
```
Open your browser at [http://localhost:3000](http://localhost:3000).

---

## 🐳 Docker Production Deployment

AutoPilot includes a production-ready `docker-compose.yml` orchestrating Next.js, PostgreSQL 16, Redis 7, and the background worker daemon:

```bash
docker-compose up -d --build
```

### Services Spawned:
- **`web`**: Next.js App Router frontend and REST API on port `3000`
- **`postgres`**: PostgreSQL database with auto-initialized `scripts/schema.sql` on port `5432`
- **`redis`**: High-performance cache and job queue broker on port `6379`
- **`worker`**: Background queue execution worker

---

## 🔑 Facebook / Meta API Configuration

To switch from **Demo Mode** to **Live Mode**:
1. Go to [Meta for Developers](https://developers.facebook.com) and create a **Business App**.
2. Under **Facebook Login for Business**, add your redirect URI:
   `http://localhost:3000/api/facebook/callback`
3. Request standard permissions:
   - `pages_show_list`
   - `pages_read_engagement`
   - `pages_manage_posts`
4. Copy your **App ID** and **App Secret** into `Settings` inside the dashboard or update your `.env.local`:
   ```env
   META_APP_ID=your_app_id_here
   META_APP_SECRET=your_app_secret_here
   DEMO_MODE=false
   ```
5. Click **Connect Facebook** in the Facebook Pages tab to complete the official OAuth authorization.

---

## 📁 Folder Upload & Mapping Convention

When selecting a root folder for bulk upload:
```text
MY_VIDEOS/
├── Motivation_Page/
│   ├── clip_01.mp4
│   └── clip_02.mp4
├── Tech_Spotlight/
│   ├── ai_demo.mov
│   └── coding_tips.webm
```
AutoPilot automatically reads the first-level folders and prompts you with a mapping matrix to link each folder to its corresponding Facebook Page.

---

## 🛠️ Verification & Health Check

Query the built-in observability endpoint:
```bash
curl http://localhost:3000/api/health
```
Expected JSON output:
```json
{
  "status": "healthy",
  "components": {
    "api": { "status": "up" },
    "database": { "status": "up" },
    "worker": { "status": "running" },
    "ffmpeg": { "status": "available" },
    "facebook": { "status": "connected", "mode": "demo" }
  }
}
```
