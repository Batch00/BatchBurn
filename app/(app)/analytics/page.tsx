import { createClient } from '@/lib/supabase/server'
import {
  AnalyticsClient,
  type AnalyticsData,
  type MileageByTypeRow,
} from '@/components/analytics/AnalyticsClient'

type Period = 'month' | '3months' | 'year' | 'all'

function getPeriodDates(period: Period): { startDate: string; endDate: string } {
  const today = new Date()
  const endDate = today.toISOString().split('T')[0]
  if (period === 'month') {
    const start = new Date(today.getFullYear(), today.getMonth(), 1)
    return { startDate: start.toISOString().split('T')[0], endDate }
  }
  if (period === '3months') {
    const start = new Date(today)
    start.setMonth(start.getMonth() - 3)
    return { startDate: start.toISOString().split('T')[0], endDate }
  }
  if (period === 'year') {
    return { startDate: `${today.getFullYear()}-01-01`, endDate }
  }
  return { startDate: '2000-01-01', endDate }
}

function getWeekKey(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  const day = date.getDay()
  const diff = day === 0 ? -6 : 1 - day
  date.setDate(date.getDate() + diff)
  return date.toISOString().split('T')[0]
}

function formatWeekLabel(weekKey: string): string {
  const date = new Date(weekKey + 'T00:00:00')
  const months = [
    'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
    'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
  ]
  return `${months[date.getMonth()]} ${date.getDate()}`
}

const RUN_TYPES = ['Easy', 'Tempo', 'Long', 'Fartlek', 'Hill', 'Interval'] as const

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  const params = await searchParams
  const period = (
    ['month', '3months', 'year', 'all'].includes(params.period ?? '')
      ? params.period
      : 'year'
  ) as Period

  const { startDate, endDate } = getPeriodDates(period)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id

  const [{ data: runs }, { data: cross }] = await Promise.all([
    supabase
      .from('runs')
      .select('id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
    supabase
      .from('cross_training')
      .select('id, activity_type, date, distance_miles, duration_seconds')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true }),
  ])

  const runsData = runs ?? []
  const crossData = cross ?? []

  // — Stats —
  const totalMiles = runsData.reduce((s, r) => s + ((r.distance_miles as number) ?? 0), 0)
  const totalTime = runsData.reduce((s, r) => s + ((r.duration_seconds as number) ?? 0), 0)
  const avgPace = totalMiles > 0 ? totalTime / totalMiles : 0
  const totalRuns = runsData.length

  // — Group by week —
  const weekMap = new Map<
    string,
    { paces: number[]; typeMiles: Record<string, number> }
  >()

  for (const run of runsData) {
    const weekKey = getWeekKey(run.date as string)
    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { paces: [], typeMiles: {} })
    }
    const entry = weekMap.get(weekKey)!
    const pace = run.pace_per_mile_seconds as number | null
    if (pace) entry.paces.push(pace)
    const rt = (run.run_type as string) ?? 'Easy'
    entry.typeMiles[rt] = (entry.typeMiles[rt] ?? 0) + ((run.distance_miles as number) ?? 0)
  }

  const sortedWeekKeys = [...weekMap.keys()].sort()

  const paceTrend = sortedWeekKeys
    .map((wk) => {
      const entry = weekMap.get(wk)!
      if (!entry.paces.length) return null
      const avg = entry.paces.reduce((a, b) => a + b, 0) / entry.paces.length
      return { week: formatWeekLabel(wk), pace: avg }
    })
    .filter((w): w is { week: string; pace: number } => w !== null)

  const mileageByType: MileageByTypeRow[] = sortedWeekKeys.map((wk) => {
    const entry = weekMap.get(wk)!
    return {
      week: formatWeekLabel(wk),
      Easy: entry.typeMiles['Easy'] ?? 0,
      Tempo: entry.typeMiles['Tempo'] ?? 0,
      Long: entry.typeMiles['Long'] ?? 0,
      Fartlek: entry.typeMiles['Fartlek'] ?? 0,
      Hill: entry.typeMiles['Hill'] ?? 0,
      Interval: entry.typeMiles['Interval'] ?? 0,
    }
  })

  // — Run type distribution —
  const typeDistMap = new Map<string, number>()
  for (const run of runsData) {
    const rt = (run.run_type as string) ?? 'Easy'
    typeDistMap.set(rt, (typeDistMap.get(rt) ?? 0) + ((run.distance_miles as number) ?? 0))
  }
  const runTypeDistribution = [...typeDistMap.entries()].map(([type, miles]) => ({
    type,
    miles,
  }))

  // — Personal bests —
  let fastestPace: { value: number; date: string } | null = null
  let longestRun: { value: number; date: string } | null = null

  for (const run of runsData) {
    const pace = run.pace_per_mile_seconds as number | null
    const dist = run.distance_miles as number | null
    const date = run.date as string
    if (pace && (!fastestPace || pace < fastestPace.value)) {
      fastestPace = { value: pace, date }
    }
    if (dist && (!longestRun || dist > longestRun.value)) {
      longestRun = { value: dist, date }
    }
  }

  // Longest streak
  const runDays = new Set(runsData.map((r) => r.date as string))
  const sortedDays = [...runDays].sort()
  let maxStreak = 0
  let maxStreakEnd = ''
  let curStreak = 0
  let curStreakEnd = ''

  for (let i = 0; i < sortedDays.length; i++) {
    if (i === 0) {
      curStreak = 1
      curStreakEnd = sortedDays[i]
    } else {
      const prev = new Date(sortedDays[i - 1] + 'T00:00:00')
      const curr = new Date(sortedDays[i] + 'T00:00:00')
      const diff = (curr.getTime() - prev.getTime()) / 86400000
      if (diff === 1) {
        curStreak++
        curStreakEnd = sortedDays[i]
      } else {
        if (curStreak > maxStreak) {
          maxStreak = curStreak
          maxStreakEnd = curStreakEnd
        }
        curStreak = 1
        curStreakEnd = sortedDays[i]
      }
    }
  }
  if (curStreak > maxStreak) {
    maxStreak = curStreak
    maxStreakEnd = curStreakEnd
  }
  const longestStreak = maxStreak > 0 ? { value: maxStreak, date: maxStreakEnd } : null

  // Most miles in a week
  const weekMilesMap = new Map<string, number>()
  for (const run of runsData) {
    const wk = getWeekKey(run.date as string)
    weekMilesMap.set(wk, (weekMilesMap.get(wk) ?? 0) + ((run.distance_miles as number) ?? 0))
  }
  let mostMilesWeek: { value: number; date: string } | null = null
  for (const [wk, miles] of weekMilesMap.entries()) {
    if (!mostMilesWeek || miles > mostMilesWeek.value) {
      mostMilesWeek = { value: miles, date: wk }
    }
  }

  // — Cross training breakdown —
  const crossMap = new Map<
    string,
    { sessions: number; miles: number; duration: number }
  >()
  for (const c of crossData) {
    const type = (c.activity_type as string) ?? 'Other'
    if (!crossMap.has(type)) crossMap.set(type, { sessions: 0, miles: 0, duration: 0 })
    const entry = crossMap.get(type)!
    entry.sessions++
    entry.miles += (c.distance_miles as number) ?? 0
    entry.duration += (c.duration_seconds as number) ?? 0
  }
  const crossTraining = [...crossMap.entries()].map(([type, d]) => ({ type, ...d }))

  const analyticsData: AnalyticsData = {
    totalMiles,
    totalTime,
    avgPace,
    totalRuns,
    paceTrend,
    mileageByType,
    runTypeDistribution,
    personalBests: { fastestPace, longestRun, longestStreak, mostMilesWeek },
    crossTraining,
  }

  // suppress unused import warning for RUN_TYPES
  void RUN_TYPES

  return (
    <div className="mx-auto max-w-5xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Analytics</h1>
      <AnalyticsClient data={analyticsData} period={period} />
    </div>
  )
}
