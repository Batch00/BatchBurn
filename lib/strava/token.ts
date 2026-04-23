import { createAdminClient } from '@/lib/supabase/admin'
import { STRAVA_CONFIG } from './config'

export async function getValidToken(userId: string): Promise<string> {
  const admin = createAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('strava_access_token, strava_refresh_token, strava_token_expires_at')
    .eq('user_id', userId)
    .single()

  if (!profile?.strava_access_token) {
    throw new Error('No Strava tokens found for user')
  }

  const expiresAt = profile.strava_token_expires_at as number
  const nowPlusFive = Math.floor(Date.now() / 1000) + 300

  if (expiresAt > nowPlusFive) {
    return profile.strava_access_token as string
  }

  const response = await fetch(STRAVA_CONFIG.tokenUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      client_id: STRAVA_CONFIG.clientId,
      client_secret: STRAVA_CONFIG.clientSecret,
      grant_type: 'refresh_token',
      refresh_token: profile.strava_refresh_token,
    }),
  })

  const tokens = await response.json()

  await admin
    .from('profiles')
    .update({
      strava_access_token: tokens.access_token,
      strava_refresh_token: tokens.refresh_token,
      strava_token_expires_at: tokens.expires_at,
    })
    .eq('user_id', userId)

  return tokens.access_token as string
}

export async function saveStravaTokens(
  userId: string,
  data: {
    athleteId: number
    accessToken: string
    refreshToken: string
    expiresAt: number
  }
): Promise<void> {
  const admin = createAdminClient()
  await admin
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        strava_athlete_id: data.athleteId,
        strava_access_token: data.accessToken,
        strava_refresh_token: data.refreshToken,
        strava_token_expires_at: data.expiresAt,
      },
      { onConflict: 'user_id' }
    )
}
