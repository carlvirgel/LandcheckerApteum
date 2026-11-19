import { House } from 'lucide-react'
import { useId, useState, type FormEvent, type InputHTMLAttributes } from 'react'
import { Link, Navigate, useLocation, useNavigate, type Location } from 'react-router'
import { ApiError } from '@/api/client'
import { useAuth } from '@/auth/AuthContext'

type Mode = 'login' | 'signup'

const COPY: Record<Mode, { title: string; submit: string; switchText: string; switchLink: string; switchTo: string }> = {
  login: {
    title: 'Sign in to your account',
    submit: 'Sign in',
    switchText: 'New here?',
    switchLink: 'Create an account',
    switchTo: '/signup',
  },
  signup: {
    title: 'Create your account',
    submit: 'Create account',
    switchText: 'Already have an account?',
    switchLink: 'Sign in',
    switchTo: '/login',
  },
}

function Field({
  label,
  error,
  ...props
}: { label: string; error?: string } & InputHTMLAttributes<HTMLInputElement>) {
  const id = useId()
  const errorId = `${id}-error`
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-slate-700">
        {label}
      </label>
      <input
        {...props}
        id={id}
        aria-invalid={Boolean(error) || undefined}
        aria-describedby={error ? errorId : undefined}
        className={`mt-1 block h-11 w-full rounded-lg border-0 px-3 text-sm shadow-sm ring-1 focus:ring-2 focus:outline-none ${
          error ? 'ring-red-400 focus:ring-red-500' : 'ring-slate-300 focus:ring-teal-600'
        }`}
      />
      {error && (
        <p id={errorId} className="mt-1 text-xs text-red-700">
          {error}
        </p>
      )}
    </div>
  )
}

export default function AuthPage({ mode }: { mode: Mode }) {
  const { isAuthenticated, login, signup } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const from = (location.state as { from?: Location } | null)?.from
  const destination = from ? `${from.pathname}${from.search}` : '/'

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[]>>({})

  if (isAuthenticated && !submitting) return <Navigate to={destination} replace />

  const copy = COPY[mode]

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setSubmitting(true)
    setFormError(null)
    setFieldErrors({})
    try {
      if (mode === 'login') await login(email, password)
      else await signup(name, email, password)
      navigate(destination, { replace: true })
    } catch (error) {
      if (error instanceof ApiError && error.details) setFieldErrors(error.details)
      setFormError(error instanceof Error ? error.message : 'Something went wrong')
      setSubmitting(false)
    }
  }

  const fieldError = (key: string) => fieldErrors[key]?.[0] && `${key[0].toUpperCase()}${key.slice(1)} ${fieldErrors[key][0]}`

  return (
    <div className="mx-auto mt-6 max-w-sm sm:mt-12">
      <div className="mb-6 text-center">
        <span className="mx-auto mb-4 grid size-11 place-items-center rounded-xl bg-teal-700 text-white">
          <House aria-hidden className="size-6" />
        </span>
        <h1 className="text-2xl font-bold tracking-tight">{copy.title}</h1>
        {from && <p className="mt-2 text-sm text-slate-600">Sign in to save properties and get live price alerts.</p>}
      </div>

      <form onSubmit={onSubmit} noValidate className="space-y-4 rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
        {formError && Object.keys(fieldErrors).length === 0 && (
          <p role="alert" className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-800 ring-1 ring-red-200">
            {formError}
          </p>
        )}
        {mode === 'signup' && (
          <Field label="Name" name="name" autoComplete="name" required value={name} onChange={(e) => setName(e.target.value)} error={fieldError('name')} />
        )}
        <Field
          label="Email"
          name="email"
          type="email"
          autoComplete="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          error={fieldError('email')}
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          required
          minLength={mode === 'signup' ? 8 : undefined}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={fieldError('password')}
        />
        <button
          type="submit"
          disabled={submitting}
          className="h-11 w-full rounded-lg bg-teal-700 text-sm font-semibold text-white hover:bg-teal-800 disabled:opacity-60"
        >
          {submitting ? 'Please wait…' : copy.submit}
        </button>
        {mode === 'login' && (
          <p className="text-center text-xs text-slate-500">
            Demo account: <code className="font-mono">demo@example.com</code> / <code className="font-mono">password123</code>
          </p>
        )}
      </form>

      <p className="mt-4 text-center text-sm text-slate-600">
        {copy.switchText}{' '}
        <Link to={copy.switchTo} state={location.state} className="font-medium text-teal-700 hover:underline">
          {copy.switchLink}
        </Link>
      </p>
    </div>
  )
}
