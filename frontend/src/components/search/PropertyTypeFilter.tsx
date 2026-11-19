import { Check } from 'lucide-react'
import { PROPERTY_TYPES, type PropertyType } from '@/api/types'
import { PROPERTY_TYPE_LABELS } from '@/lib/format'

interface PropertyTypeFilterProps {
  selected: PropertyType[]
  onChange: (types: PropertyType[]) => void
}

export function PropertyTypeFilter({ selected, onChange }: PropertyTypeFilterProps) {
  const toggle = (type: PropertyType) =>
    onChange(selected.includes(type) ? selected.filter((value) => value !== type) : [...selected, type])

  return (
    <div role="group" aria-label="Property type" className="flex flex-wrap gap-1.5">
      {PROPERTY_TYPES.map((type) => {
        const active = selected.includes(type)
        return (
          <button
            key={type}
            type="button"
            aria-pressed={active}
            onClick={() => toggle(type)}
            className={`inline-flex h-8 items-center gap-1 rounded-full px-3 text-sm font-medium ring-1 transition ${
              active
                ? 'bg-teal-700 text-white ring-teal-700 hover:bg-teal-800'
                : 'bg-white text-slate-700 ring-slate-300 hover:ring-slate-400'
            }`}
          >
            {active && <Check aria-hidden className="size-3.5" />}
            {PROPERTY_TYPE_LABELS[type]}
          </button>
        )
      })}
    </div>
  )
}
