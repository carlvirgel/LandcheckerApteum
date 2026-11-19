import { tokenStorage } from '@/auth/tokenStorage'

export const API_BASE = '/api/v1'

export class ApiError extends Error {
  readonly status: number
  readonly code: string
  readonly details?: Record<string, string[]>

  constructor(status: number, code: string, message: string, details?: Record<string, string[]>) {
    super(message)
    this.name = 'ApiError'
    this.status = status
    this.code = code
    this.details = details
  }

  get isUnauthorized() {
    return this.status === 401
  }
}

type UnauthorizedListener = () => void
let onUnauthorized: UnauthorizedListener | null = null

/** AuthProvider registers this so an expired token signs the user out everywhere. */
export function setUnauthorizedHandler(listener: UnauthorizedListener | null) {
  onUnauthorized = listener
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  body?: unknown
  params?: Record<string, string | undefined>
  signal?: AbortSignal
}

export async function apiRequest<T>(path: string, { method = 'GET', body, params, signal }: RequestOptions = {}): Promise<T> {
  const headers: Record<string, string> = { Accept: 'application/json' }
  const token = tokenStorage.get()
  if (token) headers.Authorization = `Bearer ${token}`
  if (body !== undefined) headers['Content-Type'] = 'application/json'

  let url = `${API_BASE}${path}`
  if (params) {
    const search = new URLSearchParams()
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== '') search.set(key, value)
    })
    const qs = search.toString()
    if (qs) url += `?${qs}`
  }

  let response: Response
  try {
    response = await fetch(url, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    })
  } catch (error) {
    if ((error as Error).name === 'AbortError') throw error
    throw new ApiError(0, 'network_error', 'Unable to reach the server. Check your connection and try again.')
  }

  if (response.status === 204) return undefined as T

  const payload = await response.json().catch(() => null)

  if (!response.ok) {
    const error = payload?.error
    if (response.status === 401 && token) onUnauthorized?.()
    throw new ApiError(
      response.status,
      error?.code ?? 'http_error',
      error?.message ?? `Request failed (${response.status})`,
      error?.details,
    )
  }

  return payload as T
}
