import { useCallback, useLayoutEffect, useMemo, useRef } from 'react'
import { useSearchParams } from 'react-router'
import { DEFAULT_FILTERS, parseFilters, toApiParams, toUrlParams, type SearchFilters } from '@/lib/filters'

type FilterUpdate = Partial<SearchFilters> | ((current: SearchFilters) => SearchFilters)

interface PendingNavigation {
  /** The query string we last asked the router to navigate to. */
  requested: string
  /** URLs that are older than `requested` (still showing while the router catches up). */
  superseded: Set<string>
}

/** Search filters backed by the URL query string. */
export function useSearchFilters() {
  const [searchParams, setSearchParams] = useSearchParams()

  const filters = useMemo(() => parseFilters(searchParams), [searchParams])
  const apiParams = useMemo(() => toApiParams(filters), [filters])

  // Router navigations are async transitions, and a newer one cancels one still in
  // flight. If two edits happen close together (click a chip, then pick a price) they
  // would both build on the same stale URL and the first edit would be lost. So each
  // edit builds on the latest URL *we requested* until the router has caught up.
  const urlRef = useRef(searchParams.toString())
  const pendingRef = useRef<PendingNavigation | null>(null)

  useLayoutEffect(() => {
    const url = searchParams.toString()
    urlRef.current = url
    if (pendingRef.current?.requested === url) pendingRef.current = null
  }, [searchParams])

  const setFilters = useCallback(
    (update: FilterUpdate, { replace = false }: { replace?: boolean } = {}) => {
      const url = urlRef.current
      const pending = pendingRef.current
      const catchingUp = pending !== null && pending.superseded.has(url)
      const base = catchingUp ? pending.requested : url

      const current = parseFilters(new URLSearchParams(base))
      const next = typeof update === 'function' ? update(current) : { ...current, ...update }
      if (next.sort === 'distance' && !next.near) next.sort = 'newest'

      const params = toUrlParams(next)
      pendingRef.current = {
        requested: params.toString(),
        superseded: new Set([...(catchingUp ? pending.superseded : []), url, base]),
      }
      setSearchParams(params, { replace })
    },
    [setSearchParams],
  )

  const resetFilters = useCallback(() => setFilters(DEFAULT_FILTERS), [setFilters])

  return { filters, apiParams, setFilters, resetFilters }
}
