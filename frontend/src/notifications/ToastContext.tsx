import { createContext, use, useCallback, useMemo, useReducer, type ReactNode } from 'react'

export type ToastTone = 'info' | 'success' | 'error' | 'price-down' | 'price-up' | 'sold'

export interface Toast {
  id: number
  tone: ToastTone
  title: string
  description?: string
}

export type NewToast = Omit<Toast, 'id'>

interface ToastActions {
  push: (toast: NewToast) => number
  dismiss: (id: number) => void
}

type Action = { type: 'push'; toast: Toast } | { type: 'dismiss'; id: number }

const MAX_VISIBLE = 4
const AUTO_DISMISS_MS = 6_000

function reducer(state: Toast[], action: Action): Toast[] {
  switch (action.type) {
    case 'push':
      return [...state, action.toast].slice(-MAX_VISIBLE)
    case 'dismiss':
      return state.filter((toast) => toast.id !== action.id)
  }
}

// Actions and state are separate contexts so components that only *raise*
// toasts never re-render when the toast list changes.
const ToastActionsContext = createContext<ToastActions | null>(null)
const ToastStateContext = createContext<Toast[]>([])

let nextId = 1

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, dispatch] = useReducer(reducer, [])

  const dismiss = useCallback((id: number) => dispatch({ type: 'dismiss', id }), [])
  const push = useCallback(
    (toast: NewToast) => {
      const id = nextId++
      dispatch({ type: 'push', toast: { ...toast, id } })
      setTimeout(() => dismiss(id), AUTO_DISMISS_MS)
      return id
    },
    [dismiss],
  )

  const actions = useMemo(() => ({ push, dismiss }), [push, dismiss])

  return (
    <ToastActionsContext value={actions}>
      <ToastStateContext value={toasts}>{children}</ToastStateContext>
    </ToastActionsContext>
  )
}

export function useToast(): ToastActions {
  const context = use(ToastActionsContext)
  if (!context) throw new Error('useToast must be used within <ToastProvider>')
  return context
}

export function useToasts(): Toast[] {
  return use(ToastStateContext)
}
