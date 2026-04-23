import fetch from 'node-fetch'

const response = await fetch('https://www.strava.com/api/v3/push_subscriptions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    client_id: '229161',
    client_secret: process.env.STRAVA_CLIENT_SECRET,
    callback_url: 'https://batchburn.batch-apps.com/api/strava/webhook',
    verify_token: 'batchburn-strava-webhook-2026',
  }),
})
const data = await response.json()
console.log('Webhook registration result:', data)
