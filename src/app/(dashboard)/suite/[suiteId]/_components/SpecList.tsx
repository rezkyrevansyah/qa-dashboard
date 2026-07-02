import { SpecCard } from './SpecCard'
import type { Spec, TestRun } from '@/lib/types'

interface SpecListProps {
  specs: Spec[]
  suiteId: string
  suiteName: string
  lastRunBySpec: Record<string, TestRun>
}

export function SpecList({ specs, suiteId, suiteName, lastRunBySpec }: SpecListProps) {
  if (specs.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-600">
        No spec files found. Push to <code className="text-gray-500">testing-pool</code> to auto-sync.
      </div>
    )
  }

  return (
    <div className="space-y-2">
      {specs.map((spec) => (
        <SpecCard
          key={spec.id}
          spec={spec}
          suiteId={suiteId}
          suiteName={suiteName}
          lastRun={lastRunBySpec[spec.id] ?? null}
        />
      ))}
    </div>
  )
}
