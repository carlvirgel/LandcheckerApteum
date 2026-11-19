import type { Consumer } from '@rails/actioncable'

/**
 * Inert ActionCable consumer used by `jest.mock('@/realtime/cable')`.
 * A plain function (not jest.fn) so `resetMocks` can't wipe it between tests;
 * RealtimeProvider.test supplies its own controllable mock instead.
 */
export function createCableConsumer(): Consumer {
  return {
    subscriptions: { create: () => ({ unsubscribe() {} }) },
    disconnect() {},
  } as unknown as Consumer
}
