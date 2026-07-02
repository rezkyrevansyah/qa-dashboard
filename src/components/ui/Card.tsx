import { clsx } from 'clsx'

interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className, padding = true }: CardProps) {
  return (
    <div
      className={clsx(
        'bg-gray-900 border border-gray-800 rounded-xl',
        padding && 'p-5',
        className
      )}
    >
      {children}
    </div>
  )
}
