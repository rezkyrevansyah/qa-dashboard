import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { SuiteHeader } from './_components/SuiteHeader'
import { RunAllButton } from './_components/RunAllButton'
import { SpecList } from './_components/SpecList'
import { RunHistoryTable } from './_components/RunHistoryTable'
import { RunStatusPoller } from './_components/RunStatusPoller'
import { ApiTestResultCard } from '@/components/test-results/ApiTestResultCard'
import { UiTestResultCard } from '@/components/test-results/UiTestResultCard'
import type { TestRun, Spec, TestResultWithCases } from '@/lib/types'

async function getSuiteData(suiteId: string) {
  const supabase = await createClient()

  const [{ data: suite, error }, { data: specs }, { data: runs }] = await Promise.all([
    supabase.from('suites').select('*').eq('id', suiteId).single(),
    supabase.from('specs').select('*').eq('suite_id', suiteId).order('name'),
    supabase
      .from('test_runs')
      .select('*')
      .eq('suite_id', suiteId)
      .order('created_at', { ascending: false })
      .limit(20),
  ])

  if (error || !suite) return null

  // Fetch test_results + test_cases for the latest run
  const latestRunId = (runs ?? [])[0]?.id
  let latestResults: TestResultWithCases[] = []

  if (latestRunId) {
    const { data: results } = await supabase
      .from('test_results')
      .select('*, spec:specs(*), cases:test_cases(*)')
      .eq('run_id', latestRunId)
      .order('created_at')

    latestResults = (results ?? []) as TestResultWithCases[]
  }

  return { suite, specs: specs ?? [], runs: runs ?? [], latestResults }
}

export default async function SuitePage({
  params,
}: {
  params: Promise<{ suiteId: string }>
}) {
  const { suiteId } = await params
  const data = await getSuiteData(suiteId)

  if (!data) notFound()

  const { suite, specs, runs, latestResults } = data

  const lastRun = runs[0] ?? null

  // Map the most recent spec-level run per spec
  const lastRunBySpec: Record<string, TestRun> = {}
  for (const run of runs) {
    if (run.spec_id && !lastRunBySpec[run.spec_id]) {
      lastRunBySpec[run.spec_id] = run as TestRun
    }
  }

  // Active runs (pending or running) for Realtime polling
  const activeRunIds = runs
    .filter((r) => r.status === 'pending' || r.status === 'running')
    .map((r) => r.id)

  const isApi = suite.suite_type === 'api'

  return (
    <div className="space-y-6">
      <RunStatusPoller suiteId={suiteId} activeRunIds={activeRunIds} />

      <div className="flex items-start justify-between">
        <SuiteHeader suite={suite} lastRun={lastRun as TestRun | null} />
        <RunAllButton suiteId={suiteId} suiteName={suite.name} />
      </div>

      {/* Spec files */}
      <Card>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-sm font-semibold text-gray-200">Spec Files</h2>
          <span className="text-xs text-gray-600">{specs.length} files</span>
        </div>
        <SpecList
          specs={specs as Spec[]}
          suiteId={suiteId}
          suiteName={suite.name}
          lastRunBySpec={lastRunBySpec}
        />
      </Card>

      {/* Latest run results */}
      {latestResults.length > 0 && (
        <Card padding={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
            <h2 className="text-sm font-semibold text-gray-200">Latest Run Results</h2>
            <span className="text-xs text-gray-600">
              {latestResults.reduce((n, r) => n + r.cases.length, 0)} test cases
            </span>
          </div>
          <div className="p-4 space-y-2">
            {latestResults.map((result) =>
              isApi
                ? <ApiTestResultCard key={result.id} result={result} />
                : <UiTestResultCard key={result.id} result={result} />
            )}
          </div>
        </Card>
      )}

      <RunHistoryTable runs={runs as TestRun[]} suiteType={suite.suite_type as 'api' | 'ui'} />
    </div>
  )
}
