export const revalidate = 0

import { notFound } from 'next/navigation'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatPace, formatDuration } from '@/lib/utils/pace'
import { ActivityDetailClient } from '@/components/activity/ActivityDetailClient'
import { ActivityMap } from '@/components/activity/ActivityMap'
import type { UnifiedActivity } from '@/components/history/HistoryClient'

const BADGE_COLORS: Record<string, string> = {
  Easy: 'bg-blue-500/15 text-blue-400',
  Tempo: 'bg-orange-500/15 text-orange-400',
  Long: 'bg-green-700/15 text-green-400',
  Fartlek: 'bg-yellow-500/15 text-yellow-400',
  Hill: 'bg-red-500/15 text-red-400',
  Interval: 'bg-pink-500/15 text-pink-400',
}

function formatLongDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
}

function Stat({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/[0.03] p-4">
      <p className="text-xs uppercase tracking-wide text-white/40">{label}</p>
      <p className="mt-1 text-2xl font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-white/40">{sub}</p>}
    </div>
  )
}

export default async function RunDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const isDemoUser = user!.email === 'demo@batchburn.app'

  const { data: run } = await supabase
    .from('runs')
    .select(
      'id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds, notes, shoe_id, source, elevation_gain_m, heart_rate_avg, heart_rate_max, cadence_avg, map_polyline, shoes(name)',
    )
    .eq('id', id)
    .eq('user_id', userId)
    .single()

  if (!run) {
    notFound()
  }

  const { data: shoes } = await supabase
    .from('shoes')
    .select('id, name')
    .eq('user_id', userId)
    .eq('is_active', true)

  const shoeName =
    run.shoes && !Array.isArray(run.shoes) ? (run.shoes as { name: string }).name : null

  const activity: UnifiedActivity = {
    id: run.id as string,
    kind: 'run',
    label: (run.run_type as string) ?? 'Easy',
    run_type: (run.run_type as string) ?? 'Easy',
    date: run.date as string,
    distance_miles: run.distance_miles as number | null,
    duration_seconds: run.duration_seconds as number | null,
    pace_per_mile_seconds: run.pace_per_mile_seconds as number | null,
    notes: run.notes as string | null,
    shoe_id: run.shoe_id as string | null,
    source: run.source as string | null,
    shoe_name: shoeName,
  }

  const distance = run.distance_miles as number | null
  const duration = run.duration_seconds as number | null
  const pace = run.pace_per_mile_seconds as number | null
  const elevation = run.elevation_gain_m as number | null
  const hrAvg = run.heart_rate_avg as number | null
  const hrMax = run.heart_rate_max as number | null
  const cadence = run.cadence_avg as number | null
  const polylineStr = run.map_polyline as string | null
  const runType = (run.run_type as string) ?? 'Easy'
  const badgeColor = BADGE_COLORS[runType] ?? 'bg-white/10 text-white/60'

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <ActivityDetailClient
        activity={activity}
        shoes={(shoes ?? []).map((s) => ({ id: s.id as string, name: s.name as string }))}
        hiddenTypes={[]}
        isDemoUser={isDemoUser}
      />

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}`}
        >
          {runType}
        </span>
        {run.source === 'strava' && (
          <span
            title="Synced from Strava"
            aria-label="Synced from Strava"
            className="inline-flex items-center"
          >
            <Zap className="size-3.5 text-[#FC4C02]" fill="#FC4C02" />
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-bold text-white">{formatLongDate(run.date as string)}</h1>
      {shoeName && <p className="mt-1 text-sm text-white/40">{shoeName}</p>}

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat
          label="Distance"
          value={distance != null ? `${distance.toFixed(2)} mi` : '—'}
        />
        <Stat label="Duration" value={duration != null ? formatDuration(duration) : '—'} />
        <Stat label="Pace" value={pace != null ? `${formatPace(pace)} /mi` : '—'} />
        {elevation != null && (
          <Stat
            label="Elevation Gain"
            value={`${Math.round(elevation)} m`}
            sub={`${Math.round(elevation * 3.28084)} ft`}
          />
        )}
        {hrAvg != null && (
          <Stat label="Avg Heart Rate" value={`${hrAvg} bpm`} />
        )}
        {hrMax != null && (
          <Stat label="Max Heart Rate" value={`${hrMax} bpm`} />
        )}
        {cadence != null && (
          <Stat label="Avg Cadence" value={`${Math.round(cadence)} spm`} />
        )}
      </div>

      {polylineStr && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Route</p>
          <ActivityMap encoded={polylineStr} />
        </div>
      )}

      {run.notes && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Notes</p>
          <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            {run.notes as string}
          </p>
        </div>
      )}
    </div>
  )
}
