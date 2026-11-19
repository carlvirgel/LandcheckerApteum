import '@testing-library/jest-dom'
import { MockIntersectionObserver } from './intersectionObserver'

// Fetch API / TextEncoder globals come from ./jsdomEnvironment.cjs
Object.defineProperty(window, 'IntersectionObserver', { writable: true, value: MockIntersectionObserver })
window.scrollTo = jest.fn()

afterEach(() => {
  MockIntersectionObserver.reset()
  localStorage.clear()
})
