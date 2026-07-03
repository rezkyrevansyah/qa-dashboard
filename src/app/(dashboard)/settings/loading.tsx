import { Skeleton } from '@/components/ui/Skeleton'

export default function SettingsLoading() {
  return (
    <div className="max-w-2xl space-y-8">
      <div>
        <Skeleton className="h-7 w-24" />
        <Skeleton className="h-4 w-56 mt-1.5" />
      </div>
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-6 space-y-4">
        <Skeleton className="h-4 w-32" />
        <div className="flex items-start gap-6">
          <Skeleton className="w-20 h-20 rounded-xl shrink-0" />
          <div className="space-y-2">
            <Skeleton className="h-4 w-48" />
            <Skeleton className="h-3 w-36" />
            <Skeleton className="h-8 w-28 rounded-lg" />
          </div>
        </div>
      </div>
    </div>
  )
}
