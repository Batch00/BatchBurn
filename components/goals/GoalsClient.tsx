'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, ChevronDown, ChevronUp } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select } from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalRow = {
  id: string
  goal_type: string
  period: 'week' | 'month' | 'year'
  target_value: number
  is_active: boolean
  created_at: string
}

// ---------------------------------------------------------------------------
// Schema
// ---------------------------------------------------------------------------

const goalSchema = z.object({
  period: z.enum(['week', 'month', 'year']),
  target_miles: z.coerce.number().min(0.1, 'Target miles is required'),
})

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const inputCls =
  'border-white/10 bg-white/5 text-white placeholder:text-white/30 focus-visible:border-[#C41230] focus-visible:ring-[#C41230]/20'

function getWeekStart(): string {
  const now = new Date()
  const day = now.getDay()
  const diff = day === 0 ? 6 : day - 1
  const monday = new Date(now)
  monday.setDate(now.getDate() - diff)
  return monday.toISOString().split('T')[0]
}

function getMonthStart(): string {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`
}

function getYearStart(): string {
  return `${new Date().getFullYear()}-01-01`
}

function todayStr(): string {
  return new Date().toISOString().split('T')[0]
}

function getPeriodLabel(period: 'week' | 'month' | 'year'): string {
  return period === 'week' ? 'WEEK' : period === 'month' ? 'MONTH' : 'YEAR'
}

function getBarColor(pct: number): string {
  if (pct >= 100) return 'bg-[#16A34A]'
  if (pct >= 80) return 'bg-[#F59E0B]'
  return 'bg-[#C41230]'
}

// ---------------------------------------------------------------------------
// Add Goal Form
// ---------------------------------------------------------------------------

function AddGoalForm({
  userId,
  activeGoals,
  onSuccess,
}: {
  userId: string
  activeGoals: GoalRow[]
  onSuccess: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      period: 'week' as 'week' | 'month' | 'year',
      target_miles: '' as unknown as number,
    },
  })

  async function onSubmit(data: z.infer<typeof goalSchema>) {
    setSubmitError(null)

    // Client-side duplicate check
    const existing = activeGoals.find(
      (g) => g.is_active && g.period === data.period,
    )
    if (existing) {
      setSubmitError(
        `You already have an active ${data.period} goal`,
      )
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('goals').insert({
      user_id: userId,
      goal_type: 'mileage',
      period: data.period,
      target_value: data.target_miles,
      is_active: true,
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
        <Label className="text-sm text-white/60">Goal Type</Label>
        <div className="flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/40">
          Mileage
        </div>
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-period" className="text-sm text-white/60">
          Period
        </Label>
        <Select id="goal-period" {...register('period')}>
          <option value="week">Week</option>
          <option value="month">Month</option>
          <option value="year">Year</option>
        </Select>
        {errors.period && (
          <p className="text-xs text-red-400">{errors.period.message}</p>
        )}
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-miles" className="text-sm text-white/60">
          Target Miles
        </Label>
        <Input
          id="goal-miles"
          type="number"
          step="0.1"
          min="0.1"
          placeholder="e.g. 20"
          className={inputCls}
          {...register('target_miles')}
        />
        {errors.target_miles && (
          <p className="text-xs text-red-400">{errors.target_miles.message}</p>
        )}
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
          'Add Goal'
        )}
      </Button>
    </form>
  )
}

// ---------------------------------------------------------------------------
// Goal Card
// ---------------------------------------------------------------------------

function GoalCard({
  goal,
  progress,
}: {
  goal: GoalRow
  progress: number | null
}) {
  const current = progress ?? 0
  const pct = Math.min((current / goal.target_value) * 100, 100)
  const barColor = getBarColor(pct)
  const periodLabel = getPeriodLabel(goal.period)

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="rounded-md bg-[#C41230]/20 px-2 py-0.5 text-xs font-semibold tracking-wider text-[#C41230]">
          {periodLabel}
        </span>
        <span className="text-sm text-white/40">
          {goal.target_value} miles / {goal.period}
        </span>
      </div>

      <div className="mb-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold text-white">
          {current.toFixed(1)}
          <span className="ml-1 text-sm font-normal text-white/40">mi</span>
        </span>
        <span className="text-sm font-semibold text-white">
          {pct.toFixed(0)}%
        </span>
      </div>

      <div className="mb-1 h-1.5 w-full overflow-hidden rounded-full bg-[#1c2128]">
        <div
          className={`h-full rounded-full transition-all ${barColor}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <p className="text-xs text-white/30">
        {current.toFixed(1)} / {goal.target_value} mi
      </p>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface GoalsClientProps {
  initialGoals: GoalRow[]
  userId: string
  isDemoUser?: boolean
}

export function GoalsClient({ initialGoals, userId, isDemoUser = false }: GoalsClientProps) {
  const [goals, setGoals] = useState<GoalRow[]>(initialGoals)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pastOpen, setPastOpen] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})

  const activeGoals = goals.filter((g) => g.is_active)
  const pastGoals = goals.filter((g) => !g.is_active)

  // Fetch progress for active goals
  useEffect(() => {
    if (activeGoals.length === 0) return
    fetchProgress(activeGoals)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [goals])

  async function fetchProgress(active: GoalRow[]) {
    const supabase = createClient()
    const today = todayStr()
    const newProgress: Record<string, number> = {}

    await Promise.all(
      active.map(async (goal) => {
        let startDate: string
        if (goal.period === 'week') startDate = getWeekStart()
        else if (goal.period === 'month') startDate = getMonthStart()
        else startDate = getYearStart()

        const { data } = await supabase
          .from('runs')
          .select('distance_miles')
          .eq('user_id', userId)
          .gte('date', startDate)
          .lte('date', today)

        const miles = (data ?? []).reduce(
          (sum, r) => sum + ((r.distance_miles as number | null) ?? 0),
          0,
        )
        newProgress[goal.id] = miles
      }),
    )

    setProgress(newProgress)
  }

  async function fetchGoals() {
    setLoading(true)
    const supabase = createClient()
    const { data } = await supabase
      .from('goals')
      .select('id, goal_type, period, target_value, is_active, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setGoals(
        data.map((g) => ({
          id: g.id as string,
          goal_type: g.goal_type as string,
          period: g.period as 'week' | 'month' | 'year',
          target_value: g.target_value as number,
          is_active: g.is_active as boolean,
          created_at: g.created_at as string,
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
          Goals
          {loading && <Loader2 className="ml-2 inline size-4 animate-spin text-white/40" />}
        </h1>

        {!isDemoUser && <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-[#C41230] px-3 text-sm font-medium text-white transition-colors hover:bg-[#A10F29] focus:outline-none">
            <Plus className="size-4" />
            Add Goal
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Goal</DialogTitle>
            </DialogHeader>
            <AddGoalForm
              userId={userId}
              activeGoals={activeGoals}
              onSuccess={() => {
                setOpen(false)
                fetchGoals()
              }}
            />
          </DialogContent>
        </Dialog>}
      </div>

      {/* Active goals */}
      {activeGoals.length > 0 ? (
        <section className="space-y-3">
          <h2 className="text-xs uppercase tracking-widest text-white/40">Active</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {activeGoals.map((goal) => (
              <GoalCard
                key={goal.id}
                goal={goal}
                progress={progress[goal.id] ?? null}
              />
            ))}
          </div>
        </section>
      ) : (
        goals.length === 0 && !loading && (
          <div className="rounded-xl border border-white/10 bg-white/5 py-16 text-center">
            <p className="text-sm text-white/30">No goals yet. Set your first mileage goal.</p>
          </div>
        )
      )}

      {/* Past goals */}
      {pastGoals.length > 0 && (
        <section>
          <button
            type="button"
            onClick={() => setPastOpen((v) => !v)}
            className="flex w-full items-center gap-2 text-xs uppercase tracking-widest text-white/40 hover:text-white/60"
          >
            Past Goals
            {pastOpen ? (
              <ChevronUp className="size-3.5" />
            ) : (
              <ChevronDown className="size-3.5" />
            )}
          </button>
          {pastOpen && (
            <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3 opacity-60">
              {pastGoals.map((goal) => (
                <GoalCard key={goal.id} goal={goal} progress={null} />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
