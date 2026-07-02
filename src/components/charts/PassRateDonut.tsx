'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface PassRateDonutProps {
  passed: number
  failed: number
  skipped: number
}

export function PassRateDonut({ passed, failed, skipped }: PassRateDonutProps) {
  const total = passed + failed + skipped
  const rate = total === 0 ? 0 : Math.round((passed / total) * 100)

  const data = [
    { name: 'Passed', value: passed, color: '#22c55e' },
    { name: 'Failed', value: failed, color: '#ef4444' },
    { name: 'Skipped', value: skipped, color: '#4b5563' },
  ].filter((d) => d.value > 0)

  if (total === 0) {
    data.push({ name: 'No data', value: 1, color: '#1f2937' })
  }

  return (
    <div className="relative flex items-center justify-center">
      <ResponsiveContainer width={140} height={140}>
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={48}
            outerRadius={64}
            dataKey="value"
            strokeWidth={0}
          >
            {data.map((entry, index) => (
              <Cell key={index} fill={entry.color} />
            ))}
          </Pie>
        </PieChart>
      </ResponsiveContainer>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-2xl font-bold text-white">{rate}%</span>
        <span className="text-xs text-gray-500">pass rate</span>
      </div>
    </div>
  )
}
