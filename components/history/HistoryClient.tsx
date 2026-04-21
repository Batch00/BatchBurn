'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { formatPace, formatDuration } from '@/lib/utils/pace'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'

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
  shoe_id?: string | null
  activity_type?: string | null
  run_type?: string | null
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

const RUN_TYPES = ['Easy', 'Tempo', 'Long', 'Fartlek', 'Hill', 'Interval'] as const
const CROSS_TYPES = ['Bike', 'Walk', 'Stair Master', 'Swim', 'Strength', 'Yoga', 'Other'] as const
const SHOW_DISTANCE_CROSS = new Set(['Bike', 'Walk', 'Swim'])

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const editRunSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    distance: z.coerce.number().refine((v) => v > 0, { message: 'Distance must be greater than 0' }),
    hours: z.coerce.number().min(0).max(23),
    minutes: z.coerce.number().min(0).max(59),
    seconds: z.coerce.number().min(0).max(59),
    run_type: z.enum(RUN_TYPES),
    shoe_id: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.hours + data.minutes + data.seconds > 0, {
    message: 'Duration must be greater than 0',
    path: ['minutes'],
  })

const editCrossSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    activity_type: z.enum(CROSS_TYPES),
    hours: z.coerce.number().min(0).max(23),
    minutes: z.coerce.number().min(0).max(59),
    seconds: z.coerce.number().min(0).max(59),
    distance_miles: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.hours + data.minutes + data.seconds > 0, {
    message: 'Duration must be greater than 0',
    path: ['minutes'],
  })

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

function secondsToHMS(total: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { hours, minutes, seconds }
}

// ---------------------------------------------------------------------------
// Edit Run Modal
// ---------------------------------------------------------------------------

function EditRunModal({
  activity,
  shoes,
  onClose,
  onSaved,
}: {
  activity: UnifiedActivity
  shoes: { id: string; name: string }[]
  onClose: () => void
  onSaved: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hms = secondsToHMS(activity.duration_seconds ?? 0)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editRunSchema),
    defaultValues: {
      date: activity.date,
      distance: activity.distance_miles ?? 0,
      hours: hms.hours,
      minutes: hms.minutes,
      seconds: hms.seconds,
      run_type: (activity.run_type ?? activity.label ?? 'Easy') as (typeof RUN_TYPES)[number],
      shoe_id: activity.shoe_id ?? '',
      notes: activity.notes ?? '',
    },
  })

  async function onSubmit(data: z.infer<typeof editRunSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const durationSeconds = data.hours * 3600 + data.minutes * 60 + data.seconds
    const pacePerMileSeconds = Math.round(durationSeconds / data.distance)
    const distanceKm = data.distance * 1.60934

    const { error } = await supabase
      .from('runs')
      .update({
        date: data.date,
        distance_miles: data.distance,
        distance_km: distanceKm,
        duration_seconds: durationSeconds,
        pace_per_mile_seconds: pacePerMileSeconds,
        run_type: data.run_type,
        shoe_id: data.shoe_id || null,
        notes: data.notes || null,
      })
      .eq('id', activity.id)

    if (error) {
      setSubmitError(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#161B22] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Run</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm text-white/60">Date</Label>
            <Input type="date" className={inputCls} {...register('date')} />
            {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Distance (miles)</Label>
            <Input type="number" step="0.01" min="0" className={inputCls} {...register('distance')} />
            {errors.distance && <p className="text-xs text-red-400">{errors.distance.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Duration</Label>
            <div className="flex gap-2">
              {(['hours', 'minutes', 'seconds'] as const).map((f, i) => (
                <div key={f} className="flex flex-1 flex-col items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max={f === 'hours' ? 23 : 59}
                    placeholder="00"
                    className={`${inputCls} text-center`}
                    {...register(f)}
                  />
                  <span className="text-xs text-white/30">{['HH', 'MM', 'SS'][i]}</span>
                </div>
              ))}
            </div>
            {errors.minutes && <p className="text-xs text-red-400">{errors.minutes.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Run Type</Label>
            <Select {...register('run_type')}>
              {RUN_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Shoe</Label>
            <Select {...register('shoe_id')}>
              <option value="">— No shoe —</option>
              {shoes.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Notes</Label>
            <Textarea rows={2} {...register('notes')} />
          </div>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/10 text-white/60 hover:border-white/20 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#C41230] text-white hover:bg-[#A10F29] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Edit Cross Training Modal
// ---------------------------------------------------------------------------

function EditCrossModal({
  activity,
  onClose,
  onSaved,
}: {
  activity: UnifiedActivity
  onClose: () => void
  onSaved: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hms = secondsToHMS(activity.duration_seconds ?? 0)

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editCrossSchema),
    defaultValues: {
      date: activity.date,
      activity_type: (activity.activity_type ?? 'Bike') as (typeof CROSS_TYPES)[number],
      hours: hms.hours,
      minutes: hms.minutes,
      seconds: hms.seconds,
      distance_miles: activity.distance_miles ?? 0,
      notes: activity.notes ?? '',
    },
  })

  const activityType = watch('activity_type') as string
  const showDistance = SHOW_DISTANCE_CROSS.has(activityType)

  async function onSubmit(data: z.infer<typeof editCrossSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const durationSeconds = data.hours * 3600 + data.minutes * 60 + data.seconds

    const { error } = await supabase
      .from('cross_training')
      .update({
        date: data.date,
        activity_type: data.activity_type,
        duration_seconds: durationSeconds,
        distance_miles: showDistance ? (data.distance_miles || null) : null,
        notes: data.notes || null,
      })
      .eq('id', activity.id)

    if (error) {
      setSubmitError(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
      <div className="w-full max-w-md rounded-xl border border-white/10 bg-[#161B22] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Cross Training</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm text-white/60">Date</Label>
            <Input type="date" className={inputCls} {...register('date')} />
            {errors.date && <p className="text-xs text-red-400">{errors.date.message}</p>}
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Activity Type</Label>
            <Select {...register('activity_type')}>
              {CROSS_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Duration</Label>
            <div className="flex gap-2">
              {(['hours', 'minutes', 'seconds'] as const).map((f, i) => (
                <div key={f} className="flex flex-1 flex-col items-center gap-1">
                  <Input
                    type="number"
                    min="0"
                    max={f === 'hours' ? 23 : 59}
                    placeholder="00"
                    className={`${inputCls} text-center`}
                    {...register(f)}
                  />
                  <span className="text-xs text-white/30">{['HH', 'MM', 'SS'][i]}</span>
                </div>
              ))}
            </div>
            {errors.minutes && <p className="text-xs text-red-400">{errors.minutes.message}</p>}
          </div>

          {showDistance && (
            <div className="space-y-1">
              <Label className="text-sm text-white/60">Distance (miles)</Label>
              <Input type="number" step="0.01" min="0" className={inputCls} {...register('distance_miles')} />
            </div>
          )}

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Notes</Label>
            <Textarea rows={2} {...register('notes')} />
          </div>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              onClick={onClose}
              variant="outline"
              className="flex-1 border-white/10 text-white/60 hover:border-white/20 hover:text-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#C41230] text-white hover:bg-[#A10F29] disabled:opacity-50"
            >
              {isSubmitting ? <Loader2 className="size-4 animate-spin" /> : 'Save'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface HistoryClientProps {
  initialActivities: UnifiedActivity[]
  userId: string
}

export function HistoryClient({ initialActivities, userId }: HistoryClientProps) {
  const router = useRouter()
  const [filterType, setFilterType] = useState<FilterType>('All')
  const [dateRange, setDateRange] = useState<DateRange>('All Time')
  const [limit, setLimit] = useState(PAGE_SIZE)
  const [activities, setActivities] = useState<UnifiedActivity[]>(initialActivities)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(false)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [clientFetched, setClientFetched] = useState(false)

  // Edit / delete state
  const [menuOpenId, setMenuOpenId] = useState<string | null>(null)
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [editActivity, setEditActivity] = useState<UnifiedActivity | null>(null)
  const [editShoes, setEditShoes] = useState<{ id: string; name: string }[]>([])
  const [shoesFetched, setShoesFetched] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

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
          .select('id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds, notes, shoe_id, shoes(name)')
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
          activity_type: c.activity_type as string,
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
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpenId(null)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpenId])

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

  const displayActivities = clientFetched ? activities : initialActivities

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
                  onClick={() => setExpandedId(isExpanded ? null : activity.id)}
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

                    {/* Right: stats + menu */}
                    <div className="ml-4 flex shrink-0 items-center gap-3 text-sm">
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

                      {/* More menu */}
                      <div
                        className="relative"
                        ref={isMenuOpen ? menuRef : null}
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
                    </div>
                  </div>

                  {/* Shoe name */}
                  {activity.shoe_name && (
                    <p className="mt-1 text-xs text-white/30">{activity.shoe_name}</p>
                  )}
                </button>
              )}

              {/* Expanded notes */}
              {isExpanded && !isConfirmingDelete && activity.notes && (
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
