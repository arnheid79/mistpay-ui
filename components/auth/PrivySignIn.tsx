'use client'

import { useState, useSyncExternalStore } from 'react'
import { authJwtStore } from '@/lib/auth_jwt_store'

export interface PrivyAuth {
  authToken: string
  address: string
  phone: string
}

type State = 'idle' | 'phone' | 'code' | 'loading'

// Our backend already returns human-readable messages (see routes/auth.ts /api/auth/otp/*, and
// DashboardLayoutInner's Privy-sync errors); only fall back to a generic message for the rare
// error with none (e.g. a raw network failure).
function friendlyError(raw: string): string {
  return raw.trim() || 'Sign-in failed. Please try again.'
}

function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s\-().]/g, ''))
}

function normalizePhone(phone: string): string {
  return phone.replace(/[\s\-().]/g, '')
}

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

// Collects phone + OTP (via our backend's Twilio Verify routes, not Privy's own SMS — see
// otp.service.ts) and hands the resulting token to authJwtStore. DashboardLayoutInner, which is
// always mounted, does the actual Privy custom-auth sync and calls onSuccess/setAuth; this
// component just shows a spinner until that either finishes (it unmounts) or fails (subscribes
// to the store to show the error here, since this is where the "try again" affordance lives).
export function PrivySignIn() {
  const [state, setState] = useState<State>('idle')
  const [phone, setPhone] = useState('')
  const [phoneError, setPhoneError] = useState<string | null>(null)
  const [code, setCode] = useState('')
  const jwtState = useSyncExternalStore(authJwtStore.subscribe, authJwtStore.getState)

  function validatePhone(value: string): boolean {
    const normalized = normalizePhone(value)
    if (!normalized) {
      setPhoneError('Phone number is required.')
      return false
    }
    if (!isE164(normalized)) {
      setPhoneError('Include your country code: +1 555 000 0000')
      return false
    }
    setPhoneError(null)
    return true
  }

  async function requestCode() {
    if (!validatePhone(phone)) return
    setState('loading')
    try {
      const res = await fetch(`${BACKEND}/api/auth/otp/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalizePhone(phone) }),
      })
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string })?.error ?? 'Could not send the code')
      setState('code')
    } catch (err: unknown) {
      console.error('OTP send error:', err)
      authJwtStore.setError(friendlyError((err as Error)?.message ?? ''))
      setState('phone')
    }
  }

  async function verifyCode() {
    setState('loading')
    try {
      const normalized = normalizePhone(phone)
      const res = await fetch(`${BACKEND}/api/auth/otp/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: normalized, code }),
      })
      if (!res.ok) throw new Error(((await res.json().catch(() => null)) as { error?: string })?.error ?? 'Incorrect or expired code')
      const { customToken } = (await res.json()) as { customToken: string }

      // DashboardLayoutInner's useSyncJwtBasedAuthState picks this up and exchanges it with Privy.
      authJwtStore.setPending(normalized, customToken)
    } catch (err: unknown) {
      console.error('OTP verify error:', err)
      authJwtStore.setError(friendlyError((err as Error)?.message ?? ''))
      setState('code')
    }
  }

  const waitingOnPrivy = jwtState.status === 'pending'

  if (jwtState.status === 'error') {
    return (
      <div className="magic-signin-wrap">
        <p className="magic-error">{jwtState.error}</p>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-signal btn-lg" onClick={() => { authJwtStore.reset(); setState('phone') }}>Try again</button>
          <button onClick={() => { authJwtStore.reset(); setState('idle') }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(155,167,181,0.55)', padding: 0 }}>
            ← Back
          </button>
        </div>
      </div>
    )
  }

  if (state === 'loading' || waitingOnPrivy) {
    return (
      <div className="magic-signin-wrap">
        <button className="btn btn-signal btn-lg" disabled>
          <span className="spinner" />
          {waitingOnPrivy ? 'Connecting your wallet…' : code ? 'Verifying…' : 'Sending SMS…'}
        </button>
        <p className="cta-note">One moment…</p>
      </div>
    )
  }

  if (state === 'idle') {
    return (
      <div className="magic-signin-wrap">
        <button className="btn btn-signal btn-lg" onClick={() => setState('phone')}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
            <path d="M3 12h18M13 6l8 6-8 6" />
          </svg>
          Sign in with phone
        </button>
        <p className="cta-note">SMS code · no seed phrase · no install</p>
      </div>
    )
  }

  if (state === 'phone') {
    return (
      <div className="magic-signin-wrap">
        <div className="magic-phone-row">
          <input
            className="cta-input"
            type="tel"
            placeholder="+1 555 000 0000"
            value={phone}
            onChange={(e) => { setPhone(e.target.value); if (phoneError) setPhoneError(null) }}
            onKeyDown={(e) => e.key === 'Enter' && requestCode()}
            autoFocus
          />
          <button className="btn btn-signal btn-lg" onClick={requestCode}>
            Send code →
          </button>
        </div>
        {phoneError && <p style={{ fontSize: 13, color: '#e05454', margin: '6px 0 0' }}>{phoneError}</p>}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button onClick={() => setState('idle')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(155,167,181,0.55)', padding: 0 }}>
            ← Back
          </button>
          <p className="cta-note" style={{ margin: 0 }}>We&apos;ll send a one-time code via SMS</p>
        </div>
      </div>
    )
  }

  if (state === 'code') {
    return (
      <div className="magic-signin-wrap">
        <div className="magic-phone-row">
          <input
            className="cta-input"
            type="text"
            inputMode="numeric"
            placeholder="123456"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && verifyCode()}
            autoFocus
          />
          <button className="btn btn-signal btn-lg" onClick={verifyCode}>
            Verify →
          </button>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginTop: 8 }}>
          <button onClick={() => setState('phone')} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: 'rgba(155,167,181,0.55)', padding: 0 }}>
            ← Back
          </button>
          <p className="cta-note" style={{ margin: 0 }}>Enter the code we texted you</p>
        </div>
      </div>
    )
  }

  return null
}
