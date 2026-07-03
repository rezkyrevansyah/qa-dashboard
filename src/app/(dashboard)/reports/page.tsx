import { createServiceClient } from '@/lib/supabase'
import { PublicReportsTable } from './_components/PublicReportsTable'
import type { PublicReportWithDetails } from '@/lib/types'

export const dynamic = 'force-dynamic'

export default async function ReportsPage() {
  const supabase = createServiceClient()

  const { data } = await supabase
    .from('public_reports')
    .select(`
      id, token, run_id, suite_id, is_active, created_at, updated_at,
      run:test_runs(id, status, total_tests, passed_tests, failed_tests, duration_ms, completed_at, github_run_url),
      suite:suites(id, name, suite_type)
    `)
    .order('created_at', { ascending: false })

  const reports = (data ?? []) as unknown as PublicReportWithDetails[]

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Published Reports</h1>
        <p className="text-sm text-gray-400 mt-1">Manage shareable test run links untuk developers.</p>
      </div>
      <PublicReportsTable reports={reports} />
    </div>
  )
}
