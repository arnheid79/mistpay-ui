'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { usePrivy, useSyncJwtBasedAuthState } from '@privy-io/react-auth'
import { DashboardShell } from '@/components/dashboard/DashboardShell'
import { PrivySignIn, type PrivyAuth } from '@/components/auth/PrivySignIn'
import { OnboardingWizard, type OnboardingProfile } from '@/components/auth/OnboardingWizard'
import { PrivyClientProvider } from '@/components/auth/PrivyClientProvider'
import { authJwtStore } from '@/lib/auth_jwt_store'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

const DEFAULT_DEMO_PROFILE: OnboardingProfile = {
  onboarded: true,
  displayName: 'Demo User',
  accountType: 'individual',
  avatarUrl: null,
  businessName: null,
  websiteUrl: null,
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <PrivyClientProvider>
      <DashboardLayoutInner>{children}</DashboardLayoutInner>
    </PrivyClientProvider>
  )
}

function DashboardLayoutInner({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { getAccessToken } = usePrivy()
  const [checkedStorage, setCheckedStorage] = useState(false)
  const [auth, setAuth] = useState<PrivyAuth | null>(null)
  const [profile, setProfile] = useState<OnboardingProfile | null>(null)
  const [profileLoading, setProfileLoading] = useState(true)

  // Mounted for the whole life of /dashboard (unlike PrivySignIn, which unmounts on success) —
  // Privy's docs require this hook to live somewhere that never unmounts. PrivySignIn verifies the
  // phone via our own Twilio Verify routes and pushes the resulting JWT into authJwtStore; this is
  // what actually exchanges it with Privy for a real session + embedded wallet.
  useSyncJwtBasedAuthState({
    subscribe: useCallback((onChange: () => void) => authJwtStore.subscribe(onChange), []),
    getExternalJwt: authJwtStore.getExternalJwt,
    onAuthenticated: useCallback(async () => {
      const phone = authJwtStore.getState().phone
      try {
        const authToken = await getAccessToken()
        if (!authToken || !phone) throw new Error('No access token returned from Privy')

        const res = await fetch(`${BACKEND}/api/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${authToken}` },
          body: JSON.stringify({ phone }),
        })
        if (!res.ok) throw new Error('Could not register wallet')
        const { walletAddress } = (await res.json()) as { walletAddress: string }

        const newAuth: PrivyAuth = { authToken, address: walletAddress, phone }
        localStorage.setItem('mistpay_auth', JSON.stringify(newAuth))
        authJwtStore.reset()
        setAuth(newAuth)
      } catch (err: unknown) {
        console.error('Post-auth registration error:', err)
        authJwtStore.setError(err instanceof Error ? err.message : 'Sign-in failed. Please try again.')
      }
    }, [getAccessToken]),
    onError: useCallback((err: Error) => {
      console.error('Privy custom-auth sync error:', err)
      authJwtStore.setError(err?.message || 'Sign-in failed. Please try again.')
    }, []),
  })

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (raw) setAuth(JSON.parse(raw))
    setCheckedStorage(true)
  }, [])

  useEffect(() => {
    if (!auth) { setProfileLoading(false); return }
    setProfileLoading(true)
    fetch(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${auth.authToken}` } })
      .then((r) => {
        if (r.status === 401 && auth.authToken !== 'demo-token') {
          localStorage.removeItem('mistpay_auth'); setAuth(null); return null
        }
        return r.json()
      })
      .then((data) => {
        if (data) {
          setProfile(data)
        } else {
          setProfile(DEFAULT_DEMO_PROFILE)
        }
      })
      .catch(() => {
        // Fallback for UI testing when backend is offline or un-onboarded
        setProfile(DEFAULT_DEMO_PROFILE)
      })
      .finally(() => setProfileLoading(false))
  }, [auth])

  function signOut() {
    localStorage.removeItem('mistpay_auth')
    router.replace('/')
  }

  if (!checkedStorage || (auth && profileLoading)) {
    return (
      <div className="flex min-h-screen bg-[var(--ink)]" role="status" aria-live="polite">
        <span className="sr-only">Loading dashboard…</span>
        <div className="w-[232px] shrink-0 border-r border-white/[0.06] bg-[var(--ink-2)]" />
        <div className="flex-1 px-10 py-9">
          <div className="mb-8 h-[34px] w-40 animate-pulse rounded-sm bg-white/[0.06]" />
          <div className="mb-9 grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3.5">
            {[0, 1, 2, 3].map((i) => <div key={i} className="h-[90px] animate-pulse rounded-lg bg-white/[0.04]" />)}
          </div>
        </div>
      </div>
    )
  }

  if (!auth) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--ink)] p-6">
        <div className="max-w-[380px] text-center">
          <h1 className="mb-2.5 font-serif text-[32px] font-normal italic text-paper">
            Sign in to MistPay
          </h1>
          <p className="mb-7 text-sm text-[rgba(155,167,181,0.6)]">Enter your phone number to open your dashboard.</p>
          {process.env.NEXT_PUBLIC_PRIVY_APP_ID ? (
            <PrivySignIn />
          ) : (
            <p className="text-sm text-[rgba(224,84,84,0.8)]">Sign-in isn&apos;t configured yet — set NEXT_PUBLIC_PRIVY_APP_ID.</p>
          )}
          <div className="mt-6 border-t border-white/[0.08] pt-4 flex flex-col gap-2 items-center">
            <span className="text-xs text-[rgba(155,167,181,0.6)]">Dev UI Bypass Preview:</span>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const demoAuth: PrivyAuth = {
                    authToken: 'demo-token',
                    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    phone: '+15550000000',
                  }
                  localStorage.setItem('mistpay_auth', JSON.stringify(demoAuth))
                  setProfile({
                    onboarded: true,
                    displayName: 'Demo User',
                    accountType: 'individual',
                    avatarUrl: null,
                    businessName: null,
                    websiteUrl: null,
                  })
                  setAuth(demoAuth)
                }}
                className="text-xs text-[var(--teal-signal)] hover:underline cursor-pointer"
              >
                👤 Personal UI
              </button>
              <button
                onClick={() => {
                  const demoAuth: PrivyAuth = {
                    authToken: 'demo-token',
                    address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
                    phone: '+15550000000',
                  }
                  localStorage.setItem('mistpay_auth', JSON.stringify(demoAuth))
                  setProfile({
                    onboarded: true,
                    displayName: 'Demo Merchant',
                    accountType: 'business',
                    avatarUrl: null,
                    businessName: 'MistPay Store',
                    websiteUrl: 'https://example.com',
                  })
                  setAuth(demoAuth)
                }}
                className="text-xs text-[var(--teal-signal)] hover:underline cursor-pointer"
              >
                🏢 Business UI
              </button>
            </div>
          </div>
        </div>
      </main>
    )
  }

  if (profile && !profile.onboarded) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-[var(--ink)] p-6">
        <OnboardingWizard
          authToken={auth.authToken}
          onComplete={(newProfile) => {
            setProfile(newProfile)
          }}
        />
      </main>
    )
  }

  const activeProfile = profile ?? DEFAULT_DEMO_PROFILE

  return (
    <DashboardShell
      address={auth.address}
      displayName={activeProfile.displayName}
      avatarUrl={activeProfile.avatarUrl}
      accountType={activeProfile.accountType}
      businessName={activeProfile.businessName}
      onSignOut={signOut}
    >
      {children}
    </DashboardShell>
  )
}
