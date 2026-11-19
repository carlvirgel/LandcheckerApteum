import { authApi, propertiesApi, savedSearchesApi, watchlistApi } from '@/api/endpoints'

/**
 * Typed handles on the auto-mocked API module. Test files must call
 * `jest.mock('@/api/endpoints')` themselves (Jest hoists it per file).
 */
export const api = {
  auth: jest.mocked(authApi),
  properties: jest.mocked(propertiesApi),
  watchlist: jest.mocked(watchlistApi),
  savedSearches: jest.mocked(savedSearchesApi),
}
