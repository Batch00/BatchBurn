'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPace, formatDuration } from '@/lib/utils/pace'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterType = 'All' | 'Runs' | 'Cross Training'
type DateRange = 'This Week' | 'This Month' | 'This Year' | 'All Time'

export type UnifiedActivity = {
  id: string
  kind: 'run' | 'cross'
  label: string
  date: string
  distance_miles?: number | null
  duration_seconds?: number | null
  pace_per_mile_seconds?: number | null
  notes?: string | null
  shoe_name?: string | null
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PAGE_SIZE = 20

const BORDER_COLORS: Record<string, string> = {
  Easy: 'border-l-blue-500',
  Tempo: 'border-l-orange-500',
  Long: 'border-l-green-700',
  Fartlek: 'border-l-yellow-500',
  Hill: 'border-l-red-500',
  Interval: 'border-l-pink-500',
  'Cross Training': 'border-l-purple-600',
}

const BADGE_COLORS: Record<string, string> = {
  Easy: 'bg-blue-500/15 text-blue-400',
  Tempo: 'bg-orange-500/15 text-orange-400',
  Long: 'bg-green-700/15 text-green-400',
  Fartlek: 'bg-yellow-500/15 text-yellow-400',
  Hill: 'bg-red-500/15 text-red-400',
  Interval: 'bg-pink-500/15 text-pink-400',
  'Cross Training': 'bg-purple-600/15 text-purple-400',
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function getDateBounds(range: DateRange): { gte?: string; lte?: string } {
  const now = new Date()
  const today = now.toISOString().split('T')[0]
  if (range === 'All Time') return {}
  if (range === 'This Week') {
    const day = now.getDay()
    const diff = day === 0 ? 6 : day - 1
    const monday = new Date(now)
    monday.setDate(now.getDate() - diff)
    return { gte: monday.toISOString().split('T')[0], lte: today }
  }
  if (range === 'This Month') {
    const m = String(now.getMonth() + 1).padStart(2, '0')
    return { gte: `${now.getFullYear()}-${m}-01`, lte: today }
  }
  return { gte: `${now.getFullYear()}-01-01`, lte: today }
}

function formatDate(dateStr: string): string {
  const date = new Date(dateStr + 'T00:00:00')
  return date.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
  })
}

function mergeSort(runs: UnifiedActivity[], cross: UnifiedActivity[]): UnifiedActivity[] {
  return [...runs, ...cross].sort((a, b) => b.date.localeCompare(a.date))
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HistoryClientProps {
  initialActivities: UnifiedActivity[]
  userId: string
}

export function HistoryClient({ initialActivities, userId }: HistoryClientProps) {
  const [filterType, setFilterType] = useState<FilterType>('All')
  const [dateRange, setDateRange] = useState<DateRange>('All Time')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [activities, setActivities] = useState<UnifiedActivity[]>(initialActivities)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  // Track whether we've moved past the SSR-provided initial data
  const [clientFetched, setClientFetched] = useState(false)

  const fetchActivities = useCallback(
    async (type: FilterType, range: DateRange, lim: number) => {
      setLoading(true)
      const supabase = createClient()
      const bounds = getDateBounds(range)
      // Fetch lim+1 to detect if there are more records
      const fetchLimit = lim + 1

      let runs: UnifiedActivity[] = []
      let cross: UnifiedActivity[] = []
      let runsHasMore = false
      let crossHasMore = false

      if (type !== 'Cross Training') {
        let q = supabase
          .from('runs')
          .select('id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds, notes, shoes(name)')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(fetchLimit)
        if (bounds.gte) q = q.gte('date', bounds.gte)
        if (bounds.lte) q = q.lte('date', bounds.lte)
        const { data } = await q
        const rows = data ?? []
        runsHasMore = rows.length > lim
        runs = rows.slice(0, lim).map((r) => ({
          id: r.id,
          kind: 'run' as const,
          label: (r.run_type as string) ?? 'Easy',
          date: r.date as string,
          distance_miles: r.distance_miles as number | null,
          duration_seconds: r.duration_seconds as number | null,
          pace_per_mile_seconds: r.pace_per_mile_seconds as number | null,
          notes: r.notes as string | null,
          shoe_name:
            r.shoes && !Array.isArray(r.shoes)
              ? (r.shoes as { name: string }).name
              : null,
        }))
      }

      if (type !== 'Runs') {
        let q = supabase
          .from('cross_training')
          .select('id, activity_type, date, distance_miles, duration_seconds, notes')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(fetchLimit)
        if (bounds.gte) q = q.gte('date', bounds.gte)
        if (bounds.lte) q = q.lte('date', bounds.lte)
        const { data } = await q
        const rows = data ?? []
        crossHasMore = rows.length > lim
        cross = rows.slice(0, lim).map((c) => ({
          id: c.id,
          kind: 'cross' as const,
          label: 'Cross Training',
          date: c.date as string,
          distance_miles: c.distance_miles as number | null,
          duration_seconds: c.duration_seconds as number | null,
          notes: c.notes as string | null,
        }))
      }

      const merged = mergeSort(runs, cross)
      setActivities(merged)
      setHasMore(runsHasMore || crossHasMore)
      setClientFetched(true)
      setLoading(false)
    },
    [userId],
  )

  // Re-fetch when filter type or date range changes; reset limit
  useEffect(() => {
    setLimit(PAGE_SIZE)
    fetchActivities(filterType, dateRange, PAGE_SIZE)
  }, [filterType, dateRange, fetchActivities])

  // Re-fetch when limit increases (Load More)
  useEffect(() => {
    if (!clientFetched) return
    fetchActivities(filterType, dateRange, limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  function handleFilterType(t: FilterType) {
    setFilterType(t)
    setExpandedId(null)
  }

  function handleDateRange(r: DateRange) {
    setDateRange(r)
    setExpandedId(null)
  }

  function handleLoadMore() {
    setLimit((prev) => prev + PAGE_SIZE)
  }

  const displayActivities = clientFetched ? activities : initialActivities

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
        {/* Type toggle */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['All', 'Runs', 'Cross Training'] as FilterType[]).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => handleFilterType(t)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                filterType === t
                  ? 'bg-[#C41230] text-white'
                  : 'bg-white/5 text-white/60 hover:text-white/80'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        {/* Date range */}
        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['This Week', 'This Month', 'This Year', 'All Time'] as DateRange[]).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => handleDateRange(r)}
              className={`rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                dateRange === r
                  ? 'bg-[#C41230] text-white'
                  : 'bg-white/5 text-white/60 hover:text-white/80'
              }`}
            >
              {r}
            </button>
          ))}
        </div>
      </div>

      {/* Count */}
      <p className="text-sm text-white/40">
        {displayActivities.length} {displayActivities.length === 1 ? 'activity' : 'activities'}
      </p>

      {/* Activity list */}
      <div className="space-y-2">
        {displayActivities.length === 0 && !loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 py-16 text-center">
            <p className="text-sm text-white/30">No activities found</p>
          </div>
        )}

        {displayActivities.map((activity) => {
          const borderColor = BORDER_COLORS[activity.label] ?? 'border-l-white/20'
          const badgeColor = BADGE_COLORS[activity.label] ?? 'bg-white/10 text-white/60'
          const isExpanded = expandedId === activity.id

          return (
            <div key={activity.id}>
              <button
                type="button"
                onClick={() =>
                  setExpandedId(isExpanded ? null : activity.id)
                }
                className={`w-full rounded-lg border-l-2 bg-white/[0.03] px-3 py-3 text-left transition-colors hover:bg-white/[0.06] ${borderColor}`}
              >
                <div className="flex items-center justify-between">
                  {/* Left: badge + date */}
                  <div className="flex min-w-0 items-center gap-3">
                    <span
                      className={`shrink-0 rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}`}
                    >
                      {activity.label}
                    </span>
                    <span className="truncate text-sm text-white/50">
                      {formatDate(activity.date)}
                    </span>
                  </div>

                  {/* Right: stats */}
                  <div className="ml-4 flex shrink-0 items-center gap-4 text-sm">
                    {activity.distance_miles != null && (
                      <span className="text-white">
                        {activity.distance_miles.toFixed(2)} mi
                      </span>
                    )}
                    {activity.duration_seconds != null && (
                      <span className="text-white/50">
                        {formatDuration(activity.duration_seconds)}
                      </span>
                    )}
                    {activity.kind === 'run' &&
                      activity.pace_per_mile_seconds != null && (
                        <span className="hidden text-white/40 sm:block">
                          {formatPace(activity.pace_per_mile_seconds)} /mi
                        </span>
                      )}
                  </div>
                </div>

                {/* Shoe name */}
                {activity.shoe_name && (
                  <p className="mt-1 text-xs text-white/30">{activity.shoe_name}</p>
                )}
              </button>

              {/* Expanded notes */}
              {isExpanded && activity.notes && (
                <div className="rounded-b-lg border-x border-b border-white/10 bg-white/[0.02] px-4 py-2.5">
                  <p className="text-sm text-white/50">{activity.notes}</p>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* Load More */}
      {(hasMore || loading) && (
        <div className="flex justify-center pt-2">
          <button
            type="button"
            onClick={handleLoadMore}
            disabled={loading}
            className="flex items-center gap-2 rounded-lg border border-white/10 bg-transparent px-6 py-2.5 text-sm text-white/60 transition-colors hover:bg-white/5 hover:text-white/80 disabled:opacity-50"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Load More'
            )}
          </button>
        </div>
      )}
    </div>
  )
}
