import { Select } from './Select'

interface RangeFilterProps {
  label: string
  min: number | null
  max: number | null
  steps: number[]
  format: (value: number) => string
  onChange: (range: { min: number | null; max: number | null }) => void
}

const parse = (value: string) => (value === '' ? null : Number(value))

/** A min/max pair of selects; each side only offers values that keep the range valid. */
export function RangeFilter({ label, min, max, steps, format, onChange }: RangeFilterProps) {
  return (
    <fieldset className="flex items-center gap-1.5">
      <legend className="sr-only">{label}</legend>
      <Select
        label={`Minimum ${label.toLowerCase()}`}
        value={min ?? ''}
        onChange={(event) => onChange({ min: parse(event.target.value), max })}
        className="w-[7.5rem]"
      >
        <option value="">{`${label}: any`}</option>
        {steps
          .filter((step) => max === null || step <= max)
          .map((step) => (
            <option key={step} value={step}>
              {`${format(step)}+`}
            </option>
          ))}
      </Select>
      <span aria-hidden className="text-slate-400">
        –
      </span>
      <Select
        label={`Maximum ${label.toLowerCase()}`}
        value={max ?? ''}
        onChange={(event) => onChange({ min, max: parse(event.target.value) })}
        className="w-[7.5rem]"
      >
        <option value="">No max</option>
        {steps
          .filter((step) => min === null || step >= min)
          .map((step) => (
            <option key={step} value={step}>
              {format(step)}
            </option>
          ))}
      </Select>
    </fieldset>
  )
}
