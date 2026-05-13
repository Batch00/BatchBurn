'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { formatPace } from '@/lib/utils/pace'
import { toast } from '@/lib/hooks/use-toast'
import { revalidateAll } from '@/lib/actions'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type Shoe = {
  id: string
  name: string
  current_miles: number
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function todayStr(): string {
  const d = new Date()
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

// ---------------------------------------------------------------------------
// Run form
// ---------------------------------------------------------------------------

const RUN_TYPES = ['Easy', 'Tempo', 'Long', 'Fartlek', 'Hill', 'Interval'] as const

const runSchema = z
  .object({
    date: z.string().min(1, 'Date is required'),
    distance: z.coerce
      .number()
      .refine((v) => v > 0, { message: 'Distance must be greater than 0' }),
    hours: z.coerce.number().min(0).max(23),
    minutes: z.coerce.number().min(0).max(59),
    seconds: z.coerce.number().min(0).max(59),
    type: z.enum(RUN_TYPES),
    shoe_id: z.string().optional(),
    notes: z.string().optional(),
  })
  .refine((data) => data.hours + data.minutes + data.seconds > 0, {
    message: 'Duration must be greater than 0',
    path: ['minutes'],
  })

function RunForm({ shoes, userId }: { shoes: Shoe[]; userId: string }) {
  const router = useRouter()
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(runSchema),
    defaultValues: {
      date: todayStr(),
      type: 'Easy',
      shoe_id: '',
      notes: '',
    },
  })

  const watchedValues = watch(['distance', 'hours', 'minutes', 'seconds'])
  const dist = Number(watchedValues[0]) || 0
  const durationSec =
    (Number(watchedValues[1]) || 0) * 3600 +
    (Number(watchedValues[2]) || 0) * 60 +
    (Number(watchedValues[3]) || 0)
  const paceDisplay =
    dist > 0 && durationSec > 0 ? formatPace(durationSec / dist) : '--:--'

  async function onSubmit(data: z.infer<typeof runSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const durationSeconds = data.hours * 3600 + data.minutes * 60 + data.seconds
    const pacePerMileSeconds = Math.round(durationSeconds / data.distance)
    const distanceKm = data.distance * 1.60934

    const { error } = await supabase.from('runs').insert({
      user_id: userId,
      date: data.date,
      distance_miles: data.distance,
      distance_km: distanceKm,
      duration_seconds: durationSeconds,
      pace_per_mile_seconds: pacePerMileSeconds,
      run_type: data.type,
      shoe_id: data.shoe_id || null,
      notes: data.notes || null,
      source: 'manual',
    })

    if (error) {
      setSubmitError(error.message)
      return
    }

    toast('Run logged successfully!')
    await revalidateAll()
    reset({ date: todayStr(), type: 'Easy', shoe_id: '', notes: '' })
    setTimeout(() => router.push('/dashboard'), 1500)
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Date */}
      <div className="space-y-1">
        <Label htmlFor="run-date" className="text-sm text-white/60">
          Date
        </Label>
        <Input id="run-date" type="date" className={inputCls} {...register('date')} />
        {errors.date && (
          <p className="text-xs text-red-400">{errors.date.message}</p>
        )}
      </div>

      {/* Distance */}
      <div className="space-y-1">
        <Label htmlFor="run-distance" className="text-sm text-white/60">
          Distance (miles)
        </Label>
        <Input
          id="run-distance"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          className={inputCls}
          {...register('distance')}
        />
        {errors.distance && (
          <p className="text-xs text-red-400">{errors.distance.message}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1">
        <Label className="text-sm text-white/60">Duration</Label>
        <div className="flex gap-2">
          {(
            [
              { id: 'run-hours', field: 'hours', label: 'HH', max: 23 },
              { id: 'run-minutes', field: 'minutes', label: 'MM', max: 59 },
              { id: 'run-seconds', field: 'seconds', label: 'SS', max: 59 },
            ] as const
          ).map(({ id, field, label, max }) => (
            <div key={field} className="flex flex-1 flex-col items-center gap-1">
              <Input
                id={id}
                type="number"
                min="0"
                max={max}
                placeholder="00"
                className={`${inputCls} text-center`}
                {...register(field)}
              />
              <span className="text-xs text-white/30">{label}</span>
            </div>
          ))}
        </div>
        {errors.minutes && (
          <p className="text-xs text-red-400">{errors.minutes.message}</p>
        )}
      </div>

      {/* Pace (read-only) */}
      <div className="space-y-1">
        <Label className="text-sm text-white/60">Pace</Label>
        <div className="flex h-8 items-center rounded-lg border border-white/10 bg-white/[0.03] px-2.5 text-sm text-white/60">
          <span className="font-mono">{paceDisplay}</span>
          <span className="ml-1 text-white/30">/mi</span>
        </div>
      </div>

      {/* Run Type */}
      <div className="space-y-1">
        <Label htmlFor="run-type" className="text-sm text-white/60">
          Run Type
        </Label>
        <Select id="run-type" {...register('type')}>
          {RUN_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {errors.type && (
          <p className="text-xs text-red-400">{errors.type.message}</p>
        )}
      </div>

      {/* Shoe */}
      <div className="space-y-1">
        <Label htmlFor="run-shoe" className="text-sm text-white/60">
          Shoe <span className="text-white/30">(optional)</span>
        </Label>
        <Select id="run-shoe" {...register('shoe_id')}>
          <option value="">— Select a shoe —</option>
          {shoes.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </Select>
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="run-notes" className="text-sm text-white/60">
          Notes <span className="text-white/30">(optional)</span>
        </Label>
        <Textarea
          id="run-notes"
          rows={3}
          placeholder="How did it feel?"
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
            Logging…
          </span>
        ) : (
          'Log Run'
        )}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Cross Training form
// ---------------------------------------------------------------------------

const CROSS_TYPES = [
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
  'Other',
] as const

const crossSchema = z
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

function CrossTrainingForm({ userId }: { userId: string }) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(crossSchema),
    defaultValues: {
      date: todayStr(),
      activity_type: 'Bike',
      notes: '',
    },
  })

  async function onSubmit(data: z.infer<typeof crossSchema>) {
    setSubmitError(null)
    const supabase = createClient()
    const durationSeconds = data.hours * 3600 + data.minutes * 60 + data.seconds
    const distanceMiles = data.distance_miles && data.distance_miles > 0 ? data.distance_miles : null
    const distanceKm = distanceMiles ? distanceMiles * 1.60934 : null

    const { error } = await supabase.from('cross_training').insert({
      user_id: userId,
      date: data.date,
      activity_type: data.activity_type,
      duration_seconds: durationSeconds,
      distance_miles: distanceMiles,
      distance_km: distanceKm,
      steps: data.steps && data.steps > 0 ? data.steps : null,
      notes: data.notes || null,
      source: 'manual',
    })

    if (error) {
      setSubmitError(error.message)
      return
    }

    toast('Activity logged successfully!')
    await revalidateAll()
    reset({ date: todayStr(), activity_type: 'Bike', notes: '' })
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {/* Date */}
      <div className="space-y-1">
        <Label htmlFor="cross-date" className="text-sm text-white/60">
          Date
        </Label>
        <Input id="cross-date" type="date" className={inputCls} {...register('date')} />
        {errors.date && (
          <p className="text-xs text-red-400">{errors.date.message}</p>
        )}
      </div>

      {/* Activity Type */}
      <div className="space-y-1">
        <Label htmlFor="cross-type" className="text-sm text-white/60">
          Activity Type
        </Label>
        <Select id="cross-type" {...register('activity_type')}>
          {CROSS_TYPES.map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        {errors.activity_type && (
          <p className="text-xs text-red-400">{errors.activity_type.message}</p>
        )}
      </div>

      {/* Duration */}
      <div className="space-y-1">
        <Label className="text-sm text-white/60">Duration</Label>
        <div className="flex gap-2">
          {(
            [
              { id: 'cross-hours', field: 'hours', label: 'HH', max: 23 },
              { id: 'cross-minutes', field: 'minutes', label: 'MM', max: 59 },
              { id: 'cross-seconds', field: 'seconds', label: 'SS', max: 59 },
            ] as const
          ).map(({ id, field, label, max }) => (
            <div key={field} className="flex flex-1 flex-col items-center gap-1">
              <Input
                id={id}
                type="number"
                min="0"
                max={max}
                placeholder="00"
                className={`${inputCls} text-center`}
                {...register(field)}
              />
              <span className="text-xs text-white/30">{label}</span>
            </div>
          ))}
        </div>
        {errors.minutes && (
          <p className="text-xs text-red-400">{errors.minutes.message}</p>
        )}
      </div>

      {/* Distance */}
      <div className="space-y-1">
        <Label htmlFor="cross-distance" className="text-sm text-white/60">
          Distance (miles) <span className="text-white/30">(optional)</span>
        </Label>
        <Input
          id="cross-distance"
          type="number"
          step="0.01"
          min="0"
          placeholder="0.00"
          className={inputCls}
          {...register('distance_miles')}
        />
        {errors.distance_miles && (
          <p className="text-xs text-red-400">{errors.distance_miles.message}</p>
        )}
      </div>

      {/* Steps */}
      <div className="space-y-1">
        <Label htmlFor="cross-steps" className="text-sm text-white/60">
          Steps <span className="text-white/30">(optional)</span>
        </Label>
        <Input
          id="cross-steps"
          type="number"
          min="0"
          placeholder="0"
          className={inputCls}
          {...register('steps')}
        />
        {errors.steps && (
          <p className="text-xs text-red-400">{errors.steps.message}</p>
        )}
      </div>

      {/* Notes */}
      <div className="space-y-1">
        <Label htmlFor="cross-notes" className="text-sm text-white/60">
          Notes <span className="text-white/30">(optional)</span>
        </Label>
        <Textarea
          id="cross-notes"
          rows={3}
          placeholder="How did it feel?"
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
            Logging…
          </span>
        ) : (
          'Log Activity'
        )}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Root export
// ---------------------------------------------------------------------------

export function LogActivityClient({
  shoes,
  userId,
  isDemoUser = false,
}: {
  shoes: Shoe[]
  userId: string
  isDemoUser?: boolean
}) {
  const [activeTab, setActiveTab] = useState<'run' | 'cross'>('run')

  if (isDemoUser) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/5 p-8 text-center">
        <p className="text-sm text-white/60">
          Demo accounts cannot log activities.{' '}
          <a
            href="https://www.batch-apps.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-[#00D4AA] underline"
          >
            Request access
          </a>{' '}
          to create your own account.
        </p>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-6">
      {/* Tab toggle */}
      <div className="mb-6 flex border-b border-white/10">
        {(
          [
            { key: 'run', label: 'Run' },
            { key: 'cross', label: 'Cross Training' },
          ] as const
        ).map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`mr-6 pb-3 text-sm font-medium transition-colors ${
              activeTab === key
                ? 'border-b-2 border-[#C41230] text-[#C41230]'
                : 'text-white/40 hover:text-white/70'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {activeTab === 'run' ? (
        <RunForm shoes={shoes} userId={userId} />
      ) : (
        <CrossTrainingForm userId={userId} />
      )}
    </div>
  )
}
