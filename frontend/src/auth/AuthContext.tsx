import { useQueryClient } from '@tanstack/react-query'
import { createContext, use, useCallback, useEffect, useMemo, useReducer, type ReactNode } from 'react'
import { ApiError, setUnauthorizedHandler } from '@/api/client'
import { authApi } from '@/api/endpoints'
import type { Session, User } from '@/api/types'
import { queryKeys } from '@/lib/queryClient'
import { tokenStorage } from './tokenStorage'

type AuthStatus = 'restoring' | 'authenticated' | 'anonymous'

interface AuthState {
  status: AuthStatus
  user: User | null
  token: string | null
}

type AuthAction =
  | { type: 'signed_in'; user: User; token: string }
  | { type: 'restore_failed' }
  | { type: 'signed_out' }

function authReducer(state: AuthState, action: AuthAction): AuthState {
  switch (action.type) {
    case 'signed_in':
      return { status: 'authenticated', user: action.user, token: action.token }
    case 'restore_failed':
      return { ...state, status: 'anonymous', user: null }
    case 'signed_out':
      return { status: 'anonymous', user: null, token: null }
  }
}

function initialState(): AuthState {
  const token = tokenStorage.get()
  return { status: token ? 'restoring' : 'anonymous', user: null, token }
}

export interface AuthContextValue extends AuthState {
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<User>
  signup: (name: string, email: string, password: string) => Promise<User>
  logout: () => void
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(authReducer, undefined, initialState)
  const queryClient = useQueryClient()

  const logout = useCallback(() => {
    tokenStorage.clear()
    dispatch({ type: 'signed_out' })
    // Per-user data must not leak into the next session
    queryClient.removeQueries({ queryKey: queryKeys.watchlist })
    queryClient.removeQueries({ queryKey: queryKeys.savedSearches })
  }, [queryClient])

  // Any 401 on an authenticated request (expired/revoked token) signs the user out
  useEffect(() => {
    setUnauthorizedHandler(logout)
    return () => setUnauthorizedHandler(null)
  }, [logout])

  // Validate a token restored from storage once on boot
  const restoringToken = state.status === 'restoring' ? state.token : null
  useEffect(() => {
    if (!restoringToken) return
    let cancelled = false
    authApi
      .me()
      .then(({ user }) => {
        if (!cancelled) dispatch({ type: 'signed_in', user, token: restoringToken })
      })
      .catch((error: unknown) => {
        if (cancelled) return
        // Keep the token on network errors so a reload can retry; drop it if rejected
        if (error instanceof ApiError && error.isUnauthorized) logout()
        else dispatch({ type: 'restore_failed' })
      })
    return () => {
      cancelled = true
    }
  }, [restoringToken, logout])

  const startSession = useCallback((session: Session) => {
    tokenStorage.set(session.token)
    dispatch({ type: 'signed_in', user: session.user, token: session.token })
    return session.user
  }, [])

  const login = useCallback(
    async (email: string, password: string) => startSession(await authApi.login(email, password)),
    [startSession],
  )
  const signup = useCallback(
    async (name: string, email: string, password: string) => startSession(await authApi.signup(name, email, password)),
    [startSession],
  )

  const value = useMemo<AuthContextValue>(
    () => ({ ...state, isAuthenticated: state.status === 'authenticated', login, signup, logout }),
    [state, login, signup, logout],
  )

  return <AuthContext value={value}>{children}</AuthContext>
}

export function useAuth(): AuthContextValue {
  const context = use(AuthContext)
  if (!context) throw new Error('useAuth must be used within <AuthProvider>')
  return context
}
