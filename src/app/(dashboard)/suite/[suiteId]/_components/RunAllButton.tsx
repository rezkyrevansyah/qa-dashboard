'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/Button'
import { Play } from 'lucide-react'
import { toast } from 'sonner'

interface RunAllButtonProps {
  suiteId: string
  suiteName: string
}

export function RunAllButton({ suiteId, suiteName }: RunAllButtonProps) {
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  async function handleRun() {
    setLoading(true)
    try {
      const res = await fetch('/api/runs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suiteId, suiteName }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to trigger run')
      toast.success('Test run triggered', { description: `Run ID: ${data.runId.slice(0, 8)}…` })
      router.refresh()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to trigger run')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Button onClick={handleRun} loading={loading} size="md">
      <Play className="w-3.5 h-3.5" />
      Run All
    </Button>
  )
}
