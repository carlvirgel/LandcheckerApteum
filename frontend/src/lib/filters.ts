import { PROPERTY_TYPES, type PropertyType, type SearchParamsRecord } from '@/api/types'

/**
 * Search filters live in the page URL (shareable, survive reloads, back button works).
 * This module is the single place that converts between the URL, the typed filter
 * object the UI works with, and the params the API expects.
 */

export type StatusFilter = 'available' | 'sold' | 'all'
export type SortOption = 'newest' | 'price_asc' | 'price_desc' | 'distance'

export interface NearFilter {
  lat: number
  lng: number
  radiusKm: number
  label: string
}

export interface SearchFilters {
  q: string
  minPrice: number | null
  maxPrice: number | null
  minBedrooms: number | null
  maxBedrooms: number | null
  propertyTypes: PropertyType[]
  status: StatusFilter
  sort: SortOption
  near: NearFilter | null
}

export const DEFAULT_FILTERS: SearchFilters = {
  q: '',
  minPrice: null,
  maxPrice: null,
  minBedrooms: null,
  maxBedrooms: null,
  propertyTypes: [],
  status: 'available',
  sort: 'newest',
  near: null,
}

export const SORT_OPTIONS: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Newest' },
  { value: 'price_asc', label: 'Price (low to high)' },
  { value: 'price_desc', label: 'Price (high to low)' },
  { value: 'distance', label: 'Distance' },
]

export const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'available', label: 'For sale' },
  { value: 'sold', label: 'Sold' },
  { value: 'all', label: 'All listings' },
]

export const PRICE_STEPS = [
  200_000, 300_000, 400_000, 500_000, 600_000, 700_000, 800_000, 900_000, 1_000_000, 1_250_000, 1_500_000,
  1_750_000, 2_000_000, 2_500_000, 3_000_000, 4_000_000, 5_000_000,
]

export const BEDROOM_STEPS = [1, 2, 3, 4, 5]
export const RADIUS_STEPS_KM = [1, 2, 5, 10, 20]

const SORT_VALUES = new Set<string>(SORT_OPTIONS.map((option) => option.value))
const API_STATUSES: Record<StatusFilter, string | undefined> = {
  available: undefined, // API default: active + under_offer
  sold: 'sold',
  all: 'active,under_offer,sold',
}

function toWholeNumber(value: string | null, max = Number.MAX_SAFE_INTEGER): number | null {
  if (value === null || value.trim() === '' || !/^\d+$/.test(value.trim())) return null
  const number = Number(value)
  return number <= max ? number : null
}

function toCoordinate(value: string | null, limit: number): number | null {
  if (value === null || value.trim() === '') return null
  const number = Number(value)
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null
}

function parseStatus(value: string | null): StatusFilter {
  if (!value) return 'available'
  if (value === 'all') return 'all'
  const statuses = new Set(value.split(','))
  if (statuses.has('sold') && statuses.has('active')) return 'all'
  return statuses.has('sold') ? 'sold' : 'available'
}

/** Lenient parser: anything invalid in the URL silently falls back to the default. */
export function parseFilters(params: URLSearchParams): SearchFilters {
  const propertyTypes = (params.get('property_types') ?? '')
    .split(',')
    .filter((type): type is PropertyType => (PROPERTY_TYPES as readonly string[]).includes(type))

  const lat = toCoordinate(params.get('lat'), 90)
  const lng = toCoordinate(params.get('lng'), 180)
  const radiusKm = toCoordinate(params.get('radius_km'), 50)
  const near =
    lat !== null && lng !== null && radiusKm !== null && radiusKm > 0
      ? { lat, lng, radiusKm, label: params.get('near_label') ?? 'selected location' }
      : null

  let sort = (params.get('sort') ?? (near ? 'distance' : 'newest')) as SortOption
  if (!SORT_VALUES.has(sort) || (sort === 'distance' && !near)) sort = near ? 'distance' : 'newest'

  let minPrice = toWholeNumber(params.get('min_price'))
  let maxPrice = toWholeNumber(params.get('max_price'))
  if (minPrice !== null && maxPrice !== null && minPrice > maxPrice) [minPrice, maxPrice] = [maxPrice, minPrice]

  let minBedrooms = toWholeNumber(params.get('min_bedrooms'), 20)
  let maxBedrooms = toWholeNumber(params.get('max_bedrooms'), 20)
  if (minBedrooms !== null && maxBedrooms !== null && minBedrooms > maxBedrooms)
    [minBedrooms, maxBedrooms] = [maxBedrooms, minBedrooms]

  return {
    q: (params.get('q') ?? '').slice(0, 100),
    minPrice,
    maxPrice,
    minBedrooms,
    maxBedrooms,
    propertyTypes: [...new Set(propertyTypes)],
    status: parseStatus(params.get('status')),
    sort,
    near,
  }
}

/** Params sent to GET /api/v1/properties (also what saved searches store). */
export function toApiParams(filters: SearchFilters): SearchParamsRecord {
  const params: SearchParamsRecord = {}
  const q = filters.q.trim()
  if (q) params.q = q
  if (filters.minPrice !== null) params.min_price = String(filters.minPrice)
  if (filters.maxPrice !== null) params.max_price = String(filters.maxPrice)
  if (filters.minBedrooms !== null) params.min_bedrooms = String(filters.minBedrooms)
  if (filters.maxBedrooms !== null) params.max_bedrooms = String(filters.maxBedrooms)
  if (filters.propertyTypes.length) params.property_types = [...filters.propertyTypes].sort().join(',')
  const status = API_STATUSES[filters.status]
  if (status) params.status = status
  if (filters.near) {
    params.lat = String(filters.near.lat)
    params.lng = String(filters.near.lng)
    params.radius_km = String(filters.near.radiusKm)
  }
  if (filters.sort !== (filters.near ? 'distance' : 'newest')) params.sort = filters.sort
  return params
}

/** Params for the page URL: API params plus UI-only state, with friendlier values. */
export function toUrlParams(filters: SearchFilters): URLSearchParams {
  const params = new URLSearchParams(toApiParams(filters))
  if (filters.status === 'all') params.set('status', 'all')
  if (filters.near) params.set('near_label', filters.near.label)
  return params
}

export function countActiveFilters(filters: SearchFilters): number {
  return [
    filters.q.trim() !== '',
    filters.minPrice !== null || filters.maxPrice !== null,
    filters.minBedrooms !== null || filters.maxBedrooms !== null,
    filters.propertyTypes.length > 0,
    filters.status !== 'available',
    filters.near !== null,
  ].filter(Boolean).length
}

/** Turns stored saved-search filters back into a page URL query string. */
export function savedFiltersToUrl(filters: Record<string, string | number | string[]>): string {
  const params = new URLSearchParams()
  Object.entries(filters).forEach(([key, value]) => {
    params.set(key, Array.isArray(value) ? value.join(',') : String(value))
  })
  return toUrlParams(parseFilters(params)).toString()
}
