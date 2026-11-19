import { LoaderCircle, RotateCcw, TriangleAlert } from 'lucide-react'
import type { ReactNode } from 'react'

export function Spinner({ label = 'Loading', className = '' }: { label?: string; className?: string }) {
  return (
    <span role="status" className={`inline-flex items-center gap-2 text-sm text-slate-500 ${className}`}>
      <LoaderCircle aria-hidden className="size-4 animate-spin" />
      {label}
    </span>
  )
}

interface ErrorStateProps {
  title?: string
  message: string
  onRetry?: () => void
  compact?: boolean
}

export function ErrorState({ title = 'Something went wrong', message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <div
      role="alert"
      className={`flex flex-col items-center gap-3 rounded-xl border border-red-200 bg-red-50 text-center text-red-900 ${compact ? 'p-4' : 'px-6 py-12'}`}
    >
      <TriangleAlert aria-hidden className="size-6 text-red-500" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 text-sm text-red-800">{message}</p>
      </div>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm font-medium text-red-900 shadow-sm ring-1 ring-red-200 hover:bg-red-100"
        >
          <RotateCcw aria-hidden className="size-4" /> Try again
        </button>
      )}
    </div>
  )
}

interface EmptyStateProps {
  icon: ReactNode
  title: string
  description: string
  action?: ReactNode
}

export function EmptyState({ icon, title, description, action }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-slate-300 bg-white px-6 py-16 text-center">
      <div className="rounded-full bg-slate-100 p-3 text-slate-500">{icon}</div>
      <div>
        <p className="font-semibold text-slate-900">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-slate-600">{description}</p>
      </div>
      {action}
    </div>
  )
}
