import { act } from '@testing-library/react'

/** jsdom has no IntersectionObserver; this one lets tests decide when things "scroll into view". */
export class MockIntersectionObserver implements IntersectionObserver {
  static instances = new Set<MockIntersectionObserver>()

  readonly root = null
  readonly rootMargin: string
  readonly scrollMargin = '0px'
  readonly thresholds = [0]
  private readonly callback: IntersectionObserverCallback
  private readonly elements = new Set<Element>()

  constructor(callback: IntersectionObserverCallback, options?: IntersectionObserverInit) {
    this.callback = callback
    this.rootMargin = options?.rootMargin ?? '0px'
    MockIntersectionObserver.instances.add(this)
  }

  observe(element: Element) {
    this.elements.add(element)
  }

  unobserve(element: Element) {
    this.elements.delete(element)
  }

  disconnect() {
    this.elements.clear()
    MockIntersectionObserver.instances.delete(this)
  }

  takeRecords(): IntersectionObserverEntry[] {
    return []
  }

  static reset() {
    MockIntersectionObserver.instances.clear()
  }

  /** Simulates every observed element entering the viewport. */
  static async enterViewport() {
    await act(async () => {
      MockIntersectionObserver.instances.forEach((observer) => {
        const entries = [...observer.elements].map(
          (target) => ({ target, isIntersecting: true, intersectionRatio: 1 }) as IntersectionObserverEntry,
        )
        if (entries.length) observer.callback(entries, observer)
      })
    })
  }
}
