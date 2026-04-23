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
  const { object_type, aspect_type, object_id, owner_id } = body

  if (object_type !== 'activity' || aspect_type !== 'create') {
    return NextResponse.json({ ok: true })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('user_id')
    .eq('strava_athlete_id', owner_id)
    .maybeSingle()

  if (!profile) {
    return NextResponse.json({ ok: true })
  }

  const userId = profile.user_id as string

  try {
    const accessToken = await getValidToken(userId)

    const activityResponse = await fetch(
      `${STRAVA_CONFIG.apiBase}/activities/${object_id}`,
      { headers: { Authorization: `Bearer ${accessToken}` } }
    )

    if (!activityResponse.ok) {
      return NextResponse.json({ ok: true })
    }

    const activity = await activityResponse.json()
    const { table, record } = mapStravaActivity(activity, userId)

    const { data: existing } = await admin
      .from(table)
      .select('id')
      .eq('strava_activity_id', String(object_id))
      .eq('user_id', userId)
      .maybeSingle()

    if (!existing) {
      await admin.from(table).insert(record)
    }
  } catch (err) {
    console.error('Strava webhook error:', err)
  }

  return NextResponse.json({ ok: true })
}
