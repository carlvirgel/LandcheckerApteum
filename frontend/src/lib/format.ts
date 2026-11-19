import type { ListingStatus, PropertyType } from '@/api/types'

const currency = new Intl.NumberFormat('en-AU', { style: 'currency', currency: 'AUD', maximumFractionDigits: 0 })
const number = new Intl.NumberFormat('en-AU')

export function formatPrice(value: number): string {
  return currency.format(value)
}

/** $850k, $1.25M — used where space is tight (select options, chips). */
export function formatPriceShort(value: number): string {
  if (value >= 1_000_000) return `$${Number((value / 1_000_000).toFixed(2))}M`
  if (value >= 1_000) return `$${Math.round(value / 1_000)}k`
  return `$${value}`
}

export function formatNumber(value: number): string {
  return number.format(value)
}

export const PROPERTY_TYPE_LABELS: Record<PropertyType, string> = {
  house: 'House',
  apartment: 'Apartment',
  townhouse: 'Townhouse',
  unit: 'Unit',
  villa: 'Villa',
  land: 'Land',
}

export const STATUS_LABELS: Record<ListingStatus, string> = {
  active: 'For sale',
  under_offer: 'Under offer',
  sold: 'Sold',
  withdrawn: 'Withdrawn',
}

const relative = new Intl.RelativeTimeFormat('en-AU', { numeric: 'auto' })
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', 365 * 24 * 3600],
  ['month', 30 * 24 * 3600],
  ['week', 7 * 24 * 3600],
  ['day', 24 * 3600],
  ['hour', 3600],
  ['minute', 60],
]

export function formatRelativeTime(iso: string, now: number = Date.now()): string {
  const seconds = (new Date(iso).getTime() - now) / 1000
  for (const [unit, size] of UNITS) {
    if (Math.abs(seconds) >= size) return relative.format(Math.round(seconds / size), unit)
  }
  return 'just now'
}
