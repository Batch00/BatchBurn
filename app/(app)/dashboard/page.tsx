export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { DashboardClient, type WeekBucket, type RawWeeklyRun, type RawWeeklyCross } from '@/components/dashboard/DashboardClient'
import { ShoeHealthWidget, type Shoe } from '@/components/dashboard/ShoeHealthWidget'
import { GoalProgress, type Goal } from '@/components/dashboard/GoalProgress'
import { type Activity } from '@/components/dashboard/ActivityFeed'
import { RefreshButton } from '@/components/ui/RefreshButton'

function getMonday(d: Date): Date {
  const date = new Date(d)
  const day = date.getDay()
  const diff = day === 0 ? 6 : day - 1
  date.setDate(date.getDate() - diff)
  date.setHours(0, 0, 0, 0)
  return date
}

function toDateStr(d: Date): string {
  return d.toISOString().split('T')[0]
}

function getWeekLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const userId = user!.id
  const isDemoUser = user!.email === 'demo@batchburn.app'

  const now = new Date()
  const monday = getMonday(now)
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const yearStart = new Date(now.getFullYear(), 0, 1)
  const twelveWeeksAgo = new Date(monday)
  twelveWeeksAgo.setDate(twelveWeeksAgo.getDate() - 11 * 7)

  // Parallel fetches
  const [
    { data: wtdRuns },
    { data: mtdRuns },
    { data: ytdRuns },
    { data: wtdCross },
    { data: mtdCross },
    { data: ytdCross },
    { data: recentRuns },
    { data: recentCross },
    { data: weeklyRuns },
    { data: weeklyCross },
    { data: shoes },
    { data: goals },
    { data: lastGarminRun },
    { data: lastGarminCross },
  ] = await Promise.all([
    // WTD runs
    supabase
      .from('runs')
      .select('distance_miles, duration_seconds, pace_per_mile_seconds')
      .eq('user_id', userId)
      .gte('date', toDateStr(monday))
      .lte('date', toDateStr(now)),
    // MTD runs
    supabase
      .from('runs')
      .select('distance_miles')
      .eq('user_id', userId)
      .gte('date', toDateStr(monthStart))
      .lte('date', toDateStr(now)),
    // YTD runs
    supabase
      .from('runs')
      .select('distance_miles')
      .eq('user_id', userId)
      .gte('date', toDateStr(yearStart))
      .lte('date', toDateStr(now)),
    // WTD cross training
    supabase
      .from('cross_training')
      .select('distance_miles, duration_seconds, activity_type')
      .eq('user_id', userId)
      .gte('date', toDateStr(monday))
      .lte('date', toDateStr(now)),
    // MTD cross training
    supabase
      .from('cross_training')
      .select('distance_miles, activity_type')
      .eq('user_id', userId)
      .gte('date', toDateStr(monthStart))
      .lte('date', toDateStr(now)),
    // YTD cross training
    supabase
      .from('cross_training')
      .select('distance_miles, activity_type')
      .eq('user_id', userId)
      .gte('date', toDateStr(yearStart))
      .lte('date', toDateStr(now)),
    // Last 20 recent runs for activity feed
    supabase
      .from('runs')
      .select('id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds, source')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20),
    // Last 20 recent cross training for activity feed
    supabase
      .from('cross_training')
      .select('id, activity_type, date, distance_miles, duration_seconds, source')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20),
    // 12 weeks of runs for chart (with run_type)
    supabase
      .from('runs')
      .select('date, distance_miles, run_type')
      .eq('user_id', userId)
      .gte('date', toDateStr(twelveWeeksAgo))
      .lte('date', toDateStr(now))
      .order('date', { ascending: true }),
    // 12 weeks of cross training for chart
    supabase
      .from('cross_training')
      .select('date, distance_miles, activity_type')
      .eq('user_id', userId)
      .gte('date', toDateStr(twelveWeeksAgo))
      .lte('date', toDateStr(now))
      .order('date', { ascending: true }),
    // Active shoes — join runs to compute mileage
    supabase
      .from('shoes')
      .select('id, name, initial_miles, runs(distance_miles)')
      .eq('user_id', userId)
      .eq('is_active', true),
    // Active goals — target_value is the column name in schema
    supabase
      .from('goals')
      .select('id, period, target_value, scope, name')
      .eq('user_id', userId)
      .eq('is_active', true),
    // Most recent Garmin CSV import (runs)
    supabase
      .from('runs')
      .select('created_at')
      .eq('user_id', userId)
      .eq('source', 'garmin_csv')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
    // Most recent Garmin CSV import (cross training)
    supabase
      .from('cross_training')
      .select('created_at')
      .eq('user_id', userId)
      .eq('source', 'garmin_csv')
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),
  ])

  // Compute KPIs
  const wtdMiles = (wtdRuns ?? []).reduce((s, r) => s + (r.distance_miles ?? 0), 0)
  const mtdMiles = (mtdRuns ?? []).reduce((s, r) => s + (r.distance_miles ?? 0), 0)
  const ytdMiles = (ytdRuns ?? []).reduce((s, r) => s + (r.distance_miles ?? 0), 0)

  // All-active totals (runs + cross training, null distance treated as 0)
  const wtdCrossMiles = (wtdCross ?? []).reduce((s, c) => s + (c.distance_miles ?? 0), 0)
  const mtdCrossMiles = (mtdCross ?? []).reduce((s, c) => s + (c.distance_miles ?? 0), 0)
  const ytdCrossMiles = (ytdCross ?? []).reduce((s, c) => s + (c.distance_miles ?? 0), 0)
  const activeWtdMiles = wtdMiles + wtdCrossMiles
  const activeMtdMiles = mtdMiles + mtdCrossMiles
  const activeYtdMiles = ytdMiles + ytdCrossMiles

  // Cross training miles grouped by activity_type, per period — for scoped goals
  function sumCrossByType(
    rows: { distance_miles: number | null; activity_type: string | null }[] | null,
  ): Record<string, number> {
    const map: Record<string, number> = {}
    for (const c of rows ?? []) {
      const t = c.activity_type ?? ''
      map[t] = (map[t] ?? 0) + (c.distance_miles ?? 0)
    }
    return map
  }
  const wtdCrossByType = sumCrossByType(wtdCross ?? null)
  const mtdCrossByType = sumCrossByType(mtdCross ?? null)
  const ytdCrossByType = sumCrossByType(ytdCross ?? null)

  // Resolve a goal's current progress based on its scope + period
  function goalCurrentMiles(period: string, scope: string): number {
    const runsMiles = period === 'week' ? wtdMiles : period === 'month' ? mtdMiles : ytdMiles
    const crossTotal =
      period === 'week' ? wtdCrossMiles : period === 'month' ? mtdCrossMiles : ytdCrossMiles
    const crossByType =
      period === 'week' ? wtdCrossByType : period === 'month' ? mtdCrossByType : ytdCrossByType
    if (scope === 'runs') return runsMiles
    if (scope === 'all') return runsMiles + crossTotal
    return crossByType[scope] ?? 0
  }

  function goalName(name: string | null, period: string, scope: string): string {
    if (name && name.trim()) return name.trim()
    const p = period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Year'
    const s = scope === 'all' ? 'All Activities' : scope === 'runs' ? 'Runs' : scope
    return `${p} · ${s}`
  }

  // WTD combined duration for active-mode "Total Time" card
  const wtdRunDuration = (wtdRuns ?? []).reduce((s, r) => s + (r.duration_seconds ?? 0), 0)
  const wtdCrossDuration = (wtdCross ?? []).reduce((s, c) => s + (c.duration_seconds ?? 0), 0)
  const activeWtdDuration = wtdRunDuration + wtdCrossDuration

  // Weighted avg pace this week
  const wtdRunsWithPace = (wtdRuns ?? []).filter(
    (r) => r.pace_per_mile_seconds != null && (r.distance_miles ?? 0) > 0,
  )
  const totalWeightedPace = wtdRunsWithPace.reduce(
    (s, r) => s + r.pace_per_mile_seconds! * r.distance_miles!,
    0,
  )
  const totalMilesForPace = wtdRunsWithPace.reduce((s, r) => s + r.distance_miles!, 0)
  const avgPace = totalMilesForPace > 0 ? totalWeightedPace / totalMilesForPace : 0

  // Build week buckets
  const weekBuckets: WeekBucket[] = Array.from({ length: 12 }, (_, i) => {
    const weekStart = new Date(twelveWeeksAgo)
    weekStart.setDate(weekStart.getDate() + i * 7)
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekEnd.getDate() + 6)
    return {
      label: getWeekLabel(toDateStr(weekStart)),
      start: toDateStr(weekStart),
      end: toDateStr(weekEnd),
    }
  })

  // Merge recent activities (last 20 of each, sorted by date)
  const allActivities: Activity[] = [
    ...(recentRuns ?? []).map((r) => ({
      id: r.id,
      type: r.run_type ?? 'Easy',
      date: r.date,
      distance_miles: r.distance_miles,
      duration_seconds: r.duration_seconds,
      pace_seconds: r.pace_per_mile_seconds,
      is_run: true,
      source: r.source,
    })),
    ...(recentCross ?? []).map((c) => ({
      id: c.id,
      type: 'Cross Training',
      activity_type: c.activity_type,
      date: c.date,
      distance_miles: c.distance_miles,
      duration_seconds: c.duration_seconds,
      is_run: false,
      source: c.source,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

  // Days since the most recent Garmin CSV import (null if never imported)
  const garminTimestamps = [
    lastGarminRun?.created_at as string | undefined,
    lastGarminCross?.created_at as string | undefined,
  ].filter((t): t is string => !!t)
  const daysSinceGarminImport =
    garminTimestamps.length === 0
      ? null
      : Math.floor(
          (Date.now() - Math.max(...garminTimestamps.map((t) => new Date(t).getTime()))) /
            86_400_000,
        )

  const rawWeeklyRuns: RawWeeklyRun[] = (weeklyRuns ?? []).map((r) => ({
    date: r.date as string,
    distance_miles: r.distance_miles as number | null,
    run_type: r.run_type as string | null,
  }))

  const rawWeeklyCross: RawWeeklyCross[] = (weeklyCross ?? []).map((c) => ({
    date: c.date as string,
    distance_miles: c.distance_miles as number | null,
    activity_type: c.activity_type as string | null,
  }))

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <RefreshButton />
      </div>

      {/* KPI toggle + cards + filter chips + Chart + Activity Feed (client-side state) */}
      <DashboardClient
        wtdMiles={wtdMiles}
        mtdMiles={mtdMiles}
        ytdMiles={ytdMiles}
        avgPace={avgPace}
        activeWtdMiles={activeWtdMiles}
        activeMtdMiles={activeMtdMiles}
        activeYtdMiles={activeYtdMiles}
        activeWtdDuration={activeWtdDuration}
        weeklyRuns={rawWeeklyRuns}
        weeklyCross={rawWeeklyCross}
        weekBuckets={weekBuckets}
        allActivities={allActivities}
        daysSinceGarminImport={daysSinceGarminImport}
        isDemoUser={isDemoUser}
      />

      {/* Shoe Health + Goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ShoeHealthWidget shoes={(shoes ?? []).map((s) => ({
          id: s.id as string,
          name: s.name as string,
          current_miles:
            (Array.isArray(s.runs)
              ? (s.runs as { distance_miles: number | null }[]).reduce(
                  (sum, r) => sum + (r.distance_miles ?? 0), 0)
              : 0) + ((s.initial_miles as number | null) ?? 0),
        })).sort((a, b) => b.current_miles - a.current_miles)} />
        <GoalProgress goals={(goals ?? []).map((g) => {
          const period = g.period as 'week' | 'month' | 'year'
          const scope = (g.scope as string | null) ?? 'runs'
          return {
            id: g.id as string,
            period,
            scope,
            name: goalName(g.name as string | null, period, scope),
            target_miles: g.target_value as number,
            current_miles: goalCurrentMiles(period, scope),
          }
        })} />
      </div>
    </div>
  )
}
