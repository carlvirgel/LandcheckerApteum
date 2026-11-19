import { Component, type ErrorInfo, type ReactNode } from 'react'
import { ErrorState } from './states'

interface Props {
  children: ReactNode
}

interface State {
  error: Error | null
}

/** Last line of defence for render errors, so one broken view never blanks the app. */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null }

  static getDerivedStateFromError(error: Error): State {
    return { error }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (this.state.error) {
      return (
        <div className="mx-auto max-w-xl p-8">
          <ErrorState
            title="This page crashed"
            message="An unexpected error occurred. Reloading usually fixes it."
            onRetry={() => window.location.reload()}
          />
        </div>
      )
    }
    return this.props.children
  }
}
