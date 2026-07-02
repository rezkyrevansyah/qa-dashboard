import Link from 'next/link'
import { formatDistanceToNow } from 'date-fns'
import { Card } from '@/components/ui/Card'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import type { TestRun, Suite } from '@/lib/types'

interface RunRow extends TestRun {
  suite: Suite
}

interface RecentRunsTableProps {
  runs: RunRow[]
}

export function RecentRunsTable({ runs }: RecentRunsTableProps) {
  return (
    <Card padding={false} className="col-span-2">
      <div className="flex items-center justify-between px-5 py-4 border-b border-gray-800">
        <h2 className="text-sm font-semibold text-gray-200">Recent Runs</h2>
        <span className="text-xs text-gray-600">{runs.length} runs</span>
      </div>
      <div className="divide-y divide-gray-800">
        {runs.length === 0 ? (
          <p className="px-5 py-8 text-sm text-gray-600 text-center">No runs yet. Trigger a test from a suite page.</p>
        ) : (
          runs.map((run) => (
            <Link
              key={run.id}
              href={`/suite/${run.suite_id}`}
              className="flex items-center gap-4 px-5 py-3 hover:bg-gray-800/50 transition-colors"
            >
              <RunStatusBadge status={run.status} />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-200 truncate">{run.suite.name}</p>
                <p className="text-xs text-gray-600">
                  {run.passed_tests} passed · {run.failed_tests} failed
                  {run.duration_ms ? ` · ${(run.duration_ms / 1000).toFixed(1)}s` : ''}
                </p>
              </div>
              <span className="text-xs text-gray-600 shrink-0">
                {formatDistanceToNow(new Date(run.created_at), { addSuffix: true })}
              </span>
            </Link>
          ))
        )}
      </div>
    </Card>
  )
}
