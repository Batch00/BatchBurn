# BatchBurn

A personal workout tracking and analytics app for runners. Log runs, 
cross training, and races. Track shoe mileage, set goals, and visualize 
performance trends — all from a mobile-first dark athletic interface.

**Live**: https://batchburn.batch-apps.com  
**Ecosystem**: [batch-apps.com](https://www.batch-apps.com)

## Features
- Log runs and cross training with auto-calculated pace
- Strava OAuth sync — Garmin activities import automatically
- Dashboard: WTD/MTD/YTD KPIs, weekly chart, activity feed
- Analytics: pace trend, mileage by type, personal bests
- Shoe tracker with mileage, price/mile, primary shoe auto-assign
- Race log with automatic PR detection
- Weekly/monthly/yearly mileage goals
- Invite-only with demo account
- PWA — installable on iOS and Android

## Stack
Next.js 15 · Supabase · Tailwind CSS · shadcn/ui · Recharts · Vercel

## Dev
See CLAUDE.md for full technical documentation.

## Garmin Auto-Sync
A Windows Task Scheduler job exports the activity CSV from Garmin Connect 
(via Playwright) and uploads it to `/api/import/garmin` at log on — but only 
if `SYNC_INTERVAL_DAYS` (default 2) have passed since the last successful sync.

1. Copy `scripts/garmin-sync/.env.example` to `scripts/garmin-sync/.env` and 
   fill in `BATCHBURN_URL`, `GARMIN_SYNC_API_KEY` (must match Vercel), and 
   `SYNC_INTERVAL_DAYS`
2. `node scripts/garmin-sync/setup-login.mjs` — log in to Garmin, check 
   "Remember me", then close the window
3. `node scripts/garmin-sync/sync.mjs --force` — test run (bypasses the interval)
4. In PowerShell: `powershell -ExecutionPolicy Bypass -File scripts\garmin-sync\register-task.ps1` 
   (use an Administrator PowerShell if it reports "Access is denied"). 
   Remove with `unregister-task.ps1`.
5. Logs: `%LOCALAPPDATA%\BatchBurn\sync.log`. Exports are kept in 
   `%LOCALAPPDATA%\BatchBurn\exports` (10 most recent). If the log says 
   `GARMIN LOGIN REQUIRED`, re-run step 2.
