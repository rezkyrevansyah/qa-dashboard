'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { clsx } from 'clsx'
import { FolderOpen, Folder } from 'lucide-react'
import type { SuiteWithLastRun } from '@/lib/types'

interface SidebarSuiteItemProps {
  suite: SuiteWithLastRun
}

const statusDot: Record<string, string> = {
  passed: 'bg-green-400',
  need_fix: 'bg-amber-400',
  failed: 'bg-red-400',
  running: 'bg-blue-400 animate-pulse',
  pending: 'bg-yellow-400 animate-pulse',
  error: 'bg-orange-400',
}

export function SidebarSuiteItem({ suite }: SidebarSuiteItemProps) {
  const pathname = usePathname()
  const isActive = pathname === `/suite/${suite.id}`
  const dotColor = suite.last_run ? statusDot[suite.last_run.status] : 'bg-gray-600'

  return (
    <Link
      href={`/suite/${suite.id}`}
      className={clsx(
        'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-colors group',
        isActive
          ? 'bg-blue-600/20 text-blue-300 border border-blue-600/30'
          : 'text-gray-400 hover:text-gray-200 hover:bg-gray-800'
      )}
    >
      {isActive ? (
        <FolderOpen className="w-4 h-4 shrink-0 text-blue-400" />
      ) : (
        <Folder className="w-4 h-4 shrink-0" />
      )}
      <span className="flex-1 truncate font-medium">{suite.name}</span>
      <span className={clsx('w-2 h-2 rounded-full shrink-0', dotColor)} />
    </Link>
  )
}
