import { useCallback, useLayoutEffect, useRef } from 'react'

/**
 * Returns a function with a permanently stable identity that always calls the
 * latest `callback`. Lets memoised children receive handlers without re-rendering
 * whenever the parent's closure changes.
 */
export function useStableCallback<Args extends unknown[], R>(callback: (...args: Args) => R): (...args: Args) => R {
  const ref = useRef(callback)
  useLayoutEffect(() => {
    ref.current = callback
  })
  return useCallback((...args: Args) => ref.current(...args), [])
}
