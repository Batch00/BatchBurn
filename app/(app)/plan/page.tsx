import { createClient } from '@/lib/supabase/server'
import { PlanClient } from '@/components/plan/PlanClient'

export default async function PlanPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const isDemoUser = user!.email === 'demo@batchburn.app'

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <h1 className="text-2xl font-bold text-white">Plan</h1>
      <PlanClient userId={user!.id} isDemoUser={isDemoUser} />
    </div>
  )
}
