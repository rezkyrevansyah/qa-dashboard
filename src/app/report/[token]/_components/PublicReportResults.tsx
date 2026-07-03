'use client'

import { useState, useMemo } from 'react'
import { Search, X } from 'lucide-react'
import { ApiTestResultCard } from '@/components/test-results/ApiTestResultCard'
import { UiTestResultCard } from '@/components/test-results/UiTestResultCard'
import type { HttpMethod, SuiteType, TestStatus, TestResultWithCases } from '@/lib/types'

interface PublicTestCase {
  id: string
  title: string
  status: TestStatus
  duration_ms: number | null
  error_message: string | null
  http_method: HttpMethod | null
  http_url: string | null
  http_status: number | null
}

export interface PublicTestResult {
  id: string
  status: TestStatus
  duration_ms: number | null
  spec: { id: string; name: string; path: string }
  cases: PublicTestCase[]
}

interface PublicReportResultsProps {
  results: PublicTestResult[]
  suiteType: SuiteType
  suiteId: string
  runId: string
}

const STATUS_OPTIONS = [
  { value: 'all', label: 'Semua' },
  { value: 'passed', label: 'Passed' },
  { value: 'failed', label: 'Failed' },
] as const

const METHOD_ORDER = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const

function toCardResult(result: PublicTestResult, suiteId: string, runId: string): TestResultWithCases {
  return {
    ...result,
    run_id: runId,
    spec_id: result.spec.id,
    spec: { ...result.spec, suite_id: suiteId, created_at: '', updated_at: '' },
    cases: result.cases.map((c) => ({
      ...c,
      result_id: result.id,
      error_stack: null,
      http_duration_ms: null,
      screenshot_url: null,
      created_at: '',
    })),
    error_message: null,
    error_stack: null,
    created_at: '',
  } as unknown as TestResultWithCases
}

export function PublicReportResults({ results, suiteType, suiteId, runId }: PublicReportResultsProps) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'passed' | 'failed'>('all')
  const [methodFilter, setMethodFilter] = useState<string>('all')
  const [search, setSearch] = useState('')

  const availableMethods = useMemo(() => {
    const methods = new Set<string>()
    for (const result of results) {
      for (const c of result.cases) {
        if (c.http_method) methods.add(c.http_method)
      }
    }
    return METHOD_ORDER.filter((m) => methods.has(m))
  }, [results])

  // Filter cases within each result, then drop results with 0 matching cases
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return results
      .map((result) => {
        let cases = result.cases
        if (statusFilter !== 'all') {
          cases = cases.filter((c) => c.status === statusFilter)
        }
        if (methodFilter !== 'all') {
          cases = cases.filter((c) => c.http_method === methodFilter)
        }
        if (q) {
          const specMatch = result.spec.name.toLowerCase().includes(q)
          cases = specMatch ? cases : cases.filter((c) => c.title.toLowerCase().includes(q))
        }
        return { ...result, cases }
      })
      .filter((result) => result.cases.length > 0)
  }, [results, statusFilter, methodFilter, search])

  // Total matched cases count for the counter
  const totalMatchedCases = useMemo(
    () => filtered.reduce((sum, r) => sum + r.cases.length, 0),
    [filtered]
  )
  const totalCases = useMemo(
    () => results.reduce((sum, r) => sum + r.cases.length, 0),
    [results]
  )

  const hasActiveFilter = statusFilter !== 'all' || methodFilter !== 'all' || search.trim() !== ''

  function resetFilters() {
    setStatusFilter('all')
    setMethodFilter('all')
    setSearch('')
  }

  return (
    <div className="space-y-4">
      <div className="space-y-3">
        {/* Search + reset */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama spec atau test case..."
              className="w-full pl-9 pr-3 py-2 bg-gray-900 border border-gray-700 rounded-lg text-sm text-gray-200 placeholder-gray-600 focus:outline-none focus:border-gray-500 transition-colors"
            />
          </div>
          {hasActiveFilter && (
            <button
              onClick={resetFilters}
              className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-2 border border-gray-700 rounded-lg hover:border-gray-500 transition-colors whitespace-nowrap"
            >
              <X className="w-3.5 h-3.5" />
              Reset
            </button>
          )}
        </div>

        {/* Filter pills row */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status filter */}
          <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
            {STATUS_OPTIONS.map(({ value, label }) => (
              <button
                key={value}
                onClick={() => setStatusFilter(value as typeof statusFilter)}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === value
                    ? value === 'passed'
                      ? 'bg-green-900/60 text-green-300 border border-green-800'
                      : value === 'failed'
                      ? 'bg-red-900/60 text-red-300 border border-red-800'
                      : 'bg-gray-700 text-white border border-gray-600'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Method filter — only for API suites */}
          {suiteType === 'api' && availableMethods.length > 0 && (
            <div className="flex items-center gap-1 bg-gray-900 border border-gray-800 rounded-lg p-1">
              <button
                onClick={() => setMethodFilter('all')}
                className={`text-xs px-2.5 py-1 rounded-md font-medium transition-colors ${
                  methodFilter === 'all'
                    ? 'bg-gray-700 text-white border border-gray-600'
                    : 'text-gray-500 hover:text-gray-300'
                }`}
              >
                Semua Method
              </button>
              {availableMethods.map((method) => (
                <button
                  key={method}
                  onClick={() => setMethodFilter(method)}
                  className={`text-xs px-2.5 py-1 rounded-md font-mono font-bold transition-colors ${
                    methodFilter === method
                      ? method === 'GET'
                        ? 'bg-blue-900/70 text-blue-300 border border-blue-800'
                        : method === 'POST'
                        ? 'bg-green-900/70 text-green-300 border border-green-800'
                        : method === 'PUT'
                        ? 'bg-yellow-900/70 text-yellow-300 border border-yellow-800'
                        : method === 'PATCH'
                        ? 'bg-orange-900/70 text-orange-300 border border-orange-800'
                        : 'bg-red-900/70 text-red-300 border border-red-800'
                      : 'text-gray-500 hover:text-gray-300'
                  }`}
                >
                  {method}
                </button>
              ))}
            </div>
          )}

          {/* Count */}
          <span className="text-xs text-gray-600 ml-auto">
            {hasActiveFilter
              ? `${totalMatchedCases} dari ${totalCases} test case`
              : `${totalCases} test case`}
          </span>
        </div>
      </div>

      {/* Results */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider">Test Results</h2>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-center border border-gray-800 rounded-xl">
            <Search className="w-8 h-8 text-gray-700 mb-3" />
            <p className="text-sm text-gray-500">Tidak ada hasil yang cocok dengan filter ini.</p>
            <button
              onClick={resetFilters}
              className="mt-3 text-xs text-blue-400 hover:text-blue-300 transition-colors"
            >
              Reset filter
            </button>
          </div>
        ) : (
          filtered.map((result) => {
            const cardResult = toCardResult(result, suiteId, runId)
            return suiteType === 'api'
              ? <ApiTestResultCard key={result.id} result={cardResult} />
              : <UiTestResultCard key={result.id} result={cardResult} />
          })
        )}
      </div>
    </div>
  )
}
