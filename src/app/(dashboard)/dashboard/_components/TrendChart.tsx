'use client'

import { useState } from 'react'
import { ChevronDown } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { PassRateDonut } from '@/components/charts/PassRateDonut'
import type { TrendDataPoint } from '@/lib/types'

interface TrendChartProps {
  data: TrendDataPoint[]
}

const PERIODS = [
  { label: '1 Minggu', value: 7 },
  { label: '14 Hari', value: 14 },
  { label: '30 Hari', value: 30 },
] as const

type Period = 7 | 14 | 30

export function TrendChart({ data }: TrendChartProps) {
  const [period, setPeriod] = useState<Period>(7)

  const sliced = data.slice(data.length - period)
  const periodTotals = sliced.reduce(
    (totals, item) => ({
      passed: totals.passed + item.passed,
      failed: totals.failed + item.failed,
      skipped: totals.skipped + item.skipped,
    }),
    { passed: 0, failed: 0, skipped: 0 }
  )
  const rangeLabel = sliced.length > 0
    ? `${sliced[0].fullDate} – ${sliced[sliced.length - 1].fullDate}`
    : ''
  const periodLabel = PERIODS.find((p) => p.value === period)?.label ?? ''

  return (
    <Card className="col-span-2">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-gray-200">
            Test Runs — {periodLabel}
          </h2>
          {rangeLabel && (
            <p className="text-xs text-gray-500 mt-0.5">{rangeLabel}</p>
          )}
        </div>
        <div className="relative">
          <select
            value={period}
            onChange={(e) => setPeriod(Number(e.target.value) as Period)}
            className="h-9 appearance-none rounded-lg border border-gray-700 bg-gray-800 pl-3 pr-9 text-xs font-medium text-gray-200 outline-none transition-colors hover:border-gray-600 focus:border-gray-500 cursor-pointer"
          >
            {PERIODS.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <ChevronDown
            size={15}
            aria-hidden="true"
            className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-400"
          />
        </div>
      </div>
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <TrendLineChart data={sliced} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <PassRateDonut
            passed={periodTotals.passed}
            failed={periodTotals.failed}
            skipped={periodTotals.skipped}
          />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-gray-400">Passed: {periodTotals.passed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-gray-400">Failed: {periodTotals.failed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-600 shrink-0" />
              <span className="text-gray-400">Skipped: {periodTotals.skipped}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
