import { MapPin, RotateCcw, X } from 'lucide-react'
import { memo } from 'react'
import {
  BEDROOM_STEPS,
  countActiveFilters,
  PRICE_STEPS,
  RADIUS_STEPS_KM,
  SORT_OPTIONS,
  STATUS_OPTIONS,
  type SearchFilters,
  type SortOption,
  type StatusFilter,
} from '@/lib/filters'
import { formatPriceShort } from '@/lib/format'
import { KeywordInput } from './KeywordInput'
import { PropertyTypeFilter } from './PropertyTypeFilter'
import { RangeFilter } from './RangeFilter'
import { Select } from './Select'

export type FilterChange = (update: Partial<SearchFilters>, options?: { replace?: boolean }) => void

interface FilterBarProps {
  filters: SearchFilters
  onChange: FilterChange
  onReset: () => void
}

const formatBeds = (value: number) => `${value} bed${value === 1 ? '' : 's'}`

export const FilterBar = memo(function FilterBar({ filters, onChange, onReset }: FilterBarProps) {
  const activeCount = countActiveFilters(filters)

  return (
    <section aria-label="Search filters" className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row">
        <KeywordInput value={filters.q} onChange={(q) => onChange({ q }, { replace: true })} />
        <Select
          label="Sort by"
          value={filters.sort}
          onChange={(event) => onChange({ sort: event.target.value as SortOption })}
          className="sm:w-52 [&_select]:h-12 [&_select]:rounded-xl"
        >
          {SORT_OPTIONS.map((option) => (
            <option key={option.value} value={option.value} disabled={option.value === 'distance' && !filters.near}>
              {`Sort: ${option.label}`}
            </option>
          ))}
        </Select>
      </div>

      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <RangeFilter
          label="Price"
          min={filters.minPrice}
          max={filters.maxPrice}
          steps={PRICE_STEPS}
          format={formatPriceShort}
          onChange={({ min, max }) => onChange({ minPrice: min, maxPrice: max })}
        />
        <RangeFilter
          label="Beds"
          min={filters.minBedrooms}
          max={filters.maxBedrooms}
          steps={BEDROOM_STEPS}
          format={formatBeds}
          onChange={({ min, max }) => onChange({ minBedrooms: min, maxBedrooms: max })}
        />
        <Select
          label="Listing status"
          value={filters.status}
          onChange={(event) => onChange({ status: event.target.value as StatusFilter })}
          className="w-36"
        >
          {STATUS_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
        <PropertyTypeFilter selected={filters.propertyTypes} onChange={(propertyTypes) => onChange({ propertyTypes })} />

        {activeCount > 0 && (
          <button
            type="button"
            onClick={onReset}
            className="inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-sm font-medium text-slate-600 hover:bg-slate-200/60 hover:text-slate-900"
          >
            <RotateCcw aria-hidden className="size-3.5" /> Reset filters ({activeCount})
          </button>
        )}
      </div>

      {filters.near && (
        <div className="flex flex-wrap items-center gap-2 rounded-xl bg-teal-50 px-3 py-2 text-sm text-teal-900 ring-1 ring-teal-200">
          <MapPin aria-hidden className="size-4 text-teal-700" />
          <span>Within</span>
          <Select
            label="Search radius"
            value={filters.near.radiusKm}
            onChange={(event) =>
              filters.near && onChange({ near: { ...filters.near, radiusKm: Number(event.target.value) } })
            }
            className="[&_select]:h-8 [&_select]:bg-white"
          >
            {RADIUS_STEPS_KM.map((km) => (
              <option key={km} value={km}>
                {km} km
              </option>
            ))}
          </Select>
          <span>
            of <strong className="font-semibold">{filters.near.label}</strong>
          </span>
          <button
            type="button"
            onClick={() => onChange({ near: null, sort: 'newest' })}
            className="ml-auto rounded p-1 text-teal-800 hover:bg-teal-100"
            aria-label="Clear location filter"
          >
            <X className="size-4" />
          </button>
        </div>
      )}
    </section>
  )
})
