import { Bookmark, BookmarkPlus, Trash2 } from 'lucide-react'
import { useId, useState, type FormEvent } from 'react'
import { Link } from 'react-router'
import type { SearchParamsRecord } from '@/api/types'
import { Spinner } from '@/components/common/states'
import { usePopover } from '@/hooks/usePopover'
import { useCreateSavedSearch, useDeleteSavedSearch, useSavedSearches } from '@/hooks/useSavedSearches'
import { savedFiltersToUrl } from '@/lib/filters'

interface SavedSearchesMenuProps {
  apiParams: SearchParamsRecord
  suggestedName: string
}

/** "Save this search" + a list of the user's saved searches. Signed-in users only. */
export function SavedSearchesMenu({ apiParams, suggestedName }: SavedSearchesMenuProps) {
  const { open, setOpen, ref } = usePopover<HTMLDivElement>()
  const savedSearches = useSavedSearches()
  const createSearch = useCreateSavedSearch()
  const deleteSearch = useDeleteSavedSearch()
  const [name, setName] = useState('')
  const inputId = useId()

  const submit = (event: FormEvent) => {
    event.preventDefault()
    createSearch.mutate(
      { name: name.trim() || suggestedName, filters: apiParams },
      { onSuccess: () => setName('') },
    )
  }

  const createError = createSearch.error?.message

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        aria-expanded={open}
        className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-white px-3 text-sm font-medium text-slate-700 shadow-sm ring-1 ring-slate-300 hover:ring-slate-400"
      >
        <Bookmark aria-hidden className="size-4" /> Saved searches
        {savedSearches.data && savedSearches.data.length > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 text-xs text-slate-600">{savedSearches.data.length}</span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 z-20 mt-2 w-80 rounded-xl bg-white p-3 shadow-xl ring-1 ring-slate-200">
          <form onSubmit={submit} className="space-y-2 border-b border-slate-100 pb-3">
            <label htmlFor={inputId} className="text-xs font-semibold uppercase tracking-wide text-slate-500">
              Save current search
            </label>
            <div className="flex gap-2">
              <input
                id={inputId}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder={suggestedName}
                maxLength={80}
                className="h-9 min-w-0 flex-1 rounded-lg border-0 px-2.5 text-sm ring-1 ring-slate-300 focus:ring-2 focus:ring-teal-600 focus:outline-none"
              />
              <button
                type="submit"
                disabled={createSearch.isPending}
                className="inline-flex h-9 items-center gap-1 rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800 disabled:opacity-60"
              >
                <BookmarkPlus aria-hidden className="size-4" /> Save
              </button>
            </div>
            {createError && <p className="text-xs text-red-700">{createError}</p>}
          </form>

          <div className="pt-2">
            {savedSearches.isPending ? (
              <Spinner className="p-2" />
            ) : savedSearches.isError ? (
              <p className="p-2 text-sm text-red-700">Couldn't load saved searches.</p>
            ) : savedSearches.data.length === 0 ? (
              <p className="p-2 text-sm text-slate-500">No saved searches yet.</p>
            ) : (
              <ul className="max-h-72 space-y-0.5 overflow-y-auto">
                {savedSearches.data.map((search) => (
                  <li key={search.id} className="group flex items-center gap-1">
                    <Link
                      to={{ pathname: '/', search: savedFiltersToUrl(search.filters) }}
                      onClick={() => setOpen(false)}
                      className="min-w-0 flex-1 truncate rounded-md px-2 py-1.5 text-sm text-slate-800 hover:bg-slate-100"
                    >
                      {search.name}
                    </Link>
                    <button
                      type="button"
                      onClick={() => deleteSearch.mutate(search.id)}
                      className="rounded-md p-1.5 text-slate-400 opacity-0 hover:bg-red-50 hover:text-red-600 focus:opacity-100 group-hover:opacity-100"
                      aria-label={`Delete saved search ${search.name}`}
                    >
                      <Trash2 className="size-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
