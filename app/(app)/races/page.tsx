export const revalidate = 0

import { createClient } from '@/lib/supabase/server'
import { RacesClient, type RaceRow, type ShoeOption } from '@/components/races/RacesClient'

export default async function RacesPage() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const userId = user!.id

  const [{ data: racesData }, { data: shoesData }] = await Promise.all([
    supabase
      .from('races')
      .select(
        'id, event_name, date, distance_miles, duration_seconds, pace_per_mile_seconds, is_pr, overall_place, overall_competitors, age_group_place, age_group_competitors, notes',
      )
      .eq('user_id', userId)
      .order('date', { ascending: false }),
    supabase
      .from('shoes')
      .select('id, name')
      .eq('user_id', userId)
      .eq('is_active', true)
      .order('name'),
  ])

  const races: RaceRow[] = (racesData ?? []).map((r) => ({
    id: r.id as string,
    event_name: r.event_name as string,
    date: r.date as string,
    distance_miles: r.distance_miles as number,
    duration_seconds: r.duration_seconds as number,
    pace_per_mile_seconds: r.pace_per_mile_seconds as number | null,
    is_pr: r.is_pr as boolean,
    overall_place: r.overall_place as number | null,
    overall_competitors: r.overall_competitors as number | null,
    age_group_place: r.age_group_place as number | null,
    age_group_competitors: r.age_group_competitors as number | null,
    notes: r.notes as string | null,
  }))

  const shoes: ShoeOption[] = (shoesData ?? []).map((s) => ({
    id: s.id as string,
    name: s.name as string,
  }))

  return (
    <div className="mx-auto max-w-4xl p-4 md:p-6">
      <RacesClient initialRaces={races} shoes={shoes} userId={userId} />
    </div>
  )
}
