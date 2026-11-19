import { createConsumer, type Consumer } from '@rails/actioncable'

/**
 * Browsers can't attach an Authorization header to a WebSocket handshake, so the
 * JWT travels as a query param (Rails filters it from logs). The relative URL
 * resolves to ws(s)://<current host>/cable, which Vite/nginx proxy to Rails.
 */
export function createCableConsumer(token: string): Consumer {
  return createConsumer(`/cable?token=${encodeURIComponent(token)}`)
}
