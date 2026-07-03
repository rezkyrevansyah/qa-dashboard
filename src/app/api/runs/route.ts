import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'
import { triggerWorkflowDispatch } from '@/lib/github'

export async function GET(request: NextRequest) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const { searchParams } = request.nextUrl
  const suiteId = searchParams.get('suiteId')
  const offset = parseInt(searchParams.get('offset') ?? '0', 10)
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '20', 10), 50)

  if (!suiteId) {
    return NextResponse.json({ error: 'suiteId is required' }, { status: 400 })
  }

  const supabase = await createClient()
  const { data, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('suite_id', suiteId)
    .order('created_at', { ascending: false })
    .range(offset, offset + limit - 1)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

export async function DELETE(request: NextRequest) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  try {
    const { runIds } = await request.json()
    if (!Array.isArray(runIds) || runIds.length === 0) {
      return NextResponse.json({ error: 'runIds array is required' }, { status: 400 })
    }

    const supabase = createServiceClient()
    const { error } = await supabase.from('test_runs').delete().in('id', runIds)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ ok: true, deleted: runIds.length })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  let user
  try {
    user = await requireAuth()
  } catch (res) {
    return res as Response
  }

  try {
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
  } catch (err) {
    console.error('[POST /api/runs] Unhandled error:', err)
    const message = err instanceof Error ? err.message : 'Internal server error'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
