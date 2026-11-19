import { useEffect, useRef } from 'react'
import { useStableCallback } from './useStableCallback'

/**
 * Calls `onLoadMore` when the returned sentinel element scrolls within `rootMargin`
 * of the viewport. The observer is recreated whenever `enabled` flips back on, so
 * if the sentinel is still visible after a page loads (tall screens) the next page
 * is requested immediately.
 */
export function useInfiniteScroll<T extends Element>(onLoadMore: () => void, enabled: boolean, rootMargin = '800px') {
  const ref = useRef<T>(null)
  const loadMore = useStableCallback(onLoadMore)

  useEffect(() => {
    const node = ref.current
    if (!node || !enabled || typeof IntersectionObserver === 'undefined') return

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) loadMore()
      },
      { rootMargin },
    )
    observer.observe(node)
    return () => observer.disconnect()
  }, [enabled, rootMargin, loadMore])

  return ref
}
