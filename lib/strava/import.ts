import { createAdminClient } from '@/lib/supabase/admin'
import { STRAVA_CONFIG } from './config'
import { mapStravaActivity } from './mapper'

export async function importStravaHistory(
  userId: string,
  accessToken: string
): Promise<{ imported: number; skipped: number; synced: number }> {
  const response = await fetch(
    `${STRAVA_CONFIG.apiBase}/athlete/activities?per_page=200`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  )

  if (!response.ok) {
    throw new Error(`Strava API error: ${response.status}`)
  }

  const activities = (await response.json()) as Record<string, unknown>[]
  const admin = createAdminClient()

  const { data: profileData } = await admin
    .from('profiles')
    .select('primary_shoe_id')
    .eq('user_id', userId)
    .maybeSingle()
  const primaryShoeId = (profileData?.primary_shoe_id as string | null) ?? null

  let imported = 0
  let skipped = 0
  let synced = 0

  for (const activity of activities) {
    const { table, record } = mapStravaActivity(activity, userId, primaryShoeId)
    const stravaId = Number(activity.id)
    const date = record.date as string
    const distanceMiles = record.distance_miles as number | undefined

    console.log(
      `Strava activity: id=${stravaId} sport_type=${activity.sport_type} type=${activity.type} date=${date} dist=${distanceMiles?.toFixed(2)} → ${table}`
    )

    // Step 1: skip if strava_activity_id already exists in target table
    const { data: alreadyLinked } = await admin
      .from(table)
      .select('id')
      .eq('strava_activity_id', stravaId)
      .eq('user_id', userId)
      .maybeSingle()

    if (alreadyLinked) {
      console.log(`  → skip (strava_activity_id already exists)`)
      skipped++
      continue
    }

    // Step 2: look for an existing manual row on same date with similar distance
    // Only attempt this match when the activity has meaningful distance
    if (distanceMiles != null && distanceMiles > 0.05) {
      const { data: dateMatch } = await admin
        .from(table)
        .select('id')
        .eq('user_id', userId)
        .eq('date', date)
        .gte('distance_miles', distanceMiles - 0.1)
        .lte('distance_miles', distanceMiles + 0.1)
        .is('strava_activity_id', null)
        .maybeSingle()

      if (dateMatch) {
        const { error } = await admin
          .from(table)
          .update({ strava_activity_id: stravaId, source: 'strava' })
          .eq('id', dateMatch.id)
        if (!error) {
          console.log(`  → synced (updated existing row ${dateMatch.id})`)
          synced++
        }
        continue
      }
    }

    // Step 3: no existing row — insert as new
    const { error } = await admin.from(table).insert(record)
    if (!error) {
      console.log(`  → imported (new row)`)
      imported++
    } else {
      console.error(`  → insert error:`, error.message)
    }
  }

  return { imported, skipped, synced }
}
