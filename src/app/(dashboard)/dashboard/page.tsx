import { createClient } from '@/lib/supabase'
import { StatsGrid } from './_components/StatsGrid'
import { TrendChart } from './_components/TrendChart'
import { RecentRunsTable } from './_components/RecentRunsTable'
import { format, subDays } from 'date-fns'
import type { DashboardStats, TrendDataPoint } from '@/lib/types'

async function getDashboardData() {
  const supabase = await createClient()

  // All-time stats from test_runs
  const { data: runs } = await supabase
    .from('test_runs')
    .select('*, suite:suites(*)')
    .order('created_at', { ascending: false })
    .limit(100)

  const allRuns = runs ?? []
  const totalRuns = allRuns.length
  const totalPassed = allRuns.filter((r) => r.status === 'passed').length
  const totalNeedFix = allRuns.filter((r) => r.status === 'need_fix').length
  const totalFailed = allRuns.filter((r) => r.status === 'failed').length
  const passRate = totalRuns === 0 ? 0 : Math.round((totalPassed / totalRuns) * 100)

  const stats: DashboardStats = { total_runs: totalRuns, total_passed: totalPassed, total_need_fix: totalNeedFix, total_failed: totalFailed, pass_rate: passRate }

  // Trend data: last 30 days (client slices to 7/14/30 based on period selection)
  const today = new Date()
  const trendData: TrendDataPoint[] = Array.from({ length: 30 }, (_, i) => {
    const date = subDays(today, 29 - i)
    const dateStr = format(date, 'MMM d')
    const fullDate = format(date, 'd MMM yyyy')
    const dayStr = format(date, 'yyyy-MM-dd')
    const dayRuns = allRuns.filter((r) => r.created_at.startsWith(dayStr))
    return {
      date: dateStr,
      fullDate,
      passed: dayRuns.reduce((sum, r) => sum + (r.passed_tests ?? 0), 0),
      failed: dayRuns.reduce((sum, r) => sum + (r.failed_tests ?? 0), 0),
      skipped: dayRuns.reduce((sum, r) => sum + (r.skipped_tests ?? 0), 0),
    }
  })

  // Recent 20 runs with suite info
  const recentRuns = allRuns.slice(0, 20)

  return { stats, trendData, recentRuns }
}

export default async function DashboardPage() {
  const { stats, trendData, recentRuns } = await getDashboardData()

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-white">Overview</h1>
        <p className="text-sm text-gray-500 mt-0.5">All test suites summary</p>
      </div>

      <StatsGrid stats={stats} />

      <div className="grid grid-cols-2 gap-4">
        <TrendChart data={trendData} />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <RecentRunsTable runs={recentRuns as Parameters<typeof RecentRunsTable>[0]['runs']} />
      </div>
    </div>
  )
}
