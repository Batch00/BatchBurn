import { createClient } from '@/lib/supabase/server'
import { LogActivityClient, type Shoe } from '@/components/activity/LogActivityClient'

export default async function LogPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const isDemoUser = user!.email === 'demo@batchburn.app'

  const [{ data: shoes }, { data: profile }] = await Promise.all([
    supabase
      .from('shoes')
      .select('id, name, current_miles')
      .eq('user_id', user!.id)
      .eq('is_active', true)
      .order('name'),
    supabase
      .from('profiles')
      .select('hidden_activity_types')
      .eq('user_id', user!.id)
      .single(),
  ])

  const hiddenTypes = (profile?.hidden_activity_types as string[] | null) ?? []

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Log Activity</h1>
      <LogActivityClient
        shoes={(shoes ?? []) as Shoe[]}
        userId={user!.id}
        isDemoUser={isDemoUser}
        hiddenTypes={hiddenTypes}
      />
    </div>
  )
}
