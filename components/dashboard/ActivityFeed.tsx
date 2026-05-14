import Link from 'next/link'
import { Zap } from 'lucide-react'
import { formatPace, formatDuration } from '@/lib/utils/pace'

const typeColors: Record<string, string> = {
  Easy: 'border-l-blue-500',
  Tempo: 'border-l-orange-500',
  Long: 'border-l-green-700',
  Fartlek: 'border-l-cyan-500',
  Hill: 'border-l-yellow-600',
  Interval: 'border-l-red-500',
  'Cross Training': 'border-l-purple-500',
  Bike: 'border-l-blue-500',
  Walk: 'border-l-green-600',
  'Stair Master': 'border-l-orange-500',
  Swim: 'border-l-cyan-500',
  Strength: 'border-l-purple-500',
  Yoga: 'border-l-pink-500',
  Soccer: 'border-l-green-600',
  Tennis: 'border-l-yellow-500',
  Pickleball: 'border-l-orange-500',
  Basketball: 'border-l-red-500',
  Hiking: 'border-l-green-600',
  Treadmill: 'border-l-blue-500',
  Elliptical: 'border-l-purple-600',
  Rowing: 'border-l-cyan-500',
  Climbing: 'border-l-pink-500',
  'Ultimate Frisbee': 'border-l-green-600',
  Other: 'border-l-gray-500',
}

const typeBadgeColors: Record<string, string> = {
  Easy: 'bg-blue-500/15 text-blue-400',
  Tempo: 'bg-orange-500/15 text-orange-400',
  Long: 'bg-green-700/15 text-green-400',
  Fartlek: 'bg-cyan-500/15 text-cyan-400',
  Hill: 'bg-yellow-600/15 text-yellow-400',
  Interval: 'bg-red-500/15 text-red-400',
  'Cross Training': 'bg-purple-500/15 text-purple-400',
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

export interface Activity {
  id: string
  type: string
  activity_type?: string
  date: string
  distance_miles?: number
  duration_seconds?: number
  pace_seconds?: number
  is_run: boolean
  source?: string | null
}

interface ActivityFeedProps {
  activities: Activity[]
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

export function ActivityFeed({ activities }: ActivityFeedProps) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-white/40">
          Recent Activity
        </h3>
        <Link
          href="/history"
          className="text-xs text-[#C41230] hover:underline"
        >
          View all
        </Link>
      </div>
      <div className="space-y-2">
        {activities.length === 0 && (
          <p className="py-4 text-center text-sm text-white/30">
            No activities yet. Log your first run!
          </p>
        )}
        {activities.map((activity) => {
          const label = activity.is_run
            ? activity.type
            : activity.activity_type || 'Cross Training'
          const borderColor = typeColors[label] || 'border-l-white/20'
          const badgeColor =
            typeBadgeColors[label] || 'bg-white/10 text-white/60'

          return (
            <div
              key={activity.id}
              className={`flex items-center justify-between rounded-lg border-l-2 bg-white/[0.03] px-3 py-2.5 ${borderColor}`}
            >
              <div className="flex items-center gap-2">
                <span
                  className={`rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}`}
                >
                  {label}
                </span>
                {activity.source === 'strava' && (
                  <Zap
                    className="size-3 shrink-0 text-[#FC4C02]"
                    fill="#FC4C02"
                    aria-label="Synced from Strava"
                  />
                )}
                <span className="text-sm text-white/50">
                  {formatDate(activity.date)}
                </span>
              </div>
              <div className="flex items-center gap-4 text-sm">
                {activity.distance_miles != null && (
                  <span className="text-white">
                    {activity.distance_miles.toFixed(1)} mi
                  </span>
                )}
                {activity.duration_seconds != null && (
                  <span className="text-white/50">
                    {formatDuration(activity.duration_seconds)}
                  </span>
                )}
                {activity.is_run && activity.pace_seconds != null && (
                  <span className="text-white/40">
                    {formatPace(activity.pace_seconds)} /mi
                  </span>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
