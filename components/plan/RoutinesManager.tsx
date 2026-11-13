'use client'

import { useCallback, useEffect, useState } from 'react'
import { ArrowDown, ArrowUp, Pencil, Plus } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { revalidateAll } from '@/lib/actions'
import { toast } from '@/lib/hooks/use-toast'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Select } from '@/components/ui/select'
import { ROUTINE_SELECT, type Routine } from './WeekPlan'

const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']
// ISO day numbers in display order: the plan week runs Sunday to Saturday.
const DAY_ORDER = [7, 1, 2, 3, 4, 5, 6]

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'
const primaryBtn =
  'inline-flex h-8 items-center justify-center gap-1.5 rounded-lg bg-[#C41230] px-3 text-sm font-medium text-white transition-colors hover:bg-[#A10F29] disabled:opacity-50'
const iconBtn = 'rounded p-1 text-white/40 hover:bg-white/5 hover:text-white/80 disabled:opacity-20'

type RoutineFields = Pick<Routine, 'name' | 'default_minutes' | 'kind' | 'weekdays' | 'addon_default'>

function RoutineForm({
  routine,
  busy,
  onSubmit,
}: {
  routine: Routine | null
  busy: boolean
  onSubmit: (fields: RoutineFields) => void
}) {
  const [name, setName] = useState(routine?.name ?? '')
  const [minutes, setMinutes] = useState(String(routine?.default_minutes ?? 45))
  const [kind, setKind] = useState<Routine['kind']>(routine?.kind ?? 'session')
  const [weekdays, setWeekdays] = useState<number[]>(routine?.weekdays ?? [])
  const [addonDefault, setAddonDefault] = useState(routine?.addon_default ?? false)

  const mins = Number(minutes)
  const valid = name.trim() !== '' && Number.isInteger(mins) && mins >= 1 && mins <= 600

  function toggleDay(day: number) {
    setWeekdays((prev) =>
      prev.includes(day) ? prev.filter((d) => d !== day) : [...prev, day].sort((a, b) => a - b),
    )
  }

  return (
    <form
      className="space-y-4"
      onSubmit={(e) => {
        e.preventDefault()
        if (!valid) return
        onSubmit({
          name: name.trim(),
          default_minutes: mins,
          kind,
          weekdays: kind === 'session' ? weekdays : [],
          addon_default: kind === 'addon' ? addonDefault : false,
        })
      }}
    >
      <div className="space-y-1">
        <label htmlFor="routine-name" className="text-sm text-white/60">
          Name
        </label>
        <Input
          id="routine-name"
          className={inputCls}
          placeholder="Back and biceps"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="routine-minutes" className="text-sm text-white/60">
          Typical minutes
        </label>
        <Input
          id="routine-minutes"
          type="number"
          min="1"
          max="600"
          className={inputCls}
          value={minutes}
          onChange={(e) => setMinutes(e.target.value)}
        />
      </div>
      <div className="space-y-1">
        <label htmlFor="routine-kind" className="text-sm text-white/60">
          Type
        </label>
        <Select
          id="routine-kind"
          value={kind}
          onChange={(e) => setKind(e.target.value as Routine['kind'])}
        >
          <option value="session">Session</option>
          <option value="addon">Add-on (ticked onto a session)</option>
        </Select>
      </div>
      {kind === 'session' ? (
        <div className="space-y-1">
          <p className="text-sm text-white/60">Default days</p>
          <div className="flex flex-wrap gap-1">
            {DAY_ORDER.map((day) => {
              const label = WEEKDAYS[day - 1]
              const on = weekdays.includes(day)
              return (
                <button
                  key={day}
                  type="button"
                  onClick={() => toggleDay(day)}
                  className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                    on ? 'bg-[#C41230] text-white' : 'bg-white/5 text-white/50 hover:text-white/80'
                  }`}
                >
                  {label}
                </button>
              )
            })}
          </div>
        </div>
      ) : (
        <label className="flex items-center gap-2 text-sm text-white/80">
          <input
            type="checkbox"
            className="accent-[#C41230]"
            checked={addonDefault}
            onChange={(e) => setAddonDefault(e.target.checked)}
          />
          Tick on new sessions by default
        </label>
      )}
      <button type="submit" className={`${primaryBtn} w-full`} disabled={busy || !valid}>
        Save
      </button>
    </form>
  )
}

export function RoutinesManager({
  userId,
  isDemoUser,
  onChange,
}: {
  userId: string
  isDemoUser: boolean
  onChange: () => void
}) {
  const [routines, setRoutines] = useState<Routine[]>([])
  const [editing, setEditing] = useState<Routine | 'new' | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    const { data, error } = await createClient()
      .from('routines')
      .select(ROUTINE_SELECT)
      .order('sort_order')
      .order('created_at')
    if (error) {
      toast(error.message, 'error')
      return
    }
    setRoutines((data ?? []) as Routine[])
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function run(action: () => Promise<string | null>) {
    setBusy(true)
    const err = await action()
    setBusy(false)
    if (err) {
      toast(err, 'error')
      return
    }
    setEditing(null)
    await revalidateAll()
    await load()
    onChange()
  }

  async function save(fields: RoutineFields) {
    const supabase = createClient()
    const { error } =
      editing && editing !== 'new'
        ? await supabase.from('routines').update(fields).eq('id', editing.id)
        : await supabase.from('routines').insert({
            ...fields,
            user_id: userId,
            sort_order: routines.reduce((max, r) => Math.max(max, r.sort_order), -1) + 1,
          })
    return error ? error.message : null
  }

  async function setActive(r: Routine, isActive: boolean) {
    const { error } = await createClient()
      .from('routines')
      .update({ is_active: isActive })
      .eq('id', r.id)
    return error ? error.message : null
  }

  // Swap with a neighbor, then write the new order for every row that changed.
  async function move(index: number, dir: -1 | 1) {
    const order = [...routines]
    const [item] = order.splice(index, 1)
    order.splice(index + dir, 0, item)
    const changed = order
      .map((r, i) => ({ id: r.id, sort_order: i, old: r.sort_order }))
      .filter((r) => r.sort_order !== r.old)
    const supabase = createClient()
    const results = await Promise.all(
      changed.map((r) =>
        supabase.from('routines').update({ sort_order: r.sort_order }).eq('id', r.id),
      ),
    )
    const failed = results.find((r) => r.error)
    return failed?.error ? failed.error.message : null
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-xs uppercase tracking-widest text-white/40">Routines</h3>
        {!isDemoUser && (
          <button type="button" className={primaryBtn} onClick={() => setEditing('new')}>
            <Plus className="size-4" />
            Add routine
          </button>
        )}
      </div>

      {routines.length === 0 ? (
        <p className="py-4 text-center text-sm text-white/30">
          No routines yet. Add one to start planning your week.
        </p>
      ) : (
        <div className="space-y-2">
          {routines.map((r, i) => (
            <div
              key={r.id}
              className={`flex items-center gap-3 rounded-lg border-l-2 border-purple-500 bg-white/[0.03] px-3 py-2.5 ${
                r.is_active ? '' : 'opacity-50'
              }`}
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm text-white">{r.name}</p>
                <p className="text-xs text-white/40">
                  {r.default_minutes} min ·{' '}
                  {r.kind === 'addon'
                    ? `Add-on${r.addon_default ? ', ticked by default' : ''}`
                    : r.weekdays.length > 0
                      ? DAY_ORDER.filter((d) => r.weekdays.includes(d))
                          .map((d) => WEEKDAYS[d - 1])
                          .join(', ')
                      : 'No default day'}
                  {r.is_active ? '' : ' · Inactive'}
                </p>
              </div>
              {!isDemoUser && (
                <div className="flex shrink-0 items-center gap-1">
                  <label className="flex items-center gap-1 text-xs text-white/50">
                    <input
                      type="checkbox"
                      className="accent-[#C41230]"
                      checked={r.is_active}
                      disabled={busy}
                      onChange={(e) => run(() => setActive(r, e.target.checked))}
                    />
                    Active
                  </label>
                  <button
                    type="button"
                    aria-label="Move up"
                    className={iconBtn}
                    disabled={busy || i === 0}
                    onClick={() => run(() => move(i, -1))}
                  >
                    <ArrowUp className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Move down"
                    className={iconBtn}
                    disabled={busy || i === routines.length - 1}
                    onClick={() => run(() => move(i, 1))}
                  >
                    <ArrowDown className="size-4" />
                  </button>
                  <button
                    type="button"
                    aria-label="Edit routine"
                    className={iconBtn}
                    onClick={() => setEditing(r)}
                  >
                    <Pencil className="size-4" />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-sm">
          <DialogHeader>
            <DialogTitle>{editing === 'new' ? 'Add routine' : 'Edit routine'}</DialogTitle>
          </DialogHeader>
          {editing !== null && (
            <RoutineForm
              key={editing === 'new' ? 'new' : editing.id}
              routine={editing === 'new' ? null : editing}
              busy={busy}
              onSubmit={(fields) => run(() => save(fields))}
            />
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}
