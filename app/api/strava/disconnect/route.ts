import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST() {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const admin = createAdminClient()

  const { data: profile } = await admin
    .from('profiles')
    .select('strava_access_token')
    .eq('user_id', user.id)
    .single()

  if (profile?.strava_access_token) {
    // Deauthorize from Strava — fire and forget, don't block disconnect on Strava API
    void fetch('https://www.strava.com/oauth/deauthorize', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `access_token=${profile.strava_access_token}`,
    })
  }

  await admin
    .from('profiles')
    .update({
      strava_athlete_id: null,
      strava_access_token: null,
      strava_refresh_token: null,
      strava_token_expires_at: null,
    })
    .eq('user_id', user.id)

  return NextResponse.json({ ok: true })
}
