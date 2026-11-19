import { QueryClientProvider, type QueryClient } from '@tanstack/react-query'
import { lazy, type ReactNode } from 'react'
import { createBrowserRouter, RouterProvider, type RouteObject } from 'react-router'
import { AuthProvider } from '@/auth/AuthContext'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Layout } from '@/components/layout/Layout'
import { ToastProvider } from '@/notifications/ToastContext'
import SearchPage from '@/pages/SearchPage'
import { RealtimeProvider } from '@/realtime/RealtimeProvider'

// Secondary routes are split into their own chunks
const WatchlistPage = lazy(() => import('@/pages/WatchlistPage'))
const AuthPage = lazy(() => import('@/pages/AuthPage'))
const NotFoundPage = lazy(() => import('@/pages/NotFoundPage'))

export const routes: RouteObject[] = [
  {
    element: <Layout />,
    children: [
      { index: true, element: <SearchPage /> },
      { path: 'watchlist', element: <WatchlistPage /> },
      { path: 'login', element: <AuthPage mode="login" /> },
      { path: 'signup', element: <AuthPage mode="signup" /> },
      { path: '*', element: <NotFoundPage /> },
    ],
  },
]

/**
 * State management:
 *  - Server state (search pages, watchlist, saved searches): TanStack Query cache
 *  - Session + notifications: React Context with reducers
 *  - Search filters: the URL query string
 *  - Real-time: ActionCable events patch the Query cache, so every view updates at once
 */
export function AppProviders({ queryClient, children }: { queryClient: QueryClient; children: ReactNode }) {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <ToastProvider>
          <AuthProvider>
            <RealtimeProvider>{children}</RealtimeProvider>
          </AuthProvider>
        </ToastProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  )
}

const router = createBrowserRouter(routes)

export default function App({ queryClient }: { queryClient: QueryClient }) {
  return (
    <AppProviders queryClient={queryClient}>
      <RouterProvider router={router} />
    </AppProviders>
  )
}
