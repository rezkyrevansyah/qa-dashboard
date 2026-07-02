'use client'

import {
  ComposedChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import type { TrendDataPoint } from '@/lib/types'

interface TrendLineChartProps {
  data: TrendDataPoint[]
}

export function TrendLineChart({ data }: TrendLineChartProps) {
  return (
    <ResponsiveContainer width="100%" height={220}>
      <ComposedChart data={data} margin={{ top: 4, right: 4, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" vertical={false} />
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
        />
        <YAxis
          tick={{ fontSize: 11, fill: '#6b7280' }}
          tickLine={false}
          axisLine={false}
          allowDecimals={false}
        />
        <Tooltip
          contentStyle={{
            backgroundColor: '#111827',
            border: '1px solid #374151',
            borderRadius: '8px',
            fontSize: '12px',
            color: '#e5e7eb',
          }}
          cursor={{ fill: 'rgba(255,255,255,0.03)' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#9ca3af', paddingTop: '8px' }}
        />
        <Bar dataKey="passed" name="Passed" stackId="a" fill="#22c55e" radius={[0, 0, 0, 0]} maxBarSize={40} />
        <Bar dataKey="failed" name="Failed" stackId="a" fill="#ef4444" radius={[3, 3, 0, 0]} maxBarSize={40} />
      </ComposedChart>
    </ResponsiveContainer>
  )
}
