import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { STRAVA_CONFIG } from '@/lib/strava/config'
import { saveStravaTokens } from '@/lib/strava/token'
import { importStravaHistory } from '@/lib/strava/import'

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const code = searchParams.get('code')
  const error = searchParams.get('error')

  const appUrl = process.env.NEXT_PUBLIC_APP_URL!

  if (error || !code) {
    return NextResponse.redirect(`${appUrl}/settings?strava=error`)
  }

  const tokenResponse = await fetch(STRAVA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CONFIG.clientId,
      client_secret: STRAVA_CONFIG.clientSecret,
      code,
      grant_type: 'authorization_code',
    }),
  })

  if (!tokenResponse.ok) {
    return NextResponse.redirect(`${appUrl}/settings?strava=error`)
  }

  const tokenData = await tokenResponse.json()

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(`${appUrl}/login`)
  }

  await saveStravaTokens(user.id, {
    athleteId: tokenData.athlete.id,
    accessToken: tokenData.access_token,
    refreshToken: tokenData.refresh_token,
    expiresAt: tokenData.expires_at,
  })

  // Fire-and-forget — import runs in background, redirect immediately
  void importStravaHistory(user.id, tokenData.access_token)

  return NextResponse.redirect(`${appUrl}/settings?strava=connected`)
}
