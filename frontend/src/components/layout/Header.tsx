import { Heart, House, LogOut } from 'lucide-react'
import { Link, NavLink } from 'react-router'
import { useAuth } from '@/auth/AuthContext'
import { useWatchlist } from '@/hooks/useWatchlist'
import { useConnectionStatus, type ConnectionStatus } from '@/realtime/RealtimeProvider'

const navClass = ({ isActive }: { isActive: boolean }) =>
  `inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium transition ${
    isActive ? 'bg-teal-50 text-teal-800' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
  }`

const LIVE_STATUS: Record<Exclude<ConnectionStatus, 'offline'>, { label: string; dot: string }> = {
  connected: { label: 'Live updates on', dot: 'bg-emerald-500' },
  connecting: { label: 'Connecting…', dot: 'bg-amber-400 animate-pulse' },
  disconnected: { label: 'Reconnecting…', dot: 'bg-red-500 animate-pulse' },
}

function LiveIndicator() {
  const status = useConnectionStatus()
  if (status === 'offline') return null
  const { label, dot } = LIVE_STATUS[status]
  return (
    <span className="hidden items-center gap-1.5 text-xs text-slate-500 md:inline-flex" title={label}>
      <span aria-hidden className={`size-2 rounded-full ${dot}`} />
      {label}
    </span>
  )
}

export function Header() {
  const { user, isAuthenticated, status, logout } = useAuth()
  const { items } = useWatchlist()

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-screen-2xl items-center gap-2 px-4 sm:px-6">
        <Link to="/" className="mr-2 flex items-center gap-2 font-bold tracking-tight text-slate-900">
          <span className="grid size-8 place-items-center rounded-lg bg-teal-700 text-white">
            <House aria-hidden className="size-[18px]" />
          </span>
          <span className="hidden sm:inline">Property Search</span>
        </Link>

        <nav aria-label="Main" className="flex items-center gap-1">
          <NavLink to="/" end className={navClass}>
            Search
          </NavLink>
          <NavLink to="/watchlist" className={navClass}>
            <Heart aria-hidden className="size-4" /> Watchlist
            {isAuthenticated && items.length > 0 && (
              <span className="rounded-full bg-rose-500 px-1.5 text-xs font-semibold text-white" aria-label={`${items.length} saved`}>
                {items.length}
              </span>
            )}
          </NavLink>
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <LiveIndicator />
          {isAuthenticated && user ? (
            <>
              <span className="hidden text-sm text-slate-700 sm:inline">{user.name}</span>
              <button
                type="button"
                onClick={logout}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-sm font-medium text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              >
                <LogOut aria-hidden className="size-4" /> Sign out
              </button>
            </>
          ) : status === 'restoring' ? null : (
            <>
              <Link to="/login" className="text-sm font-medium text-slate-700 hover:text-slate-900">
                Sign in
              </Link>
              <Link
                to="/signup"
                className="inline-flex h-9 items-center rounded-lg bg-teal-700 px-3 text-sm font-medium text-white hover:bg-teal-800"
              >
                Create account
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  )
}
