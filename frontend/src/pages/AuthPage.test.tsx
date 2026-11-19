import { screen, waitFor } from '@testing-library/react'
import { ApiError } from '@/api/client'
import { tokenStorage } from '@/auth/tokenStorage'
import { buildPage, demoUser } from '@/test/fixtures'
import { api } from '@/test/mockApi'
import { renderApp } from '@/test/renderApp'

jest.mock('@/api/endpoints')
jest.mock('@/realtime/cable')

beforeEach(() => {
  api.properties.search.mockResolvedValue(buildPage([]))
  api.watchlist.list.mockResolvedValue({ data: [] })
  api.savedSearches.list.mockResolvedValue({ data: [] })
})

describe('Sign in', () => {
  it('stores the session and returns to the page the user came from', async () => {
    api.auth.login.mockResolvedValue({ token: 'jwt-123', user: demoUser })
    const { user, router } = renderApp({ route: '/watchlist' })

    // Watchlist requires a session, so we land on the login page first
    await screen.findByRole('heading', { name: 'Sign in to your account' })
    await user.type(screen.getByLabelText('Email'), 'demo@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    await waitFor(() => expect(router.state.location.pathname).toBe('/watchlist'))
    expect(api.auth.login).toHaveBeenCalledWith('demo@example.com', 'password123')
    expect(tokenStorage.get()).toBe('jwt-123')
    expect(await screen.findByRole('button', { name: /sign out/i })).toBeInTheDocument()
  })

  it('shows the server error for bad credentials', async () => {
    api.auth.login.mockRejectedValue(new ApiError(401, 'unauthorized', 'Invalid email or password'))
    const { user } = renderApp({ route: '/login' })

    await user.type(await screen.findByLabelText('Email'), 'demo@example.com')
    await user.type(screen.getByLabelText('Password'), 'wrong')
    await user.click(screen.getByRole('button', { name: 'Sign in' }))

    expect(await screen.findByRole('alert')).toHaveTextContent('Invalid email or password')
    expect(tokenStorage.get()).toBeNull()
  })
})

describe('Sign up', () => {
  it('shows field errors returned by the API', async () => {
    api.auth.signup.mockRejectedValue(
      new ApiError(422, 'validation_failed', 'Email has already been taken', { email: ['has already been taken'] }),
    )
    const { user } = renderApp({ route: '/signup' })

    await user.type(await screen.findByLabelText('Name'), 'Jane')
    await user.type(screen.getByLabelText('Email'), 'taken@example.com')
    await user.type(screen.getByLabelText('Password'), 'password123')
    await user.click(screen.getByRole('button', { name: 'Create account' }))

    expect(await screen.findByText('Email has already been taken')).toBeInTheDocument()
    expect(screen.getByLabelText('Email')).toHaveAttribute('aria-invalid', 'true')
  })
})

describe('Session restore', () => {
  it('signs out when the stored token is rejected', async () => {
    api.auth.me.mockRejectedValue(new ApiError(401, 'unauthorized', 'Authentication required'))
    renderApp({ signedIn: true })

    expect(await screen.findByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    expect(tokenStorage.get()).toBeNull()
  })
})
