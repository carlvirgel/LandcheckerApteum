import { CircleCheck, Info, Tag, TrendingDown, TrendingUp, TriangleAlert, X } from 'lucide-react'
import type { ReactNode } from 'react'
import { useToast, useToasts, type ToastTone } from './ToastContext'

const TONES: Record<ToastTone, { icon: ReactNode; accent: string }> = {
  info: { icon: <Info className="size-5" />, accent: 'text-sky-600' },
  success: { icon: <CircleCheck className="size-5" />, accent: 'text-teal-600' },
  error: { icon: <TriangleAlert className="size-5" />, accent: 'text-red-600' },
  'price-down': { icon: <TrendingDown className="size-5" />, accent: 'text-emerald-600' },
  'price-up': { icon: <TrendingUp className="size-5" />, accent: 'text-amber-600' },
  sold: { icon: <Tag className="size-5" />, accent: 'text-rose-600' },
}

export function Toaster() {
  const toasts = useToasts()
  const { dismiss } = useToast()

  return (
    <div
      aria-live="polite"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex flex-col items-center gap-2 p-4 sm:items-end"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          role={toast.tone === 'error' ? 'alert' : 'status'}
          className="pointer-events-auto flex w-full max-w-sm animate-toast-in items-start gap-3 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        >
          <span aria-hidden className={TONES[toast.tone].accent}>
            {TONES[toast.tone].icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-slate-900">{toast.title}</p>
            {toast.description && <p className="mt-0.5 text-sm text-slate-600">{toast.description}</p>}
          </div>
          <button
            type="button"
            onClick={() => dismiss(toast.id)}
            className="rounded p-0.5 text-slate-400 hover:text-slate-700"
            aria-label="Dismiss notification"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  )
}
