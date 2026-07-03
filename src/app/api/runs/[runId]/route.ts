import { NextRequest, NextResponse } from 'next/server'
import { createClient, createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const { runId } = await params
  const supabase = await createClient()

  const { data: run, error } = await supabase
    .from('test_runs')
    .select('*')
    .eq('id', runId)
    .single()

  if (error || !run) {
    return NextResponse.json({ error: 'Run not found' }, { status: 404 })
  }

  return NextResponse.json(run)
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ runId: string }> }
) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const { runId } = await params
  const supabase = createServiceClient()

  const { error } = await supabase
    .from('test_runs')
    .delete()
    .eq('id', runId)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
