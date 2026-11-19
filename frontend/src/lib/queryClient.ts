import { QueryClient } from '@tanstack/react-query'
import { ApiError } from '@/api/client'
import type { SearchParamsRecord } from '@/api/types'

export const queryKeys = {
  propertiesRoot: ['properties'] as const,
  properties: (params: SearchParamsRecord) => ['properties', params] as const,
  watchlist: ['watchlist'] as const,
  savedSearches: ['saved-searches'] as const,
}

export function createQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Real-time pushes keep watched data fresh; refetching every list on focus isn't worth it.
        refetchOnWindowFocus: false,
        // Client errors (4xx) won't fix themselves; retry only network/5xx failures.
        retry: (failureCount, error) =>
          !(error instanceof ApiError && error.status >= 400 && error.status < 500) && failureCount < 2,
      },
    },
  })
}
