import { keepPreviousData, useInfiniteQuery } from '@tanstack/react-query'
import { useMemo } from 'react'
import { propertiesApi } from '@/api/endpoints'
import type { SearchParamsRecord } from '@/api/types'
import { queryKeys } from '@/lib/queryClient'

/** Cursor-paginated search; each filter combination is cached separately. */
export function usePropertySearch(params: SearchParamsRecord) {
  const query = useInfiniteQuery({
    queryKey: queryKeys.properties(params),
    queryFn: ({ pageParam, signal }) => propertiesApi.search(params, pageParam, signal),
    initialPageParam: null as string | null,
    getNextPageParam: (lastPage) => lastPage.meta.next_cursor ?? null,
    // Keep showing the previous results while a new filter combination loads
    placeholderData: keepPreviousData,
  })

  const properties = useMemo(() => query.data?.pages.flatMap((page) => page.data) ?? [], [query.data])
  const totalCount = query.data?.pages[0]?.meta.total_count

  return { ...query, properties, totalCount }
}
