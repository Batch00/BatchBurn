'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Plus, ChevronDown, ChevronUp, MoreHorizontal } from 'lucide-react'
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
import { CROSS_TYPES } from '@/components/history/EditActivityModals'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GoalRow = {
  id: string
  goal_type: string
  period: 'week' | 'month' | 'year'
  target_value: number
  scope: string
  name: string | null
  is_active: boolean
  created_at: string
}

// Valid scope values: 'all', 'runs', or a specific cross training activity type.
const SCOPE_VALUES = ['all', 'runs', ...CROSS_TYPES] as const

// ---------------------------------------------------------------------------
// Schemas
// ---------------------------------------------------------------------------

const goalSchema = z.object({
  period: z.enum(['week', 'month', 'year']),
  scope: z.enum(SCOPE_VALUES),
  name: z.string().optional(),
  target_miles: z.coerce.number().min(0.1, 'Target miles is required'),
})

const goalEditSchema = z.object({
  period: z.enum(['week', 'month', 'year']),
  scope: z.enum(SCOPE_VALUES),
  name: z.string().optional(),
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

function scopeLabel(scope: string): string {
  if (scope === 'all') return 'All Activities'
  if (scope === 'runs') return 'Runs'
  return scope
}

function scopeTagClass(scope: string): string {
  if (scope === 'all') return 'bg-white/10 text-white/80'
  if (scope === 'runs') return 'bg-blue-500/15 text-blue-400'
  return 'bg-green-600/15 text-green-400'
}

function autoGoalName(period: 'week' | 'month' | 'year', scope: string): string {
  const p = period === 'week' ? 'Week' : period === 'month' ? 'Month' : 'Year'
  return `${p} · ${scopeLabel(scope)}`
}

function goalDisplayName(goal: GoalRow): string {
  return goal.name && goal.name.trim() ? goal.name.trim() : autoGoalName(goal.period, goal.scope)
}

// Cross training types visible in the scope dropdown, respecting hidden_activity_types
// but always keeping `keep` (e.g. the scope a goal already uses) so it never disappears.
function visibleScopeTypes(hiddenTypes: string[], keep?: string): string[] {
  return CROSS_TYPES.filter((t) => t === keep || !hiddenTypes.includes(t))
}

// ---------------------------------------------------------------------------
// Edit Goal Modal
// ---------------------------------------------------------------------------

function EditGoalModal({
  goal,
  activeGoals,
  hiddenTypes,
  onClose,
  onSaved,
}: {
  goal: GoalRow
  activeGoals: GoalRow[]
  hiddenTypes: string[]
  onClose: () => void
  onSaved: () => void
}) {
  const [submitError, setSubmitError] = useState<string | null>(null)

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(goalEditSchema),
    defaultValues: {
      period: goal.period,
      scope: goal.scope as (typeof SCOPE_VALUES)[number],
      name: goal.name ?? '',
      target_miles: goal.target_value,
    },
  })

  const typeOptions = visibleScopeTypes(hiddenTypes, goal.scope)

  async function onSubmit(data: z.infer<typeof goalEditSchema>) {
    setSubmitError(null)

    const conflict = activeGoals.find(
      (g) => g.id !== goal.id && g.is_active && g.period === data.period && g.scope === data.scope,
    )
    if (conflict) {
      setSubmitError(`You already have an active ${data.period} goal for ${scopeLabel(data.scope)}`)
      return
    }

    const supabase = createClient()
    const { error } = await supabase
      .from('goals')
      .update({
        period: data.period,
        scope: data.scope,
        name: data.name && data.name.trim() ? data.name.trim() : null,
        target_value: data.target_miles,
      })
      .eq('id', goal.id)
    if (error) {
      setSubmitError(error.message)
      return
    }
    onSaved()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-black/70 p-4">
      <div className="my-auto w-full max-w-sm rounded-xl border border-white/10 bg-[#161B22] p-6 shadow-xl">
        <h2 className="mb-4 text-lg font-semibold text-white">Edit Goal</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1">
            <Label className="text-sm text-white/60">Goal Type</Label>
            <div className="flex h-8 items-center rounded-lg border border-white/10 bg-white/5 px-2.5 text-sm text-white/40">
              Mileage
            </div>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-goal-name" className="text-sm text-white/60">
              Goal Name <span className="text-white/30">(optional)</span>
            </Label>
            <Input
              id="edit-goal-name"
              type="text"
              placeholder="e.g. Frisbee Summer Push"
              className={inputCls}
              {...register('name')}
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-goal-scope" className="text-sm text-white/60">
              Activity Scope
            </Label>
            <Select id="edit-goal-scope" {...register('scope')}>
              <option value="all">All Activities</option>
              <option value="runs">Runs Only</option>
              {typeOptions.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </Select>
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-goal-period" className="text-sm text-white/60">
              Period
            </Label>
            <Select id="edit-goal-period" {...register('period')}>
              <option value="week">Week</option>
              <option value="month">Month</option>
              <option value="year">Year</option>
            </Select>
            {errors.period && (
              <p className="text-xs text-red-400">{errors.period.message}</p>
            )}
          </div>

          <div className="space-y-1">
            <Label htmlFor="edit-goal-miles" className="text-sm text-white/60">
              Target Miles
            </Label>
            <Input
              id="edit-goal-miles"
              type="number"
              step="0.1"
              min="0.1"
              className={inputCls}
              {...register('target_miles')}
            />
            {errors.target_miles && (
              <p className="text-xs text-red-400">{errors.target_miles.message}</p>
            )}
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
// Add Goal Form
// ---------------------------------------------------------------------------

function AddGoalForm({
  userId,
  activeGoals,
  hiddenTypes,
  onSuccess,
}: {
  userId: string
  activeGoals: GoalRow[]
  hiddenTypes: string[]
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
      scope: 'runs' as (typeof SCOPE_VALUES)[number],
      name: '',
      target_miles: '' as unknown as number,
    },
  })

  const typeOptions = visibleScopeTypes(hiddenTypes)

  async function onSubmit(data: z.infer<typeof goalSchema>) {
    setSubmitError(null)

    const existing = activeGoals.find(
      (g) => g.is_active && g.period === data.period && g.scope === data.scope,
    )
    if (existing) {
      setSubmitError(`You already have an active ${data.period} goal for ${scopeLabel(data.scope)}`)
      return
    }

    const supabase = createClient()
    const { error } = await supabase.from('goals').insert({
      user_id: userId,
      goal_type: 'mileage',
      period: data.period,
      scope: data.scope,
      name: data.name && data.name.trim() ? data.name.trim() : null,
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
        <Label htmlFor="goal-name" className="text-sm text-white/60">
          Goal Name <span className="text-white/30">(optional)</span>
        </Label>
        <Input
          id="goal-name"
          type="text"
          placeholder="e.g. Frisbee Summer Push"
          className={inputCls}
          {...register('name')}
        />
      </div>

      <div className="space-y-1">
        <Label htmlFor="goal-scope" className="text-sm text-white/60">
          Activity Scope
        </Label>
        <Select id="goal-scope" {...register('scope')}>
          <option value="all">All Activities</option>
          <option value="runs">Runs Only</option>
          {typeOptions.map((t) => (
            <option key={t} value={t}>{t}</option>
          ))}
        </Select>
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
  activeGoals,
  hiddenTypes,
  isDemoUser,
  onRefresh,
}: {
  goal: GoalRow
  progress: number | null
  activeGoals: GoalRow[]
  hiddenTypes: string[]
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

  async function handleDeactivate() {
    setMenuOpen(false)
    const supabase = createClient()
    await supabase.from('goals').update({ is_active: false }).eq('id', goal.id)
    router.refresh()
    onRefresh()
  }

  async function handleDelete() {
    setDeleting(true)
    const supabase = createClient()
    await supabase.from('goals').delete().eq('id', goal.id)
    setDeleting(false)
    setConfirmDelete(false)
    router.refresh()
    onRefresh()
  }

  const current = progress ?? 0
  const pct = Math.min((current / goal.target_value) * 100, 100)
  const barColor = getBarColor(pct)
  const periodLabel = getPeriodLabel(goal.period)

  if (confirmDelete) {
    return (
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <p className="mb-1 text-sm font-medium text-white">Delete this goal?</p>
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
        <EditGoalModal
          goal={goal}
          activeGoals={activeGoals}
          hiddenTypes={hiddenTypes}
          onClose={() => setEditOpen(false)}
          onSaved={() => {
            setEditOpen(false)
            router.refresh()
            onRefresh()
          }}
        />
      )}
      <div className="rounded-xl border border-white/10 bg-white/[0.03] p-5">
        <div className="mb-3 flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-white">{goalDisplayName(goal)}</p>
            <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <span className="rounded-md bg-[#C41230]/20 px-2 py-0.5 text-[10px] font-semibold tracking-wider text-[#C41230]">
                {periodLabel}
              </span>
              <span className={`rounded-md px-2 py-0.5 text-[10px] font-semibold ${scopeTagClass(goal.scope)}`}>
                {scopeLabel(goal.scope)}
              </span>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {!isDemoUser && goal.is_active && (
              <div className="relative" ref={menuRef}>
                <button
                  type="button"
                  onClick={() => setMenuOpen((v) => !v)}
                  className="flex size-7 items-center justify-center rounded-md text-white/30 hover:bg-white/10 hover:text-white/60"
                >
                  <MoreHorizontal className="size-4" />
                </button>
                {menuOpen && (
                  <div className="absolute right-0 top-8 z-10 min-w-[140px] rounded-lg border border-white/10 bg-[#161B22] py-1 shadow-xl">
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
                      onClick={handleDeactivate}
                      className="w-full px-4 py-2 text-left text-sm text-white/70 hover:bg-white/5 hover:text-white"
                    >
                      Mark Complete
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
    </>
  )
}

// ---------------------------------------------------------------------------
// Main client component
// ---------------------------------------------------------------------------

interface GoalsClientProps {
  initialGoals: GoalRow[]
  userId: string
  isDemoUser?: boolean
  hiddenTypes?: string[]
}

export function GoalsClient({ initialGoals, userId, isDemoUser = false, hiddenTypes = [] }: GoalsClientProps) {
  const [goals, setGoals] = useState<GoalRow[]>(initialGoals)
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [pastOpen, setPastOpen] = useState(false)
  const [progress, setProgress] = useState<Record<string, number>>({})

  const activeGoals = goals.filter((g) => g.is_active)
  const pastGoals = goals.filter((g) => !g.is_active)

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

        const sumMiles = (rows: { distance_miles: number | null }[] | null) =>
          (rows ?? []).reduce((sum, r) => sum + (r.distance_miles ?? 0), 0)

        let miles = 0

        if (goal.scope === 'runs' || goal.scope === 'all') {
          const { data } = await supabase
            .from('runs')
            .select('distance_miles')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', today)
          miles += sumMiles(data as { distance_miles: number | null }[] | null)
        }

        if (goal.scope === 'all') {
          const { data } = await supabase
            .from('cross_training')
            .select('distance_miles')
            .eq('user_id', userId)
            .gte('date', startDate)
            .lte('date', today)
          miles += sumMiles(data as { distance_miles: number | null }[] | null)
        } else if (goal.scope !== 'runs') {
          const { data } = await supabase
            .from('cross_training')
            .select('distance_miles')
            .eq('user_id', userId)
            .eq('activity_type', goal.scope)
            .gte('date', startDate)
            .lte('date', today)
          miles += sumMiles(data as { distance_miles: number | null }[] | null)
        }

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
      .select('id, goal_type, period, target_value, scope, name, is_active, created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (data) {
      setGoals(
        data.map((g) => ({
          id: g.id as string,
          goal_type: g.goal_type as string,
          period: g.period as 'week' | 'month' | 'year',
          target_value: g.target_value as number,
          scope: (g.scope as string | null) ?? 'runs',
          name: (g.name as string | null) ?? null,
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
          <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-md">
            <DialogHeader>
              <DialogTitle>Add Goal</DialogTitle>
            </DialogHeader>
            <AddGoalForm
              userId={userId}
              activeGoals={activeGoals}
              hiddenTypes={hiddenTypes}
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
                activeGoals={activeGoals}
                hiddenTypes={hiddenTypes}
                isDemoUser={isDemoUser}
                onRefresh={fetchGoals}
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
                <GoalCard
                  key={goal.id}
                  goal={goal}
                  progress={null}
                  activeGoals={activeGoals}
                  hiddenTypes={hiddenTypes}
                  isDemoUser={isDemoUser}
                  onRefresh={fetchGoals}
                />
              ))}
            </div>
          )}
        </section>
      )}
    </div>
  )
}
