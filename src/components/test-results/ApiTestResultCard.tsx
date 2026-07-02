'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { clsx } from 'clsx'
import { TestCaseRow } from './TestCaseRow'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import type { TestResultWithCases } from '@/lib/types'

const methodColors: Record<string, string> = {
  GET: 'bg-blue-900 text-blue-300 border-blue-700',
  POST: 'bg-green-900 text-green-300 border-green-700',
  PUT: 'bg-yellow-900 text-yellow-300 border-yellow-700',
  PATCH: 'bg-orange-900 text-orange-300 border-orange-700',
  DELETE: 'bg-red-900 text-red-300 border-red-700',
}

function statusCodeColor(code: number) {
  if (code >= 200 && code < 300) return 'text-green-400'
  if (code >= 400 && code < 500) return 'text-yellow-400'
  return 'text-red-400'
}

interface ApiTestResultCardProps {
  result: TestResultWithCases
}

export function ApiTestResultCard({ result }: ApiTestResultCardProps) {
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="border border-gray-800 rounded-xl overflow-hidden">
      <button
        onClick={() => setExpanded((e) => !e)}
        className="flex items-center gap-3 w-full px-4 py-3 text-left hover:bg-gray-800/40 transition-colors"
      >
        {expanded
          ? <ChevronDown className="w-4 h-4 text-gray-500 shrink-0" />
          : <ChevronRight className="w-4 h-4 text-gray-500 shrink-0" />
        }
        <code className="text-xs font-mono text-gray-400">{result.spec.name}</code>
        <div className="flex-1" />
        <RunStatusBadge status={result.status as 'passed' | 'failed'} />
        <span className="text-xs text-gray-600">
          {result.cases.length} tests
          {result.duration_ms ? ` · ${(result.duration_ms / 1000).toFixed(1)}s` : ''}
        </span>
      </button>

      {expanded && (
        <div className="border-t border-gray-800 divide-y divide-gray-800/50">
          {result.cases.map((tc) => (
            <div key={tc.id} className="px-4 py-2">
              {/* Show HTTP method badge if present */}
              {tc.http_method && (
                <div className="flex items-center gap-2 mb-1.5">
                  <span className={clsx(
                    'text-xs font-bold px-1.5 py-0.5 rounded border font-mono',
                    methodColors[tc.http_method] ?? 'bg-gray-800 text-gray-400 border-gray-700'
                  )}>
                    {tc.http_method}
                  </span>
                  {tc.http_url && (
                    <code className="text-xs text-gray-500 truncate">{tc.http_url}</code>
                  )}
                  {tc.http_status != null && (
                    <span className={clsx('text-xs font-bold ml-auto', statusCodeColor(tc.http_status))}>
                      {tc.http_status}
                    </span>
                  )}
                  {tc.http_duration_ms != null && (
                    <span className="text-xs text-gray-600">{tc.http_duration_ms}ms</span>
                  )}
                </div>
              )}
              <TestCaseRow testCase={tc} />
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
