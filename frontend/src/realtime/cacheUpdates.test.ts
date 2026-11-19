import { QueryClient, type InfiniteData } from '@tanstack/react-query'
import type { PropertyPage, WatchlistItem } from '@/api/types'
import { queryKeys } from '@/lib/queryClient'
import { buildPage, buildProperty, buildWatchlistItem } from '@/test/fixtures'
import { applyWatchlistEvent, describePropertyChange, patchPropertyInPages } from './cacheUpdates'

const infinite = (...pages: PropertyPage[]): InfiniteData<PropertyPage, string | null> => ({
  pages,
  pageParams: pages.map((_, index) => (index === 0 ? null : `cursor-${index}`)),
})

describe('patchPropertyInPages', () => {
  it('replaces the property and keeps untouched pages and items referentially equal', () => {
    const a = buildProperty()
    const b = buildProperty({ price: 800_000, distance_km: 1.2 })
    const c = buildProperty()
    const data = infinite(buildPage([a]), buildPage([b, c]))

    const patched = patchPropertyInPages(data, { ...b, distance_km: undefined, price: 750_000 } as never)!

    expect(patched).not.toBe(data)
    expect(patched.pages[0]).toBe(data.pages[0])
    expect(patched.pages[1].data[1]).toBe(c)
    expect(patched.pages[1].data[0]).toMatchObject({ id: b.id, price: 750_000 })
  })

  it('returns the same object when the property is not cached', () => {
    const data = infinite(buildPage([buildProperty()]))
    expect(patchPropertyInPages(data, buildProperty())).toBe(data)
  })
})

describe('applyWatchlistEvent', () => {
  it('updates the property in every search cache and in the watchlist', () => {
    const queryClient = new QueryClient()
    const property = buildProperty({ price: 1_000_000 })
    const searchA = queryKeys.properties({ q: 'richmond' })
    const searchB = queryKeys.properties({ property_types: 'house' })
    queryClient.setQueryData(searchA, infinite(buildPage([property])))
    queryClient.setQueryData(searchB, infinite(buildPage([buildProperty(), property])))
    queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, [buildWatchlistItem(property)])

    const updated = { ...property, price: 900_000, status: 'under_offer' as const }
    applyWatchlistEvent(queryClient, { type: 'property.updated', property: updated, changes: { price: [1_000_000, 900_000] } })

    const pageA = queryClient.getQueryData<InfiniteData<PropertyPage>>(searchA)!
    const pageB = queryClient.getQueryData<InfiniteData<PropertyPage>>(searchB)!
    expect(pageA.pages[0].data[0].price).toBe(900_000)
    expect(pageB.pages[0].data[1].status).toBe('under_offer')
    expect(queryClient.getQueryData<WatchlistItem[]>(queryKeys.watchlist)![0].property.price).toBe(900_000)
  })

  it('syncs watchlist membership pushed from other tabs', () => {
    const queryClient = new QueryClient()
    const property = buildProperty()
    queryClient.setQueryData<WatchlistItem[]>(queryKeys.watchlist, [])

    const item = buildWatchlistItem(property)
    applyWatchlistEvent(queryClient, { type: 'watchlist.added', property_id: property.id, item })
    applyWatchlistEvent(queryClient, { type: 'watchlist.added', property_id: property.id, item })
    expect(queryClient.getQueryData(queryKeys.watchlist)).toEqual([item])

    applyWatchlistEvent(queryClient, { type: 'watchlist.removed', property_id: property.id })
    expect(queryClient.getQueryData(queryKeys.watchlist)).toEqual([])
  })
})

describe('describePropertyChange', () => {
  const property = buildProperty({ street_address: '12 Swan St', suburb: 'Richmond' })

  it('describes price drops and rises', () => {
    expect(describePropertyChange({ type: 'property.updated', property, changes: { price: [1_000_000, 950_000] } })).toEqual({
      tone: 'price-down',
      title: 'Price drop',
      description: '12 Swan St, Richmond is now $950,000 (was $1,000,000).',
    })
    expect(describePropertyChange({ type: 'property.updated', property, changes: { price: [900_000, 950_000] } })?.title).toBe(
      'Price increase',
    )
  })

  it('prioritises status changes', () => {
    const toast = describePropertyChange({
      type: 'property.updated',
      property,
      changes: { status: ['active', 'sold'], price: [1, 2] },
    })
    expect(toast).toMatchObject({ tone: 'sold', title: 'Sold' })
  })

  it('ignores membership events', () => {
    expect(describePropertyChange({ type: 'watchlist.removed', property_id: 1 })).toBeNull()
  })
})
