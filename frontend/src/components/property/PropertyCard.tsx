import { Bath, BedDouble, Car, LandPlot, MapPin, TrendingDown, TrendingUp } from 'lucide-react'
import { memo, useState } from 'react'
import type { Property } from '@/api/types'
import { formatNumber, formatPrice, formatRelativeTime, PROPERTY_TYPE_LABELS } from '@/lib/format'
import { PropertyMedia } from './PropertyMedia'
import { WatchButton } from './WatchButton'

export interface PropertyCardProps {
  property: Property
  isWatched: boolean
  onToggleWatch: (property: Property, watched: boolean) => void
  onShowNearby?: (property: Property) => void
  /** Watchlist view: price when the user saved it, to show the movement since. */
  priceAtSave?: number
}

/**
 * Returns a counter that increments whenever `key` changes after mount, using the
 * "adjust state while rendering" pattern rather than an effect. Used to replay a
 * highlight animation when a live update changes the price or status.
 */
function useChangeCounter(key: string) {
  const [previousKey, setPreviousKey] = useState(key)
  const [count, setCount] = useState(0)
  if (key !== previousKey) {
    setPreviousKey(key)
    setCount((value) => value + 1)
  }
  return count
}

function Feature({ icon: Icon, label, value }: { icon: typeof BedDouble; label: string; value: string | number }) {
  return (
    <li className="flex items-center gap-1.5" title={label}>
      <Icon aria-hidden className="size-4 text-slate-400" />
      <span className="font-medium text-slate-700">{value}</span>
      <span className="sr-only">{label}</span>
    </li>
  )
}

function PriceMovement({ from, to }: { from: number; to: number }) {
  if (from === to) return <p className="text-xs text-slate-500">No price change since you saved it</p>
  const dropped = to < from
  const Icon = dropped ? TrendingDown : TrendingUp
  return (
    <p className={`flex items-center gap-1 text-xs font-medium ${dropped ? 'text-emerald-700' : 'text-amber-700'}`}>
      <Icon aria-hidden className="size-3.5" />
      {dropped ? 'Down' : 'Up'} {formatPrice(Math.abs(to - from))} since you saved it
    </p>
  )
}

/**
 * Memoised: in a long infinite list only the card whose props actually changed
 * (watch toggled, live price update) re-renders. Callers must pass stable handlers.
 */
export const PropertyCard = memo(function PropertyCard({
  property,
  isWatched,
  onToggleWatch,
  onShowNearby,
  priceAtSave,
}: PropertyCardProps) {
  const changeCount = useChangeCounter(`${property.price}|${property.status}`)
  const isLand = property.property_type === 'land'

  return (
    <article
      aria-label={property.full_address}
      className="card-offscreen-skip group flex flex-col overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 transition hover:shadow-md"
    >
      <PropertyMedia property={property}>
        <WatchButton
          watched={isWatched}
          address={property.street_address}
          onClick={() => onToggleWatch(property, isWatched)}
        />
      </PropertyMedia>

      <div className="flex flex-1 flex-col gap-3 p-4">
        <div key={changeCount} className={`-mx-1 rounded-md px-1 ${changeCount ? 'animate-flash' : ''}`}>
          <p className="text-xl font-bold tracking-tight text-slate-900">{formatPrice(property.price)}</p>
          {priceAtSave !== undefined && <PriceMovement from={priceAtSave} to={property.price} />}
        </div>

        <div>
          <h3 className="truncate font-semibold text-slate-900">{property.street_address}</h3>
          <p className="truncate text-sm text-slate-600">
            {property.suburb} {property.state} {property.postcode}
          </p>
        </div>

        <ul className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
          {!isLand && <Feature icon={BedDouble} label="Bedrooms" value={property.bedrooms} />}
          {!isLand && <Feature icon={Bath} label="Bathrooms" value={property.bathrooms} />}
          {!isLand && <Feature icon={Car} label="Car spaces" value={property.car_spaces} />}
          {property.land_size_sqm && (
            <Feature icon={LandPlot} label="Land size" value={`${formatNumber(property.land_size_sqm)} m²`} />
          )}
        </ul>

        <div className="mt-auto flex items-end justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
          <div className="min-w-0">
            <p>
              <span className="font-medium text-slate-700">{PROPERTY_TYPE_LABELS[property.property_type]}</span> · Listed{' '}
              {formatRelativeTime(property.listed_at)}
            </p>
            <p className="truncate">{property.agency.name}</p>
          </div>
          {onShowNearby && (
            <button
              type="button"
              onClick={() => onShowNearby(property)}
              className="inline-flex shrink-0 items-center gap-1 rounded-md px-2 py-1 font-medium text-teal-700 hover:bg-teal-50"
            >
              <MapPin aria-hidden className="size-3.5" /> Nearby
            </button>
          )}
        </div>
      </div>
    </article>
  )
})
