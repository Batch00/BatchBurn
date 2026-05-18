export const revalidate = 0

import { notFound } from 'next/navigation'
import { Zap } from 'lucide-react'
import { createClient } from '@/lib/supabase/server'
import { formatDuration } from '@/lib/utils/pace'
import { ActivityDetailClient } from '@/components/activity/ActivityDetailClient'
import { ActivityMap } from '@/components/activity/ActivityMap'
import type { UnifiedActivity } from '@/components/history/HistoryClient'

const BADGE_COLORS: Record<string, string> = {
  Bike: 'bg-blue-500/15 text-blue-400',
  Walk: 'bg-green-600/15 text-green-500',
  'Stair Master': 'bg-orange-500/15 text-orange-400',
  Swim: 'bg-cyan-500/15 text-cyan-400',
  Strength: 'bg-purple-500/15 text-purple-400',
  Yoga: 'bg-pink-500/15 text-pink-400',
  Soccer: 'bg-green-600/15 text-green-500',
  Tennis: 'bg-yellow-500/15 text-yellow-400',
  Pickleball: 'bg-orange-500/15 text-orange-400',
  Basketball: 'bg-red-500/15 text-red-400',
  Hiking: 'bg-green-600/15 text-green-500',
  Treadmill: 'bg-blue-500/15 text-blue-400',
  Elliptical: 'bg-purple-600/15 text-purple-400',
  Rowing: 'bg-cyan-500/15 text-cyan-400',
  Climbing: 'bg-pink-500/15 text-pink-400',
  'Ultimate Frisbee': 'bg-green-600/15 text-green-500',
  Other: 'bg-gray-500/15 text-gray-400',
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

export default async function CrossDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const isDemoUser = user!.email === 'demo@batchburn.app'

  const [{ data: row }, { data: profile }] = await Promise.all([
    supabase
      .from('cross_training')
      .select(
        'id, activity_type, date, distance_miles, duration_seconds, steps, notes, source, elevation_gain_m, heart_rate_avg, heart_rate_max, map_polyline',
      )
      .eq('id', id)
      .eq('user_id', userId)
      .single(),
    supabase
      .from('profiles')
      .select('hidden_activity_types')
      .eq('user_id', userId)
      .single(),
  ])

  if (!row) {
    notFound()
  }

  const hiddenTypes = (profile?.hidden_activity_types as string[] | null) ?? []
  const activityType = (row.activity_type as string) ?? 'Other'

  const activity: UnifiedActivity = {
    id: row.id as string,
    kind: 'cross',
    label: activityType,
    activity_type: activityType,
    date: row.date as string,
    distance_miles: row.distance_miles as number | null,
    duration_seconds: row.duration_seconds as number | null,
    steps: row.steps as number | null,
    notes: row.notes as string | null,
    source: row.source as string | null,
  }

  const distance = row.distance_miles as number | null
  const duration = row.duration_seconds as number | null
  const steps = row.steps as number | null
  const elevation = row.elevation_gain_m as number | null
  const hrAvg = row.heart_rate_avg as number | null
  const hrMax = row.heart_rate_max as number | null
  const polylineStr = row.map_polyline as string | null
  const badgeColor = BADGE_COLORS[activityType] ?? 'bg-white/10 text-white/60'

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <ActivityDetailClient
        activity={activity}
        shoes={[]}
        hiddenTypes={hiddenTypes}
        isDemoUser={isDemoUser}
      />

      <div className="mt-2 flex items-center gap-2">
        <span
          className={`whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}`}
        >
          {activityType}
        </span>
        {row.source === 'strava' && (
          <span
            title="Synced from Strava"
            aria-label="Synced from Strava"
            className="inline-flex items-center"
          >
            <Zap className="size-3.5 text-[#FC4C02]" fill="#FC4C02" />
          </span>
        )}
      </div>

      <h1 className="mt-2 text-2xl font-bold text-white">{formatLongDate(row.date as string)}</h1>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3">
        {distance != null && (
          <Stat label="Distance" value={`${distance.toFixed(2)} mi`} />
        )}
        <Stat label="Duration" value={duration != null ? formatDuration(duration) : '—'} />
        {steps != null && <Stat label="Steps" value={steps.toLocaleString()} />}
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
      </div>

      {polylineStr && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Route</p>
          <ActivityMap encoded={polylineStr} />
        </div>
      )}

      {row.notes && (
        <div className="mt-6">
          <p className="mb-2 text-xs uppercase tracking-wide text-white/40">Notes</p>
          <p className="rounded-lg border border-white/10 bg-white/[0.03] p-4 text-sm text-white/70">
            {row.notes as string}
          </p>
        </div>
      )}
    </div>
  )
}
