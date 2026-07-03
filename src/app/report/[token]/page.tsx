import { createServiceClient } from '@/lib/supabase'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { ApiTestResultCard } from '@/components/test-results/ApiTestResultCard'
import { UiTestResultCard } from '@/components/test-results/UiTestResultCard'
import { AlertTriangle, CheckCircle, ExternalLink } from 'lucide-react'
import type { RunStatus, SuiteType, TestStatus, HttpMethod } from '@/lib/types'

interface PageProps {
  params: Promise<{ token: string }>
}

interface PublicReportRun {
  id: string
  status: RunStatus
  total_tests: number
  passed_tests: number
  failed_tests: number
  skipped_tests: number
  duration_ms: number | null
  started_at: string | null
  completed_at: string | null
  github_run_url: string | null
  triggered_by: string | null
}

interface PublicReportSuite {
  id: string
  name: string
  suite_type: SuiteType
  description: string | null
}

interface PublicTestCase {
  id: string
  title: string
  status: TestStatus
  duration_ms: number | null
  error_message: string | null
  http_method: HttpMethod | null
  http_url: string | null
  http_status: number | null
}

interface PublicTestResult {
  id: string
  status: TestStatus
  duration_ms: number | null
  spec: { id: string; name: string; path: string }
  cases: PublicTestCase[]
}

async function getPublicReport(token: string) {
  const supabase = createServiceClient()

  const { data: report, error: reportErr } = await supabase
    .from('public_reports')
    .select('id, token, run_id, suite_id, is_active, created_at')
    .eq('token', token)
    .maybeSingle()

  if (reportErr || !report) return { status: 'not_found' as const }
  if (!report.is_active) return { status: 'expired' as const }

  const [{ data: suite }, { data: run }, { data: results }] = await Promise.all([
    supabase
      .from('suites')
      .select('id, name, suite_type, description')
      .eq('id', report.suite_id)
      .single(),
    supabase
      .from('test_runs')
      .select('id, status, total_tests, passed_tests, failed_tests, skipped_tests, duration_ms, started_at, completed_at, github_run_url, triggered_by')
      .eq('id', report.run_id)
      .single(),
    supabase
      .from('test_results')
      .select(`
        id, status, duration_ms,
        spec:specs(id, name, path),
        cases:test_cases(id, title, status, duration_ms, error_message, http_method, http_url, http_status)
      `)
      .eq('run_id', report.run_id)
      .order('created_at', { ascending: true }),
  ])

  return {
    status: 'ok' as const,
    report: { token: report.token, created_at: report.created_at },
    suite: suite as PublicReportSuite,
    run: run as PublicReportRun,
    results: (results ?? []) as PublicTestResult[],
  }
}

function formatDuration(ms: number | null) {
  if (!ms) return '—'
  if (ms < 1000) return `${ms}ms`
  return `${(ms / 1000).toFixed(1)}s`
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('id-ID', {
    day: 'numeric', month: 'short', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

export default async function PublicReportPage({ params }: PageProps) {
  const { token } = await params
  const data = await getPublicReport(token)

  if (data.status === 'not_found') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <AlertTriangle className="w-12 h-12 text-gray-600 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Report Not Found</h1>
        <p className="text-gray-400">Link ini tidak valid atau sudah dihapus.</p>
      </div>
    )
  }

  if (data.status === 'expired') {
    return (
      <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center text-center px-4">
        <CheckCircle className="w-12 h-12 text-gray-600 mb-4" />
        <h1 className="text-xl font-semibold text-white mb-2">Report Expired</h1>
        <p className="text-gray-400">Link ini sudah dinonaktifkan oleh tim QA.</p>
      </div>
    )
  }

  const { suite, run, results, report } = data
  const passRate = run.total_tests > 0
    ? Math.round((run.passed_tests / run.total_tests) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg shrink-0">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span className="font-bold text-white text-sm tracking-wide">QA Dashboard</span>
          <span className="text-gray-600 text-sm ml-2">· Public Report</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* Suite + Run info */}
        <div>
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-2xl font-bold text-white">{suite.name}</h1>
            <span className={`text-xs font-semibold px-2 py-0.5 rounded border ${
              suite.suite_type === 'api'
                ? 'bg-purple-950 text-purple-300 border-purple-800'
                : 'bg-cyan-950 text-cyan-300 border-cyan-800'
            }`}>
              {suite.suite_type.toUpperCase()}
            </span>
          </div>
          {suite.description && (
            <p className="text-gray-400 text-sm">{suite.description}</p>
          )}
        </div>

        {/* Run summary card */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-gray-500 mb-1">Run Date</p>
              <p className="text-sm text-gray-200">{formatDate(run.completed_at ?? run.started_at)}</p>
            </div>
            <RunStatusBadge status={run.status} />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 pt-2 border-t border-gray-800">
            <div>
              <p className="text-xs text-gray-500 mb-1">Passed</p>
              <p className="text-lg font-bold text-green-400">{run.passed_tests}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Failed</p>
              <p className="text-lg font-bold text-red-400">{run.failed_tests}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Skipped</p>
              <p className="text-lg font-bold text-gray-400">{run.skipped_tests}</p>
            </div>
            <div>
              <p className="text-xs text-gray-500 mb-1">Duration</p>
              <p className="text-lg font-bold text-gray-200">{formatDuration(run.duration_ms)}</p>
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-gray-800">
            <div className="flex items-center gap-2">
              <div className="w-full bg-gray-800 rounded-full h-2 w-40">
                <div
                  className={`h-2 rounded-full transition-all ${passRate === 100 ? 'bg-green-500' : passRate > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${passRate}%` }}
                />
              </div>
              <span className="text-sm font-semibold text-gray-300">{passRate}% pass rate</span>
            </div>
            {run.github_run_url && (
              <a
                href={run.github_run_url}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1.5 text-xs text-blue-400 hover:text-blue-300 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                GitHub Actions
              </a>
            )}
          </div>
        </div>

        {/* Results */}
        {results.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Test Results</h2>
            {results.map((result) => {
              // Cast to shape expected by cards
              const cardResult = {
                ...result,
                spec: result.spec,
                cases: result.cases.map((c) => ({ ...c, error_stack: null, http_duration_ms: null, screenshot_url: null })),
                error_message: null,
                error_stack: null,
                created_at: '',
                run_id: run.id,
                spec_id: result.spec.id,
              }
              return suite.suite_type === 'api'
                ? <ApiTestResultCard key={result.id} result={cardResult} />
                : <UiTestResultCard key={result.id} result={cardResult} />
            })}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="border-t border-gray-800 mt-12">
        <div className="max-w-4xl mx-auto px-4 py-5 flex items-center justify-between text-xs text-gray-600">
          <span>Generated by QA Dashboard</span>
          <span>{formatDate(report.created_at)}</span>
        </div>
      </footer>
    </div>
  )
}
