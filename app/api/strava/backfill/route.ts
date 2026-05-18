import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { getValidToken } from '@/lib/strava/token'
import { STRAVA_CONFIG } from '@/lib/strava/config'

type StravaActivityDetail = {
  total_elevation_gain?: number
  has_heartrate?: boolean
  average_heartrate?: number
  max_heartrate?: number
  average_cadence?: number
  map?: { summary_polyline?: string }
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function buildUpdate(
  detail: StravaActivityDetail,
  includeCadence: boolean
): Record<string, unknown> {
  const update: Record<string, unknown> = {}
  if (detail.total_elevation_gain != null) {
    update.elevation_gain_m = detail.total_elevation_gain
  }
  if (detail.has_heartrate && detail.average_heartrate != null) {
    update.heart_rate_avg = Math.round(detail.average_heartrate)
  }
  if (detail.has_heartrate && detail.max_heartrate != null) {
    update.heart_rate_max = Math.round(detail.max_heartrate)
  }
  const polyline = detail.map?.summary_polyline
  if (polyline && polyline.length > 0) {
    update.map_polyline = polyline
  }
  if (includeCadence && detail.average_cadence != null) {
    update.cadence_avg = detail.average_cadence
  }
  return update
}

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const accessToken = await getValidToken(user.id)
    const admin = createAdminClient()

    const { data: runs } = await admin
      .from('runs')
      .select('id, strava_activity_id')
      .eq('user_id', user.id)
      .not('strava_activity_id', 'is', null)
      .or('heart_rate_avg.is.null,map_polyline.is.null')

    const { data: cross } = await admin
      .from('cross_training')
      .select('id, strava_activity_id')
      .eq('user_id', user.id)
      .not('strava_activity_id', 'is', null)
      .or('heart_rate_avg.is.null,map_polyline.is.null')

    let updatedRuns = 0
    let updatedCross = 0

    const targets: Array<{
      table: 'runs' | 'cross_training'
      id: string
      stravaId: number
    }> = [
      ...(runs ?? []).map((r) => ({
        table: 'runs' as const,
        id: r.id as string,
        stravaId: Number(r.strava_activity_id),
      })),
      ...(cross ?? []).map((c) => ({
        table: 'cross_training' as const,
        id: c.id as string,
        stravaId: Number(c.strava_activity_id),
      })),
    ]

    for (const target of targets) {
      const res = await fetch(
        `${STRAVA_CONFIG.apiBase}/activities/${target.stravaId}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      )

      if (!res.ok) {
        console.error(
          `Strava detail fetch failed for ${target.stravaId}: ${res.status}`
        )
        await sleep(200)
        continue
      }

      const detail = (await res.json()) as StravaActivityDetail
      const update = buildUpdate(detail, target.table === 'runs')

      if (Object.keys(update).length > 0) {
        const { error } = await admin
          .from(target.table)
          .update(update)
          .eq('id', target.id)
        if (!error) {
          if (target.table === 'runs') updatedRuns++
          else updatedCross++
        } else {
          console.error(`Update error for ${target.id}:`, error.message)
        }
      }

      await sleep(200)
    }

    return NextResponse.json({
      updated_runs: updatedRuns,
      updated_cross: updatedCross,
    })
  } catch (err) {
    console.error('Strava backfill failed:', err)
    return NextResponse.json({ error: 'Backfill failed' }, { status: 500 })
  }
}
