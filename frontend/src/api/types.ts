export const PROPERTY_TYPES = ['house', 'apartment', 'townhouse', 'unit', 'villa', 'land'] as const
export type PropertyType = (typeof PROPERTY_TYPES)[number]

export type ListingStatus = 'active' | 'under_offer' | 'sold' | 'withdrawn'

export interface Agency {
  id: number
  name: string
  phone: string | null
}

export interface Property {
  id: number
  title: string
  street_address: string
  suburb: string
  state: string
  postcode: string
  full_address: string
  latitude: number
  longitude: number
  property_type: PropertyType
  status: ListingStatus
  price: number
  bedrooms: number
  bathrooms: number
  car_spaces: number
  land_size_sqm: number | null
  image_url: string | null
  listed_at: string
  updated_at: string
  agency: Agency
  distance_km?: number
  description?: string
}

export interface PageMeta {
  next_cursor?: string
  has_more: boolean
  total_count?: number
  limit: number
}

export interface PropertyPage {
  data: Property[]
  meta: PageMeta
}

export interface WatchlistItem {
  property_id: number
  price_at_save: number
  saved_at: string
  property: Property
}

export interface User {
  id: number
  email: string
  name: string
  role: 'user' | 'admin'
}

export interface Session {
  token: string
  user: User
}

/** Filters exactly as the API (and the page URL) understands them. */
export type SearchParamsRecord = Record<string, string>

export interface SavedSearch {
  id: number
  name: string
  filters: Record<string, string | number | string[]>
  created_at: string
}

/** Messages pushed over the WatchlistChannel */
export type WatchlistEvent =
  | {
      type: 'property.updated'
      property: Property
      changes: Partial<{ price: [number, number]; status: [ListingStatus, ListingStatus] }>
    }
  | { type: 'watchlist.added'; property_id: number; item: WatchlistItem }
  | { type: 'watchlist.removed'; property_id: number }
