import type { RunStatus } from '@/lib/types'
import { Badge } from './Badge'

const labels: Record<RunStatus, string> = {
  pending: 'Pending',
  running: 'Running',
  passed: 'Passed',
  need_fix: 'Need Fix',
  failed: 'Failed',
  error: 'Error',
}

interface RunStatusBadgeProps {
  status: RunStatus
  className?: string
}

export function RunStatusBadge({ status, className }: RunStatusBadgeProps) {
  return (
    <Badge variant={status} pulse={status === 'running' || status === 'pending'} className={className}>
      {labels[status]}
    </Badge>
  )
}
