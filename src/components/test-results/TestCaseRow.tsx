'use client'

import { useState } from 'react'
import { ChevronDown, ChevronRight, CheckCircle2, XCircle, Clock, SkipForward } from 'lucide-react'
import { clsx } from 'clsx'
import type { TestCase } from '@/lib/types'

const statusIcon = {
  passed: <CheckCircle2 className="w-4 h-4 text-green-400 shrink-0" />,
  failed: <XCircle className="w-4 h-4 text-red-400 shrink-0" />,
  skipped: <SkipForward className="w-4 h-4 text-gray-500 shrink-0" />,
  pending: <Clock className="w-4 h-4 text-yellow-400 shrink-0" />,
}

interface TestCaseRowProps {
  testCase: TestCase
}

export function TestCaseRow({ testCase }: TestCaseRowProps) {
  const [expanded, setExpanded] = useState(false)
  const hasDetails = testCase.status === 'failed' && (testCase.error_message || testCase.error_stack)

  return (
    <div className="border border-gray-800 rounded-lg overflow-hidden">
      <button
        onClick={() => hasDetails && setExpanded((e) => !e)}
        className={clsx(
          'flex items-center gap-3 w-full px-4 py-2.5 text-left',
          hasDetails ? 'hover:bg-gray-800/50 cursor-pointer' : 'cursor-default'
        )}
      >
        {statusIcon[testCase.status]}
        <span className="flex-1 text-sm text-gray-300">{testCase.title}</span>
        {testCase.duration_ms != null && (
          <span className="text-xs text-gray-600 shrink-0">{testCase.duration_ms}ms</span>
        )}
        {hasDetails && (
          expanded
            ? <ChevronDown className="w-3.5 h-3.5 text-gray-600 shrink-0" />
            : <ChevronRight className="w-3.5 h-3.5 text-gray-600 shrink-0" />
        )}
      </button>

      {expanded && hasDetails && (
        <div className="px-4 pb-3 border-t border-gray-800 bg-gray-950">
          {testCase.error_message && (
            <p className="text-xs text-red-400 mt-2 font-medium">{testCase.error_message}</p>
          )}
          {testCase.error_stack && (
            <pre className="text-xs text-gray-500 mt-2 overflow-x-auto whitespace-pre-wrap leading-relaxed">
              {testCase.error_stack}
            </pre>
          )}
        </div>
      )}
    </div>
  )
}
