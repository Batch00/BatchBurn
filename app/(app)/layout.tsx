import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AppShell } from '@/components/dashboard/AppShell'
import { Toaster } from '@/components/ui/toaster'

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const isDemoUser = user.email === 'demo@batchburn.app'

  return (
    <>
      <AppShell userEmail={user.email ?? ''} isDemoUser={isDemoUser}>{children}</AppShell>
      <Toaster />
    </>
  )
}
