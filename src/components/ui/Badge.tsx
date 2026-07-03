import { clsx } from 'clsx'
import type { RunStatus, TestStatus } from '@/lib/types'

type BadgeVariant = RunStatus | TestStatus | 'api' | 'ui'

const variantStyles: Record<BadgeVariant, string> = {
  passed: 'bg-green-950 text-green-400 border-green-800',
  need_fix: 'bg-amber-950 text-amber-400 border-amber-800',
  failed: 'bg-red-950 text-red-400 border-red-800',
  pending: 'bg-yellow-950 text-yellow-400 border-yellow-800',
  running: 'bg-blue-950 text-blue-400 border-blue-800',
  error: 'bg-orange-950 text-orange-400 border-orange-800',
  skipped: 'bg-gray-800 text-gray-400 border-gray-700',
  api: 'bg-purple-950 text-purple-400 border-purple-800',
  ui: 'bg-cyan-950 text-cyan-400 border-cyan-800',
}

interface BadgeProps {
  variant: BadgeVariant
  children: React.ReactNode
  className?: string
  pulse?: boolean
}

export function Badge({ variant, children, className, pulse = false }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-xs font-medium border',
        variantStyles[variant],
        className
      )}
    >
      {pulse && (
        <span className="relative flex h-1.5 w-1.5">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-current opacity-75" />
          <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-current" />
        </span>
      )}
      {children}
    </span>
  )
}
