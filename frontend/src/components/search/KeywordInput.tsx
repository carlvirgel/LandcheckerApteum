import { Search, X } from 'lucide-react'
import { useEffect, useId, useState } from 'react'
import { useDebouncedValue } from '@/hooks/useDebouncedValue'

interface KeywordInputProps {
  value: string
  onChange: (value: string) => void
  debounceMs?: number
}

/** Free-text address/suburb/postcode search; commits after the user stops typing. */
export function KeywordInput({ value, onChange, debounceMs = 350 }: KeywordInputProps) {
  const id = useId()
  const [draft, setDraft] = useState(value)
  const [syncedValue, setSyncedValue] = useState(value)

  // The URL changed from elsewhere (reset, saved search, back button): adopt it
  if (value !== syncedValue) {
    setSyncedValue(value)
    setDraft(value)
  }

  const debounced = useDebouncedValue(draft, debounceMs)
  useEffect(() => {
    // Only commit once typing has settled (debounced caught up with the draft)
    if (debounced === draft && debounced.trim() !== value.trim()) onChange(debounced)
  }, [debounced, draft, value, onChange])

  return (
    <form
      role="search"
      className="relative flex-1"
      onSubmit={(event) => {
        event.preventDefault()
        if (draft.trim() !== value.trim()) onChange(draft)
      }}
    >
      <label htmlFor={id} className="sr-only">
        Search by address, suburb or postcode
      </label>
      <Search aria-hidden className="pointer-events-none absolute left-3.5 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
      <input
        id={id}
        type="search"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        placeholder="Search by address, suburb or postcode"
        autoComplete="off"
        maxLength={100}
        className="h-12 w-full rounded-xl border-0 bg-white pl-11 pr-10 text-base shadow-sm ring-1 ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-teal-600 focus:outline-none [&::-webkit-search-cancel-button]:hidden"
      />
      {draft && (
        <button
          type="button"
          onClick={() => {
            setDraft('')
            onChange('')
          }}
          className="absolute right-3 top-1/2 -translate-y-1/2 rounded p-1 text-slate-400 hover:text-slate-700"
          aria-label="Clear search"
        >
          <X className="size-4" />
        </button>
      )}
    </form>
  )
}
