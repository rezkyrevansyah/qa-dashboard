import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase'
import { requireAuth } from '@/lib/auth'

export async function GET() {
  try {
    await requireAuth()
  } catch (res) {
    return res as Response
  }

  const supabase = await createClient()

  // Fetch all suites
  const { data: suites, error: suitesError } = await supabase
    .from('suites')
    .select('*')
    .order('name')

  if (suitesError) {
    return NextResponse.json({ error: suitesError.message }, { status: 500 })
  }

  // Fetch the latest run per suite
  const suiteIds = (suites ?? []).map((s) => s.id)
  const { data: latestRuns } = await supabase
    .from('test_runs')
    .select('*')
    .in('suite_id', suiteIds)
    .order('created_at', { ascending: false })

  // Map latest run per suite
  const lastRunBySuite: Record<string, unknown> = {}
  for (const run of latestRuns ?? []) {
    if (!lastRunBySuite[run.suite_id]) {
      lastRunBySuite[run.suite_id] = run
    }
  }

  const result = (suites ?? []).map((suite) => ({
    ...suite,
    last_run: lastRunBySuite[suite.id] ?? null,
  }))

  return NextResponse.json(result)
}
