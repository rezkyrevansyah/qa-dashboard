'use client'

import { useState } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { SidebarSuiteItem } from './SidebarSuiteItem'
import type { SuiteWithLastRun } from '@/lib/types'

interface SidebarProps {
  suites: SuiteWithLastRun[]
}

export function Sidebar({ suites }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard = pathname === '/dashboard'
  const [syncing, setSyncing] = useState(false)

  async function handleSync() {
    setSyncing(true)
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Sync failed')
      toast.success('Sync triggered', {
        description: 'GitHub Actions sedang scan folder cypress/e2e/ — refresh dalam ~30 detik.',
      })
      // Refresh sidebar after 30s to show newly synced suites
      setTimeout(() => router.refresh(), 30000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
    } finally {
      setSyncing(false)
    }
  }

  return (
    <aside className="w-60 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 bg-blue-600 rounded-lg">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <span className="font-bold text-white text-sm tracking-wide">QA Dashboard</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {/* Dashboard link */}
        <Link
          href="/dashboard"
          className={clsx(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            isDashboard
              ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          )}
        >
          <LayoutDashboard className="w-4 h-4 shrink-0" />
          <span className="font-medium">Overview</span>
        </Link>

        {/* Suites section */}
        <div className="pt-4">
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider">
              Test Suites
            </p>
            <button
              onClick={handleSync}
              disabled={syncing}
              title="Sync suites from testing-pool"
              className="text-gray-600 hover:text-gray-300 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', syncing && 'animate-spin')} />
            </button>
          </div>
          <div className="space-y-0.5">
            {suites.length === 0 ? (
              <div className="px-3 py-2 space-y-2">
                <p className="text-xs text-gray-600">No suites synced yet.</p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 flex items-center gap-1.5"
                >
                  <RefreshCw className={clsx('w-3 h-3', syncing && 'animate-spin')} />
                  {syncing ? 'Syncing…' : 'Sync now'}
                </button>
              </div>
            ) : (
              suites.map((suite) => (
                <SidebarSuiteItem key={suite.id} suite={suite} />
              ))
            )}
          </div>
        </div>
      </nav>
    </aside>
  )
}
