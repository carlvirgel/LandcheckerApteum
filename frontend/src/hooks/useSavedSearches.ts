import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { savedSearchesApi } from '@/api/endpoints'
import type { SavedSearch, SearchParamsRecord } from '@/api/types'
import { useAuth } from '@/auth/AuthContext'
import { queryKeys } from '@/lib/queryClient'
import { useToast } from '@/notifications/ToastContext'

export function useSavedSearches() {
  const { isAuthenticated } = useAuth()
  return useQuery({
    queryKey: queryKeys.savedSearches,
    queryFn: ({ signal }) => savedSearchesApi.list(signal).then((response) => response.data),
    enabled: isAuthenticated,
    staleTime: 5 * 60_000,
  })
}

export function useCreateSavedSearch() {
  const queryClient = useQueryClient()
  const { push } = useToast()

  return useMutation({
    mutationFn: ({ name, filters }: { name: string; filters: SearchParamsRecord }) => savedSearchesApi.create(name, filters),
    onSuccess: ({ data }) => {
      queryClient.setQueryData<SavedSearch[]>(queryKeys.savedSearches, (searches = []) => [data, ...searches])
      push({ tone: 'success', title: 'Search saved', description: `“${data.name}” is in your saved searches.` })
    },
  })
}

export function useDeleteSavedSearch() {
  const queryClient = useQueryClient()
  const { push } = useToast()

  return useMutation({
    mutationFn: (id: number) => savedSearchesApi.remove(id),
    onSuccess: (_, id) => {
      queryClient.setQueryData<SavedSearch[]>(queryKeys.savedSearches, (searches) => searches?.filter((search) => search.id !== id))
    },
    onError: (error) => push({ tone: 'error', title: "Couldn't delete saved search", description: error.message }),
  })
}
