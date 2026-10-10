'use client'

import { useCallback, useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { MistWordmark } from '@/components/ui/logo'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { BACKEND } from '@/lib/useAuth'
import { fmtDate, priceLabel, type Interval } from '@/lib/subscription'

interface PayerView {
  id: string
  name: string
  amount: string
  interval: Interval
  status: 'active' | 'past_due' | 'cancelled'
  cancelReason: string | null
  nextDueAt: number | null
  merchantName: string | null
  payLink: string | null
}

// The subscriber's own page. Their link is the only thing that identifies them: they have no account.
export default function ManageSubscriptionPage() {
  const { id } = useParams<{ id: string }>()
  const [view, setView] = useState<PayerView | null>(null)
  const [missing, setMissing] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    const res = await fetch(`${BACKEND}/api/subscription/${id}`)
    if (!res.ok) { setMissing(true); return }
    setView(await res.json())
  }, [id])

  useEffect(() => { load().catch(() => setMissing(true)) }, [load])

  async function cancel() {
    if (!window.confirm('Cancel this subscription? You will not be charged again.')) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/api/subscription/${id}/cancel`, { method: 'POST' })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not cancel. Please try again.')
      await load()
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--dark-bg)] p-4">
      <div className="w-full max-w-sm space-y-6">
        <MistWordmark className="w-full justify-center" theme="dark" href="/" />
        <div className="rounded-2xl border border-[var(--dark-border)] bg-[var(--dark-surface)] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.4)] sm:p-8">
          {missing ? (
            <div className="space-y-2 text-center">
              <p className="text-title-2 text-[var(--dark-text)]">Subscription not found</p>
              <p className="text-body-s text-[var(--dark-text-2)]">Check the link you were sent.</p>
            </div>
          ) : !view ? (
            <div role="status"><span className="sr-only">Loading…</span><div className="h-12 w-48 animate-pulse rounded-lg bg-[var(--dark-elevated)]" /></div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-caps text-[var(--dark-text-3)]">{view.merchantName ? `Your subscription to ${view.merchantName}` : 'Your subscription'}</p>
                <p className="text-title-2 text-[var(--dark-text)]">{view.name}</p>
                <p className="text-display-2 font-serif italic text-[var(--dark-text)]">{priceLabel(view.amount, view.interval)}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant={view.status === 'active' ? 'success' : view.status === 'past_due' ? 'warn' : 'default'}>
                  {view.status === 'active' ? 'Active' : view.status === 'past_due' ? 'Payment overdue' : view.cancelReason === 'unpaid' ? 'Cancelled (unpaid)' : 'Cancelled'}
                </Badge>
                {view.status !== 'cancelled' && <span className="text-xs text-[var(--dark-text-2)]">Next payment {fmtDate(view.nextDueAt)}</span>}
              </div>
              {view.payLink && view.status !== 'cancelled' && (
                <a href={view.payLink} className="block"><Button variant="signal" size="lg" className="w-full">Pay this {view.interval === 'weekly' ? 'week' : view.interval === 'monthly' ? 'month' : 'year'}</Button></a>
              )}
              {error && <p role="alert" className="text-sm text-[#e05454]">{error}</p>}
              {view.status !== 'cancelled' && (
                <button type="button" onClick={cancel} disabled={busy} className="w-full cursor-pointer border-none bg-transparent p-0 text-center text-sm text-[var(--dark-text-2)] underline disabled:opacity-50">
                  {busy ? 'Cancelling…' : 'Cancel subscription'}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
