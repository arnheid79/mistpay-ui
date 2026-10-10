'use client'

import { useCallback, useEffect, useState } from 'react'
import { useWallets } from '@privy-io/react-auth'
import { useSendTransaction } from '@privy-io/react-auth/tempo'
import type { Address, Hex } from 'viem'
import { BACKEND, authHeaders } from '@/lib/useAuth'
import { formatMicrosExact, parseAmountMicros, refundCalls } from '@/lib/refund'

interface RefundLeg {
  legId: string
  source: string
  amountMicros: string
  refundedMicros: string
  refundableMicros: string
  canRefund: boolean
  to: string | null
  reason: string | null
}

interface RefundInfo {
  tokenAddress: string
  tokenSymbol: string
  tokenDecimals: number
  memo: string
  legs: RefundLeg[]
}

const usd = (micros: string, decimals: number) => `$${(Number(micros) / 10 ** decimals).toFixed(2)}`
const short = (a: string) => `${a.slice(0, 6)}…${a.slice(-4)}`

// One plain sentence for the receiver; the full error goes to the console for us.
function friendly(err: unknown): string {
  console.error('refund error:', err)
  const raw = String((err as { message?: string })?.message ?? err)
  if (/reject|denied|cancel|closed/i.test(raw)) return 'The refund was cancelled.'
  if (/insufficient/i.test(raw)) return "Your wallet doesn't have enough for this refund plus the small network fee."
  return 'The refund could not be completed. Please try again.'
}

function useDashboardTheme() {
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')

  useEffect(() => {
    const updateTheme = () => {
      const stored = localStorage.getItem('mistpay_theme') as 'dark' | 'light' | null
      if (stored) {
        setTheme(stored)
      } else {
        const shell = document.querySelector('.mist-dashboard')
        const attr = shell?.getAttribute('data-theme') as 'dark' | 'light' | null
        if (attr) setTheme(attr)
      }
    }
    updateTheme()

    window.addEventListener('mistpay_theme_change', updateTheme)
    return () => window.removeEventListener('mistpay_theme_change', updateTheme)
  }, [])

  return theme
}

/**
 * Refund a payment from the receiver's own wallet. MistPay never moves this money: the wallet signs a transfer back to
 * the payer, and the backend records it only after reading it from the chain.
 * Must render inside PrivyProvider (the dashboard layout provides it).
 */
export function RefundPanel({ requestId, authToken, walletAddress }: { requestId: string; authToken: string; walletAddress: string }) {
  const theme = useDashboardTheme()
  const { wallets } = useWallets()
  const { sendTransaction } = useSendTransaction()
  const [info, setInfo] = useState<RefundInfo | null>(null)
  const [amounts, setAmounts] = useState<Record<string, string>>({})
  const [busyLeg, setBusyLeg] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`${BACKEND}/api/my/requests/${requestId}/refunds`, { headers: authHeaders(authToken) })
    if (!res.ok) throw new Error('Could not load refund options')
    setInfo(await res.json())
  }, [requestId, authToken])

  useEffect(() => { load().catch((e) => setError(e.message)) }, [load])

  async function refund(leg: RefundLeg) {
    if (!info || !leg.to) return
    setError(null)
    setNote(null)
    const micros = parseAmountMicros(amounts[leg.legId] ?? formatMicrosExact(BigInt(leg.refundableMicros), info.tokenDecimals), info.tokenDecimals)
    if (micros === null || micros <= BigInt(0)) { setError('Enter an amount like 12.50'); return }
    if (micros > BigInt(leg.refundableMicros)) { setError('That is more than is left to refund'); return }
    const wallet = wallets.find((w) => w.address.toLowerCase() === walletAddress.toLowerCase())
    if (!wallet) { setError('Your wallet is not ready. Sign in again and retry.'); return }

    setBusyLeg(leg.legId)
    try {
      const { hash } = await sendTransaction({
        transaction: { calls: refundCalls(info.tokenAddress as Address, leg.to as Address, micros, info.memo as Hex) },
        wallet,
      })
      const res = await fetch(`${BACKEND}/api/my/requests/${requestId}/refunds`, {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ legId: leg.legId, txHash: hash }),
      })
      const out = await res.json()
      if (!res.ok) throw new Error(out.error ?? 'Could not record the refund')
      setInfo((prev) => (prev ? { ...prev, legs: out.legs } : prev))
      setNote(out.recorded > 0 ? `Refunded ${usd(micros.toString(), info.tokenDecimals)} to ${short(leg.to)}.` : 'Sent, but not recorded yet. Refresh in a moment.')
    } catch (e) {
      setError(friendly(e))
    } finally {
      setBusyLeg(null)
    }
  }

  if (!info) return <p className={`m-0 font-mono text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{error ?? 'Loading refund options…'}</p>
  if (info.legs.length === 0) return null

  return (
    <div className={`mt-5 border-t ${theme === 'light' ? 'border-slate-200' : 'border-white/10'} pt-4`}>
      <p className={`mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>Refund</p>
      <div className="flex flex-col gap-3">
        {info.legs.map((leg) => {
          const d = info.tokenDecimals
          return (
            <div key={leg.legId} className="flex flex-wrap items-center gap-3">
              <span className={`font-mono text-xs ${theme === 'light' ? 'text-slate-900 font-medium' : 'text-paper'}`}>
                Paid {usd(leg.amountMicros, d)}{Number(leg.refundedMicros) > 0 && ` · refunded ${usd(leg.refundedMicros, d)}`}
              </span>
              {leg.canRefund ? (
                <>
                  <input
                    aria-label="Refund amount"
                    inputMode="decimal"
                    value={amounts[leg.legId] ?? formatMicrosExact(BigInt(leg.refundableMicros), d)}
                    onChange={(e) => setAmounts((a) => ({ ...a, [leg.legId]: e.target.value }))}
                    className={`w-28 rounded-xl border px-2.5 py-1.5 font-mono text-xs outline-none ${
                      theme === 'light'
                        ? 'border-slate-300 bg-white text-slate-900 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
                    }`}
                  />
                  <button
                    type="button"
                    disabled={busyLeg !== null}
                    onClick={() => refund(leg)}
                    className={`rounded-xl px-3.5 py-1.5 text-xs font-bold shadow-sm transition-all ${
                      theme === 'light'
                        ? 'bg-[#007a6c] text-white hover:bg-[#006357]'
                        : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb]'
                    } ${busyLeg !== null ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'}`}
                  >
                    {busyLeg === leg.legId ? 'Refunding…' : `Refund${leg.to ? ` to ${short(leg.to)}` : ''}`}
                  </button>
                </>
              ) : (
                <span className={`text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{leg.reason ?? 'Fully refunded.'}</span>
              )}
            </div>
          )
        })}
      </div>
      {info.legs.some((l) => l.canRefund) && (
        <p className={`mt-3 text-xs ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>The money comes from your wallet, and you pay the small network fee.</p>
      )}
      {error && <p role="alert" className="mt-2 font-mono text-xs text-red-500">{error}</p>}
      {note && <p role="status" className={`mt-2 font-mono text-xs ${theme === 'light' ? 'text-[#007a6c] font-semibold' : 'text-[#00d2b8]'}`}>{note}</p>}
    </div>
  )
}
