import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { triggerWorkflowDispatch } from '@/lib/github'

export async function POST(request: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch (res) {
    return res as Response
  }

  const body = await request.json()
  const { suiteId, specId, suiteName, specFile } = body

  if (!suiteId || !suiteName) {
    return NextResponse.json({ error: 'suiteId and suiteName are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  // Create the test_run row with status 'pending'
  const { data: runRow, error: insertError } = await supabase
    .from('test_runs')
    .insert({
      suite_id: suiteId,
      spec_id: specId ?? null,
      triggered_by: user.id,
      status: 'pending',
    })
    .select('id')
    .single()

  if (insertError || !runRow) {
    return NextResponse.json({ error: insertError?.message ?? 'Failed to create run' }, { status: 500 })
  }

  // Trigger GitHub Actions workflow_dispatch
  try {
    await triggerWorkflowDispatch({
      suite_name: suiteName,
      spec_file: specFile,
      run_id: runRow.id,
    })
  } catch (err) {
    // Mark the run as errored if GitHub API call fails
    await supabase
      .from('test_runs')
      .update({ status: 'error' })
      .eq('id', runRow.id)

    const message = err instanceof Error ? err.message : 'GitHub dispatch failed'
    return NextResponse.json({ error: message }, { status: 502 })
  }

  return NextResponse.json({ runId: runRow.id, status: 'pending' })
}
