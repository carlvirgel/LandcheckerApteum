import { QueryClient } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { createMemoryRouter, RouterProvider } from 'react-router'
import { AppProviders, routes } from '@/App'
import { tokenStorage } from '@/auth/tokenStorage'

interface RenderAppOptions {
  route?: string
  /** Start with a stored session token (authApi.me must be mocked to accept it). */
  signedIn?: boolean
}

/** Renders the real route tree and providers against an in-memory router. */
export function renderApp({ route = '/', signedIn = false }: RenderAppOptions = {}) {
  if (signedIn) tokenStorage.set('test-token')

  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity }, mutations: { retry: false } },
  })
  const router = createMemoryRouter(routes, { initialEntries: [route] })
  const user = userEvent.setup()

  const utils = render(
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>,
  )

  return { ...utils, user, router, queryClient }
}
