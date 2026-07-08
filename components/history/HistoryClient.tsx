'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2, MoreHorizontal, Zap, Watch } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPace, formatDuration } from '@/lib/utils/pace'
import { EditRunModal, EditCrossModal } from './EditActivityModals'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type FilterType = 'All' | 'Runs' | 'Cross Training'
type DateRange = 'This Week' | 'This Month' | 'This Year' | 'All Time'
type SourceFilter = 'All' | 'Strava' | 'Garmin CSV'

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
  shoe_id?: string | null
  activity_type?: string | null
  run_type?: string | null
  source?: string | null
  steps?: number | null
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

const BADGE_COLORS: Record<string, string> = {
  Easy: 'bg-blue-500/15 text-blue-400',
  Tempo: 'bg-orange-500/15 text-orange-400',
  Long: 'bg-green-700/15 text-green-400',
  Fartlek: 'bg-yellow-500/15 text-yellow-400',
  Hill: 'bg-red-500/15 text-red-400',
  Interval: 'bg-pink-500/15 text-pink-400',
  'Cross Training': 'bg-purple-600/15 text-purple-400',
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
  isDemoUser?: boolean
  hiddenTypes?: string[]
}

export function HistoryClient({ initialActivities, userId, isDemoUser = false, hiddenTypes = [] }: HistoryClientProps) {
  const router = useRouter()
  const [filterType, setFilterType] = useState<FilterType>('All')
  const [dateRange, setDateRange] = useState<DateRange>('All Time')
  const [sourceFilter, setSourceFilter] = useState<SourceFilter>('All')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [activities, setActivities] = useState<UnifiedActivity[]>(initialActivities)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [clientFetched, setClientFetched] = useState(false)

  // Edit / delete state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editActivity, setEditActivity] = useState<UnifiedActivity | null>(null)
  const [editShoes, setEditShoes] = useState<{ id: string; name: string }[]>([])
  const [shoesFetched, setShoesFetched] = useState(false)

  const fetchActivities = useCallback(
    async (type: FilterType, range: DateRange, lim: number) => {
      setLoading(true)
      const supabase = createClient()
      const bounds = getDateBounds(range)
      const fetchLimit = lim + 1

      let runs: UnifiedActivity[] = []
      let cross: UnifiedActivity[] = []
      let runsHasMore = false
      let crossHasMore = false

      if (type !== 'Cross Training') {
        let q = supabase
          .from('runs')
          .select('id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds, notes, shoe_id, source, shoes(name)')
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
          run_type: (r.run_type as string) ?? 'Easy',
          date: r.date as string,
          distance_miles: r.distance_miles as number | null,
          duration_seconds: r.duration_seconds as number | null,
          pace_per_mile_seconds: r.pace_per_mile_seconds as number | null,
          notes: r.notes as string | null,
          shoe_id: r.shoe_id as string | null,
          source: r.source as string | null,
          shoe_name:
            r.shoes && !Array.isArray(r.shoes)
              ? (r.shoes as { name: string }).name
              : null,
        }))
      }

      if (type !== 'Runs') {
        let q = supabase
          .from('cross_training')
          .select('id, activity_type, date, distance_miles, duration_seconds, steps, notes, source')
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
          label: (c.activity_type as string) ?? 'Cross Training',
          activity_type: c.activity_type as string,
          date: c.date as string,
          distance_miles: c.distance_miles as number | null,
          duration_seconds: c.duration_seconds as number | null,
          steps: c.steps as number | null,
          notes: c.notes as string | null,
          source: c.source as string | null,
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

  useEffect(() => {
    setLimit(PAGE_SIZE)
    fetchActivities(filterType, dateRange, PAGE_SIZE)
  }, [filterType, dateRange, fetchActivities])

  useEffect(() => {
    if (!clientFetched) return
    fetchActivities(filterType, dateRange, limit)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [limit])

  // Close menu on outside click
  useEffect(() => {
    if (!menuOpenId) return
    function handleClick(e: MouseEvent) {
      const target = e.target as Element | null
      if (target?.closest(`[data-activity-menu="${menuOpenId}"]`)) return
      setMenuOpenId(null)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpenId])

  function handleFilterType(t: FilterType) {
    setFilterType(t)
  }

  function handleDateRange(r: DateRange) {
    setDateRange(r)
  }

  function handleLoadMore() {
    setLimit((prev) => prev + PAGE_SIZE)
  }

  async function handleDelete(activity: UnifiedActivity) {
    setDeletingId(activity.id)
    const supabase = createClient()
    const table = activity.kind === 'run' ? 'runs' : 'cross_training'
    await supabase.from(table).delete().eq('id', activity.id)
    setDeletingId(null)
    setConfirmDeleteId(null)
    setMenuOpenId(null)
    router.refresh()
    fetchActivities(filterType, dateRange, limit)
  }

  async function handleEditOpen(activity: UnifiedActivity, e: React.MouseEvent) {
    e.stopPropagation()
    setMenuOpenId(null)
    if (activity.kind === 'run' && !shoesFetched) {
      const supabase = createClient()
      const { data } = await supabase
        .from('shoes')
        .select('id, name')
        .eq('user_id', userId)
        .eq('is_active', true)
      setEditShoes(data ?? [])
      setShoesFetched(true)
    }
    setEditActivity(activity)
  }

  function handleEditSaved() {
    setEditActivity(null)
    router.refresh()
    fetchActivities(filterType, dateRange, limit)
  }

  const baseActivities = clientFetched ? activities : initialActivities
  const displayActivities =
    sourceFilter === 'Strava'
      ? baseActivities.filter((a) => a.source === 'strava')
      : sourceFilter === 'Garmin CSV'
        ? baseActivities.filter((a) => a.source === 'garmin_csv')
        : baseActivities

  return (
    <div className="space-y-4">
      {/* Edit modals */}
      {editActivity?.kind === 'run' && (
        <EditRunModal
          activity={editActivity}
          shoes={editShoes}
          onClose={() => setEditActivity(null)}
          onSaved={handleEditSaved}
        />
      )}
      {editActivity?.kind === 'cross' && (
        <EditCrossModal
          activity={editActivity}
          hiddenTypes={hiddenTypes}
          onClose={() => setEditActivity(null)}
          onSaved={handleEditSaved}
        />
      )}

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3">
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

        <div className="flex gap-1 rounded-lg border border-white/10 bg-white/[0.03] p-1">
          {(['All', 'Strava', 'Garmin CSV'] as SourceFilter[]).map((s) => {
            const activeBg =
              s === 'Strava' ? 'bg-[#FC4C02]' : s === 'Garmin CSV' ? 'bg-[#007CC3]' : 'bg-[#C41230]'
            return (
              <button
                key={s}
                type="button"
                onClick={() => setSourceFilter(s)}
                className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium transition-colors ${
                  sourceFilter === s
                    ? `${activeBg} text-white`
                    : 'bg-white/5 text-white/60 hover:text-white/80'
                }`}
              >
                {s === 'Strava' && <Zap className="size-3" />}
                {s === 'Garmin CSV' && <Watch className="size-3" />}
                {s === 'All' ? 'All Sources' : s}
              </button>
            )
          })}
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
          const isConfirmingDelete = confirmDeleteId === activity.id
          const isDeleting = deletingId === activity.id
          const isMenuOpen = menuOpenId === activity.id

          return (
            <div key={activity.id} className="relative">
              {/* Delete confirmation overlay */}
              {isConfirmingDelete ? (
                <div className={`rounded-lg border-l-2 bg-white/[0.03] px-3 py-3 ${borderColor}`}>
                  <p className="mb-3 text-sm text-white/70">Delete this activity?</p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteId(null)}
                      className="flex-1 rounded-md border border-white/10 py-1.5 text-sm text-white/60 hover:bg-white/5"
                    >
                      Cancel
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(activity)}
                      disabled={isDeleting}
                      className="flex-1 rounded-md bg-red-600/80 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
                    >
                      {isDeleting ? (
                        <Loader2 className="mx-auto size-4 animate-spin" />
                      ) : (
                        'Delete'
                      )}
                    </button>
                  </div>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => {
                    const path = activity.kind === 'run' ? '/activities/run/' : '/activities/cross/'
                    router.push(`${path}${activity.id}`)
                  }}
                  className={`w-full cursor-pointer rounded-lg border-l-2 bg-white/[0.03] p-3 text-left transition-colors hover:bg-white/[0.07] ${borderColor}`}
                >
                  {(() => {
                    const menuNode = !isDemoUser ? (
                      <div
                        data-activity-menu={activity.id}
                        className="relative shrink-0"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            setMenuOpenId(isMenuOpen ? null : activity.id)
                          }}
                          className="flex size-7 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/60"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                        {isMenuOpen && (
                          <div className="absolute right-0 top-8 z-10 min-w-[120px] rounded-lg border border-white/10 bg-[#161B22] py-1 shadow-xl">
                            <button
                              type="button"
                              onClick={(e) => handleEditOpen(activity, e)}
                              className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                            >
                              Edit
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation()
                                setMenuOpenId(null)
                                setConfirmDeleteId(activity.id)
                              }}
                              className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                            >
                              Delete
                            </button>
                          </div>
                        )}
                      </div>
                    ) : null

                    return (
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between sm:gap-3">
                        {/* Mobile row 1 / Desktop left cluster: badge + strava (+ date on desktop) + menu (mobile only) */}
                        <div className="flex items-center justify-between gap-2 sm:justify-start">
                          <div className="flex min-w-0 items-center gap-2">
                            <span
                              className={`shrink-0 whitespace-nowrap rounded-md px-2 py-0.5 text-xs font-medium ${badgeColor}`}
                            >
                              {activity.label}
                            </span>
                            {activity.source === 'strava' && (
                              <span
                                title="Synced from Strava"
                                aria-label="Synced from Strava"
                                className="shrink-0"
                              >
                                <Zap className="size-3 text-[#FC4C02]" fill="#FC4C02" />
                              </span>
                            )}
                            {activity.source === 'garmin_csv' && (
                              <span
                                title="Imported from Garmin"
                                aria-label="Imported from Garmin"
                                className="shrink-0"
                              >
                                <Watch className="size-3 text-[#007CC3]" />
                              </span>
                            )}
                            <span className="hidden whitespace-nowrap text-sm text-white/50 sm:inline">
                              {formatDate(activity.date)}
                            </span>
                          </div>
                          <div className="sm:hidden">{menuNode}</div>
                        </div>

                        {/* Mobile row 2 / Desktop right cluster: date (mobile only) + stats + menu (desktop only) */}
                        <div className="flex items-center justify-between gap-3 sm:justify-end">
                          <span className="whitespace-nowrap text-sm text-white/70 sm:hidden">
                            {formatDate(activity.date)}
                          </span>
                          <div className="flex items-center gap-3 text-sm">
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
                                <span className="text-white/40">
                                  {formatPace(activity.pace_per_mile_seconds)} /mi
                                </span>
                              )}
                          </div>
                          <div className="hidden sm:block">{menuNode}</div>
                        </div>
                      </div>
                    )
                  })()}

                  {/* Shoe name */}
                  {activity.shoe_name && (
                    <p className="mt-1 text-xs text-white/30">{activity.shoe_name}</p>
                  )}
                </button>
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
