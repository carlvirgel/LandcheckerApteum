import type { Property, PropertyPage, User, WatchlistItem } from '@/api/types'

let nextId = 1

export function buildProperty(overrides: Partial<Property> = {}): Property {
  const id = overrides.id ?? nextId++
  return {
    id,
    title: 'Renovated 3-bedroom house',
    street_address: `${id} Smith St`,
    suburb: 'Richmond',
    state: 'VIC',
    postcode: '3121',
    full_address: `${id} Smith St, Richmond VIC 3121`,
    latitude: -37.823,
    longitude: 144.998,
    property_type: 'house',
    status: 'active',
    price: 1_000_000,
    bedrooms: 3,
    bathrooms: 2,
    car_spaces: 1,
    land_size_sqm: 400,
    image_url: null,
    listed_at: '2026-11-01T12:00:00+11:00',
    updated_at: '2026-11-01T12:00:00+11:00',
    agency: { id: 1, name: 'Northside Realty', phone: '03 9555 0102' },
    ...overrides,
  }
}

export function buildPage(data: Property[], meta: Partial<PropertyPage['meta']> = {}): PropertyPage {
  return { data, meta: { has_more: false, limit: 24, total_count: data.length, ...meta } }
}

export function buildWatchlistItem(property: Property, overrides: Partial<WatchlistItem> = {}): WatchlistItem {
  return { property_id: property.id, price_at_save: property.price, saved_at: '2026-11-10T10:00:00+11:00', property, ...overrides }
}

export const demoUser: User = { id: 7, email: 'demo@example.com', name: 'Demo User', role: 'user' }
