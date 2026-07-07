import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { STRAVA_CONFIG } from '@/lib/strava/config'
import { getValidToken } from '@/lib/strava/token'
import { mapStravaActivity } from '@/lib/strava/mapper'

export async function GET(request: NextRequest) {
  const url = new URL(request.url)
  const mode = url.searchParams.get('hub.mode')
  const token = url.searchParams.get('hub.verify_token')
  const challenge = url.searchParams.get('hub.challenge')

  console.log('Strava webhook verify:', { received: token, expected: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN })

  if (mode === 'subscribe' && token === process.env.STRAVA_WEBHOOK_VERIFY_TOKEN) {
    return NextResponse.json({ 'hub.challenge': challenge }, { status: 200 })
  }

  return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
}

export async function POST(request: NextRequest) {
  const body = await request.json()
  // Log the raw incoming event so we can see exactly what Strava sent.
  console.log('[strava-webhook] raw body:', JSON.stringify(body))

  const { object_type, aspect_type, object_id, owner_id } = body

  if (object_type !== 'activity') {
    console.log('[strava-webhook] ignoring non-activity event:', object_type)
    return NextResponse.json({ ok: true })
  }

  // Garmin (and other) activities often arrive as a `create` followed shortly
  // by an `update` once GPS/HR data finishes syncing. If we only ever handled
  // `create`, a dropped/failed/early create means the activity never lands.
  // So we handle `update` too, but only import when we don't already have it.
  // We do NOT filter on the `manual` field — GPS-less Garmin bike rides can be
  // flagged manual and must still be imported.
  if (aspect_type !== 'create' && aspect_type !== 'update') {
    console.log('[strava-webhook] ignoring aspect_type:', aspect_type)
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('user_id, primary_shoe_id')
    .eq('strava_athlete_id', owner_id)
    .maybeSingle()

  if (!profile) {
    console.warn('[strava-webhook] no profile matched owner_id:', owner_id)
    return NextResponse.json({ ok: true })
  }

  const userId = profile.user_id as string
  const primaryShoeId = (profile.primary_shoe_id as string | null) ?? null
  console.log('[strava-webhook] matched user_id:', userId, 'aspect_type:', aspect_type, 'object_id:', object_id)

  try {
    let accessToken: string
    try {
      accessToken = await getValidToken(userId)
    } catch (tokenErr) {
      // A webhook can fire before token refresh has settled; surface it loudly
      // instead of letting it fall through as a silent failure.
      console.error('[strava-webhook] getValidToken failed for user', userId, tokenErr)
      return NextResponse.json({ ok: true })
    }

    const activityResponse = await fetch(
      `${STRAVA_CONFIG.apiBase}/activities/${object_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!activityResponse.ok) {
      const errText = await activityResponse.text().catch(() => '')
      console.error(
        '[strava-webhook] failed to fetch activity',
        object_id,
        'status:',
        activityResponse.status,
        errText
      )
      return NextResponse.json({ ok: true })
    }

    const activity = await activityResponse.json()
    console.log('[strava-webhook] fetched activity from Strava:', JSON.stringify(activity))

    const { table, record } = mapStravaActivity(activity, userId, primaryShoeId)
    console.log('[strava-webhook] mapped record for table', table, ':', JSON.stringify(record))

    const stravaId = Number(object_id)

    const { data: existing } = await admin
      .from(table)
      .select('id')
      .eq('strava_activity_id', stravaId)
      .eq('user_id', userId)
      .maybeSingle()

    if (existing) {
      console.log('[strava-webhook] activity already exists, skipping insert:', stravaId)
      return NextResponse.json({ ok: true })
    }

    const { error: insertError } = await admin.from(table).insert(record)
    if (insertError) {
      console.error('[strava-webhook] insert failed:', insertError.message, insertError)
    } else {
      console.log('[strava-webhook] inserted activity into', table, ':', stravaId)
    }
  } catch (err) {
    console.error('[strava-webhook] unexpected error:', err)
  }

  return NextResponse.json({ ok: true })
}
