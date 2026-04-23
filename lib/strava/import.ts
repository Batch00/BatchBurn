import { createAdminClient } from '@/lib/supabase/admin'
import { STRAVA_CONFIG } from './config'
import { mapStravaActivity } from './mapper'

export async function importStravaHistory(
  userId: string,
  accessToken: string
): Promise<{ imported: number; skipped: number }> {
  const response = await fetch(
    `${STRAVA_CONFIG.apiBase}/athlete/activities?per_page=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`)
  }

  const activities = (await response.json()) as Record<string, unknown>[]
  const admin = createAdminClient()
  let imported = 0
  let skipped = 0

  for (const activity of activities) {
    const { table, record } = mapStravaActivity(activity, userId)
    const stravaId = String(activity.id)
    console.log(
      `Strava activity: id=${stravaId} sport_type=${activity.sport_type} type=${activity.type} → ${table}`
    )

    const { data: existing } = await admin
      .from(table)
      .select('id')
      .eq('strava_activity_id', stravaId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      skipped++
      continue
    }

    const { error } = await admin.from(table).insert(record)
    if (!error) imported++
  }

  return { imported, skipped }
}
