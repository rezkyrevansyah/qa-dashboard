'use client'

import { useState } from 'react'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { Card } from '@/components/ui/Card'
import { Spinner } from '@/components/ui/Spinner'
import { ApiTestResultCard } from '@/components/test-results/ApiTestResultCard'
import { UiTestResultCard } from '@/components/test-results/UiTestResultCard'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink, ChevronDown, ChevronRight } from 'lucide-react'
import type { TestRun, TestResultWithCases } from '@/lib/types'

interface RunHistoryTableProps {
  runs: TestRun[]
  suiteType: 'api' | 'ui'
}

function RunRow({ run, suiteType }: { run: TestRun; suiteType: 'api' | 'ui' }) {
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const [results, setResults] = useState<TestResultWithCases[] | null>(null)

  async function handleExpand() {
    if (expanded) {
      setExpanded(false)
      return
    }
    setExpanded(true)
    if (results !== null) return // already fetched

    setLoading(true)
    try {
      const res = await fetch(`/api/runs/${run.id}/results`)
      if (res.ok) {
        const data = await res.json()
        setResults(data)
      }
    } finally {
      setLoading(false)
    }
  }

  const canExpand = run.status === 'passed' || run.status === 'failed'

  return (
    <div className="border-b border-gray-800 last:border-0">
      {/* Row header */}
      <div
        className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/30 transition-colors"
        onClick={canExpand ? handleExpand : undefined}
        style={{ cursor: canExpand ? 'pointer' : 'default' }}
      >
        {canExpand ? (
          expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        ) : (
          <span className="w-3.5 shrink-0" />
        )}

        <RunStatusBadge status={run.status} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-mono text-xs text-gray-400">{run.id.slice(0, 8)}</span>
            {run.spec_id && <span className="text-xs text-gray-600">· spec only</span>}
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            <span className="text-green-500">{run.passed_tests} passed</span>
            {' · '}
            <span className="text-red-500">{run.failed_tests} failed</span>
            {' · '}
            {run.skipped_tests} skipped
            {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
          </p>
        </div>

        <div className="flex items-center gap-3 shrink-0" onClick={(e) => e.stopPropagation()}>
          {run.github_run_url && (
            <a
              href={run.github_run_url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-300"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
          <span className="text-xs text-gray-600">
            {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
          </span>
        </div>
      </div>

      {/* Expanded results */}
      {expanded && (
        <div className="px-4 pb-4 bg-gray-950/50">
          {loading ? (
            <div className="flex items-center gap-2 py-4 text-xs text-gray-500">
              <Spinner size="sm" />
              Loading results…
            </div>
          ) : results && results.length > 0 ? (
            <div className="space-y-2 pt-2">
              {results.map((result) =>
                suiteType === 'api'
                  ? <ApiTestResultCard key={result.id} result={result} />
                  : <UiTestResultCard key={result.id} result={result} />
              )}
            </div>
          ) : (
            <p className="py-4 text-xs text-gray-600">No detailed results stored for this run.</p>
          )}
        </div>
      )}
    </div>
  )
}

export function RunHistoryTable({ runs, suiteType }: RunHistoryTableProps) {
  return (
    <Card padding={false}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200">Run History</h2>
        <span className="text-xs text-gray-600">{runs.length} runs</span>
      </div>
      <div>
        {runs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-600 text-center">No runs yet.</p>
        ) : (
          runs.map((run) => (
            <RunRow key={run.id} run={run} suiteType={suiteType} />
          ))
        )}
      </div>
    </Card>
  )
}
