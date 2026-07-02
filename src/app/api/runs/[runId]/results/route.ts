import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
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

  const { data: results, error } = await supabase
    .from('test_results')
    .select('*, spec:specs(*), cases:test_cases(*)')
    .eq('run_id', runId)
    .order('created_at')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(results ?? [])
}
