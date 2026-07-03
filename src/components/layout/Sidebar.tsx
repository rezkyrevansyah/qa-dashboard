'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, RefreshCw, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { SidebarSuiteItem } from './SidebarSuiteItem'
import type { SuiteWithLastRun } from '@/lib/types'
import { createClient } from '../../../utils/supabase/client'

interface SidebarProps {
  suites: SuiteWithLastRun[]
}

export function Sidebar({ suites }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const isDashboard = pathname === '/dashboard'
  const [syncing, setSyncing] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)

  async function handleSync() {
    setSyncing(true)

    // Unsubscribe from any previous sync job channel
    if (channelRef.current) {
      const supabase = createClient()
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }

    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        let msg = `Sync failed (${res.status})`
        try { msg = JSON.parse(text).error ?? msg } catch { /* ignore */ }
        throw new Error(msg)
      }
      const data = await res.json()

      toast.info('Sync dimulai', {
        description: 'GitHub Actions sedang scan folder cypress/e2e/ ...',
      })

      // Subscribe to this specific sync job via Supabase Realtime
      const supabase = createClient()
      const channel = supabase
        .channel(`sync-job-${data.syncJobId}`)
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'sync_jobs',
            filter: `id=eq.${data.syncJobId}`,
          },
          (payload) => {
            const status = payload.new?.status as string
            const suitesCount = payload.new?.suites_upserted as number | null
            const specsCount = payload.new?.specs_upserted as number | null
            const errorMsg = payload.new?.error_message as string | null

            if (status === 'done') {
              toast.success('Sync selesai', {
                description: `${suitesCount ?? 0} suite, ${specsCount ?? 0} spec terdaftar.`,
              })
              router.refresh()
              setSyncing(false)
              supabase.removeChannel(channel)
              channelRef.current = null
            } else if (status === 'error') {
              toast.error('Sync gagal', {
                description: errorMsg ?? 'Cek GitHub Actions logs untuk detail.',
              })
              setSyncing(false)
              supabase.removeChannel(channel)
              channelRef.current = null
            }
          }
        )
        .subscribe()

      channelRef.current = channel

      // Fallback: stop spinner after 5 minutes regardless
      setTimeout(() => {
        if (syncing) {
          setSyncing(false)
          if (channelRef.current) {
            supabase.removeChannel(channelRef.current)
            channelRef.current = null
          }
        }
      }, 5 * 60 * 1000)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
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
              title={syncing ? 'Sync sedang berjalan...' : 'Sync suites from testing-pool'}
              className="text-gray-600 hover:text-gray-300 disabled:opacity-40 transition-colors"
            >
              <RefreshCw className={clsx('w-3.5 h-3.5', syncing && 'animate-spin')} />
            </button>
          </div>

          {/* Sync in-progress banner */}
          {syncing && (
            <div className="mx-3 mb-2 flex items-center gap-1.5 px-2 py-1.5 rounded-md bg-blue-950/50 border border-blue-800/40">
              <RefreshCw className="w-3 h-3 text-blue-400 animate-spin shrink-0" />
              <span className="text-xs text-blue-300">Sync berjalan...</span>
            </div>
          )}

          <div className="space-y-0.5">
            {suites.length === 0 ? (
              <div className="px-3 py-2 space-y-2">
                <p className="text-xs text-gray-600">No suites synced yet.</p>
                <button
                  onClick={handleSync}
                  disabled={syncing}
                  className="text-xs text-blue-400 hover:text-blue-300 disabled:opacity-40 flex items-center gap-1.5"
                >
                  {syncing
                    ? <><RefreshCw className="w-3 h-3 animate-spin" /> Syncing…</>
                    : <><CheckCircle className="w-3 h-3" /> Sync now</>
                  }
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
