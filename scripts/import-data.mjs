/**
 * BatchBurn historical data import
 * Usage: node scripts/import-data.mjs <path-to-excel> <user-uuid>
 */

import { readFileSync } from 'fs'
import { resolve } from 'path'
import * as XLSX from 'xlsx'
import { createClient } from '@supabase/supabase-js'

// ---------------------------------------------------------------------------
// Load .env.local
// ---------------------------------------------------------------------------

function loadEnv() {
  const env = {}
  try {
    const raw = readFileSync(resolve(process.cwd(), '.env.local'), 'utf8')
    for (const line of raw.split('\n')) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      const idx = trimmed.indexOf('=')
      if (idx === -1) continue
      const key = trimmed.slice(0, idx).trim()
      const value = trimmed.slice(idx + 1).trim()
      env[key] = value
    }
  } catch {
    console.error('Could not read .env.local')
    process.exit(1)
  }
  return env
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/**
 * Parse a duration string like "0:27:09" or "1:00:59" to total seconds.
 * Also handles Excel numeric time values (fraction of a day).
 */
function parseDuration(val) {
  if (val === null || val === undefined || val === '') return null
  if (typeof val === 'number') {
    // Excel stores time as fraction of 24h
    return Math.round(val * 86400)
  }
  const str = String(val).trim()
  const parts = str.split(':')
  if (parts.length === 3) {
    const h = parseInt(parts[0], 10)
    const m = parseInt(parts[1], 10)
    const s = parseInt(parts[2], 10)
    if (isNaN(h) || isNaN(m) || isNaN(s)) return null
    return h * 3600 + m * 60 + s
  }
  if (parts.length === 2) {
    const m = parseInt(parts[0], 10)
    const s = parseInt(parts[1], 10)
    if (isNaN(m) || isNaN(s)) return null
    return m * 60 + s
  }
  return null
}

/**
 * Parse a date cell. Handles Excel serial numbers and JS Date objects.
 * Returns "YYYY-MM-DD" string or null.
 */
function parseDate(val) {
  if (val === null || val === undefined || val === '') return null
  let d
  if (val instanceof Date) {
    d = val
  } else if (typeof val === 'number') {
    d = XLSX.SSF.parse_date_code(val)
    if (!d) return null
    return `${d.y}-${String(d.m).padStart(2, '0')}-${String(d.d).padStart(2, '0')}`
  } else {
    d = new Date(val)
  }
  if (isNaN(d.getTime())) return null
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function toFloat(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseFloat(val)
  return isNaN(n) ? null : n
}

function toInt(val) {
  if (val === null || val === undefined || val === '') return null
  const n = parseInt(val, 10)
  return isNaN(n) ? null : n
}

function toStr(val) {
  if (val === null || val === undefined || val === '') return null
  return String(val).trim() || null
}

// ---------------------------------------------------------------------------
// Post to API in batches
// ---------------------------------------------------------------------------

async function postBatch(url, secret, type, records) {
  const res = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': secret,
    },
    body: JSON.stringify({ type, records }),
  })
  if (!res.ok) {
    const text = await res.text()
    throw new Error(`HTTP ${res.status}: ${text}`)
  }
  return res.json()
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

async function main() {
  const args = process.argv.slice(2)
  if (args.length < 2) {
    console.error('Usage: node scripts/import-data.mjs <path-to-excel> <user-uuid>')
    process.exit(1)
  }

  const [excelPath, userId] = args
  const env = loadEnv()

  const IMPORT_SECRET = env['IMPORT_SECRET']
  const SUPABASE_URL = env['NEXT_PUBLIC_SUPABASE_URL']
  const SERVICE_ROLE_KEY = env['SUPABASE_SERVICE_ROLE_KEY']
  const APP_URL = env['NEXT_PUBLIC_APP_URL'] || 'http://localhost:3000'

  if (!IMPORT_SECRET || !SUPABASE_URL || !SERVICE_ROLE_KEY) {
    console.error('Missing required env vars in .env.local')
    process.exit(1)
  }

  // Fetch shoes for this user to map name → id
  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    db: { schema: 'batchburn' },
  })
  const { data: shoes, error: shoesErr } = await supabase
    .from('shoes')
    .select('id, name')
    .eq('user_id', userId)

  if (shoesErr) {
    console.error('Failed to fetch shoes:', shoesErr.message)
    process.exit(1)
  }

  const shoeMap = new Map()
  for (const s of shoes ?? []) {
    shoeMap.set(s.name.trim().toLowerCase(), s.id)
  }
  console.log(`Loaded ${shoeMap.size} shoes for user`)

  // Read Excel
  const workbook = XLSX.readFile(resolve(process.cwd(), excelPath), { cellDates: true })

  // ---------------------------------------------------------------------------
  // Parse Log (runs) sheet
  // ---------------------------------------------------------------------------

  const logSheet = workbook.Sheets['Log']
  if (!logSheet) {
    console.error('Sheet "Log" not found in workbook')
    process.exit(1)
  }

  const logRows = XLSX.utils.sheet_to_json(logSheet, { header: 1, defval: null })
  const runs = []
  let runSkipped = 0

  for (let i = 2; i < logRows.length; i++) {
    const row = logRows[i]
    const dateStr = parseDate(row[0])
    if (!dateStr) { runSkipped++; continue }

    const distanceMiles = toFloat(row[2])
    if (!distanceMiles || distanceMiles <= 0) { runSkipped++; continue }

    const distanceKm = toFloat(row[3])
    const durationSeconds = parseDuration(row[4])
    if (!durationSeconds || durationSeconds <= 0) { runSkipped++; continue }

    const pacePerMileSeconds = Math.round(durationSeconds / distanceMiles)
    const runType = toStr(row[7])
    const shoeNameRaw = toStr(row[12])
    const shoeId = shoeNameRaw
      ? (shoeMap.get(shoeNameRaw.toLowerCase()) ?? null)
      : null
    const notes = toStr(row[13])

    runs.push({
      user_id: userId,
      date: dateStr,
      distance_miles: distanceMiles,
      distance_km: distanceKm,
      duration_seconds: durationSeconds,
      pace_per_mile_seconds: pacePerMileSeconds,
      run_type: runType,
      shoe_id: shoeId,
      notes,
      source: 'import',
    })
  }

  console.log(`Parsed ${runs.length} runs (skipped ${runSkipped} rows)`)

  // ---------------------------------------------------------------------------
  // Parse Cross Training sheet
  // ---------------------------------------------------------------------------

  const crossSheet = workbook.Sheets['Cross Training']
  if (!crossSheet) {
    console.error('Sheet "Cross Training" not found in workbook')
    process.exit(1)
  }

  const crossRows = XLSX.utils.sheet_to_json(crossSheet, { header: 1, defval: null })
  const crossTraining = []
  let crossSkipped = 0

  for (let i = 2; i < crossRows.length; i++) {
    const row = crossRows[i]
    const dateStr = parseDate(row[0])
    if (!dateStr) { crossSkipped++; continue }

    const durationSeconds = parseDuration(row[5])
    if (!durationSeconds || durationSeconds <= 0) { crossSkipped++; continue }

    const activityType = toStr(row[9])
    if (!activityType) { crossSkipped++; continue }

    const distanceMiles = toFloat(row[2])
    const distanceKm = toFloat(row[3])
    const steps = toInt(row[4])
    const notes = toStr(row[14])

    crossTraining.push({
      user_id: userId,
      date: dateStr,
      activity_type: activityType,
      duration_seconds: durationSeconds,
      distance_miles: distanceMiles,
      distance_km: distanceKm,
      steps,
      notes,
      source: 'import',
    })
  }

  console.log(`Parsed ${crossTraining.length} cross training records (skipped ${crossSkipped} rows)`)

  // ---------------------------------------------------------------------------
  // POST to API in batches of 50
  // ---------------------------------------------------------------------------

  const apiUrl = `${APP_URL}/api/import`
  const BATCH = 50
  let totalRunsInserted = 0
  let totalCrossInserted = 0
  let totalErrors = 0

  // Runs
  for (let i = 0; i < runs.length; i += BATCH) {
    const batch = runs.slice(i, i + BATCH)
    try {
      const result = await postBatch(apiUrl, IMPORT_SECRET, 'runs', batch)
      totalRunsInserted += result.inserted ?? 0
      if (result.errors?.length) {
        totalErrors += result.errors.length
        console.error(`Batch ${i / BATCH + 1} run errors:`, result.errors)
      }
    } catch (err) {
      totalErrors++
      console.error(`Batch ${i / BATCH + 1} run failed:`, err.message)
    }
  }

  // Cross training
  for (let i = 0; i < crossTraining.length; i += BATCH) {
    const batch = crossTraining.slice(i, i + BATCH)
    try {
      const result = await postBatch(apiUrl, IMPORT_SECRET, 'cross_training', batch)
      totalCrossInserted += result.inserted ?? 0
      if (result.errors?.length) {
        totalErrors += result.errors.length
        console.error(`Batch ${i / BATCH + 1} cross training errors:`, result.errors)
      }
    } catch (err) {
      totalErrors++
      console.error(`Batch ${i / BATCH + 1} cross training failed:`, err.message)
    }
  }

  console.log(`\nImported ${totalRunsInserted} runs, ${totalCrossInserted} cross training records. Errors: ${totalErrors}`)
}

main().catch((err) => {
  console.error('Fatal:', err)
  process.exit(1)
})
