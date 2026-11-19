import { Suspense } from 'react'
import { Outlet } from 'react-router'
import { ErrorBoundary } from '@/components/common/ErrorBoundary'
import { Spinner } from '@/components/common/states'
import { Toaster } from '@/notifications/Toaster'
import { Header } from './Header'

export function Layout() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="mx-auto max-w-screen-2xl px-4 py-6 sm:px-6">
        <ErrorBoundary>
          <Suspense fallback={<Spinner className="p-8" />}>
            <Outlet />
          </Suspense>
        </ErrorBoundary>
      </main>
      <Toaster />
    </div>
  )
}
