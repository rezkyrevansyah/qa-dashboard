'use client'

import { useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '../../../../../../utils/supabase/client'
import type { RunStatus } from '@/lib/types'

interface RunStatusPollerProps {
  suiteId: string
  activeRunIds: string[]
}

const TERMINAL_STATUSES: RunStatus[] = ['passed', 'failed', 'error']

export function RunStatusPoller({ suiteId, activeRunIds }: RunStatusPollerProps) {
  const router = useRouter()
  const pollingRef = useRef<NodeJS.Timeout | null>(null)

  useEffect(() => {
    if (activeRunIds.length === 0) return

    const supabase = createClient()

    // Supabase Realtime subscription
    const channel = supabase
      .channel(`suite-runs-${suiteId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'test_runs',
          filter: `suite_id=eq.${suiteId}`,
        },
        (payload) => {
          const status = payload.new?.status as RunStatus
          if (TERMINAL_STATUSES.includes(status)) {
            router.refresh()
          }
        }
      )
      .subscribe()

    // Fallback polling every 5s
    pollingRef.current = setInterval(async () => {
      for (const runId of activeRunIds) {
        const res = await fetch(`/api/runs/${runId}`)
        if (res.ok) {
          const run = await res.json()
          if (TERMINAL_STATUSES.includes(run.status as RunStatus)) {
            router.refresh()
            break
          }
        }
      }
    }, 5000)

    return () => {
      supabase.removeChannel(channel)
      if (pollingRef.current) clearInterval(pollingRef.current)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [suiteId, JSON.stringify(activeRunIds)])

  return null
}
