import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { watchlistApi } from '@/api/endpoints'
import type { Property, WatchlistItem } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { queryKeys } from '@/lib/queryClient'
import { useToast } from '@/notifications/ToastContext'
import { removeWatchlistItem, upsertWatchlistItem } from '@/realtime/cacheUpdates'
import { useStableCallback } from './useStableCallback'

const EMPTY: WatchlistItem[] = []

export function useWatchlist() {
  const { isAuthenticated } = useAuth()

  const query = useQuery({
    queryKey: queryKeys.watchlist,
    queryFn: ({ signal }) => watchlistApi.list(signal).then((response) => response.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000, // kept fresh by WebSocket pushes
  })

  const items = query.data ?? EMPTY
  const watchedIds = useMemo(() => new Set(items.map((item) => item.property_id)), [items])

  return { ...query, items, watchedIds }
}

interface ToggleVariables {
  property: Property
  watched: boolean
}

/**
 * Optimistically adds/removes a property. All watchlist mutations share a scope,
 * so rapid double-clicks are sent to the server in order rather than racing.
 */
export function useToggleWatch() {
  const queryClient = useQueryClient()
  const { push } = useToast()

  return useMutation({
    mutationFn: async ({ property, watched }: ToggleVariables): Promise<WatchlistItem | undefined> => {
      if (watched) {
        await watchlistApi.remove(property.id)
        return undefined
      }
      return (await watchlistApi.add(property.id)).data
    },
    scope: { id: 'watchlist' },
    onMutate: async ({ property, watched }) => {
      await queryClient.cancelQueries({ queryKey: queryKeys.watchlist })
      const previous = queryClient.getQueryData<WatchlistItem[]>(queryKeys.watchlist)

      queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, (items = []) =>
        watched
          ? removeWatchlistItem(items, property.id)
          : upsertWatchlistItem(items, {
              property_id: property.id,
              price_at_save: property.price,
              saved_at: new Date().toISOString(),
              property,
            }),
      )
      return { previous }
    },
    onSuccess: (item) => {
      // Swap the optimistic entry for the server's (authoritative price_at_save / saved_at)
      if (item) {
        queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, (items) =>
          items?.map((existing) => (existing.property_id === item.property_id ? item : existing)),
        )
      }
    },
    onError: (error, { watched }, context) => {
      queryClient.setQueryData(queryKeys.watchlist, context?.previous)
      push({
        tone: 'error',
        title: watched ? "Couldn't remove from watchlist" : "Couldn't add to watchlist",
        description: error.message,
      })
    },
  })
}

/**
 * A stable `(property, watched) => void` handler for property cards. Anonymous
 * users are sent to sign in and returned to the page they were on.
 */
export function useWatchToggleHandler() {
  const { isAuthenticated } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const { push } = useToast()
  const { mutate } = useToggleWatch()

  return useStableCallback((property: Property, watched: boolean) => {
    if (!isAuthenticated) {
      push({ tone: 'info', title: 'Sign in to save properties', description: 'Your watchlist follows you across devices.' })
      navigate('/login', { state: { from: location } })
      return
    }
    mutate({ property, watched })
  })
}
