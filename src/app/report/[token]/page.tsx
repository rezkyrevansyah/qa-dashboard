import { createServiceClient } from '@/lib/supabase'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { AlertTriangle, CheckCircle, FileText, User } from 'lucide-react'
import type { RunStatus, SuiteType } from '@/lib/types'
import { PublicReportResults } from './_components/PublicReportResults'
import type { PublicTestResult } from './_components/PublicReportResults'

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
}

interface PublicReportSuite {
  id: string
  name: string
  suite_type: SuiteType
  description: string | null
}

interface PublicNoteRef {
  test_case_id: string
  test_cases: {
    id: string
    title: string
    status: string
    http_method: string | null
    http_url: string | null
  }
}

interface PublicNote {
  id: string
  content: string
  updated_at: string
  referenced_cases: PublicNoteRef[]
}

async function getPublicReport(token: string) {
  const supabase = createServiceClient()

  const { data: report, error: reportErr } = await supabase
    .from('public_reports')
    .select('id, token, run_id, suite_id, is_active, created_at, created_by')
    .eq('token', token)
    .maybeSingle()

  if (reportErr || !report) return { status: 'not_found' as const }
  if (!report.is_active) return { status: 'expired' as const }

  const [{ data: suite }, { data: run }, { data: results }, { data: notes }] = await Promise.all([
    supabase
      .from('suites')
      .select('id, name, suite_type, description')
      .eq('id', report.suite_id)
      .single(),
    supabase
      .from('test_runs')
      .select('id, status, total_tests, passed_tests, failed_tests, skipped_tests, duration_ms, started_at, completed_at')
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
    supabase
      .from('run_notes')
      .select(`
        id, content, updated_at,
        referenced_cases:note_test_cases(
          test_case_id,
          test_cases(id, title, status, http_method, http_url)
        )
      `)
      .eq('run_id', report.run_id)
      .order('created_at', { ascending: true }),
  ])

  const noteList = (notes ?? []) as unknown as PublicNote[]
  const highlightedCaseIds = new Set(
    noteList.flatMap((n) => (n.referenced_cases ?? []).map((r) => r.test_case_id))
  )

  return {
    status: 'ok' as const,
    report: {
      token: report.token,
      created_at: report.created_at,
      created_by: report.created_by as string | null,
    },
    suite: suite as PublicReportSuite,
    run: run as PublicReportRun,
    results: (results ?? []) as unknown as PublicTestResult[],
    notes: noteList,
    highlightedCaseIds,
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

const statusDot: Record<string, string> = {
  passed: 'bg-green-400',
  failed: 'bg-red-400',
  skipped: 'bg-gray-500',
  pending: 'bg-yellow-400',
}

function PublicNoteCard({ note }: { note: PublicNote }) {
  return (
    <div className="bg-amber-950/30 border border-amber-800/50 rounded-xl p-4">
      <p className="text-sm text-gray-300 whitespace-pre-wrap leading-relaxed">{note.content}</p>

      {note.referenced_cases && note.referenced_cases.length > 0 && (
        <div className="mt-3 pt-3 border-t border-amber-800/30">
          <p className="text-xs text-amber-500/70 mb-2">Referensi test case:</p>
          <div className="flex flex-wrap gap-1.5">
            {note.referenced_cases.map((ref) => (
              <a
                key={ref.test_case_id}
                href={`#tc-${ref.test_case_id}`}
                className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-amber-900/20 border border-amber-800/40 text-xs text-amber-300 hover:bg-amber-900/40 transition-colors"
              >
                {ref.test_cases.http_method && (
                  <span className="font-mono font-bold text-amber-400/80 text-[10px]">
                    {ref.test_cases.http_method}
                  </span>
                )}
                <span className="truncate max-w-[200px]">{ref.test_cases.title}</span>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${statusDot[ref.test_cases.status] ?? 'bg-gray-500'}`} />
              </a>
            ))}
          </div>
        </div>
      )}

      <p className="text-xs text-gray-600 mt-3">Diperbarui {formatDate(note.updated_at)}</p>
    </div>
  )
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

  const { suite, run, results, report, notes, highlightedCaseIds } = data
  const passRate = run.total_tests > 0
    ? Math.round((run.passed_tests / run.total_tests) * 100)
    : 0

  return (
    <div className="min-h-screen bg-gray-950 text-gray-100">
      {/* Header */}
      <header className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-white rounded-lg shrink-0 p-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/logo_baznas.png" alt="BAZNAS" className="w-full h-full object-contain" />
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

          <div className="flex items-center pt-2 border-t border-gray-800">
            <div className="flex items-center gap-3 flex-1 min-w-0">
              <span className="text-sm font-semibold text-gray-300 whitespace-nowrap">{passRate}% pass rate</span>
              <div className="flex-1 bg-gray-800 rounded-full h-2 min-w-[60px]">
                <div
                  className={`h-2 rounded-full transition-all ${passRate === 100 ? 'bg-green-500' : passRate > 0 ? 'bg-amber-500' : 'bg-red-500'}`}
                  style={{ width: `${passRate}%` }}
                />
              </div>
            </div>
          </div>

          {/* Reporter */}
          {report.created_by && (
            <div className="flex items-center gap-2 pt-2 border-t border-gray-800">
              <User className="w-3.5 h-3.5 text-gray-600 shrink-0" />
              <span className="text-xs text-gray-500">Reported by</span>
              <span className="text-xs text-gray-300 font-medium">{report.created_by}</span>
            </div>
          )}
        </div>

        {/* QA Notes */}
        {notes.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <FileText className="w-4 h-4 text-amber-400 shrink-0" />
              <span className="text-xs font-semibold text-amber-400 uppercase tracking-wider">Notes dari QA</span>
            </div>
            {notes.map((note) => (
              <PublicNoteCard key={note.id} note={note} />
            ))}
          </div>
        )}

        {/* Results with filters */}
        {results.length > 0 && (
          <PublicReportResults
            results={results}
            suiteType={suite.suite_type}
            suiteId={suite.id}
            runId={run.id}
            highlightedCaseIds={highlightedCaseIds}
          />
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
