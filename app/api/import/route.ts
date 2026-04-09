import { NextRequest, NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

export async function POST(req: NextRequest) {
  const auth = req.headers.get('authorization')
  if (!auth || auth !== process.env.IMPORT_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as { type: 'runs' | 'cross_training'; records: unknown[] }
  const { type, records } = body

  if (type !== 'runs' && type !== 'cross_training') {
    return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
  }

  const supabase = createAdminClient()
  const errors: unknown[] = []
  let inserted = 0

  const { data, error } = await supabase
    .from(type)
    .insert(records as Record<string, unknown>[])
    .select('id')

  if (error) {
    errors.push(error)
  } else {
    inserted = data?.length ?? records.length
  }

  return NextResponse.json({ inserted, errors })
}
