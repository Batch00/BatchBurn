export const STRAVA_CONFIG = {
  clientId: process.env.STRAVA_CLIENT_ID!,
  clientSecret: process.env.STRAVA_CLIENT_SECRET!,
  webhookVerifyToken: process.env.STRAVA_WEBHOOK_VERIFY_TOKEN!,
  redirectUri: `${process.env.NEXT_PUBLIC_APP_URL}/api/strava/callback`,
  authUrl: 'https://www.strava.com/oauth/authorize',
  tokenUrl: 'https://www.strava.com/oauth/token',
  apiBase: 'https://www.strava.com/api/v3',
  scopes: 'activity:read_all',
}
