import { NextRequest, NextResponse } from 'next/server'
import Papa from 'papaparse'
import { createClient } from '@/lib/supabase/server'

// Map Garmin's "Activity Type" to a target table + activity/run type.
const RUN_TYPES = new Set(['Running', 'Treadmill Running', 'Trail Running'])

const CROSS_TYPE_MAP: Record<string, string> = {
  Cycling: 'Bike',
  'Indoor Cycling': 'Bike',
  'Mountain Biking': 'Bike',
  Walking: 'Walk',
  'Strength Training': 'Strength',
  Yoga: 'Yoga',
  'Stair Stepper': 'Stair Master',
  Swimming: 'Swim',
  'Open Water Swimming': 'Swim',
  'Lap Swimming': 'Swim',
  Elliptical: 'Elliptical',
  Rowing: 'Rowing',
  'Indoor Rowing': 'Rowing',
  Hiking: 'Hiking',
}

// Parse a Garmin numeric cell. Returns null for empty / "--" / non-numeric.
function parseNum(raw: string | undefined): number | null {
  if (raw == null) return null
  const cleaned = raw.replace(/,/g, '').trim()
  if (cleaned === '' || cleaned === '--') return null
  const n = Number(cleaned)
  return Number.isFinite(n) ? n : null
}

// Extract the YYYY-MM-DD day from Garmin's "Date" cell (e.g. "2024-03-15 07:30:00").
function parseDate(raw: string | undefined): string | null {
  if (!raw) return null
  const match = raw.match(/\d{4}-\d{2}-\d{2}/)
  if (match) return match[0]
  const d = new Date(raw)
  return Number.isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
}

// Parse "HH:MM:SS", "MM:SS" (optionally with fractional seconds) to whole seconds.
function parseDuration(raw: string | undefined): number | null {
  if (!raw) return null
  const cleaned = raw.trim()
  if (cleaned === '' || cleaned === '--') return null
  const parts = cleaned.split(':').map((p) => parseFloat(p))
  if (parts.some((p) => Number.isNaN(p))) return null
  let seconds = 0
  for (const p of parts) seconds = seconds * 60 + p
  return Math.round(seconds)
}

type ExistingRow = { date: string; distance_miles: number | null; activity_type?: string | null }

// Dedup: same day + distance within 0.15 mi. For distanceless activities,
// fall back to same day + same activity type so re-imports don't duplicate.
function isDuplicate(
  existing: ExistingRow[],
  date: string,
  distanceMiles: number | null,
  activityType: string | null,
): boolean {
  return existing.some((e) => {
    if (e.date !== date) return false
    if (distanceMiles != null && distanceMiles > 0) {
      return e.distance_miles != null && Math.abs(e.distance_miles - distanceMiles) <= 0.15
    }
    // distanceless (strength, yoga, …)
    return (e.distance_miles == null || e.distance_miles === 0) && e.activity_type === activityType
  })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const userId = user.id

  const formData = await req.formData()
  const file = formData.get('file')
  if (!(file instanceof File)) {
    return NextResponse.json({ error: 'No file provided' }, { status: 400 })
  }

  const text = await file.text()
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
  })
  const rows = parsed.data

  // Pre-fetch existing rows once for in-memory dedup (covers re-imports and
  // intra-file duplicates as we append inserted rows to these lists).
  const [{ data: existingRuns }, { data: existingCross }] = await Promise.all([
    supabase.from('runs').select('date, distance_miles').eq('user_id', userId),
    supabase.from('cross_training').select('date, distance_miles, activity_type').eq('user_id', userId),
  ])
  const runsSeen: ExistingRow[] = (existingRuns ?? []) as ExistingRow[]
  const crossSeen: ExistingRow[] = (existingCross ?? []) as ExistingRow[]

  let imported = 0
  let skipped = 0
  const errors: string[] = []

  for (const row of rows) {
    const activityType = (row['Activity Type'] ?? '').trim()
    if (!activityType) continue

    const date = parseDate(row['Date'])
    if (!date) {
      errors.push(`Skipped row with unparseable date: "${row['Date'] ?? ''}"`)
      continue
    }

    const durationSeconds = parseDuration(row['Time'] ?? row['Moving Time'])
    const distanceRaw = parseNum(row['Distance'])
    const distanceMiles = distanceRaw != null && distanceRaw > 0 ? distanceRaw : null
    const notes = (row['Title'] ?? '').trim() || null
    const calories = parseNum(row['Calories'])
    const avgHr = parseNum(row['Avg HR'])
    const maxHr = parseNum(row['Max HR'])
    const ascentFt = parseNum(row['Total Ascent'])
    const elevationGainM = ascentFt != null ? Math.round(ascentFt * 0.3048) : null

    const isRun = RUN_TYPES.has(activityType)
    const table = isRun ? 'runs' : 'cross_training'
    const seen = isRun ? runsSeen : crossSeen
    const crossType = CROSS_TYPE_MAP[activityType] ?? 'Other'
    const dedupType = isRun ? null : crossType

    if (isDuplicate(seen, date, distanceMiles, dedupType)) {
      skipped++
      continue
    }

    const base: Record<string, unknown> = {
      user_id: userId,
      date,
      duration_seconds: durationSeconds ?? 0,
      source: 'garmin_csv',
      notes,
      ...(distanceMiles != null ? { distance_miles: distanceMiles, distance_km: distanceMiles * 1.60934 } : {}),
      ...(avgHr != null ? { heart_rate_avg: Math.round(avgHr) } : {}),
      ...(maxHr != null ? { heart_rate_max: Math.round(maxHr) } : {}),
      ...(elevationGainM != null ? { elevation_gain_m: elevationGainM } : {}),
      ...(calories != null ? { calories: Math.round(calories) } : {}),
    }

    let record: Record<string, unknown>
    if (isRun) {
      const cadence = parseNum(row['Avg Run Cadence'])
      record = {
        ...base,
        run_type: 'Easy',
        pace_per_mile_seconds:
          distanceMiles != null && distanceMiles > 0 && durationSeconds != null
            ? Math.round(durationSeconds / distanceMiles)
            : null,
        ...(cadence != null ? { cadence_avg: cadence } : {}),
      }
    } else {
      record = { ...base, activity_type: crossType }
    }

    const { error } = await supabase.from(table).insert(record)
    if (error) {
      errors.push(`${activityType} on ${date}: ${error.message}`)
      continue
    }

    seen.push({ date, distance_miles: distanceMiles, activity_type: dedupType })
    imported++
  }

  return NextResponse.json({ imported, skipped, errors })
}
