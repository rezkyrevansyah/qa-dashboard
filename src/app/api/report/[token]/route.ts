import { NextRequest, NextResponse } from 'next/server'
import { createServiceClient } from '@/lib/supabase'

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params
  const supabase = createServiceClient()

  // Fetch report
  const { data: report, error: reportErr } = await supabase
    .from('public_reports')
    .select('id, token, run_id, suite_id, is_active, created_at')
    .eq('token', token)
    .maybeSingle()

  if (reportErr || !report) {
    return NextResponse.json({ error: 'not_found' }, { status: 404 })
  }

  if (!report.is_active) {
    return NextResponse.json({ error: 'expired' }, { status: 410 })
  }

  // Fetch suite
  const { data: suite } = await supabase
    .from('suites')
    .select('id, name, suite_type, description')
    .eq('id', report.suite_id)
    .single()

  // Fetch run
  const { data: run } = await supabase
    .from('test_runs')
    .select('id, status, total_tests, passed_tests, failed_tests, skipped_tests, duration_ms, started_at, completed_at, github_run_url, triggered_by')
    .eq('id', report.run_id)
    .single()

  // Fetch test results with specs and test cases
  const { data: results } = await supabase
    .from('test_results')
    .select(`
      id, status, duration_ms,
      spec:specs(id, name, path),
      cases:test_cases(id, title, status, duration_ms, error_message, http_method, http_url, http_status)
    `)
    .eq('run_id', report.run_id)
    .order('created_at', { ascending: true })

  return NextResponse.json({
    report: { token: report.token, created_at: report.created_at },
    suite,
    run,
    results: results ?? [],
  })
}
