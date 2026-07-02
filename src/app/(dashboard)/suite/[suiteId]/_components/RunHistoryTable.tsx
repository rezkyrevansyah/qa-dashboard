import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { Card } from '@/components/ui/Card'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import type { TestRun } from '@/lib/types'

interface RunHistoryTableProps {
  runs: TestRun[]
}

export function RunHistoryTable({ runs }: RunHistoryTableProps) {
  return (
    <Card padding={false}>
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200">Run History</h2>
        <span className="text-xs text-gray-600">{runs.length} runs</span>
      </div>
      <div className="divide-y divide-gray-800">
        {runs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-600 text-center">No runs yet.</p>
        ) : (
          runs.map((run) => (
            <div key={run.id} className="flex items-center gap-4 px-5 py-3">
              <RunStatusBadge status={run.status} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-300 font-mono text-xs">{run.id.slice(0, 8)}</span>
                  {run.spec_id && (
                    <span className="text-xs text-gray-600">· spec only</span>
                  )}
                </div>
                <p className="text-xs text-gray-600 mt-0.5">
                  {run.passed_tests} passed · {run.failed_tests} failed · {run.skipped_tests} skipped
                  {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                </p>
              </div>
              <div className="flex items-center gap-3">
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
                <span className="text-xs text-gray-600 shrink-0">
                  {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}
