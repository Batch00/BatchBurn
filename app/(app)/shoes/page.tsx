export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { ShoesClient, type ShoeRow } from '@/components/shoes/ShoesClient'

export default async function ShoesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const isDemoUser = user!.email === 'demo@batchburn.app'

  const [{ data: shoesData }, { data: profileData }] = await Promise.all([
    supabase
      .from('shoes')
      .select(
        'id, name, is_active, initial_miles, price_usd, purchase_date, notes, retired_date, runs(distance_miles)',
      )
      .eq('user_id', userId)
      .order('is_active', { ascending: false })
      .order('name'),
    supabase
      .from('profiles')
      .select('primary_shoe_id')
      .eq('user_id', userId)
      .single(),
  ])

  const primaryShoeId = (profileData?.primary_shoe_id as string | null) ?? null

  const initialShoes: ShoeRow[] = (shoesData ?? []).map((s) => {
    const runs = Array.isArray(s.runs)
      ? (s.runs as { distance_miles: number | null }[])
      : []
    const runMiles = runs.reduce((sum, r) => sum + (r.distance_miles ?? 0), 0)
    return {
      id: s.id as string,
      name: s.name as string,
      is_active: s.is_active as boolean,
      initial_miles: s.initial_miles as number | null,
      price_usd: s.price_usd as number | null,
      purchase_date: s.purchase_date as string | null,
      notes: s.notes as string | null,
      retired_date: s.retired_date as string | null,
      computed_miles: runMiles + ((s.initial_miles as number | null) ?? 0),
      run_count: runs.length,
    }
  }).sort((a, b) => b.computed_miles - a.computed_miles)

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">Shoes</h1>
      <ShoesClient
        initialShoes={initialShoes}
        userId={userId}
        isDemoUser={isDemoUser}
        initialPrimaryShoeId={primaryShoeId}
      />
    </div>
  )
}
