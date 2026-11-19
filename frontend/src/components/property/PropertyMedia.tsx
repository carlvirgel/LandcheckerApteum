import { Building, Building2, House, LandPlot, Trees, Warehouse, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'
import type { Property, PropertyType } from '@/api/types'
import { STATUS_LABELS } from '@/lib/format'

const TYPE_ART: Record<PropertyType, { icon: LucideIcon; gradient: string }> = {
  house: { icon: House, gradient: 'from-teal-100 via-emerald-50 to-teal-200 text-teal-700/70' },
  apartment: { icon: Building2, gradient: 'from-sky-100 via-indigo-50 to-sky-200 text-sky-700/70' },
  townhouse: { icon: Warehouse, gradient: 'from-amber-100 via-orange-50 to-amber-200 text-amber-700/70' },
  unit: { icon: Building, gradient: 'from-violet-100 via-fuchsia-50 to-violet-200 text-violet-700/70' },
  villa: { icon: Trees, gradient: 'from-lime-100 via-green-50 to-lime-200 text-lime-700/70' },
  land: { icon: LandPlot, gradient: 'from-stone-100 via-yellow-50 to-stone-200 text-stone-600/70' },
}

const STATUS_BADGE: Partial<Record<Property['status'], string>> = {
  under_offer: 'bg-amber-500 text-white',
  sold: 'bg-rose-600 text-white',
  withdrawn: 'bg-slate-600 text-white',
}

function formatDistance(km: number): string {
  if (km < 0.01) return 'Same location'
  return km < 1 ? `${Math.round(km * 1000)} m away` : `${km.toFixed(1)} km away`
}

export function PropertyMedia({ property, children }: { property: Property; children?: ReactNode }) {
  const art = TYPE_ART[property.property_type]
  const Icon = art.icon
  const badge = STATUS_BADGE[property.status]

  return (
    <div className="relative aspect-16/10 overflow-hidden bg-slate-100">
      {property.image_url ? (
        <img
          src={property.image_url}
          alt=""
          loading="lazy"
          decoding="async"
          className="size-full object-cover transition duration-300 group-hover:scale-[1.03]"
        />
      ) : (
        <div aria-hidden className={`flex size-full items-center justify-center bg-linear-to-br ${art.gradient}`}>
          <Icon strokeWidth={1.25} className="size-16 transition duration-300 group-hover:scale-110" />
        </div>
      )}

      <div className="absolute left-3 top-3 flex flex-wrap gap-1.5">
        {badge && (
          <span className={`rounded-md px-2 py-0.5 text-xs font-semibold uppercase tracking-wide ${badge}`}>
            {STATUS_LABELS[property.status]}
          </span>
        )}
        {property.distance_km !== undefined && (
          <span className="rounded-md bg-white/90 px-2 py-0.5 text-xs font-medium text-slate-700 shadow-sm">
            {formatDistance(property.distance_km)}
          </span>
        )}
      </div>

      {children}
    </div>
  )
}
