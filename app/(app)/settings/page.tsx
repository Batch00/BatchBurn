import { createClient } from '@/lib/supabase/server'
import { SettingsClient } from '@/components/settings/SettingsClient'

export default async function SettingsPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const email = user!.email ?? ''
  const isDemoUser = email === 'demo@batchburn.app'

  const { data: profileData } = await supabase
    .from('profiles')
    .select('display_name')
    .eq('user_id', userId)
    .single()

  const displayName = (profileData?.display_name as string | null) ?? ''

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Settings</h1>
      <SettingsClient
        userId={userId}
        email={email}
        displayName={displayName}
        isDemoUser={isDemoUser}
      />
    </div>
  )
}
