import { Heart } from 'lucide-react'

interface WatchButtonProps {
  watched: boolean
  address: string
  onClick: () => void
}

export function WatchButton({ watched, address, onClick }: WatchButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={watched}
      aria-label={watched ? `Remove ${address} from watchlist` : `Save ${address} to watchlist`}
      title={watched ? 'Remove from watchlist' : 'Save to watchlist'}
      className={`absolute right-3 top-3 grid size-9 place-items-center rounded-full shadow-sm ring-1 transition active:scale-90 ${
        watched
          ? 'bg-rose-500 text-white ring-rose-500 hover:bg-rose-600'
          : 'bg-white/90 text-slate-700 ring-slate-200 hover:bg-white hover:text-rose-500'
      }`}
    >
      <Heart aria-hidden className={`size-[18px] ${watched ? 'fill-current' : ''}`} />
    </button>
  )
}
