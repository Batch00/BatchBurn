import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getValidToken } from '@/lib/strava/token'
import { importStravaHistory } from '@/lib/strava/import'

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
    const result = await importStravaHistory(user.id, accessToken)
    return NextResponse.json(result)
  } catch (err) {
    console.error('Strava import failed:', err)
    return NextResponse.json({ error: 'Import failed' }, { status: 500 })
  }
}
