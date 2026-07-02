'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { RunStatusBadge } from '@/components/ui/RunStatusBadge'
import { Play, FileCode2 } from 'lucide-react'
import { toast } from 'sonner'
import type { Spec, TestRun } from '@/lib/types'

interface SpecCardProps {
  spec: Spec
  suiteId: string
  suiteName: string
  lastRun: TestRun | null
}

export function SpecCard({ spec, suiteId, suiteName, lastRun }: SpecCardProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRun() {
    setLoading(true)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          suiteId,
          specId: spec.id,
          suiteName,
          specFile: spec.name,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to trigger run')
      toast.success(`Running ${spec.name}`, { description: `Run ID: ${data.runId.slice(0, 8)}…` })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-gray-800/50 border border-gray-800 hover:border-gray-700 transition-colors">
      <FileCode2 className="w-4 h-4 text-gray-500 shrink-0" />
      <span className="flex-1 text-sm font-medium text-gray-300 font-mono">{spec.name}</span>
      {lastRun && <RunStatusBadge status={lastRun.status} />}
      <Button variant="secondary" size="sm" onClick={handleRun} loading={loading}>
        <Play className="w-3 h-3" />
        Run
      </Button>
    </div>
  )
}
