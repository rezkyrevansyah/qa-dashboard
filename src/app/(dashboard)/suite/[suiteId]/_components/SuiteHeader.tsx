import { Badge } from '@/components/ui/Badge'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { formatDistanceToNow } from 'date-fns'
import { ExternalLink } from 'lucide-react'
import type { Suite, TestRun } from '@/lib/types'

interface SuiteHeaderProps {
  suite: Suite
  lastRun: TestRun | null
}

export function SuiteHeader({ suite, lastRun }: SuiteHeaderProps) {
  const passRate =
    lastRun && lastRun.total_tests > 0
      ? Math.round((lastRun.passed_tests / lastRun.total_tests) * 100)
      : null

  return (
    <div className="flex items-start justify-between">
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-white">{suite.name}</h1>
          <Badge variant={suite.suite_type as 'api' | 'ui'}>{suite.suite_type.toUpperCase()}</Badge>
        </div>
        {suite.description && (
          <p className="text-sm text-gray-500">{suite.description}</p>
        )}
        <div className="flex items-center gap-4 mt-2">
          {lastRun ? (
            <>
              <RunStatusBadge status={lastRun.status} />
              {passRate !== null && (
                <span className="text-xs text-gray-500">{passRate}% pass rate</span>
              )}
              <span className="text-xs text-gray-600">
                Last run {formatDistanceToNow(new Date(lastRun.created_at), { addSuffix: true })}
              </span>
              {lastRun.github_run_url && (
                <a
                  href={lastRun.github_run_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1 text-xs text-blue-400 hover:text-blue-300"
                >
                  <ExternalLink className="w-3 h-3" />
                  GitHub Actions
                </a>
              )}
            </>
          ) : (
            <span className="text-xs text-gray-600">No runs yet</span>
          )}
        </div>
      </div>
    </div>
  )
}
