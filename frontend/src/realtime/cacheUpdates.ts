import type { InfiniteData, QueryClient } from '@tanstack/react-query'
import type { Property, PropertyPage, WatchlistEvent, WatchlistItem } from '@/api/types'
import { formatPrice, STATUS_LABELS } from '@/lib/format'
import { queryKeys } from '@/lib/queryClient'
import type { NewToast } from '@/notifications/ToastContext'

/**
 * Replaces one property inside cached infinite-search data. Pages and items that
 * don't contain it keep their identity, so memoised cards for everything else
 * skip re-rendering.
 */
export function patchPropertyInPages(
  data: InfiniteData<PropertyPage, string | null> | undefined,
  property: Property,
): InfiniteData<PropertyPage, string | null> | undefined {
  if (!data) return data

  let changed = false
  const pages = data.pages.map((page) => {
    const index = page.data.findIndex((item) => item.id === property.id)
    if (index === -1) return page

    changed = true
    const items = page.data.slice()
    // keep request-specific fields such as distance_km
    items[index] = { ...items[index], ...property }
    return { ...page, data: items }
  })

  return changed ? { ...data, pages } : data
}

export function upsertWatchlistItem(items: WatchlistItem[] | undefined, item: WatchlistItem): WatchlistItem[] | undefined {
  if (!items) return items
  return items.some((existing) => existing.property_id === item.property_id) ? items : [item, ...items]
}

export function removeWatchlistItem(items: WatchlistItem[] | undefined, propertyId: number): WatchlistItem[] | undefined {
  if (!items) return items
  const next = items.filter((item) => item.property_id !== propertyId)
  return next.length === items.length ? items : next
}

/** Applies a server push to every cached view of the data. */
export function applyWatchlistEvent(queryClient: QueryClient, event: WatchlistEvent) {
  switch (event.type) {
    case 'property.updated': {
      const { property } = event
      queryClient.setQueriesData<InfiniteData<PropertyPage, string | null>>({ queryKey: queryKeys.propertiesRoot }, (data) =>
        patchPropertyInPages(data, property),
      )
      queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, (items) =>
        items?.map((item) => (item.property_id === property.id ? { ...item, property: { ...item.property, ...property } } : item)),
      )
      break
    }
    case 'watchlist.added':
      queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, (items) => upsertWatchlistItem(items, event.item))
      break
    case 'watchlist.removed':
      queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, (items) => removeWatchlistItem(items, event.property_id))
      break
  }
}

/** A human-friendly notification for a watched property's change (or null). */
export function describePropertyChange(event: WatchlistEvent): NewToast | null {
  if (event.type !== 'property.updated') return null

  const { property, changes } = event
  const where = `${property.street_address}, ${property.suburb}`

  if (changes.status) {
    const [, to] = changes.status
    if (to === 'sold') return { tone: 'sold', title: 'Sold', description: `${where} has sold.` }
    if (to === 'active') return { tone: 'info', title: 'Back on the market', description: `${where} is for sale again.` }
    return { tone: 'info', title: STATUS_LABELS[to], description: `${where} is now ${STATUS_LABELS[to].toLowerCase()}.` }
  }

  if (changes.price) {
    const [from, to] = changes.price
    const dropped = to < from
    return {
      tone: dropped ? 'price-down' : 'price-up',
      title: dropped ? 'Price drop' : 'Price increase',
      description: `${where} is now ${formatPrice(to)} (was ${formatPrice(from)}).`,
    }
  }

  return null
}
