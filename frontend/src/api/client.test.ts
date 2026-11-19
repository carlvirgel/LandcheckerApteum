import { tokenStorage } from '@/auth/tokenStorage'
import { ApiError, apiRequest, setUnauthorizedHandler } from './client'
import { propertiesApi, watchlistApi } from './endpoints'

function jsonResponse(status: number, body?: unknown) {
  return new Response(body === undefined ? null : JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })
}

async function captureError(promise: Promise<unknown>): Promise<ApiError> {
  try {
    await promise
  } catch (error) {
    return error as ApiError
  }
  throw new Error('Expected the request to fail')
}

describe('apiRequest', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch')
  })

  afterEach(() => {
    setUnauthorizedHandler(null)
  })

  it('sends the session token and a JSON body', async () => {
    tokenStorage.set('abc')
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: { property_id: 7 } }))

    await expect(apiRequest('/watchlist', { method: 'POST', body: { property_id: 7 } })).resolves.toEqual({
      data: { property_id: 7 },
    })

    expect(fetchMock).toHaveBeenCalledWith('/api/v1/watchlist', {
      method: 'POST',
      headers: { Accept: 'application/json', Authorization: 'Bearer abc', 'Content-Type': 'application/json' },
      body: '{"property_id":7}',
      signal: undefined,
    })
  })

  it('sends anonymous GETs without auth or content headers, dropping blank params', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [] }))

    await apiRequest('/properties', { params: { q: 'kew', min_price: '', cursor: undefined, sort: 'price_asc' } })

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/properties?q=kew&sort=price_asc')
    expect(init?.headers).toEqual({ Accept: 'application/json' })
    expect(init?.body).toBeUndefined()
  })

  it('resolves 204 No Content to undefined', async () => {
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await expect(apiRequest('/watchlist/7', { method: 'DELETE' })).resolves.toBeUndefined()
  })

  it("turns the API's error envelope into an ApiError with field details", async () => {
    fetchMock.mockResolvedValueOnce(
      jsonResponse(422, {
        error: { code: 'invalid_params', message: 'Invalid search', details: { min_price: ['is not a number'] } },
      }),
    )

    const error = await captureError(apiRequest('/properties'))

    expect(error).toBeInstanceOf(ApiError)
    expect(error).toMatchObject({
      status: 422,
      code: 'invalid_params',
      message: 'Invalid search',
      details: { min_price: ['is not a number'] },
    })
    expect(error.isUnauthorized).toBe(false)
  })

  it('falls back to a generic error when the body is not JSON (e.g. a proxy error page)', async () => {
    fetchMock.mockResolvedValueOnce(new Response('<html>Bad Gateway</html>', { status: 502 }))

    const error = await captureError(apiRequest('/properties'))

    expect(error).toMatchObject({ status: 502, code: 'http_error', message: 'Request failed (502)' })
  })

  it('signs the user out when their token is rejected', async () => {
    const onUnauthorized = jest.fn()
    setUnauthorizedHandler(onUnauthorized)
    tokenStorage.set('expired')
    fetchMock.mockResolvedValueOnce(jsonResponse(401, { error: { code: 'unauthorized', message: 'Token expired' } }))

    const error = await captureError(apiRequest('/watchlist'))

    expect(error.isUnauthorized).toBe(true)
    expect(onUnauthorized).toHaveBeenCalledTimes(1)
  })

  it('does not sign anyone out for a 401 without a session (e.g. wrong password)', async () => {
    const onUnauthorized = jest.fn()
    setUnauthorizedHandler(onUnauthorized)
    fetchMock.mockResolvedValueOnce(
      jsonResponse(401, { error: { code: 'invalid_credentials', message: 'Invalid email or password' } }),
    )

    const error = await captureError(apiRequest('/auth/login', { method: 'POST', body: {} }))

    expect(error.message).toBe('Invalid email or password')
    expect(onUnauthorized).not.toHaveBeenCalled()
  })

  it('reports network failures as a retryable network_error', async () => {
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'))

    const error = await captureError(apiRequest('/properties'))

    expect(error).toMatchObject({ status: 0, code: 'network_error' })
    expect(error.message).toMatch(/unable to reach the server/i)
  })

  it('lets aborts through untouched so cancelled queries stay silent', async () => {
    const abort = new DOMException('The operation was aborted.', 'AbortError')
    fetchMock.mockRejectedValueOnce(abort)

    await expect(apiRequest('/properties')).rejects.toBe(abort)
  })
})

describe('endpoints', () => {
  let fetchMock: jest.SpiedFunction<typeof fetch>

  beforeEach(() => {
    fetchMock = jest.spyOn(globalThis, 'fetch')
  })

  it('passes the cursor and abort signal through to the search request', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(200, { data: [], meta: { has_more: false, limit: 24 } }))
    const controller = new AbortController()

    await propertiesApi.search({ min_bedrooms: '3' }, 'CURSOR', controller.signal)

    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('/api/v1/properties?min_bedrooms=3&cursor=CURSOR')
    expect(init?.signal).toBe(controller.signal)
  })

  it('addresses watchlist entries by property id', async () => {
    fetchMock.mockResolvedValueOnce(jsonResponse(201, { data: { property_id: 9 } }))
    fetchMock.mockResolvedValueOnce(new Response(null, { status: 204 }))

    await watchlistApi.add(9)
    await watchlistApi.remove(9)

    expect(fetchMock.mock.calls.map(([url, init]) => [init?.method, url, init?.body])).toEqual([
      ['POST', '/api/v1/watchlist', '{"property_id":9}'],
      ['DELETE', '/api/v1/watchlist/9', undefined],
    ])
  })
})
