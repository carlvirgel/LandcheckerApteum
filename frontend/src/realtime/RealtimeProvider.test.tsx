import { act, screen, waitFor } from '@testing-library/react'
import type { Consumer } from '@rails/actioncable'
import type { WatchlistEvent } from '@/api/types'
import { buildProperty, buildWatchlistItem, demoUser } from '@/test/fixtures'
import { api } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'
import { createCableConsumer } from './cable'

jest.mock('@/api/endpoints')
jest.mock('./cable', () => ({ createCableConsumer: jest.fn() }))

interface Handlers {
  connected?: () => void
  received?: (event: WatchlistEvent) => void
}

/** A fake ActionCable consumer that records the subscription so tests can push messages. */
function mockCable() {
  const handlers: Handlers = {}
  const unsubscribe = jest.fn()
  const disconnect = jest.fn()
  const create = jest.fn((_channel: unknown, mixin: Handlers) => {
    Object.assign(handlers, mixin)
    return { unsubscribe }
  })
  jest.mocked(createCableConsumer).mockReturnValue({ subscriptions: { create }, disconnect } as unknown as Consumer)
  return {
    create,
    disconnect,
    connect: () => act(() => handlers.connected?.()),
    // async: React Query notifies subscribers on a later tick
    push: (event: WatchlistEvent) => act(async () => handlers.received?.(event)),
  }
}

describe('RealtimeProvider', () => {
  beforeEach(() => {
    api.auth.me.mockResolvedValue({ user: demoUser })
    api.savedSearches.list.mockResolvedValue({ data: [] })
  })

  it('subscribes to the watchlist channel with the session token', async () => {
    const cable = mockCable()
    api.watchlist.list.mockResolvedValue({ data: [] })
    const { queryClient } = renderApp({ route: '/watchlist', signedIn: true }); (globalThis as any).qc = queryClient

    await screen.findByText('Nothing saved yet')
    expect(createCableConsumer).toHaveBeenCalledWith('test-token')
    expect(cable.create).toHaveBeenCalledWith({ channel: 'WatchlistChannel' }, expect.any(Object))

    cable.connect()
    expect(screen.getByText('Live updates on')).toBeInTheDocument()
  })

  it('updates the watched property in place and notifies the user', async () => {
    const cable = mockCable()
    const property = buildProperty({ street_address: '9 Bay St', suburb: 'Brighton', price: 2_000_000 })
    api.watchlist.list.mockResolvedValue({ data: [buildWatchlistItem(property)] })
    renderApp({ route: '/watchlist', signedIn: true })

    const card = await screen.findByRole('article', { name: property.full_address })
    expect(card).toHaveTextContent('$2,000,000')

    await cable.push({ type: 'property.updated', property: { ...property, price: 1_850_000 }, changes: { price: [2_000_000, 1_850_000] } })

    await waitFor(() => expect(card).toHaveTextContent('$1,850,000'))
    expect(card).toHaveTextContent('Down $150,000 since you saved it')
    expect(screen.getByText('Price drop')).toBeInTheDocument()
    expect(screen.getByText('9 Bay St, Brighton is now $1,850,000 (was $2,000,000).')).toBeInTheDocument()
  })

  it('reflects watchlist changes made in another tab', async () => {
    const cable = mockCable()
    const property = buildProperty({ street_address: '4 Park St' })
    api.watchlist.list.mockResolvedValue({ data: [] })
    const { queryClient } = renderApp({ route: '/watchlist', signedIn: true }); (globalThis as any).qc = queryClient

    await screen.findByText('Nothing saved yet')
    await cable.push({ type: 'watchlist.added', property_id: property.id, item: buildWatchlistItem(property) })

    expect(await screen.findByRole('article', { name: property.full_address })).toBeInTheDocument()
  })

  it('disconnects on sign out', async () => {
    const cable = mockCable()
    api.watchlist.list.mockResolvedValue({ data: [] })
    const { user } = renderApp({ route: '/watchlist', signedIn: true })

    await user.click(await screen.findByRole('button', { name: /sign out/i }))

    expect(cable.disconnect).toHaveBeenCalled()
  })
})
