import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { AdminClient, type InviteRow } from '@/components/admin/AdminClient'

export default async function AdminPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user?.email !== 'carsonb1723@gmail.com') {
    redirect('/dashboard')
  }

  const { data: invites } = await supabase
    .schema('batchburn')
    .from('invites')
    .select('id, code, created_at, used_at, used_by')
    .order('created_at', { ascending: false })

  return (
    <div className="mx-auto max-w-2xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Invite Management</h1>
      <AdminClient invites={(invites ?? []) as InviteRow[]} />
    </div>
  )
}
