import { NextResponse } from 'next/server'
import { requireAuth } from '@/lib/auth'
import { createClient } from '@/lib/supabase'

interface RouteContext {
  params: Promise<{ runId: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  try { await requireAuth() } catch (res) { return res as Response }
  const { runId } = await params
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('test_results')
    .select('cases:test_cases(id, title, status, http_method, http_url, http_status)')
    .eq('run_id', runId)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const cases = (data ?? []).flatMap((r: { cases: unknown[] }) => r.cases)
  return NextResponse.json(cases)
}
