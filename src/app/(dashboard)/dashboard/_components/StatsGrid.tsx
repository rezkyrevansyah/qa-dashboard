import { Card } from '@/components/ui/Card'
import type { DashboardStats } from '@/lib/types'

interface StatsGridProps {
  stats: DashboardStats
}

function StatCard({
  label,
  value,
  sub,
  valueColor,
}: {
  label: string
  value: string | number
  sub?: string
  valueColor?: string
}) {
  return (
    <Card>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className={`text-3xl font-bold mt-2 ${valueColor ?? 'text-white'}`}>{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </Card>
  )
}

export function StatsGrid({ stats }: StatsGridProps) {
  const pct = (n: number) =>
    stats.total_runs > 0 ? Math.round((n / stats.total_runs) * 100) : 0

  return (
    <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
      <StatCard label="Total Runs" value={stats.total_runs} />
      <StatCard
        label="Passed"
        value={stats.total_passed}
        sub={`${pct(stats.total_passed)}% of runs`}
        valueColor="text-green-400"
      />
      <StatCard
        label="Need Fix"
        value={stats.total_need_fix}
        sub={`${pct(stats.total_need_fix)}% of runs`}
        valueColor="text-amber-400"
      />
      <StatCard
        label="Failed"
        value={stats.total_failed}
        sub={`${pct(stats.total_failed)}% of runs`}
        valueColor="text-red-400"
      />
      <StatCard label="Pass Rate" value={`${stats.pass_rate}%`} sub="overall" />
    </div>
  )
}
