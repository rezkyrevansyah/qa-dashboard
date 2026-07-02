import { Card } from '@/components/ui/Card'
import type { DashboardStats } from '@/lib/types'

interface StatsGridProps {
  stats: DashboardStats
}

function StatCard({ label, value, sub }: { label: string; value: string | number; sub?: string }) {
  return (
    <Card>
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">{label}</p>
      <p className="text-3xl font-bold text-white mt-2">{value}</p>
      {sub && <p className="text-xs text-gray-600 mt-1">{sub}</p>}
    </Card>
  )
}

export function StatsGrid({ stats }: StatsGridProps) {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
      <StatCard label="Total Runs" value={stats.total_runs} />
      <StatCard
        label="Passed"
        value={stats.total_passed}
        sub={`${stats.total_runs > 0 ? Math.round((stats.total_passed / stats.total_runs) * 100) : 0}% of runs`}
      />
      <StatCard
        label="Failed"
        value={stats.total_failed}
        sub={`${stats.total_runs > 0 ? Math.round((stats.total_failed / stats.total_runs) * 100) : 0}% of runs`}
      />
      <StatCard label="Pass Rate" value={`${stats.pass_rate}%`} sub="overall" />
    </div>
  )
}
