import { act, fireEvent, screen, waitFor, within } from '@testing-library/react'
import { ApiError } from '@/api/client'
import { buildPage, buildProperty, buildWatchlistItem, demoUser } from '@/test/fixtures'
import { MockIntersectionObserver } from '@/test/intersectionObserver'
import { api } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

jest.mock('@/api/endpoints')
jest.mock('@/realtime/cable')

describe('SearchPage', () => {
  it('shows a loading state, then the results with a total', async () => {
    api.properties.search.mockResolvedValue(buildPage([buildProperty(), buildProperty()], { total_count: 1234, has_more: true }))
    renderApp()

    expect(screen.getByTestId('grid-skeleton')).toBeInTheDocument()
    expect(await screen.findAllByRole('article')).toHaveLength(2)
    expect(screen.getByText('1,234')).toBeInTheDocument()
  })

  it('sends URL filters to the API and keeps the URL in sync with filter changes', async () => {
    api.properties.search.mockResolvedValue(buildPage([buildProperty()]))
    const { user, router } = renderApp({ route: '/?q=richmond&min_bedrooms=2' })

    await screen.findByRole('article')
    expect(api.properties.search).toHaveBeenLastCalledWith({ q: 'richmond', min_bedrooms: '2' }, null, expect.any(AbortSignal))

    await user.click(screen.getByRole('button', { name: 'Townhouse' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Maximum price' }), '900000')

    await waitFor(() =>
      expect(api.properties.search).toHaveBeenLastCalledWith(
        { q: 'richmond', min_bedrooms: '2', property_types: 'townhouse', max_price: '900000' },
        null,
        expect.any(AbortSignal),
      ),
    )
    expect(router.state.location.search).toContain('property_types=townhouse')
    expect(screen.getByRole('button', { name: 'Townhouse' })).toHaveAttribute('aria-pressed', 'true')
  })

  it('keeps every change when filters are edited faster than the router navigates', async () => {
    api.properties.search.mockResolvedValue(buildPage([buildProperty()]))
    const { router } = renderApp()
    await screen.findByRole('article')

    // Both edits land before the first (async) navigation has completed
    act(() => {
      fireEvent.click(screen.getByRole('button', { name: 'Townhouse' }))
      fireEvent.change(screen.getByRole('combobox', { name: 'Minimum beds' }), { target: { value: '3' } })
    })

    await waitFor(() => expect(router.state.location.search).toContain('min_bedrooms=3'))
    expect(router.state.location.search).toContain('property_types=townhouse')
  })

  it('builds the next edit on the URL the back button returned to', async () => {
    api.properties.search.mockResolvedValue(buildPage([buildProperty()]))
    const { router, user } = renderApp()
    await screen.findByRole('article')

    await user.click(screen.getByRole('button', { name: 'House' }))
    await waitFor(() => expect(router.state.location.search).toBe('?property_types=house'))

    await act(() => router.navigate(-1))
    expect(screen.getByRole('button', { name: 'House' })).toHaveAttribute('aria-pressed', 'false')

    await user.click(screen.getByRole('button', { name: 'Unit' }))
    await waitFor(() => expect(router.state.location.search).toBe('?property_types=unit'))
  })

  it('loads the next page when the end of the list scrolls into view', async () => {
    const first = [buildProperty(), buildProperty()]
    const second = [buildProperty()]
    api.properties.search
      .mockResolvedValueOnce(buildPage(first, { has_more: true, next_cursor: 'abc', total_count: 3 }))
      .mockResolvedValueOnce(buildPage(second, { has_more: false, total_count: undefined }))
    renderApp()

    expect(await screen.findAllByRole('article')).toHaveLength(2)
    await MockIntersectionObserver.enterViewport()

    await waitFor(() => expect(screen.getAllByRole('article')).toHaveLength(3))
    expect(api.properties.search).toHaveBeenLastCalledWith({}, 'abc', expect.any(AbortSignal))
    expect(screen.getByText("You've reached the end of the results.")).toBeInTheDocument()
  })

  it('shows an error with a working retry', async () => {
    api.properties.search
      .mockRejectedValueOnce(new ApiError(500, 'internal_error', 'Something went wrong'))
      .mockResolvedValueOnce(buildPage([buildProperty()]))
    const { user } = renderApp()

    expect(await screen.findByRole('alert')).toHaveTextContent("We couldn't load properties")
    await user.click(screen.getByRole('button', { name: /try again/i }))

    expect(await screen.findByRole('article')).toBeInTheDocument()
  })

  it('offers to clear filters when nothing matches', async () => {
    api.properties.search.mockResolvedValueOnce(buildPage([])).mockResolvedValueOnce(buildPage([buildProperty()]))
    const { user, router } = renderApp({ route: '/?q=nowhere' })

    await user.click(await screen.findByRole('button', { name: 'Clear all filters' }))

    await screen.findByRole('article')
    expect(router.state.location.search).toBe('')
  })

  it('sends anonymous users to sign in when they try to save a property', async () => {
    api.properties.search.mockResolvedValue(buildPage([buildProperty({ street_address: '5 Elm Gr' })]))
    const { user, router } = renderApp({ route: '/?q=elm' })

    await user.click(await screen.findByRole('button', { name: 'Save 5 Elm Gr to watchlist' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/login'))
    expect(router.state.location.state).toMatchObject({ from: { search: '?q=elm' } })
    expect(api.watchlist.add).not.toHaveBeenCalled()
  })

  describe('when signed in', () => {
    beforeEach(() => {
      api.auth.me.mockResolvedValue({ user: demoUser })
      api.savedSearches.list.mockResolvedValue({ data: [] })
    })

    it('marks watched properties and saves new ones optimistically', async () => {
      const watched = buildProperty({ street_address: '1 Watched St' })
      const other = buildProperty({ street_address: '2 Other St' })
      api.properties.search.mockResolvedValue(buildPage([watched, other]))
      api.watchlist.list.mockResolvedValue({ data: [buildWatchlistItem(watched)] })
      let resolveAdd: (value: { data: ReturnType<typeof buildWatchlistItem> }) => void = () => {}
      api.watchlist.add.mockReturnValue(new Promise((resolve) => (resolveAdd = resolve)))
      const { user } = renderApp({ signedIn: true })

      expect(await screen.findByRole('button', { name: 'Remove 1 Watched St from watchlist' })).toHaveAttribute('aria-pressed', 'true')

      await user.click(screen.getByRole('button', { name: 'Save 2 Other St to watchlist' }))

      // Updated before the server responds
      expect(screen.getByRole('button', { name: 'Remove 2 Other St from watchlist' })).toBeInTheDocument()
      expect(within(screen.getByRole('navigation', { name: 'Main' })).getByLabelText('2 saved')).toBeInTheDocument()
      expect(api.watchlist.add).toHaveBeenCalledWith(other.id)
      resolveAdd({ data: buildWatchlistItem(other) })
    })

    it('rolls back and explains when saving fails', async () => {
      const property = buildProperty({ street_address: '3 Fail St' })
      api.properties.search.mockResolvedValue(buildPage([property]))
      api.watchlist.list.mockResolvedValue({ data: [] })
      api.watchlist.add.mockRejectedValue(new ApiError(0, 'network_error', 'Unable to reach the server.'))
      const { user } = renderApp({ signedIn: true })

      await user.click(await screen.findByRole('button', { name: 'Save 3 Fail St to watchlist' }))

      expect(await screen.findByText("Couldn't add to watchlist")).toBeInTheDocument()
      expect(screen.getByRole('button', { name: 'Save 3 Fail St to watchlist' })).toHaveAttribute('aria-pressed', 'false')
    })
  })
})
