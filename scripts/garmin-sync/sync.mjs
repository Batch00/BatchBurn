/**
 * Automated Garmin → BatchBurn sync. Exports the activity CSV from Garmin
 * Connect and uploads it to /api/import/garmin. Runs at Windows log on via
 * Task Scheduler; only syncs if SYNC_INTERVAL_DAYS have passed.
 * Usage: node scripts/garmin-sync/sync.mjs [--force]
 */

import { appendFileSync, mkdirSync, readFileSync, readdirSync, unlinkSync, writeFileSync } from 'fs'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { chromium } from 'playwright'

const APP_DIR = join(process.env.LOCALAPPDATA, 'BatchBurn')
const PROFILE_DIR = join(APP_DIR, 'garmin-profile')
const EXPORTS_DIR = join(APP_DIR, 'exports')
const LAST_SYNC_FILE = join(APP_DIR, 'last-sync.json')
const LOG_FILE = join(APP_DIR, 'sync.log')
const ACTIVITIES_URL = 'https://connect.garmin.com/modern/activities'
const OVERALL_TIMEOUT_MS = 3 * 60 * 1000
const KEEP_EXPORTS = 10

mkdirSync(EXPORTS_DIR, { recursive: true })

function log(msg) {
  const line = `[${new Date().toISOString()}] ${msg}`
  console.log(line)
  appendFileSync(LOG_FILE, line + '\n')
}

// Load scripts/garmin-sync/.env (resolved relative to this file, not cwd)
function loadEnv() {
  const env = {}
  const raw = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '.env'), 'utf8')
  for (const line of raw.split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq === -1) continue
    env[trimmed.slice(0, eq).trim()] = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '')
  }
  return env
}

function readLastSync() {
  try {
    return new Date(JSON.parse(readFileSync(LAST_SYNC_FILE, 'utf8')).lastSuccess)
  } catch {
    return null
  }
}

function pruneExports() {
  const files = readdirSync(EXPORTS_DIR)
    .filter((f) => /^garmin-\d{4}-\d{2}-\d{2}\.csv$/.test(f))
    .sort()
    .reverse()
  for (const f of files.slice(KEEP_EXPORTS)) unlinkSync(join(EXPORTS_DIR, f))
}

const isSignInUrl = (url) => /sso\.garmin\.com|\/signin/i.test(url)

let context = null

async function run() {
  const env = loadEnv()
  const baseUrl = (env.BATCHBURN_URL || '').replace(/\/$/, '')
  const intervalDays = Number(env.SYNC_INTERVAL_DAYS || 2)
  if (!baseUrl || !env.GARMIN_SYNC_API_KEY) {
    log('ERROR: BATCHBURN_URL and GARMIN_SYNC_API_KEY must be set in scripts/garmin-sync/.env')
    return 1
  }

  // 1. Interval check
  const lastSync = readLastSync()
  if (!process.argv.includes('--force') && lastSync) {
    const daysSince = (Date.now() - lastSync.getTime()) / 86_400_000
    if (daysSince < intervalDays) {
      log(`skipped — last sync ${daysSince.toFixed(1)} days ago (interval ${intervalDays})`)
      return 0
    }
  }

  // 2. Connectivity check
  try {
    await fetch(baseUrl, { method: 'HEAD', signal: AbortSignal.timeout(15_000) })
  } catch {
    log(`offline — could not reach ${baseUrl}, will retry next log on`)
    return 0
  }

  // 3. Open Garmin activities with the dedicated persistent profile
  context = await chromium.launchPersistentContext(PROFILE_DIR, { headless: false })
  const page = context.pages()[0] ?? (await context.newPage())
  await page.goto(ACTIVITIES_URL, { waitUntil: 'domcontentloaded' })

  const exportButton = page
    .getByRole('button', { name: /export csv/i })
    .or(page.getByRole('link', { name: /export csv/i }))
    .first()

  await Promise.race([
    exportButton.waitFor({ state: 'visible', timeout: 60_000 }),
    page.waitForURL(isSignInUrl, { timeout: 60_000 }),
  ]).catch(() => {})

  // 4. Login check
  if (isSignInUrl(page.url())) {
    log('GARMIN LOGIN REQUIRED — run setup-login.mjs')
    return 1
  }
  if (!(await exportButton.isVisible())) {
    throw new Error(`Export CSV button not found on ${page.url()}`)
  }
  // Give the activity list a moment to finish loading before exporting
  await page.waitForLoadState('networkidle', { timeout: 15_000 }).catch(() => {})

  // 5. Export CSV
  const csvPath = join(EXPORTS_DIR, `garmin-${new Date().toLocaleDateString('en-CA')}.csv`)
  const [download] = await Promise.all([
    page.waitForEvent('download', { timeout: 60_000 }),
    exportButton.click(),
  ])
  await download.saveAs(csvPath)
  pruneExports()
  log(`exported ${csvPath}`)

  // 6. Upload to BatchBurn
  const form = new FormData()
  form.append('file', new Blob([readFileSync(csvPath)], { type: 'text/csv' }), 'garmin.csv')
  const res = await fetch(`${baseUrl}/api/import/garmin`, {
    method: 'POST',
    headers: { 'x-batchburn-sync-key': env.GARMIN_SYNC_API_KEY },
    body: form,
    signal: AbortSignal.timeout(60_000),
  })
  if (!res.ok) {
    throw new Error(`upload failed: HTTP ${res.status} ${(await res.text()).slice(0, 500)}`)
  }
  const result = await res.json()

  // 7. Record success
  log(`success — imported ${result.imported}, skipped ${result.skipped}`)
  for (const e of result.errors ?? []) log(`  row error: ${e}`)
  writeFileSync(LAST_SYNC_FILE, JSON.stringify({ lastSuccess: new Date().toISOString() }, null, 2))
  return 0
}

// 8. Overall timeout + always close the browser
const timeout = new Promise((resolve) =>
  setTimeout(() => {
    log('ERROR: timed out after 3 minutes')
    resolve(1)
  }, OVERALL_TIMEOUT_MS).unref(),
)

let code
try {
  code = await Promise.race([run(), timeout])
} catch (err) {
  log(`ERROR: ${err instanceof Error ? err.message : String(err)}`)
  code = 1
} finally {
  await context?.close().catch(() => {})
}
process.exit(code)
