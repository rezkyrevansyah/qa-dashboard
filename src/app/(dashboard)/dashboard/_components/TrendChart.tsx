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

export function TrendChart({ data, totalPassed, totalFailed, totalSkipped }: TrendChartProps) {
  return (
    <Card className="col-span-2">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-sm font-semibold text-gray-200">Test Runs — Last 14 Days</h2>
      </div>
      <div className="flex items-start gap-6">
        <div className="flex-1">
          <TrendLineChart data={data} />
        </div>
        <div className="flex flex-col items-center gap-3">
          <PassRateDonut passed={totalPassed} failed={totalFailed} skipped={totalSkipped} />
          <div className="space-y-1 text-xs">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-green-500" />
              <span className="text-gray-400">Passed: {totalPassed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-red-500" />
              <span className="text-gray-400">Failed: {totalFailed}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-gray-600" />
              <span className="text-gray-400">Skipped: {totalSkipped}</span>
            </div>
          </div>
        </div>
      </div>
    </Card>
  )
}
