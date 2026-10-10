'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { MistWordmark } from '@/components/ui/logo'
import { Button } from '@/components/ui/button'
import { BACKEND } from '@/lib/useAuth'
import { priceLabel, type Interval } from '@/lib/subscription'

interface PlanInfo {
  name: string
  amount: number
  interval: Interval
  currency: string
  merchantName: string | null
  merchantLogo: string | null
  trust?: { verifiedPhone: string | null; fulfilledCount: number; location: string | null }
}

const INPUT_CLASS = 'w-full rounded-lg border border-[var(--dark-border)] bg-[var(--dark-elevated)] px-3.5 py-2.5 text-[15px] text-[var(--dark-text)] outline-none focus:border-[var(--signal)]'
const LABEL_CLASS = 'mb-1.5 block text-xs font-medium text-[var(--dark-text-2)]'

// The public page behind a plan's link: someone who has never heard of MistPay subscribes and pays the first cycle.
export default function SubscribePage() {
  const { code } = useParams<{ code: string }>()
  const router = useRouter()
  const [plan, setPlan] = useState<PlanInfo | null>(null)
  const [missing, setMissing] = useState(false)
  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetch(`${BACKEND}/api/subscribe/${code}`)
      .then((r) => (r.ok ? r.json() : Promise.reject()))
      .then(setPlan)
      .catch(() => setMissing(true))
  }, [code])

  async function subscribe() {
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/api/subscribe/${code}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: name.trim(), phone: phone.trim() || undefined }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not start the subscription. Please try again.')
      router.push(`/pay/${data.requestId}`) // the first cycle is paid like any request: card, Tempo wallet or another chain
    } catch (e) {
      setError((e as Error).message)
      setBusy(false)
    }
  }

  const trustParts = plan?.trust ? [plan.trust.verifiedPhone ? `✓ Phone verified ${plan.trust.verifiedPhone}` : null, plan.trust.fulfilledCount > 0 ? `${plan.trust.fulfilledCount} payments received` : null, plan.trust.location].filter(Boolean) : []

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--dark-bg)] p-4">
      <div className="w-full max-w-sm space-y-6">
        {plan?.merchantName ? (
          <div>
            <div className="flex items-center justify-center gap-2">
              {plan.merchantLogo && <img src={plan.merchantLogo} alt="" className="h-7 w-7 shrink-0 rounded-[6px] object-cover" />}
              <span className="text-[15px] font-semibold text-[var(--dark-text)]">{plan.merchantName}</span>
              <span className="font-mono text-[10px] text-[var(--dark-text-3)]">via MistPay</span>
            </div>
            {trustParts.length > 0 && <p className="mt-1 text-center text-[11px] text-[var(--dark-text-3)]">{trustParts.join(' · ')}</p>}
          </div>
        ) : (
          <MistWordmark className="w-full justify-center" theme="dark" href="/" />
        )}

        <div className="rounded-2xl border border-[var(--dark-border)] bg-[var(--dark-surface)] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.4)] sm:p-8">
          {missing ? (
            <div className="space-y-2 text-center">
              <p className="text-title-2 text-[var(--dark-text)]">This plan isn&apos;t available</p>
              <p className="text-body-s text-[var(--dark-text-2)]">The link may be wrong, or the plan was turned off. Ask them for a fresh one.</p>
            </div>
          ) : !plan ? (
            <div role="status" className="space-y-3"><span className="sr-only">Loading…</span><div className="h-4 w-32 animate-pulse rounded bg-[var(--dark-elevated)]" /><div className="h-12 w-48 animate-pulse rounded-lg bg-[var(--dark-elevated)]" /></div>
          ) : (
            <div className="space-y-5">
              <div className="space-y-1">
                <p className="text-caps text-[var(--dark-text-3)]">Subscribe to</p>
                <p className="text-title-2 text-[var(--dark-text)]">{plan.name}</p>
                <p className="text-display-2 font-serif italic text-[var(--dark-text)]">{priceLabel(plan.amount, plan.interval)}</p>
              </div>
              <div>
                <label htmlFor="sub-name" className={LABEL_CLASS}>Your name</label>
                <input id="sub-name" className={INPUT_CLASS} placeholder="Ana" maxLength={80} value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" />
              </div>
              <div>
                <label htmlFor="sub-phone" className={LABEL_CLASS}>WhatsApp number <span className="font-normal text-[var(--dark-text-3)]">(optional)</span></label>
                <input id="sub-phone" className={INPUT_CLASS} placeholder="+15551234567" value={phone} onChange={(e) => setPhone(e.target.value)} inputMode="tel" autoComplete="tel" />
                <p className="mt-1.5 text-xs text-[var(--dark-text-3)]">We&apos;ll send each renewal&apos;s payment link there, after your first payment. Leave it blank to get no messages.</p>
              </div>
              {error && <p role="alert" className="text-sm text-[#e05454]">{error}</p>}
              <Button variant="signal" size="lg" className="w-full" loading={busy} disabled={name.trim() === ''} onClick={subscribe}>Subscribe · pay the first {plan.interval === 'weekly' ? 'week' : plan.interval === 'monthly' ? 'month' : 'year'}</Button>
              <p className="text-center text-xs text-[var(--dark-text-3)]">You can cancel any time from your subscription page.</p>
            </div>
          )}
        </div>
        <p className="text-center text-xs text-[var(--dark-text-3)]">No account needed · Pay by card or crypto</p>
      </div>
    </div>
  )
}
