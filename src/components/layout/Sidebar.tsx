'use client'

import { useState, useRef, useCallback } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { clsx } from 'clsx'
import { LayoutDashboard, RefreshCw, CheckCircle, FileText } from 'lucide-react'
import Image from 'next/image'
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
  const isReports = pathname === '/reports'
  const [syncing, setSyncing] = useState(false)
  const channelRef = useRef<ReturnType<ReturnType<typeof createClient>['channel']> | null>(null)
  const pollRef = useRef<NodeJS.Timeout | null>(null)
  const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null)

  const stopSync = useCallback((supabase: ReturnType<typeof createClient>) => {
    if (channelRef.current) {
      supabase.removeChannel(channelRef.current)
      channelRef.current = null
    }
    if (pollRef.current) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
    setSyncing(false)
  }, [])

  async function handleSync() {
    setSyncing(true)

    // Clean up any previous subscription/polling
    if (supabaseRef.current) stopSync(supabaseRef.current)

    let syncJobId: string
    try {
      const res = await fetch('/api/sync', { method: 'POST' })
      if (!res.ok) {
        const text = await res.text()
        let msg = `Sync failed (${res.status})`
        try { msg = JSON.parse(text).error ?? msg } catch { /* ignore */ }
        throw new Error(msg)
      }
      const data = await res.json()
      syncJobId = data.syncJobId

      toast.info('Sync dimulai', {
        description: 'GitHub Actions sedang scan folder cypress/e2e/ ...',
      })
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Sync failed')
      setSyncing(false)
      return
    }

    const supabase = createClient()
    supabaseRef.current = supabase

    function handleSyncResult(status: string, suitesCount: number | null, specsCount: number | null, errorMsg: string | null) {
      if (status === 'done') {
        toast.success('Sync selesai', {
          description: `${suitesCount ?? 0} suite, ${specsCount ?? 0} spec terdaftar.`,
        })
        router.refresh()
        stopSync(supabase)
      } else if (status === 'error') {
        toast.error('Sync gagal', {
          description: errorMsg ?? 'Cek GitHub Actions logs untuk detail.',
        })
        stopSync(supabase)
      }
    }

    // 1. Realtime subscription (primary)
    const channel = supabase
      .channel(`sync-job-${syncJobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'sync_jobs',
          filter: `id=eq.${syncJobId}`,
        },
        (payload) => {
          handleSyncResult(
            payload.new?.status,
            payload.new?.suites_upserted ?? null,
            payload.new?.specs_upserted ?? null,
            payload.new?.error_message ?? null,
          )
        }
      )
      .subscribe()

    channelRef.current = channel

    // 2. Fallback polling every 5s (in case Realtime misses the update)
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/sync/${syncJobId}`)
        if (!res.ok) return
        const job = await res.json()
        if (job.status === 'done' || job.status === 'error') {
          handleSyncResult(job.status, job.suites_upserted, job.specs_upserted, job.error_message)
        }
      } catch {
        // network error — keep polling
      }
    }, 5000)
  }

  return (
    <aside className="w-60 shrink-0 bg-gray-950 border-r border-gray-800 flex flex-col h-full">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-4 py-4 border-b border-gray-800">
        <div className="flex items-center justify-center w-8 h-8 bg-white rounded-lg shrink-0">
          <Image src="/logo_baznas.png" alt="BAZNAS" width={24} height={24} className="object-contain" />
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

        {/* Reports link */}
        <Link
          href="/reports"
          className={clsx(
            'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors',
            isReports
              ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
              : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
          )}
        >
          <FileText className="w-4 h-4 shrink-0" />
          <span className="font-medium">Reports</span>
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
