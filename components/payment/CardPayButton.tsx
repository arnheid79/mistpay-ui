'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchQuote, type Quote } from '@/lib/payment'

interface CardPayButtonProps {
  requestId: string
  participantToken?: string
  /** False when the deployment has no card provider configured. */
  enabled: boolean
  /** True in the provider's sandbox: test cards, testnet dollars. */
  sandbox: boolean
}

type Step = 'idle' | 'loading' | 'quote' | 'redirecting' | 'error'

// The shared Button's ghost variant is styled for the light landing page (dark text): invisible on this dark page.
const GHOST = 'text-[var(--dark-text-2)] hover:bg-[var(--dark-surface)] active:bg-[var(--dark-surface)]'
const money = (n: number) => `$${n.toFixed(2)}`

export function CardPayButton({ requestId, participantToken, enabled, sandbox }: CardPayButtonProps) {
  const [step, setStep] = useState<Step>('idle')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)

  async function handleStart() {
    setError(null)
    setStep('loading')
    try {
      setQuote(await fetchQuote(requestId, { door: 'card', paymentMethod: 'credit_debit_card', participantToken }))
      setStep('quote')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start card checkout.')
      setStep('error')
    }
  }

  // Apple Pay / Google Pay do not work inside an iframe, so checkout opens as a normal page and returns here.
  function handleContinue() {
    if (!quote?.widgetUrl) return
    // Defence in depth: the URL is built by our backend, but never navigate a payer anywhere but MoonPay.
    let host = ''
    try { host = new URL(quote.widgetUrl).hostname } catch { /* falls through to the refusal below */ }
    if (host !== 'moonpay.com' && !host.endsWith('.moonpay.com')) {
      setError('Could not start card checkout. Please try again.')
      setStep('error')
      return
    }
    setStep('redirecting')
    window.location.assign(quote.widgetUrl)
  }

  if ((step === 'quote' || step === 'redirecting') && quote) {
    return (
      <div className="animate-rise-in space-y-4 rounded-xl border p-4" style={{ borderColor: 'var(--dark-border)', background: 'var(--dark-elevated)' }}>
        <div className="space-y-2 text-sm">
          <Row label="They receive" value={money(quote.receiverGets)} />
          <Row label="Card + network fee" value={money(quote.fee ?? 0)} />
          <div className="h-px" style={{ background: 'var(--dark-border)' }} />
          <Row label="You pay" value={money(quote.payTotal ?? 0)} strong />
        </div>
        {sandbox && (
          <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--dark-surface)', color: 'var(--dark-text-2)', border: '1px solid var(--dark-border)' }}>
            Sandbox: use a test card. No real money moves.
          </p>
        )}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('idle')} className={`flex-none ${GHOST}`}>Back</Button>
          <Button variant="primary" size="sm" onClick={handleContinue} loading={step === 'redirecting'} className="flex-1 whitespace-nowrap">
            Continue to checkout →
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <Button variant="primary" size="lg" onClick={handleStart} loading={step === 'loading'} disabled={!enabled} className="w-full h-12" icon={<CardIcon />}>
        Pay with Credit / Debit Card
      </Button>
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px]" style={{ color: 'var(--dark-text-3)' }}>
          {enabled ? 'Visa, Mastercard, Amex via MoonPay' : 'Card payments not available in this environment'}
        </span>
        <div className="flex items-center gap-1.5 opacity-70">
          <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-[var(--dark-border)] bg-[var(--dark-surface)] text-[var(--dark-text-2)] font-semibold">VISA</span>
          <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-[var(--dark-border)] bg-[var(--dark-surface)] text-[var(--dark-text-2)] font-semibold">MC</span>
          <span className="text-[10px] font-mono tracking-wider px-1.5 py-0.5 rounded border border-[var(--dark-border)] bg-[var(--dark-surface)] text-[var(--dark-text-2)] font-semibold">AMEX</span>
        </div>
      </div>
      {step === 'error' && error && <p className="text-center text-xs mt-1" style={{ color: '#e05454' }}>{error}</p>}
    </div>
  )
}

function Row({ label, value, strong }: { label: string; value: string; strong?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <span style={{ color: 'var(--dark-text-2)' }}>{label}</span>
      <span className={strong ? 'text-base font-semibold' : ''} style={{ color: 'var(--dark-text)' }}>{value}</span>
    </div>
  )
}

function CardIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <rect x="1" y="4" width="22" height="16" rx="2" />
      <line x1="1" y1="10" x2="23" y2="10" />
    </svg>
  )
}
