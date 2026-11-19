import { SearchX } from 'lucide-react'
import { useAuth } from '@/auth/AuthContext'
import { EmptyState, ErrorState, Spinner } from '@/components/common/states'
import { PropertyGrid, PropertyGridSkeleton } from '@/components/property/PropertyGrid'
import { FilterBar } from '@/components/search/FilterBar'
import { SavedSearchesMenu } from '@/components/search/SavedSearchesMenu'
import { useInfiniteScroll } from '@/hooks/useInfiniteScroll'
import { usePropertySearch } from '@/hooks/usePropertySearch'
import { useSearchFilters } from '@/hooks/useSearchFilters'
import { useStableCallback } from '@/hooks/useStableCallback'
import { useWatchlist, useWatchToggleHandler } from '@/hooks/useWatchlist'
import type { Property } from '@/api/types'
import { countActiveFilters, type SearchFilters } from '@/lib/filters'
import { formatNumber, PROPERTY_TYPE_LABELS } from '@/lib/format'

function suggestName(filters: SearchFilters): string {
  const parts = [
    filters.propertyTypes.map((type) => PROPERTY_TYPE_LABELS[type]).join('/') || 'Properties',
    filters.q && `in ${filters.q}`,
    filters.near && `near ${filters.near.label}`,
  ]
  return parts.filter(Boolean).join(' ').slice(0, 80)
}

export default function SearchPage() {
  const { isAuthenticated } = useAuth()
  const { filters, apiParams, setFilters, resetFilters } = useSearchFilters()
  const search = usePropertySearch(apiParams)
  const { watchedIds } = useWatchlist()
  const onToggleWatch = useWatchToggleHandler()

  const onShowNearby = useStableCallback((property: Property) => {
    setFilters((current) => ({
      ...current,
      q: '',
      sort: 'distance',
      near: {
        lat: property.latitude,
        lng: property.longitude,
        radiusKm: current.near?.radiusKm ?? 2,
        label: `${property.street_address}, ${property.suburb}`,
      },
    }))
    window.scrollTo({ top: 0, behavior: 'smooth' })
  })

  const { hasNextPage, isFetchingNextPage, isFetchNextPageError, fetchNextPage } = search
  const sentinelRef = useInfiniteScroll<HTMLDivElement>(
    () => fetchNextPage(),
    hasNextPage && !isFetchingNextPage && !isFetchNextPageError,
  )

  const showInitialError = search.isError && !isFetchNextPageError

  return (
    <div className="space-y-6">
      <FilterBar filters={filters} onChange={setFilters} onReset={resetFilters} />

      <div className="flex min-h-9 flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-600" aria-live="polite">
          {search.isPending ? (
            'Searching…'
          ) : search.totalCount !== undefined ? (
            <>
              <strong className="font-semibold text-slate-900">{formatNumber(search.totalCount)}</strong>{' '}
              {search.totalCount === 1 ? 'property' : 'properties'}
              {countActiveFilters(filters) > 0 && (search.totalCount === 1 ? ' matches your filters' : ' match your filters')}
            </>
          ) : null}
          {search.isPlaceholderData && <span className="ml-2 text-slate-400">Updating…</span>}
        </p>
        {isAuthenticated && <SavedSearchesMenu apiParams={apiParams} suggestedName={suggestName(filters)} />}
      </div>

      {search.isPending ? (
        <PropertyGridSkeleton />
      ) : showInitialError ? (
        <ErrorState title="We couldn't load properties" message={search.error.message} onRetry={() => search.refetch()} />
      ) : search.properties.length === 0 ? (
        <EmptyState
          icon={<SearchX className="size-6" />}
          title="No properties match your search"
          description="Try widening the price range, removing a property type or searching a nearby suburb."
          action={
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800"
            >
              Clear all filters
            </button>
          }
        />
      ) : (
        <>
          <PropertyGrid
            properties={search.properties}
            watchedIds={watchedIds}
            onToggleWatch={onToggleWatch}
            onShowNearby={onShowNearby}
            dimmed={search.isPlaceholderData}
          />

          <div ref={sentinelRef} data-testid="infinite-scroll-sentinel" className="flex min-h-16 items-center justify-center">
            {isFetchingNextPage ? (
              <Spinner label="Loading more properties" />
            ) : isFetchNextPageError ? (
              <ErrorState compact title="Couldn't load more" message={search.error?.message ?? ''} onRetry={() => fetchNextPage()} />
            ) : hasNextPage ? (
              <button
                type="button"
                onClick={() => fetchNextPage()}
                className="rounded-lg px-4 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
              >
                Load more
              </button>
            ) : (
              <p className="text-sm text-slate-500">You've reached the end of the results.</p>
            )}
          </div>
        </>
      )}
    </div>
  )
}
