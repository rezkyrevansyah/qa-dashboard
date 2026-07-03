import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import type { RunStatus } from '@/lib/types'

const COMPLETED_STATUSES: RunStatus[] = ['passed', 'need_fix', 'failed']

export async function POST(request: NextRequest) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  let body: { runId?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { runId } = body
  if (!runId) {
    return NextResponse.json({ error: 'runId is required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Verify run is completed
  const { data: run, error: runErr } = await supabase
    .from('test_runs')
    .select('id, status, suite_id')
    .eq('id', runId)
    .single()

  if (runErr || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  if (!COMPLETED_STATUSES.includes(run.status as RunStatus)) {
    return NextResponse.json({ error: 'Run is not completed yet' }, { status: 400 })
  }

  // Check if active report already exists for this run
  const { data: existing } = await supabase
    .from('public_reports')
    .select('token, is_active')
    .eq('run_id', runId)
    .maybeSingle()

  if (existing) {
    if (existing.is_active) {
      // Already active — return same token (idempotent)
      return NextResponse.json({ token: existing.token, url: `/report/${existing.token}` })
    }
    // Exists but inactive — reactivate
    await supabase
      .from('public_reports')
      .update({ is_active: true, updated_at: new Date().toISOString() })
      .eq('run_id', runId)
    return NextResponse.json({ token: existing.token, url: `/report/${existing.token}` })
  }

  // Create new report
  const token = crypto.randomUUID()
  const { error: insertErr } = await supabase.from('public_reports').insert({
    token,
    run_id: runId,
    suite_id: run.suite_id,
    is_active: true,
  })

  if (insertErr) {
    return NextResponse.json({ error: insertErr.message }, { status: 500 })
  }

  return NextResponse.json({ token, url: `/report/${token}` })
}
