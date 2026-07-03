'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/Card'
import { TrendLineChart } from '@/components/charts/TrendLineChart'
import { PassRateDonut } from '@/components/charts/PassRateDonut'
import type { TrendDataPoint } from '@/lib/types'

interface TrendChartProps {
  data: TrendDataPoint[]
  totalPassed: number
  totalFailed: number
  totalSkipped: number
}

const PERIODS = [
  { label: '1 Minggu', value: 7 },
  { label: '14 Hari', value: 14 },
  { label: '30 Hari', value: 30 },
] as const

type Period = 7 | 14 | 30

export function TrendChart({ data, totalPassed, totalFailed, totalSkipped }: TrendChartProps) {
  const [period, setPeriod] = useState<Period>(7)

  const sliced = data.slice(data.length - period)
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
        <select
          value={period}
          onChange={(e) => setPeriod(Number(e.target.value) as Period)}
          className="text-xs bg-gray-800 border border-gray-700 text-gray-300 rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-gray-500 cursor-pointer transition-colors hover:border-gray-600"
        >
          {PERIODS.map((p) => (
            <option key={p.value} value={p.value}>{p.label}</option>
          ))}
        </select>
      </div>
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <TrendLineChart data={sliced} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <PassRateDonut passed={totalPassed} failed={totalFailed} skipped={totalSkipped} />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500 shrink-0" />
              <span className="text-gray-400">Passed: {totalPassed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500 shrink-0" />
              <span className="text-gray-400">Failed: {totalFailed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-600 shrink-0" />
              <span className="text-gray-400">Skipped: {totalSkipped}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
