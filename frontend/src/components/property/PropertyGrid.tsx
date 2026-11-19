import type { Property } from '@/api/types'
import { PropertyCard, type PropertyCardProps } from './PropertyCard'

interface PropertyGridProps {
  properties: Property[]
  watchedIds: ReadonlySet<number>
  onToggleWatch: PropertyCardProps['onToggleWatch']
  onShowNearby?: PropertyCardProps['onShowNearby']
  priceAtSave?: ReadonlyMap<number, number>
  dimmed?: boolean
}

export const GRID_CLASSES = 'grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'

export function PropertyGrid({ properties, watchedIds, onToggleWatch, onShowNearby, priceAtSave, dimmed }: PropertyGridProps) {
  return (
    <div className={`${GRID_CLASSES} transition-opacity ${dimmed ? 'opacity-60' : ''}`} aria-busy={dimmed || undefined}>
      {properties.map((property) => (
        <PropertyCard
          key={property.id}
          property={property}
          isWatched={watchedIds.has(property.id)}
          onToggleWatch={onToggleWatch}
          onShowNearby={onShowNearby}
          priceAtSave={priceAtSave?.get(property.id)}
        />
      ))}
    </div>
  )
}

export function PropertyGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className={GRID_CLASSES} aria-hidden data-testid="grid-skeleton">
      {Array.from({ length: count }, (_, index) => (
        <div key={index} className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
          <div className="aspect-16/10 animate-pulse bg-slate-200" />
          <div className="space-y-3 p-4">
            <div className="h-6 w-1/2 animate-pulse rounded bg-slate-200" />
            <div className="h-4 w-3/4 animate-pulse rounded bg-slate-100" />
            <div className="h-4 w-2/3 animate-pulse rounded bg-slate-100" />
          </div>
        </div>
      ))}
    </div>
  )
}
