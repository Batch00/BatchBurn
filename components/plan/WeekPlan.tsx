'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { CheckCircle, ChevronLeft, ChevronRight, Circle, Dumbbell, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { revalidateAll } from '@/lib/actions'
import { toast } from '@/lib/hooks/use-toast'
import { typeColors } from '@/components/dashboard/ActivityFeed'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Routine {
  id: string
  name: string
  default_minutes: number
  activity_type: string
  weekdays: number[]
  is_active: boolean
  sort_order: number
}

interface Session {
  id: string
  routine_id: string | null
  routine_name: string
  activity_type: string
  week_start: string
  slot_weekday: number | null
  date: string
  minutes: number
  status: 'planned' | 'done' | 'skipped'
  cross_training_id: string | null
}

interface LoggedActivity {
  id: string
  href: string
  date: string
  label: string
  distance_miles: number | null
  duration_seconds: number | null
}

type DisplayState = 'planned' | 'done' | 'skipped' | 'missed'

type DialogState = { kind: 'details'; session: Session } | { kind: 'add'; date: string } | null

// ---------------------------------------------------------------------------
// Helpers (local time, same approach as todayStr() in LogActivityClient)
// ---------------------------------------------------------------------------

export const ROUTINE_SELECT = 'id, name, default_minutes, activity_type, weekdays, is_active, sort_order'

function toLocalStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toLocalStr(d)
}

// Plan weeks run Sunday to Saturday.
export function currentSunday(): string {
  const d = new Date()
  d.setDate(d.getDate() - d.getDay())
  return toLocalStr(d)
}

function shortDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })
}

function weekdayShort(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short' })
}

function dayLabel(dateStr: string): string {
  return `${weekdayShort(dateStr)} ${new Date(dateStr + 'T00:00:00').getDate()}`
}

function displayState(s: Session, today: string): DisplayState {
  // A done session whose activity was deleted from History shows as planned.
  const status = s.status === 'done' && !s.cross_training_id ? 'planned' : s.status
  if (status === 'planned' && today >= addDays(s.week_start, 14)) return 'missed'
  return status
}

function activityValue(a: LoggedActivity): string {
  if (a.distance_miles) return `${a.distance_miles.toFixed(1)} mi`
  return `${Math.round((a.duration_seconds ?? 0) / 60)} min`
}

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'
const primaryBtn =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#C41230] px-3 text-sm font-medium text-white transition-colors hover:bg-[#A10F29] disabled:opacity-50'
const secondaryBtn =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/70 transition-colors hover:text-white disabled:opacity-50'

const stateCls: Record<DisplayState, string> = {
  planned: 'bg-white/[0.03] text-white/80',
  done: 'bg-white/10 text-white',
  skipped: 'text-white/30 line-through',
  missed: 'text-white/30',
}

// ---------------------------------------------------------------------------
// Session details (minutes and day)
// ---------------------------------------------------------------------------

function SessionDetails({
  session,
  days,
  busy,
  onSave,
}: {
  session: Session
  days: string[]
  busy: boolean
  onSave: (values: { date: string; minutes: number }) => void
}) {
  const [date, setDate] = useState(session.date)
  const [minutes, setMinutes] = useState(String(session.minutes))
  const mins = Number(minutes)
  const valid = Number.isInteger(mins) && mins >= 1 && mins <= 600

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSave({ date, minutes: mins })
      }}
    >
      <div className="space-y-1">
        <label htmlFor="session-minutes" className="text-sm text-white/60">
          Minutes
        </label>
        <Input
          id="session-minutes"
          type="number"
          min="1"
          max="600"
          className={inputCls}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
        {!valid && <p className="text-xs text-red-400">Enter 1 to 600 minutes</p>}
      </div>
      <div className="space-y-1">
        <p className="text-sm text-white/60">Day</p>
        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDate(d)}
              className={`flex flex-col items-center rounded-md py-1.5 text-xs transition-colors ${
                d === date ? 'bg-[#C41230] text-white' : 'bg-white/5 text-white/50 hover:text-white/80'
              }`}
            >
              <span>{weekdayShort(d)}</span>
              <span className="font-medium">{new Date(d + 'T00:00:00').getDate()}</span>
            </button>
          ))}
        </div>
      </div>
      <button type="submit" className={`${primaryBtn} w-full`} disabled={busy || !valid}>
        Save
      </button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Week plan
// ---------------------------------------------------------------------------

interface WeekPlanProps {
  userId: string
  isDemoUser: boolean
  variant: 'dashboard' | 'page'
  reloadKey?: number
}

export function WeekPlan({ userId, isDemoUser, variant, reloadKey = 0 }: WeekPlanProps) {
  const router = useRouter()
  const [weekOffset, setWeekOffset] = useState(0)
  const [routines, setRoutines] = useState<Routine[] | null>(null)
  const [sessions, setSessions] = useState<Session[]>([])
  const [activities, setActivities] = useState<LoggedActivity[]>([])
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [dragId, setDragId] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState<string | null>(null)

  const thisSunday = currentSunday()
  const weekStart = addDays(thisSunday, -7 * weekOffset)
  const weekEnd = addDays(weekStart, 6)
  const today = toLocalStr(new Date())
  // Catch-up is allowed for the current and previous week only.
  const editable = !isDemoUser && weekOffset <= 1
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  const load = useCallback(async () => {
    const supabase = createClient()
    const { data: routineRows, error: rErr } = await supabase
      .from('routines')
      .select(ROUTINE_SELECT)
      .order('sort_order')
      .order('created_at')
    if (rErr) {
      setLoadError(rErr.message)
      return
    }
    const list = (routineRows ?? []) as Routine[]

    // Make sure the current and previous week have one row per routine weekday.
    // Conflicts are ignored, so moved or skipped sessions are never recreated.
    if (!isDemoUser) {
      const sunday = currentSunday()
      const rows = [sunday, addDays(sunday, -7)].flatMap((ws) =>
        list
          .filter((r) => r.is_active)
          .flatMap((r) =>
            r.weekdays.map((wd) => ({
              user_id: userId,
              routine_id: r.id,
              routine_name: r.name,
              activity_type: r.activity_type,
              week_start: ws,
              slot_weekday: wd,
              // weekdays are ISO (1 = Monday, 7 = Sunday); Sunday is day 0 of the week
              date: addDays(ws, wd % 7),
              minutes: r.default_minutes,
            })),
          ),
      )
      if (rows.length > 0) {
        const { error: gErr } = await supabase.from('planned_sessions').upsert(rows, {
          onConflict: 'user_id,routine_id,week_start,slot_weekday',
          ignoreDuplicates: true,
        })
        if (gErr) {
          setLoadError(gErr.message)
          return
        }
      }
    }

    const [sessionRes, runRes, crossRes] = await Promise.all([
      supabase
        .from('planned_sessions')
        .select(
          'id, routine_id, routine_name, activity_type, week_start, slot_weekday, date, minutes, status, cross_training_id',
        )
        .eq('week_start', weekStart)
        .order('date')
        .order('created_at'),
      supabase
        .from('runs')
        .select('id, date, run_type, distance_miles, duration_seconds')
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date'),
      supabase
        .from('cross_training')
        .select('id, date, activity_type, distance_miles, duration_seconds')
        .gte('date', weekStart)
        .lte('date', weekEnd)
        .order('date'),
    ])
    const firstError = sessionRes.error ?? runRes.error ?? crossRes.error
    if (firstError) {
      setLoadError(firstError.message)
      return
    }
    const sessionList = (sessionRes.data ?? []) as Session[]
    // A cross_training row linked to a session is shown by the session chip.
    const linked = new Set(sessionList.map((s) => s.cross_training_id).filter(Boolean))
    setRoutines(list)
    setSessions(sessionList)
    setActivities([
      ...(runRes.data ?? []).map((r) => ({
        id: r.id as string,
        href: `/activities/run/${r.id}`,
        date: r.date as string,
        label: (r.run_type as string | null) ?? 'Run',
        distance_miles: r.distance_miles as number | null,
        duration_seconds: r.duration_seconds as number | null,
      })),
      ...(crossRes.data ?? [])
        .filter((c) => !linked.has(c.id as string))
        .map((c) => ({
          id: c.id as string,
          href: `/activities/cross/${c.id}`,
          date: c.date as string,
          label: (c.activity_type as string | null) ?? 'Cross Training',
          distance_miles: c.distance_miles as number | null,
          duration_seconds: c.duration_seconds as number | null,
        })),
    ])
    setLoadError(null)
  }, [userId, isDemoUser, weekStart, weekEnd])

  useEffect(() => {
    load()
  }, [load, reloadKey])

  // On phones the week scrolls sideways: open on today, or on Sunday for other weeks.
  const stripRef = useRef<HTMLDivElement>(null)
  const todayRef = useRef<HTMLDivElement>(null)
  const loaded = routines !== null
  useEffect(() => {
    if (loaded && stripRef.current) {
      stripRef.current.scrollLeft = todayRef.current?.offsetLeft ?? 0
    }
  }, [loaded, weekStart])

  // Runs a write, then refreshes server data and reloads the plan.
  async function run(action: () => Promise<string | null>, success: string, touchesActivities = false) {
    setBusy(true)
    const err = await action()
    setBusy(false)
    if (err) {
      toast(err, 'error')
      return
    }
    setDialog(null)
    toast(success)
    await revalidateAll()
    if (touchesActivities) router.refresh()
    await load()
  }

  async function confirmSession(s: Session) {
    const supabase = createClient()
    const done = { status: 'done' }

    // If the watch already recorded this activity that day, link to it instead of adding one.
    const { data: garminRows, error: gErr } = await supabase
      .from('cross_training')
      .select('id')
      .eq('date', s.date)
      .eq('activity_type', s.activity_type)
      .eq('source', 'garmin_csv')
    if (gErr) return gErr.message
    const garminIds = (garminRows ?? []).map((r) => r.id as string)
    if (garminIds.length > 0) {
      const { data: claimed, error: cErr } = await supabase
        .from('planned_sessions')
        .select('cross_training_id')
        .in('cross_training_id', garminIds)
      if (cErr) return cErr.message
      const taken = new Set((claimed ?? []).map((c) => c.cross_training_id as string))
      const linkId = garminIds.find((id) => !taken.has(id))
      if (linkId) {
        const { error } = await supabase
          .from('planned_sessions')
          .update({ ...done, cross_training_id: linkId })
          .eq('id', s.id)
        return error ? error.message : null
      }
    }

    const { data: inserted, error: iErr } = await supabase
      .from('cross_training')
      .insert({
        user_id: userId,
        date: s.date,
        activity_type: s.activity_type,
        duration_seconds: s.minutes * 60,
        distance_miles: null,
        distance_km: null,
        steps: null,
        notes: s.routine_name,
        source: 'manual',
      })
      .select('id')
      .single()
    if (iErr || !inserted) return iErr?.message ?? 'Could not save the activity'

    const { error: uErr } = await supabase
      .from('planned_sessions')
      .update({ ...done, cross_training_id: inserted.id })
      .eq('id', s.id)
    if (uErr) {
      await supabase.from('cross_training').delete().eq('id', inserted.id)
      return uErr.message
    }
    return null
  }

  // One at a time, so each Garmin link check sees the previous confirms.
  async function confirmAll(list: Session[]) {
    for (const s of list) {
      const err = await confirmSession(s)
      if (err) return err
    }
    return null
  }

  async function undoSession(s: Session) {
    const supabase = createClient()
    // Only rows this plan created are deleted. A linked Garmin row is just unlinked.
    if (s.cross_training_id) {
      const { error } = await supabase
        .from('cross_training')
        .delete()
        .eq('id', s.cross_training_id)
        .eq('source', 'manual')
      if (error) return error.message
    }
    const { error } = await supabase
      .from('planned_sessions')
      .update({ status: 'planned', cross_training_id: null })
      .eq('id', s.id)
    return error ? error.message : null
  }

  async function updateSession(s: Session, fields: Record<string, unknown>) {
    const { error } = await createClient().from('planned_sessions').update(fields).eq('id', s.id)
    return error ? error.message : null
  }

  async function removeSession(s: Session) {
    const { error } = await createClient().from('planned_sessions').delete().eq('id', s.id)
    return error ? error.message : null
  }

  async function addSession(routine: Routine, date: string) {
    const { error } = await createClient().from('planned_sessions').insert({
      user_id: userId,
      routine_id: routine.id,
      routine_name: routine.name,
      activity_type: routine.activity_type,
      week_start: weekStart,
      slot_weekday: null,
      date,
      minutes: routine.default_minutes,
    })
    return error ? error.message : null
  }

  function dropOn(date: string) {
    const s = sessions.find((x) => x.id === dragId)
    setDragId(null)
    setDragOver(null)
    if (s && s.date !== date) run(() => updateSession(s, { date }), 'Session moved')
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (variant === 'dashboard' && routines !== null && routines.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <Dumbbell className="size-4 shrink-0 text-purple-400" />
        <p className="flex-1 text-sm text-white/60">No routines yet.</p>
        <Link href="/plan" className="text-xs text-[#C41230] hover:underline">
          Set up your plan
        </Link>
      </div>
    )
  }

  const counted = sessions.filter((s) => displayState(s, today) !== 'skipped')
  const doneCount = counted.filter((s) => displayState(s, today) === 'done').length
  const confirmable = editable
    ? sessions.filter((s) => displayState(s, today) === 'planned' && s.date <= today)
    : []
  const activeRoutines = (routines ?? []).filter((r) => r.is_active)
  const detail = dialog?.kind === 'details' ? dialog.session : null
  const detailState = detail ? displayState(detail, today) : null

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <button
            type="button"
            aria-label="Previous week"
            onClick={() => setWeekOffset((o) => o + 1)}
            className="rounded-md p-1 text-white/50 hover:bg-white/5 hover:text-white/80"
          >
            <ChevronLeft className="size-4" />
          </button>
          <h3 className="text-sm font-medium text-white">
            {weekOffset === 0
              ? 'This week'
              : weekOffset === 1
                ? 'Last week'
                : `${shortDate(weekStart)} to ${shortDate(weekEnd)}`}
          </h3>
          <button
            type="button"
            aria-label="Next week"
            disabled={weekOffset === 0}
            onClick={() => setWeekOffset((o) => o - 1)}
            className="rounded-md p-1 text-white/50 hover:bg-white/5 hover:text-white/80 disabled:opacity-30"
          >
            <ChevronRight className="size-4" />
          </button>
        </div>
        <div className="flex items-center gap-3">
          {counted.length > 0 && (
            <span className="text-xs text-white/50">
              {doneCount} of {counted.length} done
            </span>
          )}
          {confirmable.length > 0 && (
            <button
              type="button"
              className={`${primaryBtn} h-7 text-xs`}
              disabled={busy}
              onClick={() =>
                run(
                  () => confirmAll(confirmable),
                  `${confirmable.length} ${confirmable.length === 1 ? 'session' : 'sessions'} confirmed`,
                  true,
                )
              }
            >
              Confirm all ({confirmable.length})
            </button>
          )}
          {variant === 'dashboard' && (
            <Link href="/plan" className="text-xs text-[#C41230] hover:underline">
              Plan
            </Link>
          )}
        </div>
      </div>

      {loadError && <p className="mb-3 text-sm text-red-400">{loadError}</p>}
      {routines === null && !loadError && <p className="text-sm text-white/30">Loading...</p>}
      {!isDemoUser && weekOffset > 1 && (
        <p className="mb-3 text-xs text-white/40">Weeks before last week are read only.</p>
      )}

      {/* Days: a sideways-scrolling strip on phones, seven columns from md up */}
      {routines !== null && (
        <div
          ref={stripRef}
          className="relative flex snap-x snap-mandatory gap-2 overflow-x-auto pb-1 md:grid md:grid-cols-7 md:overflow-visible md:pb-0"
        >
          {days.map((d) => {
            const daySessions = sessions.filter((s) => s.date === d)
            const dayActivities = activities.filter((a) => a.date === d)
            return (
              <div
                key={d}
                ref={d === today ? todayRef : undefined}
                onDragOver={(e) => {
                  if (!dragId) return
                  e.preventDefault()
                  setDragOver(d)
                }}
                onDragLeave={(e) => {
                  if (!e.currentTarget.contains(e.relatedTarget as Node | null)) setDragOver(null)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  dropOn(d)
                }}
                className={`flex w-[42%] shrink-0 snap-start flex-col items-start gap-2 rounded-lg border p-2 md:w-auto md:min-w-0 md:shrink ${
                  dragOver === d
                    ? 'border-[#C41230] bg-[#C41230]/10'
                    : d === today
                      ? 'border-[#C41230]/50'
                      : 'border-white/5'
                }`}
              >
                <p
                  className={`text-xs ${d === today ? 'text-[#C41230]' : 'text-white/40'}`}
                >
                  {dayLabel(d)}
                </p>
                <div className="flex w-full flex-1 flex-col gap-1.5">
                  {daySessions.map((s) => {
                    const state = displayState(s, today)
                    const canConfirm = editable && state === 'planned' && s.date <= today
                    const canDrag = editable && state === 'planned'
                    const text = (
                      <>
                        <span className="block break-words">{s.routine_name}</span>
                        <span className="block text-xs opacity-70">
                          {state === 'missed' ? 'Missed' : `${s.minutes} min`}
                        </span>
                      </>
                    )
                    return (
                      <div
                        key={s.id}
                        draggable={canDrag}
                        onDragStart={(e) => {
                          e.dataTransfer.setData('text/plain', s.id)
                          e.dataTransfer.effectAllowed = 'move'
                          setDragId(s.id)
                        }}
                        onDragEnd={() => {
                          setDragId(null)
                          setDragOver(null)
                        }}
                        className={`flex w-full items-start gap-1.5 rounded-lg border-l-2 px-2 py-1.5 text-sm ${
                          state === 'skipped' || state === 'missed'
                            ? 'border-l-white/10'
                            : (typeColors[s.activity_type] ?? 'border-l-white/20')
                        } ${stateCls[state]} ${canDrag ? 'md:cursor-grab' : ''}`}
                      >
                        {canConfirm && (
                          <button
                            type="button"
                            aria-label={`Confirm ${s.routine_name}`}
                            disabled={busy}
                            onClick={() => run(() => confirmSession(s), 'Workout confirmed', true)}
                            className="shrink-0 text-white/40 transition-colors hover:text-green-400 disabled:opacity-50"
                          >
                            <Circle className="size-4" />
                          </button>
                        )}
                        {state === 'done' && <CheckCircle className="size-4 shrink-0 text-green-400" />}
                        {editable ? (
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left"
                            onClick={() => setDialog({ kind: 'details', session: s })}
                          >
                            {text}
                          </button>
                        ) : (
                          <span className="min-w-0 flex-1">{text}</span>
                        )}
                      </div>
                    )
                  })}
                  {dayActivities.map((a) => (
                    <Link
                      key={a.id}
                      href={a.href}
                      className={`w-full rounded-lg border border-l-2 border-white/5 px-2 py-1.5 text-xs text-white/60 transition-colors hover:bg-white/[0.07] ${
                        typeColors[a.label] ?? 'border-l-white/20'
                      }`}
                    >
                      <span className="block break-words">{a.label}</span>
                      <span className="block opacity-70">{activityValue(a)}</span>
                    </Link>
                  ))}
                </div>
                {editable && (
                  <button
                    type="button"
                    aria-label={`Add session on ${dayLabel(d)}`}
                    onClick={() => setDialog({ kind: 'add', date: d })}
                    className="flex shrink-0 items-center gap-1 text-xs text-white/30 hover:text-white/70"
                  >
                    <Plus className="size-3.5" />
                    <span>Add</span>
                  </button>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Dialogs */}
      <Dialog open={dialog !== null} onOpenChange={(open) => !open && setDialog(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
          {detail && (
            <>
              <DialogHeader>
                <DialogTitle className="break-words pr-6">{detail.routine_name}</DialogTitle>
                <p className="text-sm text-white/50">
                  {detail.activity_type} · {dayLabel(detail.date)}
                </p>
              </DialogHeader>
              {detailState === 'done' && (
                <div className="space-y-4">
                  <p className="text-sm text-white/60">Done, {detail.minutes} min.</p>
                  <button
                    type="button"
                    className={`${secondaryBtn} w-full`}
                    disabled={busy}
                    onClick={() => run(() => undoSession(detail), 'Workout undone', true)}
                  >
                    Undo
                  </button>
                </div>
              )}
              {detailState === 'skipped' && (
                <button
                  type="button"
                  className={`${secondaryBtn} w-full`}
                  disabled={busy}
                  onClick={() => run(() => updateSession(detail, { status: 'planned' }), 'Session restored')}
                >
                  Unskip
                </button>
              )}
              {detailState === 'planned' && (
                <div className="space-y-3">
                  <SessionDetails
                    key={detail.id}
                    session={detail}
                    days={days}
                    busy={busy}
                    onSave={(values) => run(() => updateSession(detail, values), 'Session updated')}
                  />
                  {detail.slot_weekday === null ? (
                    <button
                      type="button"
                      className={`${secondaryBtn} w-full`}
                      disabled={busy}
                      onClick={() => run(() => removeSession(detail), 'Session removed')}
                    >
                      Remove
                    </button>
                  ) : (
                    <button
                      type="button"
                      className={`${secondaryBtn} w-full`}
                      disabled={busy}
                      onClick={() => run(() => updateSession(detail, { status: 'skipped' }), 'Session skipped')}
                    >
                      Skip
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          {dialog?.kind === 'add' && (
            <>
              <DialogHeader>
                <DialogTitle>Add session</DialogTitle>
                <p className="text-sm text-white/50">{dayLabel(dialog.date)}</p>
              </DialogHeader>
              {activeRoutines.length === 0 ? (
                <p className="text-sm text-white/60">
                  Add a routine on the{' '}
                  <Link href="/plan" className="text-[#C41230] hover:underline">
                    Plan page
                  </Link>{' '}
                  first.
                </p>
              ) : (
                <div className="space-y-2">
                  {activeRoutines.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => addSession(r, dialog.date), 'Session added')}
                      className={`flex w-full items-start justify-between gap-3 rounded-lg border-l-2 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.07] disabled:opacity-50 ${
                        typeColors[r.activity_type] ?? 'border-l-white/20'
                      }`}
                    >
                      <span className="min-w-0 break-words">{r.name}</span>
                      <span className="shrink-0 text-xs text-white/50">{r.default_minutes} min</span>
                    </button>
                  ))}
                </div>
              )}
            </>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
