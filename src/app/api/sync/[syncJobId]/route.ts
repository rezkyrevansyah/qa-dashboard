import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ syncJobId: string }> }
) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const { syncJobId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('sync_jobs')
    .select('id, status, suites_upserted, specs_upserted, error_message, completed_at')
    .eq('id', syncJobId)
    .single()

  if (error || !data) {
    return NextResponse.json({ error: 'Sync job not found' }, { status: 404 })
  }

  return NextResponse.json(data)
}
