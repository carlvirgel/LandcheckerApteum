import { apiRequest } from './client'
import type { Property, PropertyPage, SavedSearch, SearchParamsRecord, Session, User, WatchlistItem } from './types'

export const authApi = {
  login: (email: string, password: string) =>
    apiRequest<Session>('/auth/login', { method: 'POST', body: { email, password } }),
  signup: (name: string, email: string, password: string) =>
    apiRequest<Session>('/auth/signup', { method: 'POST', body: { name, email, password } }),
  me: () => apiRequest<{ user: User }>('/auth/me'),
}

export const propertiesApi = {
  search: (params: SearchParamsRecord, cursor: string | null, signal?: AbortSignal) =>
    apiRequest<PropertyPage>('/properties', { params: { ...params, cursor: cursor ?? undefined }, signal }),
  get: (id: number, signal?: AbortSignal) => apiRequest<{ data: Property }>(`/properties/${id}`, { signal }),
}

export const watchlistApi = {
  list: (signal?: AbortSignal) => apiRequest<{ data: WatchlistItem[] }>('/watchlist', { signal }),
  add: (propertyId: number) =>
    apiRequest<{ data: WatchlistItem }>('/watchlist', { method: 'POST', body: { property_id: propertyId } }),
  remove: (propertyId: number) => apiRequest<void>(`/watchlist/${propertyId}`, { method: 'DELETE' }),
}

export const savedSearchesApi = {
  list: (signal?: AbortSignal) => apiRequest<{ data: SavedSearch[] }>('/saved_searches', { signal }),
  create: (name: string, filters: SearchParamsRecord) =>
    apiRequest<{ data: SavedSearch }>('/saved_searches', { method: 'POST', body: { name, filters } }),
  remove: (id: number) => apiRequest<void>(`/saved_searches/${id}`, { method: 'DELETE' }),
}
