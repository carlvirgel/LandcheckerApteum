import { ChevronDown } from 'lucide-react'
import type { SelectHTMLAttributes } from 'react'

interface SelectProps extends SelectHTMLAttributes<HTMLSelectElement> {
  label: string
  hideLabel?: boolean
}

export function Select({ label, hideLabel = true, className = '', children, ...props }: SelectProps) {
  return (
    <label className={`relative inline-flex flex-col gap-1 ${className}`}>
      <span className={hideLabel ? 'sr-only' : 'text-xs font-medium text-slate-600'}>{label}</span>
      <span className="relative">
        <select
          {...props}
          className="h-10 w-full cursor-pointer appearance-none rounded-lg border-0 bg-white pl-3 pr-8 text-sm text-slate-800 shadow-sm ring-1 ring-slate-300 hover:ring-slate-400 focus:ring-2 focus:ring-teal-600 focus:outline-none disabled:cursor-not-allowed disabled:opacity-50"
        >
          {children}
        </select>
        <ChevronDown aria-hidden className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
      </span>
    </label>
  )
}
