import { Heart } from 'lucide-react'
import { useMemo } from 'react'
import { Link, Navigate, useLocation } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { EmptyState, ErrorState, Spinner } from '@/components/common/states'
import { PropertyGrid, PropertyGridSkeleton } from '@/components/property/PropertyGrid'
import { useWatchlist, useWatchToggleHandler } from '@/hooks/useWatchlist'
import { useConnectionStatus } from '@/realtime/RealtimeProvider'

export default function WatchlistPage() {
  const { status } = useAuth()
  const location = useLocation()
  const watchlist = useWatchlist()
  const onToggleWatch = useWatchToggleHandler()
  const connection = useConnectionStatus()

  const properties = useMemo(() => watchlist.items.map((item) => item.property), [watchlist.items])
  const priceAtSave = useMemo(
    () => new Map(watchlist.items.map((item) => [item.property_id, item.price_at_save])),
    [watchlist.items],
  )

  if (status === 'restoring') return <Spinner className="p-8" />
  if (status === 'anonymous') return <Navigate to="/login" replace state={{ from: location }} />

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Your watchlist</h1>
          <p className="mt-1 text-sm text-slate-600">
            {connection === 'connected'
              ? "You'll be notified the moment a saved property changes price or sells."
              : 'Saved properties, with price movements since you saved them.'}
          </p>
        </div>
        {watchlist.items.length > 0 && (
          <p className="text-sm text-slate-600">
            <strong className="font-semibold text-slate-900">{watchlist.items.length}</strong> saved
          </p>
        )}
      </div>

      {watchlist.isPending ? (
        <PropertyGridSkeleton count={4} />
      ) : watchlist.isError ? (
        <ErrorState title="We couldn't load your watchlist" message={watchlist.error.message} onRetry={() => watchlist.refetch()} />
      ) : properties.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-6" />}
          title="Nothing saved yet"
          description="Tap the heart on any property to keep an eye on it. We'll let you know when its price or status changes."
          action={
            <Link to="/" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-medium text-white hover:bg-teal-800">
              Start searching
            </Link>
          }
        />
      ) : (
        <PropertyGrid
          properties={properties}
          watchedIds={watchlist.watchedIds}
          onToggleWatch={onToggleWatch}
          priceAtSave={priceAtSave}
        />
      )}
    </div>
  )
}
