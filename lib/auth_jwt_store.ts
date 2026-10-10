// Bridges the phone-OTP verification (PrivySignIn) to Privy's custom-auth sync, which per Privy's
// docs must run in a component mounted for the app's whole lifetime — not one that unmounts the
// moment sign-in succeeds (dashboard/layout.tsx's DashboardLayoutInner is that component). A plain
// external store (React's useSyncExternalStore) is the standard shape for this, not React context.
export type AuthJwtStatus = 'idle' | 'pending' | 'error'

export interface AuthJwtState {
  status: AuthJwtStatus
  token?: string
  phone?: string
  error?: string
}

let state: AuthJwtState = { status: 'idle' }
const listeners = new Set<() => void>()
const emit = () => listeners.forEach((l) => l())

export const authJwtStore = {
  getState: (): AuthJwtState => state,

  subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => listeners.delete(listener)
  },

  /** Called by PrivySignIn once Twilio Verify confirms the code. */
  setPending(phone: string, token: string) {
    state = { status: 'pending', phone, token }
    emit()
  },

  /** Called by DashboardLayoutInner if Privy's own sync (or the post-auth registration) fails. */
  setError(message: string) {
    state = { status: 'error', error: message }
    emit()
  },

  reset() {
    state = { status: 'idle' }
    emit()
  },

  getExternalJwt: async (): Promise<string | undefined> => state.token,
}
