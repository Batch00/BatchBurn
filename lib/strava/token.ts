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

  const expiresAtMs = new Date(profile.strava_token_expires_at as string).getTime()
  const nowPlusFiveMs = Date.now() + 300_000

  if (expiresAtMs > nowPlusFiveMs) {
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
      strava_token_expires_at: new Date(tokens.expires_at * 1000).toISOString(),
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
  const { error } = await admin
    .from('profiles')
    .upsert(
      {
        user_id: userId,
        strava_athlete_id: data.athleteId,
        strava_access_token: data.accessToken,
        strava_refresh_token: data.refreshToken,
        strava_token_expires_at: new Date(data.expiresAt * 1000).toISOString(),
      },
      { onConflict: 'user_id' }
    )
  if (error) throw new Error(`saveStravaTokens failed: ${error.message}`)
}
