'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Check, ChevronLeft, ChevronRight, Dumbbell, MoreHorizontal, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { revalidateAll } from '@/lib/actions'
import { toast } from '@/lib/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface Routine {
  id: string
  name: string
  default_minutes: number
  kind: 'session' | 'addon'
  weekdays: number[]
  addon_default: boolean
  is_active: boolean
  sort_order: number
}

interface Addon {
  name: string
  minutes: number
}

interface Session {
  id: string
  routine_id: string | null
  routine_name: string
  week_start: string
  slot_weekday: number | null
  date: string
  minutes: number
  addons: Addon[]
  status: 'planned' | 'done' | 'skipped'
  cross_training_id: string | null
}

type DisplayState = 'planned' | 'done' | 'skipped' | 'missed'

type DialogState =
  | { kind: 'confirm'; session: Session }
  | { kind: 'edit'; session: Session }
  | { kind: 'add'; date: string }
  | null

// ---------------------------------------------------------------------------
// Helpers (local time, same approach as todayStr() in LogActivityClient)
// ---------------------------------------------------------------------------

export const ROUTINE_SELECT =
  'id, name, default_minutes, kind, weekdays, addon_default, is_active, sort_order'

function toLocalStr(d: Date): string {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function addDays(dateStr: string, n: number): string {
  const d = new Date(dateStr + 'T00:00:00')
  d.setDate(d.getDate() + n)
  return toLocalStr(d)
}

// Plan weeks run Sunday to Saturday.
function currentSunday(): string {
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

function dayLabel(dateStr: string): string {
  const d = new Date(dateStr + 'T00:00:00')
  return `${d.toLocaleDateString('en-US', { weekday: 'short' })} ${d.getDate()}`
}

function totalMinutes(minutes: number, addons: Addon[]): number {
  return minutes + addons.reduce((sum, a) => sum + a.minutes, 0)
}

function activeAddons(routines: Routine[]): Addon[] {
  return routines
    .filter((r) => r.kind === 'addon' && r.is_active)
    .map((r) => ({ name: r.name, minutes: r.default_minutes }))
}

function defaultAddons(routines: Routine[]): Addon[] {
  return routines
    .filter((r) => r.kind === 'addon' && r.is_active && r.addon_default)
    .map((r) => ({ name: r.name, minutes: r.default_minutes }))
}

function displayState(s: Session, today: string): DisplayState {
  // A done session whose activity was deleted from History shows as planned.
  const status = s.status === 'done' && !s.cross_training_id ? 'planned' : s.status
  if (status === 'planned' && today >= addDays(s.week_start, 14)) return 'missed'
  return status
}

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'
const primaryBtn =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#C41230] px-3 text-sm font-medium text-white transition-colors hover:bg-[#A10F29] disabled:opacity-50'
const secondaryBtn =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-white/70 transition-colors hover:text-white disabled:opacity-50'

const chipCls: Record<DisplayState, string> = {
  planned: 'border-purple-500 bg-white/[0.03] text-white/80',
  done: 'border-purple-500 bg-purple-500/15 text-purple-300',
  skipped: 'border-white/10 text-white/30 line-through',
  missed: 'border-white/10 text-white/30',
}

// ---------------------------------------------------------------------------
// Session form (confirm and edit)
// ---------------------------------------------------------------------------

function SessionForm({
  session,
  addonOptions,
  days,
  submitLabel,
  busy,
  onSubmit,
}: {
  session: Session
  addonOptions: Addon[]
  days?: string[]
  submitLabel: string
  busy: boolean
  onSubmit: (values: { date: string; minutes: number; addons: Addon[] }) => void
}) {
  const [date, setDate] = useState(session.date)
  const [minutes, setMinutes] = useState(String(session.minutes))
  const [ticked, setTicked] = useState<string[]>(session.addons.map((a) => a.name))

  // The session's own add-ons win, so a renamed or inactive add-on keeps its minutes.
  const options = [
    ...session.addons,
    ...addonOptions.filter((o) => !session.addons.some((a) => a.name === o.name)),
  ]
  const chosen = options.filter((o) => ticked.includes(o.name))
  const mins = Number(minutes)
  const valid = Number.isInteger(mins) && mins >= 1 && mins <= 600

  function toggle(name: string) {
    setTicked((prev) => (prev.includes(name) ? prev.filter((n) => n !== name) : [...prev, name]))
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (valid) onSubmit({ date, minutes: mins, addons: chosen })
      }}
    >
      {days && (
        <div className="space-y-1">
          <label htmlFor="session-day" className="text-sm text-white/60">
            Day
          </label>
          <Select id="session-day" value={date} onChange={(e) => setDate(e.target.value)}>
            {days.map((d) => (
              <option key={d} value={d}>
                {dayLabel(d)}
              </option>
            ))}
          </Select>
        </div>
      )}
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
      {options.length > 0 && (
        <div className="space-y-1">
          <p className="text-sm text-white/60">Add-ons</p>
          {options.map((o) => (
            <label key={o.name} className="flex items-center gap-2 text-sm text-white/80">
              <input
                type="checkbox"
                className="accent-[#C41230]"
                checked={ticked.includes(o.name)}
                onChange={() => toggle(o.name)}
              />
              {o.name} ({o.minutes} min)
            </label>
          ))}
        </div>
      )}
      <p className="text-sm text-white/50">
        Total: {valid ? totalMinutes(mins, chosen) : '--'} min
      </p>
      <button type="submit" className={`${primaryBtn} w-full`} disabled={busy || !valid}>
        {submitLabel}
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
  const [dialog, setDialog] = useState<DialogState>(null)
  const [busy, setBusy] = useState(false)
  const [loadError, setLoadError] = useState<string | null>(null)

  const thisSunday = currentSunday()
  const weekStart = addDays(thisSunday, -7 * weekOffset)
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
      const addons = defaultAddons(list)
      const rows = [sunday, addDays(sunday, -7)].flatMap((ws) =>
        list
          .filter((r) => r.is_active && r.kind === 'session')
          .flatMap((r) =>
            r.weekdays.map((wd) => ({
              user_id: userId,
              routine_id: r.id,
              routine_name: r.name,
              week_start: ws,
              slot_weekday: wd,
              // weekdays are ISO (1 = Monday, 7 = Sunday); Sunday is day 0 of the week
              date: addDays(ws, wd % 7),
              minutes: r.default_minutes,
              addons,
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

    const { data: sessionRows, error: sErr } = await supabase
      .from('planned_sessions')
      .select(
        'id, routine_id, routine_name, week_start, slot_weekday, date, minutes, addons, status, cross_training_id',
      )
      .eq('week_start', weekStart)
      .order('date')
      .order('created_at')
    if (sErr) {
      setLoadError(sErr.message)
      return
    }
    setRoutines(list)
    setSessions((sessionRows ?? []) as Session[])
    setLoadError(null)
  }, [userId, isDemoUser, weekStart])

  useEffect(() => {
    load()
  }, [load, reloadKey])

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

  async function confirmSession(s: Session, values: { minutes: number; addons: Addon[] }) {
    const supabase = createClient()
    const done = { status: 'done', minutes: values.minutes, addons: values.addons }

    // If the watch already recorded a lift that day, link to it instead of adding one.
    const { data: garminRows, error: gErr } = await supabase
      .from('cross_training')
      .select('id')
      .eq('date', s.date)
      .eq('activity_type', 'Strength')
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
        activity_type: 'Strength',
        duration_seconds: totalMinutes(values.minutes, values.addons) * 60,
        distance_miles: null,
        distance_km: null,
        steps: null,
        notes: [s.routine_name, ...values.addons.map((a) => a.name)].join(' + '),
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

  async function addSession(routine: Routine, date: string) {
    const { error } = await createClient()
      .from('planned_sessions')
      .insert({
        user_id: userId,
        routine_id: routine.id,
        routine_name: routine.name,
        week_start: weekStart,
        slot_weekday: null,
        date,
        minutes: routine.default_minutes,
        addons: defaultAddons(routines ?? []),
      })
    return error ? error.message : null
  }

  // -------------------------------------------------------------------------
  // Render
  // -------------------------------------------------------------------------

  if (variant === 'dashboard' && routines !== null && routines.length === 0) {
    return (
      <div className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
        <Dumbbell className="size-4 shrink-0 text-purple-400" />
        <p className="flex-1 text-sm text-white/60">No strength routines yet.</p>
        <Link href="/plan" className="text-xs text-[#C41230] hover:underline">
          Set up your plan
        </Link>
      </div>
    )
  }

  const counted = sessions.filter((s) => displayState(s, today) !== 'skipped')
  const doneCount = counted.filter((s) => displayState(s, today) === 'done').length
  const sessionRoutines = (routines ?? []).filter((r) => r.kind === 'session' && r.is_active)
  const addonOptions = activeAddons(routines ?? [])

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      {/* Header */}
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        {variant === 'dashboard' ? (
          <h3 className="text-xs uppercase tracking-widest text-white/40">This week</h3>
        ) : (
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
                  : `${shortDate(weekStart)} to ${shortDate(addDays(weekStart, 6))}`}
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
        )}
        <div className="flex items-center gap-3">
          {counted.length > 0 && (
            <span className="text-xs text-white/50">
              {doneCount} of {counted.length} done
            </span>
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
      {variant === 'page' && !isDemoUser && weekOffset > 1 && (
        <p className="mb-3 text-xs text-white/40">Weeks before last week are read only.</p>
      )}

      {/* Days */}
      {routines !== null && (
        <div className="grid gap-2 md:grid-cols-7">
          {days.map((d) => {
            const daySessions = sessions.filter((s) => s.date === d)
            return (
              <div
                key={d}
                className={`flex flex-col gap-1.5 rounded-lg border p-2 ${
                  d === today ? 'border-[#C41230]/50' : 'border-white/5'
                }`}
              >
                <p className={`text-xs ${d === today ? 'text-[#C41230]' : 'text-white/40'}`}>
                  {dayLabel(d)}
                </p>
                {daySessions.map((s) => {
                  const state = displayState(s, today)
                  const total = totalMinutes(s.minutes, s.addons)
                  const canConfirm = editable && state === 'planned' && s.date <= today
                  const body = (
                    <>
                      {state === 'done' && <Check className="mt-0.5 size-3.5 shrink-0" />}
                      <span className="min-w-0 flex-1">
                        <span className="block break-words">{s.routine_name}</span>
                        <span className="block text-xs opacity-70">
                          {state === 'missed' ? 'Missed' : `${total} min`}
                        </span>
                      </span>
                    </>
                  )
                  const base = `flex items-start gap-2 rounded-lg border-l-2 px-2.5 py-2 text-sm ${chipCls[state]}`
                  if (!editable) {
                    return (
                      <div key={s.id} className={base}>
                        {body}
                      </div>
                    )
                  }
                  return (
                    <div key={s.id} className={`${base} transition-colors hover:bg-white/[0.07]`}>
                      <button
                        type="button"
                        className="flex min-w-0 flex-1 items-start gap-2 text-left"
                        onClick={() =>
                          setDialog(
                            canConfirm ? { kind: 'confirm', session: s } : { kind: 'edit', session: s },
                          )
                        }
                      >
                        {body}
                      </button>
                      {state === 'planned' && (
                        <button
                          type="button"
                          aria-label="Session options"
                          onClick={() => setDialog({ kind: 'edit', session: s })}
                          className="shrink-0 rounded p-0.5 text-white/40 hover:text-white/80"
                        >
                          <MoreHorizontal className="size-4" />
                        </button>
                      )}
                    </div>
                  )
                })}
                {editable && (
                  <button
                    type="button"
                    onClick={() => setDialog({ kind: 'add', date: d })}
                    className="flex items-center gap-1 text-xs text-white/30 hover:text-white/70"
                  >
                    <Plus className="size-3" />
                    Add
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
          {dialog?.kind === 'confirm' && (
            <>
              <DialogHeader>
                <DialogTitle>Confirm {dialog.session.routine_name}</DialogTitle>
                <p className="text-sm text-white/50">{dayLabel(dialog.session.date)}</p>
              </DialogHeader>
              <SessionForm
                key={dialog.session.id}
                session={dialog.session}
                addonOptions={addonOptions}
                submitLabel="Confirm workout"
                busy={busy}
                onSubmit={(values) =>
                  run(() => confirmSession(dialog.session, values), 'Workout confirmed', true)
                }
              />
            </>
          )}

          {dialog?.kind === 'edit' && (
            <>
              <DialogHeader>
                <DialogTitle>{dialog.session.routine_name}</DialogTitle>
                <p className="text-sm text-white/50">{dayLabel(dialog.session.date)}</p>
              </DialogHeader>
              {displayState(dialog.session, today) === 'done' && (
                <div className="space-y-4">
                  <p className="text-sm text-white/60">
                    Done, {totalMinutes(dialog.session.minutes, dialog.session.addons)} min.
                  </p>
                  <button
                    type="button"
                    className={`${secondaryBtn} w-full`}
                    disabled={busy}
                    onClick={() => run(() => undoSession(dialog.session), 'Workout undone', true)}
                  >
                    Undo
                  </button>
                </div>
              )}
              {displayState(dialog.session, today) === 'skipped' && (
                <button
                  type="button"
                  className={`${secondaryBtn} w-full`}
                  disabled={busy}
                  onClick={() =>
                    run(() => updateSession(dialog.session, { status: 'planned' }), 'Session restored')
                  }
                >
                  Unskip
                </button>
              )}
              {displayState(dialog.session, today) === 'planned' && (
                <div className="space-y-3">
                  <SessionForm
                    key={dialog.session.id}
                    session={dialog.session}
                    addonOptions={addonOptions}
                    days={days}
                    submitLabel="Save"
                    busy={busy}
                    onSubmit={(values) =>
                      run(() => updateSession(dialog.session, values), 'Session updated')
                    }
                  />
                  <button
                    type="button"
                    className={`${secondaryBtn} w-full`}
                    disabled={busy}
                    onClick={() =>
                      run(() => updateSession(dialog.session, { status: 'skipped' }), 'Session skipped')
                    }
                  >
                    Skip
                  </button>
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
              {sessionRoutines.length === 0 ? (
                <p className="text-sm text-white/60">
                  Add a routine on the{' '}
                  <Link href="/plan" className="text-[#C41230] hover:underline">
                    Plan page
                  </Link>{' '}
                  first.
                </p>
              ) : (
                <div className="space-y-2">
                  {sessionRoutines.map((r) => (
                    <button
                      key={r.id}
                      type="button"
                      disabled={busy}
                      onClick={() => run(() => addSession(r, dialog.date), 'Session added')}
                      className="flex w-full items-center justify-between rounded-lg border-l-2 border-purple-500 bg-white/[0.03] px-3 py-2 text-left text-sm text-white/80 transition-colors hover:bg-white/[0.07] disabled:opacity-50"
                    >
                      <span>{r.name}</span>
                      <span className="text-xs text-white/50">{r.default_minutes} min</span>
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
