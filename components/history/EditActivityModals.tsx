'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import type { UnifiedActivity } from './HistoryClient'

export const RUN_TYPES = ['Easy', 'Tempo', 'Long', 'Fartlek', 'Hill', 'Interval'] as const

export const CROSS_TYPES = [
  'Bike',
  'Walk',
  'Stair Master',
  'Swim',
  'Strength',
  'Yoga',
  'Soccer',
  'Tennis',
  'Pickleball',
  'Basketball',
  'Hiking',
  'Treadmill',
  'Elliptical',
  'Rowing',
  'Climbing',
  'Ultimate Frisbee',
  'Other',
] as const

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

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
    steps: z.coerce.number().min(0).optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.hours + data.minutes + data.seconds > 0, {
    message: 'Duration must be greater than 0',
    path: ['minutes'],
  })

function secondsToHMS(total: number): { hours: number; minutes: number; seconds: number } {
  const hours = Math.floor(total / 3600)
  const minutes = Math.floor((total % 3600) / 60)
  const seconds = total % 60
  return { hours, minutes, seconds }
}

export function EditRunModal({
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
      distance: Math.round((activity.distance_miles ?? 0) * 100) / 100,
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
    const distanceMiles = Math.round(data.distance * 100) / 100
    const pacePerMileSeconds = Math.round(durationSeconds / distanceMiles)
    const distanceKm = distanceMiles * 1.60934

    const { error } = await supabase
      .from('runs')
      .update({
        date: data.date,
        distance_miles: distanceMiles,
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

export function EditCrossModal({
  activity,
  hiddenTypes,
  onClose,
  onSaved,
}: {
  activity: UnifiedActivity
  hiddenTypes: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)
  const hms = secondsToHMS(activity.duration_seconds ?? 0)

  const currentType = activity.activity_type ?? ''
  const visibleTypes = CROSS_TYPES.filter(
    (t) => t === 'Other' || t === currentType || !hiddenTypes.includes(t),
  )

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(editCrossSchema),
    defaultValues: {
      date: activity.date,
      activity_type: (activity.activity_type ?? 'Bike') as (typeof CROSS_TYPES)[number],
      hours: hms.hours,
      minutes: hms.minutes,
      seconds: hms.seconds,
      distance_miles: Math.round((activity.distance_miles ?? 0) * 100) / 100,
      steps: activity.steps ?? 0,
      notes: activity.notes ?? '',
    },
  })

  async function onSubmit(data: z.infer<typeof editCrossSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const durationSeconds = data.hours * 3600 + data.minutes * 60 + data.seconds
    const distanceMiles =
      data.distance_miles && data.distance_miles > 0
        ? Math.round(data.distance_miles * 100) / 100
        : null
    const distanceKm = distanceMiles ? distanceMiles * 1.60934 : null

    const { error } = await supabase
      .from('cross_training')
      .update({
        date: data.date,
        activity_type: data.activity_type,
        duration_seconds: durationSeconds,
        distance_miles: distanceMiles,
        distance_km: distanceKm,
        steps: data.steps && data.steps > 0 ? data.steps : null,
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
              {visibleTypes.map((t) => (
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

          <div className="space-y-1">
            <Label className="text-sm text-white/60">
              Distance (miles) <span className="text-white/30">(optional)</span>
            </Label>
            <Input type="number" step="0.01" min="0" className={inputCls} {...register('distance_miles')} />
          </div>

          <div className="space-y-1">
            <Label className="text-sm text-white/60">
              Steps <span className="text-white/30">(optional)</span>
            </Label>
            <Input type="number" min="0" className={inputCls} {...register('steps')} />
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
