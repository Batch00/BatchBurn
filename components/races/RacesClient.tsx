'use client'

import { useState, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, Trophy, MoreHorizontal } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { formatPace, formatDuration } from '@/lib/utils/pace'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type RaceRow = {
  id: string
  event_name: string
  date: string
  distance_miles: number
  duration_seconds: number
  pace_per_mile_seconds: number | null
  is_pr: boolean
  overall_place: number | null
  overall_competitors: number | null
  age_group_place: number | null
  age_group_competitors: number | null
  notes: string | null
}

export type ShoeOption = {
  id: string
  name: string
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const raceSchema = z.object({
  event_name: z.string().min(1, 'Event name is required'),
  date: z.string().min(1, 'Date is required'),
  distance_miles: z.coerce.number().min(0.01, 'Distance is required'),
  hours: z.coerce.number().min(0).max(23),
  minutes: z.coerce.number().min(0).max(59),
  seconds: z.coerce.number().min(0).max(59),
  overall_place: z.coerce.number().min(1).optional().or(z.literal('')),
  overall_competitors: z.coerce.number().min(1).optional().or(z.literal('')),
  age_group_place: z.coerce.number().min(1).optional().or(z.literal('')),
  age_group_competitors: z.coerce.number().min(1).optional().or(z.literal('')),
  shoe_id: z.string().optional(),
  notes: z.string().optional(),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

function formatRaceDate(dateStr: string): string {
  return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function secondsToHMS(total: number) {
  return {
    hh: Math.floor(total / 3600),
    mm: Math.floor((total % 3600) / 60),
    ss: total % 60,
  }
}

// ---------------------------------------------------------------------------
// Edit Race Modal
// ---------------------------------------------------------------------------

function EditRaceModal({
  race,
  shoes,
  onClose,
  onSaved,
}: {
  race: RaceRow
  shoes: ShoeOption[]
  onClose: () => void
  onSaved: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const { hh, mm, ss } = secondsToHMS(race.duration_seconds)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(raceSchema),
    defaultValues: {
      event_name: race.event_name,
      date: race.date,
      distance_miles: race.distance_miles,
      hours: hh,
      minutes: mm,
      seconds: ss,
      overall_place: race.overall_place ?? ('' as unknown as number),
      overall_competitors: race.overall_competitors ?? ('' as unknown as number),
      age_group_place: race.age_group_place ?? ('' as unknown as number),
      age_group_competitors: race.age_group_competitors ?? ('' as unknown as number),
      shoe_id: '',
      notes: race.notes ?? '',
    },
  })

  async function onSubmit(data: z.infer<typeof raceSchema>) {
    setSubmitError(null)
    const supabase = createClient()

    const duration_seconds =
      (Number(data.hours) || 0) * 3600 +
      (Number(data.minutes) || 0) * 60 +
      (Number(data.seconds) || 0)

    if (duration_seconds === 0) {
      setSubmitError('Duration must be greater than 0')
      return
    }

    const pace_per_mile_seconds = Math.round(duration_seconds / data.distance_miles)

    const { error } = await supabase
      .from('races')
      .update({
        event_name: data.event_name,
        date: data.date,
        distance_miles: data.distance_miles,
        duration_seconds,
        pace_per_mile_seconds,
        overall_place:
          data.overall_place !== '' && data.overall_place != null
            ? Number(data.overall_place)
            : null,
        overall_competitors:
          data.overall_competitors !== '' && data.overall_competitors != null
            ? Number(data.overall_competitors)
            : null,
        age_group_place:
          data.age_group_place !== '' && data.age_group_place != null
            ? Number(data.age_group_place)
            : null,
        age_group_competitors:
          data.age_group_competitors !== '' && data.age_group_competitors != null
            ? Number(data.age_group_competitors)
            : null,
        shoe_id: data.shoe_id || null,
        notes: data.notes || null,
      })
      .eq('id', race.id)

    if (error) {
      setSubmitError(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-auto w-full max-w-md rounded-xl border border-white/10 bg-[#161B22] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Race</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label htmlFor="edit-race-name" className="text-sm text-white/60">
              Event Name
            </Label>
            <Input
              id="edit-race-name"
              className={inputCls}
              {...register('event_name')}
            />
            {errors.event_name && (
              <p className="text-xs text-red-400">{errors.event_name.message}</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-race-date" className="text-sm text-white/60">
                Date
              </Label>
              <Input
                id="edit-race-date"
                type="date"
                className={inputCls}
                {...register('date')}
              />
              {errors.date && (
                <p className="text-xs text-red-400">{errors.date.message}</p>
              )}
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-race-distance" className="text-sm text-white/60">
                Distance (miles)
              </Label>
              <Input
                id="edit-race-distance"
                type="number"
                step="0.01"
                min="0"
                className={inputCls}
                {...register('distance_miles')}
              />
              {errors.distance_miles && (
                <p className="text-xs text-red-400">{errors.distance_miles.message}</p>
              )}
            </div>
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">Duration</Label>
            <div className="grid grid-cols-3 gap-2">
              <div className="space-y-1">
                <Input
                  type="number"
                  min="0"
                  max="23"
                  placeholder="HH"
                  className={inputCls}
                  {...register('hours')}
                />
                <p className="text-center text-xs text-white/30">Hours</p>
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="MM"
                  className={inputCls}
                  {...register('minutes')}
                />
                <p className="text-center text-xs text-white/30">Min</p>
              </div>
              <div className="space-y-1">
                <Input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="SS"
                  className={inputCls}
                  {...register('seconds')}
                />
                <p className="text-center text-xs text-white/30">Sec</p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-race-overall-place" className="text-sm text-white/60">
                Overall Place <span className="text-white/30">(optional)</span>
              </Label>
              <Input
                id="edit-race-overall-place"
                type="number"
                min="1"
                className={inputCls}
                {...register('overall_place')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-race-overall-comp" className="text-sm text-white/60">
                Total Finishers <span className="text-white/30">(optional)</span>
              </Label>
              <Input
                id="edit-race-overall-comp"
                type="number"
                min="1"
                className={inputCls}
                {...register('overall_competitors')}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="edit-race-ag-place" className="text-sm text-white/60">
                Age Group Place <span className="text-white/30">(optional)</span>
              </Label>
              <Input
                id="edit-race-ag-place"
                type="number"
                min="1"
                className={inputCls}
                {...register('age_group_place')}
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="edit-race-ag-comp" className="text-sm text-white/60">
                Age Group Size <span className="text-white/30">(optional)</span>
              </Label>
              <Input
                id="edit-race-ag-comp"
                type="number"
                min="1"
                className={inputCls}
                {...register('age_group_competitors')}
              />
            </div>
          </div>

          {shoes.length > 0 && (
            <div className="space-y-1">
              <Label htmlFor="edit-race-shoe" className="text-sm text-white/60">
                Shoe <span className="text-white/30">(optional)</span>
              </Label>
              <Select id="edit-race-shoe" {...register('shoe_id')}>
                <option value="">— Select shoe —</option>
                {shoes.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </Select>
            </div>
          )}

          <div className="space-y-1">
            <Label htmlFor="edit-race-notes" className="text-sm text-white/60">
              Notes <span className="text-white/30">(optional)</span>
            </Label>
            <Textarea
              id="edit-race-notes"
              rows={3}
              placeholder="Course notes, conditions, etc."
              {...register('notes')}
            />
          </div>

          {submitError && <p className="text-sm text-red-400">{submitError}</p>}

          <div className="flex gap-3">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="flex-1 border-white/10 text-white/60 hover:border-white/20 hover:text-white/80"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 bg-[#C41230] font-semibold text-white hover:bg-[#A10F29] disabled:opacity-50"
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
// Add Race Form
// ---------------------------------------------------------------------------

function AddRaceForm({
  userId,
  shoes,
  onSuccess,
}: {
  userId: string
  shoes: ShoeOption[]
  onSuccess: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(raceSchema),
    defaultValues: {
      event_name: '',
      date: '',
      distance_miles: '' as unknown as number,
      hours: '' as unknown as number,
      minutes: '' as unknown as number,
      seconds: '' as unknown as number,
      overall_place: '' as unknown as number,
      overall_competitors: '' as unknown as number,
      age_group_place: '' as unknown as number,
      age_group_competitors: '' as unknown as number,
      shoe_id: '',
      notes: '',
    },
  })

  async function onSubmit(data: z.infer<typeof raceSchema>) {
    setSubmitError(null)
    const supabase = createClient()

    const duration_seconds =
      (Number(data.hours) || 0) * 3600 +
      (Number(data.minutes) || 0) * 60 +
      (Number(data.seconds) || 0)

    if (duration_seconds === 0) {
      setSubmitError('Duration must be greater than 0')
      return
    }

    const pace_per_mile_seconds = duration_seconds / data.distance_miles

    const { data: existingRaces } = await supabase
      .from('races')
      .select('id, duration_seconds, is_pr')
      .gte('distance_miles', data.distance_miles - 0.1)
      .lte('distance_miles', data.distance_miles + 0.1)

    let is_pr = false
    if (!existingRaces || existingRaces.length === 0) {
      is_pr = true
    } else {
      const allSlower = existingRaces.every(
        (r) => duration_seconds < (r.duration_seconds as number),
      )
      if (allSlower) {
        is_pr = true
        const prevPrIds = existingRaces
          .filter((r) => r.is_pr)
          .map((r) => r.id as string)
        if (prevPrIds.length > 0) {
          await supabase
            .from('races')
            .update({ is_pr: false })
            .in('id', prevPrIds)
        }
      }
    }

    const { error } = await supabase.from('races').insert({
      user_id: userId,
      event_name: data.event_name,
      date: data.date,
      distance_miles: data.distance_miles,
      duration_seconds,
      pace_per_mile_seconds,
      is_pr,
      overall_place:
        data.overall_place !== '' && data.overall_place != null
          ? Number(data.overall_place)
          : null,
      overall_competitors:
        data.overall_competitors !== '' && data.overall_competitors != null
          ? Number(data.overall_competitors)
          : null,
      age_group_place:
        data.age_group_place !== '' && data.age_group_place != null
          ? Number(data.age_group_place)
          : null,
      age_group_competitors:
        data.age_group_competitors !== '' && data.age_group_competitors != null
          ? Number(data.age_group_competitors)
          : null,
      shoe_id: data.shoe_id || null,
      notes: data.notes || null,
    })

    if (error) {
      setSubmitError(error.message)
      return
    }

    reset()
    onSuccess()
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <div className="space-y-1">
        <Label htmlFor="race-name" className="text-sm text-white/60">
          Event Name
        </Label>
        <Input
          id="race-name"
          placeholder="e.g. Boston Marathon"
          className={inputCls}
          {...register('event_name')}
        />
        {errors.event_name && (
          <p className="text-xs text-red-400">{errors.event_name.message}</p>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="race-date" className="text-sm text-white/60">
            Date
          </Label>
          <Input
            id="race-date"
            type="date"
            className={inputCls}
            {...register('date')}
          />
          {errors.date && (
            <p className="text-xs text-red-400">{errors.date.message}</p>
          )}
        </div>

        <div className="space-y-1">
          <Label htmlFor="race-distance" className="text-sm text-white/60">
            Distance (miles)
          </Label>
          <Input
            id="race-distance"
            type="number"
            step="0.01"
            min="0"
            placeholder="13.1"
            className={inputCls}
            {...register('distance_miles')}
          />
          {errors.distance_miles && (
            <p className="text-xs text-red-400">{errors.distance_miles.message}</p>
          )}
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-sm text-white/60">Duration</Label>
        <div className="grid grid-cols-3 gap-2">
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              max="23"
              placeholder="HH"
              className={inputCls}
              {...register('hours')}
            />
            <p className="text-center text-xs text-white/30">Hours</p>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="MM"
              className={inputCls}
              {...register('minutes')}
            />
            <p className="text-center text-xs text-white/30">Min</p>
          </div>
          <div className="space-y-1">
            <Input
              type="number"
              min="0"
              max="59"
              placeholder="SS"
              className={inputCls}
              {...register('seconds')}
            />
            <p className="text-center text-xs text-white/30">Sec</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="race-overall-place" className="text-sm text-white/60">
            Overall Place <span className="text-white/30">(optional)</span>
          </Label>
          <Input
            id="race-overall-place"
            type="number"
            min="1"
            placeholder="e.g. 142"
            className={inputCls}
            {...register('overall_place')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="race-overall-comp" className="text-sm text-white/60">
            Total Finishers <span className="text-white/30">(optional)</span>
          </Label>
          <Input
            id="race-overall-comp"
            type="number"
            min="1"
            placeholder="e.g. 850"
            className={inputCls}
            {...register('overall_competitors')}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1">
          <Label htmlFor="race-ag-place" className="text-sm text-white/60">
            Age Group Place <span className="text-white/30">(optional)</span>
          </Label>
          <Input
            id="race-ag-place"
            type="number"
            min="1"
            placeholder="e.g. 12"
            className={inputCls}
            {...register('age_group_place')}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="race-ag-comp" className="text-sm text-white/60">
            Age Group Size <span className="text-white/30">(optional)</span>
          </Label>
          <Input
            id="race-ag-comp"
            type="number"
            min="1"
            placeholder="e.g. 95"
            className={inputCls}
            {...register('age_group_competitors')}
          />
        </div>
      </div>

      {shoes.length > 0 && (
        <div className="space-y-1">
          <Label htmlFor="race-shoe" className="text-sm text-white/60">
            Shoe <span className="text-white/30">(optional)</span>
          </Label>
          <Select id="race-shoe" {...register('shoe_id')}>
            <option value="">— Select shoe —</option>
            {shoes.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      <div className="space-y-1">
        <Label htmlFor="race-notes" className="text-sm text-white/60">
          Notes <span className="text-white/30">(optional)</span>
        </Label>
        <Textarea
          id="race-notes"
          rows={3}
          placeholder="Course notes, conditions, etc."
          {...register('notes')}
        />
      </div>

      {submitError && <p className="text-sm text-red-400">{submitError}</p>}

      <Button
        type="submit"
        disabled={isSubmitting}
        className="w-full bg-[#C41230] font-semibold text-white hover:bg-[#A10F29] disabled:opacity-50"
        size="lg"
      >
        {isSubmitting ? (
          <span className="flex items-center gap-2">
            <Loader2 className="size-4 animate-spin" />
            Saving…
          </span>
        ) : (
          'Add Race'
        )}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Race Card
// ---------------------------------------------------------------------------

function RaceCard({
  race,
  shoes,
  isDemoUser,
  onRefresh,
}: {
  race: RaceRow
  shoes: ShoeOption[]
  isDemoUser: boolean
  onRefresh: () => void
}) {
  const router = useRouter()
  const [menuOpen, setMenuOpen] = useState(false)
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [editOpen, setEditOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!menuOpen) return
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuOpen])

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('races').delete().eq('id', race.id)
    setDeleting(false)
    setConfirmDelete(false)
    router.refresh()
    onRefresh()
  }

  if (confirmDelete) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-1 text-sm font-medium text-white">Delete {race.event_name}?</p>
        <p className="mb-4 text-xs text-white/50">This cannot be undone.</p>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setConfirmDelete(false)}
            className="flex-1 rounded-md border border-white/10 py-1.5 text-sm text-white/60 hover:bg-white/5"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 rounded-md bg-red-600/80 py-1.5 text-sm text-white hover:bg-red-600 disabled:opacity-50"
          >
            {deleting ? <Loader2 className="mx-auto size-4 animate-spin" /> : 'Delete'}
          </button>
        </div>
      </div>
    )
  }

  return (
    <>
      {editOpen && (
        <EditRaceModal
          race={race}
          shoes={shoes}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            router.refresh()
            onRefresh()
          }}
        />
      )}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="truncate text-base font-semibold text-white">
                {race.event_name}
              </h3>
              {race.is_pr && (
                <span className="shrink-0 rounded-md bg-amber-500/20 px-2 py-0.5 text-xs font-semibold text-amber-400">
                  PR
                </span>
              )}
            </div>
            <p className="mt-0.5 text-sm text-white/50">
              {formatRaceDate(race.date)} · {race.distance_miles.toFixed(1)} mi
            </p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <div className="text-right">
              <p className="text-base font-semibold text-white">
                {formatDuration(race.duration_seconds)}
              </p>
              {race.pace_per_mile_seconds != null && (
                <p className="text-sm text-white/40">
                  {formatPace(race.pace_per_mile_seconds)} /mi
                </p>
              )}
            </div>

            {!isDemoUser && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex size-7 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/60"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 z-10 min-w-[120px] rounded-lg border border-white/10 bg-[#161B22] py-1 shadow-xl">
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setEditOpen(true)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setMenuOpen(false)
                        setConfirmDelete(true)
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-white/5"
                    >
                      Delete
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Place info */}
        {(race.overall_place != null || race.age_group_place != null) && (
          <div className="mt-3 flex flex-wrap gap-4 border-t border-white/5 pt-3">
            {race.overall_place != null && (
              <div>
                <p className="text-xs text-white/30">Overall</p>
                <p className="text-sm font-medium text-white">
                  {race.overall_place}
                  {race.overall_competitors != null && (
                    <span className="text-white/40"> / {race.overall_competitors}</span>
                  )}
                </p>
              </div>
            )}
            {race.age_group_place != null && (
              <div>
                <p className="text-xs text-white/30">Age Group</p>
                <p className="text-sm font-medium text-white">
                  {race.age_group_place}
                  {race.age_group_competitors != null && (
                    <span className="text-white/40"> / {race.age_group_competitors}</span>
                  )}
                </p>
              </div>
            )}
          </div>
        )}

        {race.notes && (
          <p className="mt-2 text-xs text-white/40">{race.notes}</p>
        )}
      </div>
    </>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface RacesClientProps {
  initialRaces: RaceRow[]
  shoes: ShoeOption[]
  userId: string
  isDemoUser?: boolean
}

export function RacesClient({ initialRaces, shoes, userId, isDemoUser = false }: RacesClientProps) {
  const [races, setRaces] = useState<RaceRow[]>(initialRaces)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)

  async function fetchRaces() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('races')
      .select(
        'id, event_name, date, distance_miles, duration_seconds, pace_per_mile_seconds, is_pr, overall_place, overall_competitors, age_group_place, age_group_competitors, notes',
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })

    if (data) {
      setRaces(
        data.map((r) => ({
          id: r.id as string,
          event_name: r.event_name as string,
          date: r.date as string,
          distance_miles: r.distance_miles as number,
          duration_seconds: r.duration_seconds as number,
          pace_per_mile_seconds: r.pace_per_mile_seconds as number | null,
          is_pr: r.is_pr as boolean,
          overall_place: r.overall_place as number | null,
          overall_competitors: r.overall_competitors as number | null,
          age_group_place: r.age_group_place as number | null,
          age_group_competitors: r.age_group_competitors as number | null,
          notes: r.notes as string | null,
        })),
      )
    }
    setLoading(false)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-white">
          Races
          {loading && <Loader2 className="ml-2 inline size-4 animate-spin text-white/40" />}
        </h1>

        {!isDemoUser && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C41230] px-3 text-sm font-medium text-white transition-colors hover:bg-[#A10F29] focus:outline-none">
            <Plus className="size-4" />
            Add Race
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-lg">
            <DialogHeader>
              <DialogTitle>Add Race</DialogTitle>
            </DialogHeader>
            <AddRaceForm
              userId={userId}
              shoes={shoes}
              onSuccess={() => {
                setOpen(false)
                fetchRaces()
              }}
            />
          </DialogContent>
        </Dialog>}
      </div>

      {/* Race list */}
      {races.length === 0 && !loading ? (
        <div className="rounded-xl border border-white/10 bg-white/5 py-16 text-center">
          <Trophy className="mx-auto mb-3 size-8 text-white/20" />
          <p className="text-sm text-white/30">No races logged yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {races.map((race) => (
            <RaceCard
              key={race.id}
              race={race}
              shoes={shoes}
              isDemoUser={isDemoUser}
              onRefresh={fetchRaces}
            />
          ))}
        </div>
      )}
    </div>
  )
}
