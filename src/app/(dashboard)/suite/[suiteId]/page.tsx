import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Card } from '@/components/ui/Card'
import { SuiteHeader } from './_components/SuiteHeader'
import { RunAllButton } from './_components/RunAllButton'
import { SpecList } from './_components/SpecList'
import { RunHistoryTable } from './_components/RunHistoryTable'
import { RunStatusPoller } from './_components/RunStatusPoller'
import type { TestRun, Spec } from '@/lib/types'

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

  return { suite, specs: specs ?? [], runs: runs ?? [] }
}

export default async function SuitePage({
  params,
}: {
  params: Promise<{ suiteId: string }>
}) {
  const { suiteId } = await params
  const data = await getSuiteData(suiteId)

  if (!data) notFound()

  const { suite, specs, runs } = data

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

      <RunHistoryTable runs={runs as TestRun[]} />
    </div>
  )
}
