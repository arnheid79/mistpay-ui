'use client'

import { useState } from 'react'
import QRCodeSVG from 'react-qr-code'
import { Button } from '@/components/ui/button'
import { fetchQuote, recordFulfillment, type Quote } from '@/lib/payment'
import { addFundsToTempoWallet, connectTempoWallet, friendlyError, payWithTempoWallet, tempoTokenBalance } from '@/lib/tempo'

interface CryptoPayButtonProps {
  requestId: string
  participantToken?: string
  /** Cross-chain deposit addresses only exist on mainnet. */
  crossChainEnabled: boolean
  /** Ask the page to re-check status. Only the backend's on-chain verification can mark a request paid. */
  onSubmitted: () => void
}

type Step = 'idle' | 'menu' | 'busy' | 'confirm' | 'fund' | 'chain' | 'deposit' | 'error'

// USDC on the chains Relay fills from. Sending anything else to a deposit address is unrecoverable.
const ORIGINS = [
  { id: 8453, name: 'Base', usdc: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913' },
  { id: 1, name: 'Ethereum', usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48' },
  { id: 42161, name: 'Arbitrum', usdc: '0xaf88d065e77c8cC2239327C5EDb3A432268e5831' },
]

// The shared Button's ghost variant is styled for the light landing page (dark text): invisible on this dark page.
const GHOST = 'text-[var(--dark-text-2)] hover:bg-[var(--dark-surface)] active:bg-[var(--dark-surface)]'
const money = (n: number) => `$${n.toFixed(2)}`
const ADDRESS_RE = /^0x[0-9a-fA-F]{40}$/

export function CryptoPayButton({ requestId, participantToken, crossChainEnabled, onSubmitted }: CryptoPayButtonProps) {
  const [step, setStep] = useState<Step>('idle')
  const [quote, setQuote] = useState<Quote | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [origin, setOrigin] = useState(ORIGINS[0])
  const [refundTo, setRefundTo] = useState('')
  const [copied, setCopied] = useState(false)
  const [fund, setFund] = useState<{ have: bigint; need: bigint } | null>(null)

  // Server-side problems (quotes) already come back as a plain sentence; wallet errors are turned into one.
  const fail = (err: unknown, fallback: string, wallet = false) => {
    setError(wallet ? friendlyError(err) : err instanceof Error ? err.message : fallback)
    setStep('error')
  }
  const money6 = (micros: bigint) => `$${(Number(micros) / 1e6).toFixed(2)}`

  async function startTempo() {
    setError(null)
    setStep('busy')
    try {
      setQuote(await fetchQuote(requestId, { door: 'tempo', participantToken }))
      setStep('confirm')
    } catch (err) {
      fail(err, 'Could not get a quote.')
    }
  }

  async function payTempo() {
    if (!quote?.memo) return
    setStep('busy')
    try {
      // A brand-new passkey wallet is empty: check first, and send the payer to the wallet's own funding flow.
      const owner = await connectTempoWallet()
      const have = await tempoTokenBalance(owner, quote.token.address)
      const need = BigInt(quote.requestedMicros)
      if (have < need) {
        setFund({ have, need })
        setStep('fund')
        return
      }
      const hash = await payWithTempoWallet({ dest: quote.dest, requestedMicros: quote.requestedMicros, memo: quote.memo, token: quote.token })
      await recordFulfillment(requestId, hash, participantToken)
      onSubmitted()
      setStep('idle')
    } catch (err) {
      fail(err, 'Payment failed. Please try again.', true)
    }
  }

  async function addFunds() {
    if (!quote) return
    setStep('busy')
    try {
      await addFundsToTempoWallet(quote.requestedMicros, quote.token)
    } catch (err) {
      console.error('add funds failed', err) // closing the funding window is normal: fall through to a balance re-check
    }
    try {
      const owner = await connectTempoWallet()
      const have = await tempoTokenBalance(owner, quote.token.address)
      setFund({ have, need: BigInt(quote.requestedMicros) })
    } catch (err) {
      return fail(err, 'Could not check your balance.', true)
    }
    setStep('fund')
  }

  async function startChain() {
    if (!ADDRESS_RE.test(refundTo.trim())) {
      setError('Enter the wallet address on that chain where any refund should go.')
      return
    }
    setError(null)
    setStep('busy')
    try {
      setQuote(await fetchQuote(requestId, { door: 'chain', participantToken, originChainId: origin.id, originCurrency: origin.usdc, refundTo: refundTo.trim() }))
      setStep('deposit')
    } catch (err) {
      fail(err, 'Could not get a cross-chain quote.')
    }
  }

  async function copyAddress() {
    if (!quote?.depositAddress) return
    try {
      await navigator.clipboard.writeText(quote.depositAddress)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  const panel = { borderColor: 'var(--dark-border)', background: 'var(--dark-elevated)' } as const
  const note = { background: 'var(--dark-surface)', color: 'var(--dark-text-2)', border: '1px solid var(--dark-border)' } as const

  if (step === 'idle') {
    return (
      <Button variant="secondary" size="lg" onClick={() => setStep('menu')} className="w-full" icon={<LayersIcon />}>
        Pay with crypto
      </Button>
    )
  }

  if (step === 'busy') {
    return <Button variant="secondary" size="lg" loading className="w-full">Working…</Button>
  }

  if (step === 'menu') {
    return (
      <div className="animate-rise-in space-y-2">
        <Button variant="secondary" size="md" onClick={startTempo} className="w-full">Tempo wallet · passkey, no gas</Button>
        {crossChainEnabled && (
          <Button variant="secondary" size="md" onClick={() => setStep('chain')} className="w-full">Send from another chain</Button>
        )}
        <Button variant="ghost" size="sm" onClick={() => setStep('idle')} className={`w-full ${GHOST}`}>Cancel</Button>
      </div>
    )
  }

  if (step === 'confirm' && quote) {
    return (
      <div className="animate-rise-in space-y-4 rounded-xl border p-4" style={panel}>
        <div className="space-y-1 text-sm">
          <div className="flex justify-between"><span style={{ color: 'var(--dark-text-2)' }}>They receive</span><span style={{ color: 'var(--dark-text)' }}>{money(quote.receiverGets)}</span></div>
          <div className="flex justify-between"><span style={{ color: 'var(--dark-text-2)' }}>Network fee</span><span style={{ color: 'var(--dark-text)' }}>$0.00</span></div>
        </div>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className={`flex-none ${GHOST}`}>Back</Button>
          <Button variant="primary" size="sm" onClick={payTempo} className="flex-1">Pay {money(quote.payTotal ?? quote.receiverGets)} →</Button>
        </div>
      </div>
    )
  }

  if (step === 'fund' && fund) {
    const enough = fund.have >= fund.need
    return (
      <div className="animate-rise-in space-y-4 rounded-xl border p-4" style={panel}>
        <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
          {enough ? 'Funds received. You can pay now.' : `Your Tempo wallet has ${money6(fund.have)}. You need ${money6(fund.need)} to pay this.`}
        </p>
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className={`flex-none ${GHOST}`}>Back</Button>
          {enough ? (
            <Button variant="primary" size="sm" onClick={payTempo} className="flex-1">Pay {money(Number(fund.need) / 1e6)} →</Button>
          ) : (
            <Button variant="primary" size="sm" onClick={addFunds} className="flex-1">Add funds</Button>
          )}
        </div>
      </div>
    )
  }

  if (step === 'chain') {
    return (
      <div className="animate-rise-in space-y-3 rounded-xl border p-4" style={panel}>
        <label className="block text-xs" style={{ color: 'var(--dark-text-3)' }}>Send USDC from</label>
        <select
          value={origin.id}
          onChange={(e) => setOrigin(ORIGINS.find((o) => o.id === Number(e.target.value)) ?? ORIGINS[0])}
          className="w-full rounded-lg border bg-transparent px-3 py-2 text-sm"
          style={{ borderColor: 'var(--dark-border)', color: 'var(--dark-text)' }}
        >
          {ORIGINS.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
        </select>
        <label className="block text-xs" style={{ color: 'var(--dark-text-3)' }}>Refund address on {origin.name} (a wallet you control)</label>
        <input
          value={refundTo}
          onChange={(e) => setRefundTo(e.target.value)}
          placeholder="0x…"
          className="w-full rounded-lg border bg-transparent px-3 py-2 font-mono text-xs"
          style={{ borderColor: 'var(--dark-border)', color: 'var(--dark-text)' }}
        />
        {error && <p className="text-xs" style={{ color: '#e05454' }}>{error}</p>}
        <div className="flex gap-2">
          <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className={`flex-none ${GHOST}`}>Back</Button>
          <Button variant="primary" size="sm" onClick={startChain} className="flex-1">Get address →</Button>
        </div>
      </div>
    )
  }

  if (step === 'deposit' && quote?.depositAddress) {
    return (
      <div className="animate-rise-in space-y-4 rounded-xl border p-4 text-center" style={panel}>
        <p className="text-sm" style={{ color: 'var(--dark-text)' }}>
          Send exactly <span className="font-semibold">{quote.payAmount} USDC</span> on <span className="font-semibold">{origin.name}</span> to:
        </p>
        <div className="mx-auto w-fit rounded-xl bg-white p-3">
          <QRCodeSVG value={quote.depositAddress} size={150} level="M" bgColor="#ffffff" fgColor="#000000" />
        </div>
        <button onClick={copyAddress} className="break-all font-mono text-xs" style={{ color: 'var(--signal-300)' }}>
          {copied ? 'Copied!' : quote.depositAddress}
        </button>
        <p className="rounded-lg px-3 py-2 text-xs" style={note}>
          Works from any wallet or exchange. Only USDC on {origin.name}: anything else can&apos;t be recovered. Too much or too little is refunded to your refund address. This page updates by itself once it arrives.
        </p>
        <Button variant="ghost" size="sm" onClick={() => setStep('menu')} className={`w-full ${GHOST}`}>Back</Button>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <p className="text-center text-xs" style={{ color: '#e05454' }}>{error}</p>
      <Button variant="secondary" size="md" onClick={() => setStep('menu')} className="w-full">Try again</Button>
    </div>
  )
}

function LayersIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75">
      <polygon points="12 2 2 7 12 12 22 7 12 2" />
      <polyline points="2 17 12 22 22 17" />
      <polyline points="2 12 12 17 22 12" />
    </svg>
  )
}
