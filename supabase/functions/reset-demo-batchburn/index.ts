// Supabase Edge Function: reset-demo-batchburn
// Wipes and re-seeds the demo user's data nightly with rolling dates so the
// dashboard always shows meaningful recent data. Triggered by pg_cron.

import { createClient } from 'jsr:@supabase/supabase-js@2'

const DEMO_USER_ID = '09fba5c4-c678-4b81-87a5-31b3cd2686fc'

const SHOE_IDS = {
  pegasus: '11111111-1111-4111-8111-111111111111',
  ghost: '22222222-2222-4222-8222-222222222222',
  clifton: '33333333-3333-4333-8333-333333333333',
} as const

type RunType = 'Easy' | 'Tempo' | 'Long' | 'Fartlek' | 'Hill' | 'Interval'

// Deterministic-ish PRNG seeded by date so repeat runs the same day are stable
function mulberry32(seed: number) {
  let s = seed >>> 0
  return () => {
    s = (s + 0x6d2b79f5) >>> 0
    let t = s
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function todayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

function daysAgo(n: number): string {
  const d = new Date()
  d.setUTCDate(d.getUTCDate() - n)
  return d.toISOString().slice(0, 10)
}

function pickRunType(rand: () => number): RunType {
  const r = rand()
  if (r < 0.5) return 'Easy'
  if (r < 0.7) return 'Tempo'
  if (r < 0.9) return 'Long'
  const others: RunType[] = ['Fartlek', 'Hill', 'Interval']
  return others[Math.floor(rand() * others.length)]
}

function distanceForType(type: RunType, rand: () => number): number {
  if (type === 'Easy') return 3 + rand() * 3 // 3-6
  if (type === 'Tempo') return 3 + rand() * 2 // 3-5
  if (type === 'Long') return 8 + rand() * 5 // 8-13
  return 2 + rand() * 4 // 2-6
}

function paceForType(type: RunType, rand: () => number): number {
  // Pace in seconds per mile — between 7:30 (450) and 9:30 (570)
  if (type === 'Tempo') return 450 + Math.floor(rand() * 30) // 7:30-8:00
  if (type === 'Long') return 510 + Math.floor(rand() * 60) // 8:30-9:30
  if (type === 'Easy') return 495 + Math.floor(rand() * 60) // 8:15-9:15
  return 480 + Math.floor(rand() * 60) // 8:00-9:00
}

function shoeIdForDate(daysBack: number): string {
  if (daysBack > 90) return SHOE_IDS.pegasus
  if (daysBack > 30) return SHOE_IDS.ghost
  return SHOE_IDS.clifton
}

type RunInsert = {
  user_id: string
  date: string
  distance_miles: number
  distance_km: number
  duration_seconds: number
  pace_per_mile_seconds: number
  run_type: RunType
  shoe_id: string
  source: string
  notes: string | null
}

type CrossInsert = {
  user_id: string
  date: string
  activity_type: string
  duration_seconds: number
  distance_miles: number | null
  distance_km: number | null
  steps: number | null
  source: string
  notes: string | null
}

function generateRuns(): RunInsert[] {
  const rand = mulberry32(0xb47cb04)
  const runs: RunInsert[] = []
  // Target ~60 runs across the last 180 days. Step by ~3 days with jitter.
  let daysBack = 1
  while (daysBack < 180 && runs.length < 65) {
    const type = pickRunType(rand)
    const distance = distanceForType(type, rand)
    const pace = paceForType(type, rand)
    const duration = Math.round(distance * pace)
    runs.push({
      user_id: DEMO_USER_ID,
      date: daysAgo(daysBack),
      distance_miles: Math.round(distance * 100) / 100,
      distance_km: Math.round(distance * 1.60934 * 100) / 100,
      duration_seconds: duration,
      pace_per_mile_seconds: Math.round(duration / distance),
      run_type: type,
      shoe_id: shoeIdForDate(daysBack),
      source: 'import',
      notes: null,
    })
    daysBack += 2 + Math.floor(rand() * 3) // 2-4 day gap
  }
  return runs
}

function generateCrossTraining(): CrossInsert[] {
  const rand = mulberry32(0x9a3f1c2)
  const types = ['Bike', 'Walk', 'Stair Master', 'Strength', 'Ultimate Frisbee']
  const sessions: CrossInsert[] = []
  let daysBack = 3
  while (daysBack < 180 && sessions.length < 30) {
    const type = types[Math.floor(rand() * types.length)]
    const duration = 1500 + Math.floor(rand() * 2700) // 25-70 min
    let distanceMiles: number | null = null
    if (type === 'Bike') distanceMiles = 8 + rand() * 12 // 8-20 mi
    else if (type === 'Walk') distanceMiles = 1.5 + rand() * 2 // 1.5-3.5 mi
    else if (type === 'Ultimate Frisbee') distanceMiles = 2 + rand() * 3 // 2-5 mi
    const steps = type === 'Walk' ? 3000 + Math.floor(rand() * 4000) : null
    sessions.push({
      user_id: DEMO_USER_ID,
      date: daysAgo(daysBack),
      activity_type: type,
      duration_seconds: duration,
      distance_miles: distanceMiles != null ? Math.round(distanceMiles * 100) / 100 : null,
      distance_km: distanceMiles != null ? Math.round(distanceMiles * 1.60934 * 100) / 100 : null,
      steps,
      source: 'import',
      notes: null,
    })
    daysBack += 5 + Math.floor(rand() * 5) // 5-9 day gap
  }
  return sessions
}

Deno.serve(async (req) => {
  // Bearer token check — only the cron job (or operator with the secret) can call this
  const expected = Deno.env.get('CRON_SECRET')
  const auth = req.headers.get('Authorization') ?? ''
  const token = auth.startsWith('Bearer ') ? auth.slice(7).trim() : ''
  if (!expected || token !== expected) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    })
  }

  const supabaseUrl = Deno.env.get('APP_SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return new Response(JSON.stringify({ error: 'missing env' }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    db: { schema: 'batchburn' },
    auth: { persistSession: false },
  })

  // 1. Wipe — profile row is intentionally preserved
  const tables = ['runs', 'cross_training', 'races', 'goals', 'shoes'] as const
  for (const t of tables) {
    const { error } = await supabase.from(t).delete().eq('user_id', DEMO_USER_ID)
    if (error) {
      return new Response(JSON.stringify({ error: `wipe ${t} failed: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 2. Re-seed shoes
  const shoes = [
    {
      id: SHOE_IDS.pegasus,
      user_id: DEMO_USER_ID,
      name: 'Nike Pegasus',
      price_usd: 130,
      initial_miles: 0,
      purchase_date: daysAgo(365),
      is_active: true,
    },
    {
      id: SHOE_IDS.ghost,
      user_id: DEMO_USER_ID,
      name: 'Brooks Ghost',
      price_usd: 140,
      initial_miles: 0,
      purchase_date: daysAgo(180),
      is_active: true,
    },
    {
      id: SHOE_IDS.clifton,
      user_id: DEMO_USER_ID,
      name: 'Hoka Clifton',
      price_usd: 145,
      initial_miles: 0,
      purchase_date: daysAgo(60),
      is_active: true,
    },
  ]
  {
    const { error } = await supabase.from('shoes').insert(shoes)
    if (error) {
      return new Response(JSON.stringify({ error: `shoes insert: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 3. Re-seed runs
  const runs = generateRuns()
  {
    const { error } = await supabase.from('runs').insert(runs)
    if (error) {
      return new Response(JSON.stringify({ error: `runs insert: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 4. Re-seed cross training
  const cross = generateCrossTraining()
  {
    const { error } = await supabase.from('cross_training').insert(cross)
    if (error) {
      return new Response(JSON.stringify({ error: `cross insert: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 5. Re-seed races
  const halfDistance = 13.1
  const halfDuration = 6720 // 1:52:00
  const fiveKDistance = 3.1
  const fiveKDuration = 1320 // 22:00
  const races = [
    {
      user_id: DEMO_USER_ID,
      event_name: 'City Half Marathon',
      date: daysAgo(60),
      distance_miles: halfDistance,
      duration_seconds: halfDuration,
      pace_per_mile_seconds: Math.round(halfDuration / halfDistance),
      is_pr: true,
    },
    {
      user_id: DEMO_USER_ID,
      event_name: 'Spring 5K',
      date: daysAgo(30),
      distance_miles: fiveKDistance,
      duration_seconds: fiveKDuration,
      pace_per_mile_seconds: Math.round(fiveKDuration / fiveKDistance),
      is_pr: false,
    },
  ]
  {
    const { error } = await supabase.from('races').insert(races)
    if (error) {
      return new Response(JSON.stringify({ error: `races insert: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 6. Re-seed goals
  const goals = [
    { user_id: DEMO_USER_ID, goal_type: 'mileage', period: 'week', target_value: 20, is_active: true },
    { user_id: DEMO_USER_ID, goal_type: 'mileage', period: 'month', target_value: 80, is_active: true },
    { user_id: DEMO_USER_ID, goal_type: 'mileage', period: 'year', target_value: 1000, is_active: true },
  ]
  {
    const { error } = await supabase.from('goals').insert(goals)
    if (error) {
      return new Response(JSON.stringify({ error: `goals insert: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  // 7. Set primary shoe on demo profile
  {
    const { error } = await supabase
      .from('profiles')
      .update({ primary_shoe_id: SHOE_IDS.clifton })
      .eq('user_id', DEMO_USER_ID)
    if (error) {
      return new Response(JSON.stringify({ error: `profile update: ${error.message}` }), {
        status: 500,
        headers: { 'content-type': 'application/json' },
      })
    }
  }

  return new Response(
    JSON.stringify({
      success: true,
      reset_at: todayIso(),
      runs_created: runs.length,
      cross_training_created: cross.length,
      races_created: races.length,
      goals_created: goals.length,
      shoes_created: shoes.length,
    }),
    { headers: { 'content-type': 'application/json' } },
  )
})
