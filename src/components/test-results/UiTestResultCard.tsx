'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight } from 'lucide-react'
import { TestCaseRow } from './TestCaseRow'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import type { TestResultWithCases } from '@/lib/types'

interface UiTestResultCardProps {
  result: TestResultWithCases
  highlightedCaseIds?: Set<string>
}

export function UiTestResultCard({ result, highlightedCaseIds }: UiTestResultCardProps) {
  const isHighlighted = highlightedCaseIds && result.cases.some((c) => highlightedCaseIds.has(c.id))
  const [expanded, setExpanded] = useState(() => !!isHighlighted)

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
        <div className="border-t border-gray-800 px-4 py-3 space-y-2">
          {result.cases.map((tc) => (
            <div key={tc.id} id={`tc-${tc.id}`}>
              {tc.screenshot_url && (
                <div className="mb-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tc.screenshot_url}
                    alt={`Screenshot: ${tc.title}`}
                    className="rounded-lg border border-gray-800 max-h-48 object-cover cursor-pointer hover:opacity-90"
                    onClick={() => window.open(tc.screenshot_url!, '_blank')}
                  />
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
