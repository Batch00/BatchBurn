export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { HistoryClient, type UnifiedActivity } from '@/components/history/HistoryClient'

export default async function HistoryPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id
  const isDemoUser = user!.email === 'demo@batchburn.app'

  const [{ data: runs }, { data: cross }, { data: profile }] = await Promise.all([
    supabase
      .from('runs')
      .select(
        'id, run_type, date, distance_miles, duration_seconds, pace_per_mile_seconds, notes, shoe_id, source, shoes(name)',
      )
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20),
    supabase
      .from('cross_training')
      .select('id, activity_type, date, distance_miles, duration_seconds, steps, notes, source')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(20),
    supabase
      .from('profiles')
      .select('hidden_activity_types')
      .eq('user_id', userId)
      .single(),
  ])

  const hiddenTypes = (profile?.hidden_activity_types as string[] | null) ?? []

  const runActivities: UnifiedActivity[] = (runs ?? []).map((r) => ({
    id: r.id as string,
    kind: 'run' as const,
    label: (r.run_type as string) ?? 'Easy',
    run_type: (r.run_type as string) ?? 'Easy',
    date: r.date as string,
    distance_miles: r.distance_miles as number | null,
    duration_seconds: r.duration_seconds as number | null,
    pace_per_mile_seconds: r.pace_per_mile_seconds as number | null,
    notes: r.notes as string | null,
    shoe_id: r.shoe_id as string | null,
    source: r.source as string | null,
    shoe_name:
      r.shoes && !Array.isArray(r.shoes)
        ? (r.shoes as { name: string }).name
        : null,
  }))

  const crossActivities: UnifiedActivity[] = (cross ?? []).map((c) => ({
    id: c.id as string,
    kind: 'cross' as const,
    label: (c.activity_type as string) ?? 'Cross Training',
    activity_type: c.activity_type as string,
    date: c.date as string,
    distance_miles: c.distance_miles as number | null,
    duration_seconds: c.duration_seconds as number | null,
    steps: c.steps as number | null,
    notes: c.notes as string | null,
    source: c.source as string | null,
  }))

  const initialActivities = [...runActivities, ...crossActivities]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 20)

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <h1 className="mb-6 text-2xl font-bold text-white">History</h1>
      <HistoryClient
        initialActivities={initialActivities}
        userId={userId}
        isDemoUser={isDemoUser}
        hiddenTypes={hiddenTypes}
      />
    </div>
  )
}
