const KEY = 'property-search.token'

// Used only when localStorage throws (e.g. storage blocked): the session then
// lasts for the lifetime of the tab.
let memoryToken: string | null = null

/**
 * Persists the JWT. localStorage keeps the session across reloads; the trade-off
 * (readable by XSS) is discussed in the README alongside the httpOnly-cookie option.
 */
export const tokenStorage = {
  get(): string | null {
    try {
      return localStorage.getItem(KEY)
    } catch {
      return memoryToken
    }
  },
  set(token: string) {
    try {
      localStorage.setItem(KEY, token)
    } catch {
      memoryToken = token
    }
  },
  clear() {
    memoryToken = null
    try {
      localStorage.removeItem(KEY)
    } catch {
      /* ignore */
    }
  },
}
