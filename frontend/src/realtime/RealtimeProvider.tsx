import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useEffect, useState, type ReactNode } from 'react'
import type { WatchlistEvent } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useToast } from '@/notifications/ToastContext'
import { applyWatchlistEvent, describePropertyChange } from './cacheUpdates'
import { createCableConsumer } from './cable'

export type ConnectionStatus = 'offline' | 'connecting' | 'connected' | 'disconnected'

const ConnectionStatusContext = createContext<ConnectionStatus>('offline')

/**
 * Holds a single ActionCable subscription to the user's WatchlistChannel while
 * signed in. Incoming events patch the React Query cache (so every view showing
 * the property updates at once) and raise a toast for watched-property changes.
 */
export function RealtimeProvider({ children }: { children: ReactNode }) {
  const { token, isAuthenticated } = useAuth()
  const queryClient = useQueryClient()
  const { push } = useToast()
  // Socket status is tracked per token, so a new session starts as "connecting"
  // without resetting state inside the effect.
  const [socket, setSocket] = useState<{ token: string | null; status: ConnectionStatus }>({ token: null, status: 'offline' })
  const active = isAuthenticated && token !== null
  const status: ConnectionStatus = !active ? 'offline' : socket.token === token ? socket.status : 'connecting'

  const handleEvent = useStableCallback((event: WatchlistEvent) => {
    applyWatchlistEvent(queryClient, event)
    const toast = describePropertyChange(event)
    if (toast) push(toast)
  })

  useEffect(() => {
    if (!active || !token) return

    const report = (next: ConnectionStatus) => () => setSocket({ token, status: next })
    const consumer = createCableConsumer(token)
    const subscription = consumer.subscriptions.create(
      { channel: 'WatchlistChannel' },
      {
        connected: report('connected'),
        disconnected: report('disconnected'),
        rejected: report('disconnected'),
        received: (event: WatchlistEvent) => handleEvent(event),
      },
    )

    return () => {
      subscription.unsubscribe()
      consumer.disconnect()
    }
  }, [active, token, handleEvent])

  return <ConnectionStatusContext value={status}>{children}</ConnectionStatusContext>
}

export function useConnectionStatus(): ConnectionStatus {
  return use(ConnectionStatusContext)
}
