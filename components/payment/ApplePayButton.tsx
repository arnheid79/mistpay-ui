'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { fetchQuote, type Quote } from '@/lib/payment'

interface ApplePayButtonProps {
  requestId: string
  participantToken?: string
  /** False when the deployment has no card provider configured. */
  enabled: boolean
  /** True in the provider's sandbox: test cards, testnet dollars. */
  sandbox: boolean
}

type Step = 'idle' | 'loading' | 'quote' | 'redirecting' | 'error'

const money = (n: number) => `$${n.toFixed(2)}`

export function ApplePayButton({ requestId, participantToken, enabled, sandbox }: ApplePayButtonProps) {
  const [step, setStep] = useState<Step>('idle')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isAppleDevice, setIsAppleDevice] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    const ua = navigator.userAgent || ''
    const isApple = /Macintosh|iPhone|iPad|iPod/i.test(ua)
    const hasApplePaySession = 'ApplePaySession' in window
    setIsAppleDevice(isApple || hasApplePaySession)
  }, [])

  async function handleStart() {
    setError(null)
    setStep('loading')
    try {
      const q = await fetchQuote(requestId, {
        door: 'card',
        paymentMethod: 'apple_pay',
        participantToken,
      })
      setQuote(q)
      setStep('quote')
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not start Apple Pay checkout.')
      setStep('error')
    }
  }

  function handleContinue() {
    if (!quote?.widgetUrl) return
    let host = ''
    try { host = new URL(quote.widgetUrl).hostname } catch { /* noop */ }
    if (host !== 'moonpay.com' && !host.endsWith('.moonpay.com')) {
      setError('Could not start Apple Pay checkout. Please try again.')
      setStep('error')
      return
    }
    setStep('redirecting')
    window.location.assign(quote.widgetUrl)
  }

  if ((step === 'quote' || step === 'redirecting') && quote) {
    return (
      <div className="animate-rise-in space-y-4 rounded-xl border p-4" style={{ borderColor: 'var(--dark-border)', background: 'var(--dark-elevated)' }}>
        <div className="flex items-center justify-between pb-1 border-b" style={{ borderColor: 'var(--dark-border)' }}>
          <span className="text-xs font-semibold tracking-wider uppercase text-[var(--dark-text-3)]">Apple Pay Checkout</span>
          <ApplePayLogo width={54} height={22} className="text-white" />
        </div>
        <div className="space-y-2 text-sm">
          <Row label="They receive" value={money(quote.receiverGets)} />
          <Row label="Apple Pay + network fee" value={money(quote.fee ?? 0)} />
          <div className="h-px" style={{ background: 'var(--dark-border)' }} />
          <Row label="You pay" value={money(quote.payTotal ?? 0)} strong />
        </div>
        {sandbox && (
          <p className="rounded-lg px-3 py-2 text-xs" style={{ background: 'var(--dark-surface)', color: 'var(--dark-text-2)', border: '1px solid var(--dark-border)' }}>
            Sandbox: use simulated Apple Pay / test card. No real money moves.
          </p>
        )}
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setStep('idle')}
            className="flex-none text-[var(--dark-text-2)] hover:bg-[var(--dark-surface)]"
          >
            Back
          </Button>
          <button
            type="button"
            onClick={handleContinue}
            disabled={step === 'redirecting'}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-lg bg-black hover:bg-zinc-900 border border-zinc-700/80 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all active:scale-[0.99] disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {step === 'redirecting' ? (
              'Opening Apple Pay…'
            ) : (
              <span className="inline-flex items-center justify-center gap-1.5 whitespace-nowrap">
                <span>Continue with</span>
                <ApplePayLogo width={50} height={20} className="text-white" />
                <span>→</span>
              </span>
            )}
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        onClick={handleStart}
        disabled={!enabled || step === 'loading'}
        className="w-full h-12 inline-flex items-center justify-center rounded-xl bg-black hover:bg-zinc-900 active:scale-[0.99] border border-zinc-800 text-white shadow-sm transition-all disabled:opacity-45 disabled:cursor-not-allowed select-none px-4"
        aria-label="Pay with Apple Pay"
      >
        {step === 'loading' ? (
          <div className="inline-flex items-center gap-2 text-sm text-zinc-300">
            <svg className="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
            </svg>
            <span>Getting quote…</span>
          </div>
        ) : (
          <div className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
            <span className="text-sm font-medium tracking-tight text-white/95">Pay with</span>
            <ApplePayLogo width={58} height={24} className="text-white" />
          </div>
        )}
      </button>
      <div className="flex items-center justify-between px-1">
        <span className="text-[11px] text-[var(--dark-text-3)]">
          {enabled ? (isAppleDevice ? 'Instant 1-click checkout on your Apple device' : 'Apple Pay supported on Safari & iOS') : 'Apple Pay not configured'}
        </span>
        {isAppleDevice && enabled && (
          <span className="inline-flex items-center rounded-full bg-emerald-500/10 px-1.5 py-0.5 text-[10px] font-medium text-emerald-400 border border-emerald-500/20">
            Detected
          </span>
        )}
      </div>
      {step === 'error' && error && <p className="text-center text-xs text-[#e05454] mt-1">{error}</p>}
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

function ApplePayLogo({
  width = 58,
  height = 24,
  className = '',
}: {
  width?: number
  height?: number
  className?: string
}) {
  return (
    <svg
      width={width}
      height={height}
      viewBox="0 0 170 70"
      fill="currentColor"
      aria-label="Apple Pay"
      className={`inline-block flex-shrink-0 ${className}`}
      style={{
        width: `${width}px`,
        height: `${height}px`,
        flexShrink: 0,
        display: 'inline-block',
        verticalAlign: 'middle',
      }}
    >
      <path d="M29.8 31.8c-.1-5.7 4.7-8.5 4.9-8.6-2.7-3.9-6.9-4.4-8.3-4.5-3.5-.4-7 2.1-8.7 2.1-1.8 0-4.6-2-7.5-2-3.9 0-7.5 2.2-9.5 5.7-4.1 7.1-1 17.6 2.9 23.3 2 2.8 4.3 5.9 7.3 5.8 3-.1 4.1-1.9 7.6-1.9 3.5 0 4.6 1.9 7.6 1.9 3.1 0 5.1-2.8 7-5.7 2.3-3.3 3.2-6.5 3.3-6.7-.1-.1-6.4-2.5-6.6-9.4zM24.7 13.9c1.5-1.9 2.6-4.5 2.3-7.1-2.2.1-4.9 1.5-6.4 3.3-1.4 1.6-2.5 4.3-2.2 6.8 2.5.2 5-1.3 6.3-3z"/>
      <path d="M57.8 17.5h11.9c8.2 0 13.7 5.7 13.7 13.7 0 8.1-5.5 13.7-13.7 13.7h-5.2v14.4H57.8V17.5zm11.5 21.6c4.6 0 7.5-2.9 7.5-7.9s-2.9-7.9-7.5-7.9h-4.8v15.8h4.8zM87.2 44.5c0-6 4.7-9.7 13.2-10.2l4.8-.3v-1.7c0-2.8-2-4.5-5.6-4.5-3.3 0-5.3 1.4-5.8 3.5h-5.9c.5-4.9 4.8-8.2 11.8-8.2 7.1 0 11.4 3.7 11.4 9.8v19.4c0 1.2.2 2.4.7 3.3v.5h-6.2c-.4-.9-.6-2-.7-2.9-1.9 2.2-4.9 3.5-8.2 3.5-6 0-9.5-3.6-9.5-8.7zm18-3.9v-2.3l-4.2.3c-4.8.3-7.4 2.2-7.4 5.5 0 3.1 2.3 4.9 5.8 4.9 3.5 0 5.8-2.6 5.8-6.1l-.3-2.3zM120.3 63.8l6-17.7-9.5-27.4h6.8l6.1 20 6.1-20h6.6l-15.6 38.6h-6.5z"/>
    </svg>
  )
}
