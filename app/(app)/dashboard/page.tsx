export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { KpiCard } from '@/components/dashboard/KpiCard'
import { DashboardClient, type WeekBucket, type RawWeeklyRun, type RawWeeklyCross } from '@/components/dashboard/DashboardClient'
import { ShoeHealthWidget, type Shoe } from '@/components/dashboard/ShoeHealthWidget'
import { GoalProgress, type Goal } from '@/components/dashboard/GoalProgress'
import { type Activity } from '@/components/dashboard/ActivityFeed'
import { formatPace } from '@/lib/utils/pace'

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
    { data: recentRuns },
    { data: recentCross },
    { data: weeklyRuns },
    { data: weeklyCross },
    { data: shoes },
    { data: goals },
  ] = await Promise.all([
    // WTD runs
    supabase
      .from('runs')
      .select('distance_miles, pace_per_mile_seconds')
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
    // Last 20 recent runs for activity feed
    supabase
      .from('runs')
      .select('id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20),
    // Last 20 recent cross training for activity feed
    supabase
      .from('cross_training')
      .select('id, activity_type, date, distance_miles, duration_seconds')
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
    // Active shoes
    supabase
      .from('shoes')
      .select('id, name, current_miles')
      .eq('user_id', userId)
      .eq('is_active', true),
    // Active goals
    supabase
      .from('goals')
      .select('id, period, target_miles, current_miles')
      .eq('user_id', userId)
      .eq('is_active', true),
  ])

  // Compute KPIs
  const wtdMiles = (wtdRuns ?? []).reduce((s, r) => s + (r.distance_miles ?? 0), 0)
  const mtdMiles = (mtdRuns ?? []).reduce((s, r) => s + (r.distance_miles ?? 0), 0)
  const ytdMiles = (ytdRuns ?? []).reduce((s, r) => s + (r.distance_miles ?? 0), 0)

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
    })),
    ...(recentCross ?? []).map((c) => ({
      id: c.id,
      type: 'Cross Training',
      activity_type: c.activity_type,
      date: c.date,
      distance_miles: c.distance_miles,
      duration_seconds: c.duration_seconds,
      is_run: false,
    })),
  ].sort((a, b) => b.date.localeCompare(a.date))

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
      <h1 className="text-2xl font-bold text-white">Dashboard</h1>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <KpiCard
          label="WTD Miles"
          value={wtdMiles.toFixed(1)}
          unit="miles"
        />
        <KpiCard
          label="MTD Miles"
          value={mtdMiles.toFixed(1)}
          unit="miles"
        />
        <KpiCard
          label="YTD Miles"
          value={ytdMiles.toFixed(1)}
          unit="miles"
        />
        <KpiCard
          label="Avg Pace"
          value={avgPace > 0 ? formatPace(avgPace) : '--:--'}
          unit="min/mi"
          sublabel="This week"
        />
      </div>

      {/* Filter chips + Chart + Activity Feed (client-side filtering) */}
      <DashboardClient
        weeklyRuns={rawWeeklyRuns}
        weeklyCross={rawWeeklyCross}
        weekBuckets={weekBuckets}
        allActivities={allActivities}
      />

      {/* Shoe Health + Goals */}
      <div className="grid gap-4 lg:grid-cols-2">
        <ShoeHealthWidget shoes={(shoes ?? []) as Shoe[]} />
        <GoalProgress goals={(goals ?? []) as Goal[]} />
      </div>
    </div>
  )
}
