import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase'
import { Sidebar } from '@/components/layout/Sidebar'
import { TopBar } from '@/components/layout/TopBar'
import { getLogoUrl } from '@/lib/settings'
import type { SuiteWithLastRun } from '@/lib/types'

async function getSuites(): Promise<SuiteWithLastRun[]> {
  const supabase = await createClient()

  const { data: suites } = await supabase
    .from('suites')
    .select('*')
    .order('name')

  if (!suites || suites.length === 0) return []

  const suiteIds = suites.map((s) => s.id)
  const { data: latestRuns } = await supabase
    .from('test_runs')
    .select('*')
    .in('suite_id', suiteIds)
    .order('created_at', { ascending: false })

  const lastRunBySuite: Record<string, unknown> = {}
  for (const run of latestRuns ?? []) {
    if (!lastRunBySuite[run.suite_id]) {
      lastRunBySuite[run.suite_id] = run
    }
  }

  return suites.map((suite) => ({
    ...suite,
    last_run: (lastRunBySuite[suite.id] ?? null) as SuiteWithLastRun['last_run'],
    specs: [],
  }))
}

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  const [suites, logoUrl] = await Promise.all([getSuites(), getLogoUrl()])

  return (
    <div className="flex h-screen bg-gray-950 overflow-hidden">
      <Sidebar suites={suites} logoUrl={logoUrl} />
      <div className="flex flex-col flex-1 overflow-hidden">
        <TopBar />
        <main className="flex-1 overflow-y-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
