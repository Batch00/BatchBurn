export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { GoalsClient, type GoalRow } from '@/components/goals/GoalsClient'

export default async function GoalsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const isDemoUser = user!.email === 'demo@batchburn.app'

  const { data: goalsData } = await supabase
    .from('goals')
    .select('id, goal_type, period, target_value, is_active, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })

  const goals: GoalRow[] = (goalsData ?? []).map((g) => ({
    id: g.id as string,
    goal_type: g.goal_type as string,
    period: g.period as 'week' | 'month' | 'year',
    target_value: g.target_value as number,
    is_active: g.is_active as boolean,
    created_at: g.created_at as string,
  }))

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <GoalsClient initialGoals={goals} userId={userId} isDemoUser={isDemoUser} />
    </div>
  )
}
