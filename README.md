# TubePilot AI — AI YouTube Automation Platform

A secure, production-ready web application for managing YouTube automation from a single dashboard. Admin-only access with server-side API key management, AI content generation, trending topic discovery, scheduling, and YouTube channel integration.

## Features

- **First-time Admin Setup Wizard** — create your admin account on first launch; the wizard hides permanently afterward
- **Secure Login** — email/password authentication with session management
- **Admin Dashboard** — upload status, scheduled videos, connected APIs, AI module status, analytics overview
- **API Manager** — add, update, delete, enable/disable, and test connections for all your API keys (keys stored server-side, never exposed to frontend)
- **YouTube Automation** — media library, video queue, scheduling, YouTube channel OAuth connection
- **AI Content Pipeline** — script, title, description, hashtag, tag, thumbnail, voice, and video generation via OpenAI, Google Gemini, or OpenRouter
- **Trending System** — trending topic finder with country, language, and audience selectors (USA, UK, Canada, Australia, Global)
- **Scheduler** — upload scheduling, task queue, background job processing
- **Premium Dark UI** — responsive, animated, professional design

## Security

- All API keys are stored server-side in the database and accessed only through edge functions
- The frontend only ever sees masked key previews (e.g., `sk-x••••abcd`)
- Admin-only access enforced on every edge function via `requireAdmin()`
- Row Level Security (RLS) enabled on all database tables
- API keys are never hardcoded — add them through the API Manager after deployment

## Tech Stack

- **Frontend**: React + TypeScript + Vite + Tailwind CSS + Lucide Icons
- **Backend**: Supabase (Postgres, Auth, Edge Functions, Storage)
- **Edge Functions**: Deno-based serverless functions for all API operations

## Supported API Providers

| Category | Providers |
|----------|-----------|
| AI | OpenAI, Google Gemini, OpenRouter |
| Video/Voice | ElevenLabs, Video Generation, Image Generation |
| YouTube | YouTube Data API v3, YouTube OAuth Client ID/Secret |
| Social | Facebook API, Instagram API |
| Storage | Cloudinary, Supabase Configuration |

## Local Development

```bash
npm install
npm run dev
```

The dev server starts automatically. Open the app in your browser.

## Deployment

### 1. Deploy to a hosting platform

This is a Vite static build. Deploy the `dist/` folder to any static host:

- **Netlify**: Connect your GitHub repo, set build command `npm run build`, publish directory `dist`
- **Vercel**: Import the repo, framework preset "Vite", build command `npm run build`, output `dist`
- **GitHub Pages**: Run `npm run build`, then deploy `dist/` via GitHub Actions

### 2. Environment variables

The following are pre-configured in `.env` and must be available at build time:

```
VITE_SUPABASE_URL=<your-supabase-url>
VITE_SUPABASE_ANON_KEY=<your-supabase-anon-key>
```

No API keys are needed in environment variables — they are managed through the API Manager UI.

### 3. GitHub export

```bash
git init
git add .
git commit -m "Initial commit: TubePilot AI YouTube Automation Platform"
git remote add origin <your-repo-url>
git push -u origin main
```

### 4. Post-deployment setup

1. Visit your deployed app — the **Admin Setup Wizard** appears on first launch
2. Create your admin email and password
3. Go to **Settings → API Manager** and add your API keys
4. Enable each key and test the connection
5. Connect your YouTube channel in **YouTube Automation**
6. Start generating content in **AI Content Pipeline**
7. Find trending topics in **Trending System**
8. Schedule uploads in **Scheduler**

## Database Schema

All tables have RLS enabled and are scoped to authenticated admin users:

- `app_config` — platform configuration (admin status, YouTube connection)
- `api_keys` — encrypted API credentials (masked via `api_keys_masked` view)
- `media` — uploaded media assets
- `videos` — video records for YouTube upload
- `scheduled_tasks` — background job queue
- `ai_generations` — AI content generation log
- `trending_searches` — saved trending topic searches

## Edge Functions

| Function | Purpose |
|----------|---------|
| `api-manager` | CRUD + test-connection for API keys |
| `ai-generate` | AI content generation (scripts, titles, etc.) |
| `trending` | Trending topic finder |
| `youtube-proxy` | YouTube OAuth + channel connection |
| `scheduler` | Process pending upload tasks |

## Maintenance

- **Add a new API key**: Settings → API Manager → Add Key
- **Rotate a key**: Settings → API Manager → Update
- **Disconnect YouTube**: YouTube Automation → Disconnect
- **Process scheduled uploads**: Scheduler → Process Queue Now
- **View generation history**: AI Content Pipeline → Recent Generations
