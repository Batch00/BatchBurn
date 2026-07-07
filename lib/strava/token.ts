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
  const isExpired = expiresAtMs <= nowPlusFiveMs

  console.log(
    `[strava-token] user=${userId} expiresAt=${new Date(expiresAtMs).toISOString()} isExpired=${isExpired}`
  )

  if (!isExpired) {
    return profile.strava_access_token as string
  }

  console.log(`[strava-token] user=${userId} attempting refresh`)
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

  if (!response.ok) {
    const errBody = await response.text().catch(() => '')
    console.error(
      `[strava-token] refresh failed for user=${userId}: status=${response.status} body=${errBody}`
    )
    throw new Error(`Strava token refresh error: ${response.status} ${errBody}`)
  }

  const tokens = await response.json()
  console.log(
    `[strava-token] refresh succeeded for user=${userId} newExpiresAt=${new Date(tokens.expires_at * 1000).toISOString()}`
  )

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
