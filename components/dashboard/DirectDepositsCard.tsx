'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { useSendTransaction } from '@privy-io/react-auth/tempo'
import type { Hex } from 'viem'
import { BACKEND, authHeaders } from '@/lib/useAuth'

type Status = 'none' | 'mining' | 'ready' | 'active'

/**
 * "Turn on direct deposits": one on-chain registration, signed by the receiver's own wallet. After it, every request
 * gets a deposit address of its own, so a payment from an exchange or a wallet that cannot attach a memo is still matched
 * to the right request. The server prepares the exact call and only marks it active after reading the chain.
 * Must render inside PrivyProvider (the dashboard layout provides it). Renders nothing once active.
 */
export function DirectDepositsCard({ authToken, walletAddress, isLight }: { authToken: string; walletAddress: string; isLight?: boolean }) {
  const { wallets } = useWallets()
  const { sendTransaction } = useSendTransaction()
  const [status, setStatus] = useState<Status | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    const res = await fetch(`${BACKEND}/api/my/master`, { headers: authHeaders(authToken) })
    if (res.ok) setStatus((await res.json()).status)
  }, [authToken])

  useEffect(() => { refresh().catch(() => {}) }, [refresh])

  // The salt is mined server-side: proof-of-work, so the time is a random tail (usually under a minute, occasionally minutes). Poll until it is ready to sign.
  useEffect(() => {
    if (status !== 'mining' && status !== 'none') return
    const id = setInterval(() => { refresh().catch(() => {}) }, 4000)
    return () => clearInterval(id)
  }, [status, refresh])

  async function activate() {
    setError(null)
    const wallet = wallets.find((w) => w.address.toLowerCase() === walletAddress.toLowerCase())
    if (!wallet) { setError('Your wallet is not ready. Sign in again and retry.'); return }
    setBusy(true)
    try {
      const prep = await fetch(`${BACKEND}/api/my/master/prepare`, { method: 'POST', headers: authHeaders(authToken) })
      if (!prep.ok) throw new Error((await prep.json().catch(() => ({}))).error ?? 'Not ready yet')
      const { to, data } = await prep.json()
      const { hash } = await sendTransaction({ transaction: { calls: [{ to: to as Hex, data: data as Hex }] }, wallet })
      // The chain may take a moment to show the registration: ask a few times before giving up.
      for (let i = 0; i < 6; i++) {
        const res = await fetch(`${BACKEND}/api/my/master/confirm`, { method: 'POST', headers: authHeaders(authToken), body: JSON.stringify({ txHash: hash }) })
        const out = await res.json().catch(() => ({}))
        if (res.ok && out.status === 'active') { setStatus('active'); return }
        await new Promise((r) => setTimeout(r, 2000))
      }
      setError('It was sent, but is not confirmed yet. Refresh in a moment.')
    } catch (e) {
      console.error('direct deposits error:', e)
      const raw = String((e as Error)?.message ?? e)
      setError(/reject|denied|cancel|closed/i.test(raw) ? 'Cancelled.' : 'Could not turn on direct deposits. Please try again.')
    } finally {
      setBusy(false)
    }
  }

  if (status === null || status === 'active') return null

  return (
    <div className={`mb-7 rounded-[14px] px-5 py-[18px] transition-all ${
      isLight
        ? 'border border-slate-200 bg-white shadow-sm'
        : 'border border-[rgba(75,107,255,0.25)] bg-[rgba(75,107,255,0.06)]'
    }`}>
      <p className={`mb-1 text-[15px] font-semibold ${isLight ? 'text-slate-900' : 'text-paper'}`}>Turn on direct deposits</p>
      <p className={`mb-3.5 text-sm leading-normal ${isLight ? 'text-slate-600' : 'text-[rgba(155,167,181,0.8)]'}`}>
        Every request gets its own deposit address, so a payment from an exchange or a wallet that can&apos;t add a memo is still matched to the right request. One-time: it takes a single signature from your wallet and a small network fee.
      </p>
      {status === 'ready' ? (
        <button
          type="button"
          disabled={busy}
          onClick={activate}
          className={`rounded-[10px] border-none px-[18px] py-2.5 font-sans text-sm font-semibold transition-all ${
            isLight
              ? 'bg-[#00a894] hover:bg-[#008b7a] text-white'
              : 'bg-[var(--signal)] text-white'
          } ${busy ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
        >
          {busy ? 'Waiting for your wallet…' : 'Turn on'}
        </button>
      ) : (
        <p className={`m-0 font-mono text-xs ${isLight ? 'text-slate-500' : 'text-[rgba(107,120,136,0.7)]'}`}>Preparing your account… this usually takes under a minute, and can take a few.</p>
      )}
      {error && <p role="alert" className="mt-2.5 font-mono text-xs text-[#e05454]">{error}</p>}
    </div>
  )
}
