import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const supabase = createServiceClient()

  const { data, error } = await supabase
    .from('public_reports')
    .select(`
      id, token, run_id, suite_id, is_active, created_at, updated_at,
      run:test_runs(id, status, total_tests, passed_tests, failed_tests, duration_ms, completed_at, github_run_url),
      suite:suites(id, name, suite_type)
    `)
    .order('created_at', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data ?? [])
}

export async function PATCH(request: NextRequest) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  let body: { token?: string; is_active?: boolean }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
  }

  const { token, is_active } = body
  if (!token || is_active === undefined) {
    return NextResponse.json({ error: 'token and is_active are required' }, { status: 400 })
  }

  const supabase = createServiceClient()

  const { error } = await supabase
    .from('public_reports')
    .update({ is_active, updated_at: new Date().toISOString() })
    .eq('token', token)

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
