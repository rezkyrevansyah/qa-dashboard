import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ suiteId: string }> }
) {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const { suiteId } = await params
  const supabase = await createClient()

  const [{ data: suite, error: suiteErr }, { data: specs }, { data: runs }] = await Promise.all([
    supabase.from('suites').select('*').eq('id', suiteId).single(),
    supabase.from('specs').select('*').eq('suite_id', suiteId).order('name'),
    supabase
      .from('test_runs')
      .select('*, results:test_results(*, spec:specs(*))')
      .eq('suite_id', suiteId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (suiteErr || !suite) {
    return NextResponse.json({ error: 'Suite not found' }, { status: 404 })
  }

  return NextResponse.json({
    suite: { ...suite, specs: specs ?? [] },
    runs: runs ?? [],
  })
}
