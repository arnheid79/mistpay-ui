'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useSearchParams } from 'next/navigation'
import QRCodeSVG from 'react-qr-code'
import { MistWordmark, MistMark } from '@/components/ui/logo'
import { Badge } from '@/components/ui/badge'
import { CardPayButton } from '@/components/payment/CardPayButton'
import { CryptoPayButton } from '@/components/payment/CryptoPayButton'
import { fetchPaymentRequest, formatTimeRemaining, shortenAddress, formatTokenAmount } from '@/lib/payment'
import type { PaymentRequest, InvoiceItem, ReceiverTrust } from '@/lib/payment'

interface Props {
  requestId: string
  initialData: PaymentRequest | null
  participantToken?: string
}

export function PaymentPageClient({ requestId, initialData, participantToken }: Props) {
  const [request, setRequest] = useState<PaymentRequest | null>(initialData)
  const [paid, setPaid] = useState(initialData?.status === 'fulfilled' || initialData?.participant?.status === 'fulfilled')
  const [loading, setLoading] = useState(!initialData)
  const [timeRemaining, setTimeRemaining] = useState<string>('')
  const returnedFromCheckout = !!useSearchParams().get('transactionId')

  const refresh = useCallback(async () => {
    try {
      const data = await fetchPaymentRequest(requestId, participantToken)
      setRequest(data)
      if (data.status === 'fulfilled' || data.participant?.status === 'fulfilled') setPaid(true)
    } catch {
      // ignore
    }
  }, [requestId, participantToken])

  useEffect(() => {
    if (!initialData) {
      setLoading(true)
      refresh().finally(() => setLoading(false))
    }
  }, [initialData, refresh])

  useEffect(() => {
    if (!request) return
    const tick = () => setTimeRemaining(formatTimeRemaining(request.expiresAt))
    tick()
    const secsLeft = Math.max(0, request.expiresAt - Math.floor(Date.now() / 1000))
    const intervalMs = secsLeft < 300 ? 10_000 : 60_000
    const id = setInterval(tick, intervalMs)
    return () => clearInterval(id)
  }, [request])

  useEffect(() => {
    if (paid || !request) return
    const id = setInterval(refresh, 5000)
    return () => clearInterval(id)
  }, [paid, request, refresh])

  if (loading) {
    return (
      <PageShell>
        <div className="flex animate-pulse flex-col gap-4" role="status" aria-live="polite">
          <span className="sr-only">Loading payment details…</span>
          <div className="h-4 w-28 rounded bg-[var(--dark-elevated)]" />
          <div className="h-14 w-40 rounded-lg bg-[var(--dark-elevated)]" />
          <div className="h-px bg-[var(--dark-border)]" />
          <div className="h-12 rounded-xl bg-[var(--dark-elevated)]" />
          <div className="h-12 rounded-xl bg-[var(--dark-elevated)]" />
        </div>
      </PageShell>
    )
  }

  if (!request) {
    return (
      <PageShell>
        <div className="py-8 text-center">
          <p className="text-title-2 mb-2 text-[var(--dark-text)]">Request not found</p>
          <p className="text-body-m text-[var(--dark-text-2)]">This payment link may have expired or been cancelled.</p>
        </div>
      </PageShell>
    )
  }

  if (request.status === 'expired') {
    return (
      <PageShell merchantName={request.merchantName} merchantLogo={request.merchantLogo} trust={request.trust}>
        <StatusCard icon={<ClockIcon />} title="Link expired" subtitle="This payment request has expired. Ask the recipient to create a new one." badge={<Badge variant="warn">Expired</Badge>} />
      </PageShell>
    )
  }

  if (request.status === 'cancelled') {
    return (
      <PageShell merchantName={request.merchantName} merchantLogo={request.merchantLogo} trust={request.trust}>
        <StatusCard icon={<XIcon />} title="Request cancelled" subtitle="This payment request was cancelled by the recipient." badge={<Badge variant="danger">Cancelled</Badge>} />
      </PageShell>
    )
  }

  if (paid || request.status === 'fulfilled' || request.participant?.status === 'fulfilled') {
    const rawAmount = request.participant ? request.participant.shareAmount : request.amount
    const displayAmount = formatTokenAmount(rawAmount, request.tokenSymbol)
    return (
      <PageShell merchantName={request.merchantName} merchantLogo={request.merchantLogo} trust={request.trust}>
        <div className="animate-rise-in space-y-4 text-center">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-[rgba(46,158,107,0.15)]">
            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#2E9E6B" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <div>
            <p className="text-display-2 font-serif italic text-[var(--dark-text)]">
              {displayAmount}
            </p>
            <p className="text-body-m mt-1 text-[var(--dark-text-2)]">
              {request.participant ? `${request.participant.name}'s payment` : request.label ? `Payment to ${request.label}` : 'Payment'} complete
            </p>
          </div>
          {request.txHash && request.explorerUrl && (
            <a href={request.explorerUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs text-[var(--signal-300)] transition-colors">
              <span className="font-mono">{shortenAddress(request.txHash)}</span>
              <ExternalLinkIcon />
            </a>
          )}
          <p className="text-xs text-[var(--dark-text-3)]">Settled on {request.chainName}</p>
        </div>
      </PageShell>
    )
  }

  // Determine display amounts
  const isParticipant = !!request.participant
  const isSplit = request.splitTotal > 1
  const rawDisplayAmount = isParticipant
    ? request.participant!.shareAmount
    : isSplit
    ? request.amount / request.splitTotal
    : request.amount
  const displayAmountFormatted = formatTokenAmount(rawDisplayAmount, request.tokenSymbol)

  const isInvoice = (request.invoiceItems?.length ?? 0) > 0

  return (
    <PageShell merchantName={request.merchantName} merchantLogo={request.merchantLogo} trust={request.trust}>
      <div className="animate-settle space-y-6">
        {/* Header */}
        <div className="space-y-1">
          {isParticipant ? (
            <>
              <p className="text-caps text-[var(--dark-text-3)]">
                Hi {request.participant!.name} — your share
              </p>
              <p className="text-display-2 font-serif italic text-[var(--dark-text)]">
                {displayAmountFormatted}
              </p>
              {request.label && (
                <p className="text-body-s text-[var(--dark-text-2)]">
                  {request.label} — {displayAmountFormatted} of {formatTokenAmount(request.amount, request.tokenSymbol)} total
                </p>
              )}
            </>
          ) : (
            <>
              <p className="text-caps text-[var(--dark-text-3)]">
                {request.label
                  ? isInvoice ? `Invoice from ${request.label}` : `${request.label} is requesting`
                  : 'Payment request'}
              </p>
              <p className="text-display-2 font-serif italic text-[var(--dark-text)]">
                {displayAmountFormatted}
              </p>
              {isSplit && !isParticipant && (
                <p className="text-body-s text-[var(--dark-text-2)]">
                  Your share — {displayAmountFormatted} of {formatTokenAmount(request.amount, request.tokenSymbol)} total
                </p>
              )}
            </>
          )}
        </div>

        {/* Invoice line items */}
        {isInvoice && (
          <InvoiceTable items={request.invoiceItems!} total={request.amount} subtotal={request.subtotal} tax={request.tax} taxBps={request.taxBps} />
        )}

        {/* Meta row */}
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="signal">
            <span className="h-1.5 w-1.5 rounded-full bg-signal-500 animate-pulse-dot" />
            Pending
          </Badge>
          {isSplit && (
            <Badge variant="default">
              {request.splitPaid}/{request.splitTotal} paid
            </Badge>
          )}
          {isInvoice && request.invoiceItems?.[0]?.invoiceNumber && (
            <Badge variant="default">{request.invoiceItems[0].invoiceNumber}</Badge>
          )}
          {request.subscription && (
            <a href={request.subscription.manageUrl} className="no-underline">
              <Badge variant="signal">Subscription · {request.subscription.interval}</Badge>
            </a>
          )}
          <span className="ml-auto font-mono text-xs text-[var(--dark-text-2)]">{timeRemaining}</span>
        </div>

        {request.sandbox && (
          <p className="rounded-lg border border-[var(--dark-border)] bg-[var(--dark-elevated)] px-3 py-2 text-xs text-[var(--dark-text-2)]">
            {request.demoSettlement
              ? 'SANDBOX · test card · testnet dollars. No real money moves.'
              : 'Testnet · no real money moves.'}
          </p>
        )}

        {returnedFromCheckout && (
          <p className="animate-pulse text-center text-xs text-[var(--dark-text-2)]" role="status">
            Confirming your payment… this page updates by itself.
          </p>
        )}

        {Number(request.paidMicros || '0') > 0 && (
          <p className="text-xs text-[var(--dark-text-2)]">
            {formatTokenAmount(Number(request.paidMicros) / 10 ** request.tokenDecimals, request.tokenSymbol)} received so far
          </p>
        )}

        <div className="h-px bg-[var(--dark-border)]" />

        {/* Payment buttons */}
        <div className="space-y-3">
          <p className="text-caps mb-4 text-[var(--dark-text-3)]">How would you like to pay?</p>

          <CardPayButton
            requestId={requestId}
            participantToken={participantToken}
            enabled={request.cardEnabled}
            sandbox={request.sandbox}
          />

          <div className="flex items-center gap-3">
            <div className="h-px flex-1 bg-[var(--dark-border)]" />
            <span className="text-xs text-[var(--dark-text-3)]">or</span>
            <div className="h-px flex-1 bg-[var(--dark-border)]" />
          </div>

          <CryptoPayButton
            requestId={requestId}
            participantToken={participantToken}
            crossChainEnabled={request.crossChainEnabled}
            onSubmitted={refresh}
          />
        </div>

        <ShareSection requestId={requestId} participantToken={participantToken} />

        <div className="pt-2 text-center">
          <p className="text-xs text-[var(--dark-text-3)]">
            Settles on{' '}
            <span className="font-medium text-[var(--dark-text-2)]">{request.chainName}</span>
            {' '}in{' '}
            <span className="font-medium text-[var(--dark-text-2)]">{request.tokenSymbol}</span>
          </p>
        </div>
      </div>
    </PageShell>
  )
}

const INVOICE_TH_CLASS = 'px-3.5 py-2 font-semibold text-[11px] uppercase tracking-[0.05em] text-[var(--dark-text-3)]'
const INVOICE_TD_CLASS = 'px-3.5 py-2.5'

function InvoiceTable({ items, total, subtotal, tax, taxBps }: { items: InvoiceItem[]; total: number; subtotal?: number; tax?: number; taxBps?: number }) {
  const hasTax = !!taxBps && taxBps > 0 && subtotal !== undefined && tax !== undefined
  return (
    <div className="overflow-hidden rounded-[10px] border border-[var(--dark-border)] bg-[rgba(255,255,255,0.03)]">
      <table className="w-full border-collapse text-[13px]">
        <thead>
          <tr className="border-b border-[var(--dark-border)]">
            <th className={`${INVOICE_TH_CLASS} text-left`}>Item</th>
            <th className={`${INVOICE_TH_CLASS} text-right`}>Qty</th>
            <th className={`${INVOICE_TH_CLASS} text-right`}>Price</th>
            <th className={`${INVOICE_TH_CLASS} text-right`}>Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className={i < items.length - 1 ? 'border-b border-[var(--dark-border)]' : ''}>
              <td className={`${INVOICE_TD_CLASS} text-[var(--dark-text)]`}>{item.description}</td>
              <td className={`${INVOICE_TD_CLASS} text-right text-[var(--dark-text-2)]`}>{item.quantity}</td>
              <td className={`${INVOICE_TD_CLASS} text-right font-mono text-[var(--dark-text-2)]`}>${item.unitPrice.toFixed(2)}</td>
              <td className={`${INVOICE_TD_CLASS} text-right font-mono font-semibold text-[var(--dark-text)]`}>${(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
        <tfoot>
          {hasTax && (
            <>
              <tr className="border-t border-[var(--dark-border)]">
                <td colSpan={3} className={`${INVOICE_TD_CLASS} text-right text-xs text-[var(--dark-text-2)]`}>Subtotal</td>
                <td className={`${INVOICE_TD_CLASS} text-right font-mono text-[var(--dark-text-2)]`}>${subtotal!.toFixed(2)}</td>
              </tr>
              <tr>
                <td colSpan={3} className={`${INVOICE_TD_CLASS} text-right text-xs text-[var(--dark-text-2)]`}>Tax ({taxBps! / 100}%)</td>
                <td className={`${INVOICE_TD_CLASS} text-right font-mono text-[var(--dark-text-2)]`}>${tax!.toFixed(2)}</td>
              </tr>
            </>
          )}
          <tr className="border-t border-[var(--dark-border)]">
            <td colSpan={3} className={`${INVOICE_TD_CLASS} text-right text-xs font-semibold uppercase tracking-[0.05em] text-[var(--dark-text-2)]`}>Total</td>
            <td className={`${INVOICE_TD_CLASS} text-right font-mono font-bold text-[var(--dark-text)]`}>${total.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>
  )
}

function ShareSection({ requestId, participantToken }: { requestId: string; participantToken?: string }) {
  const [open, setOpen] = useState(false)
  const [copied, setCopied] = useState(false)
  const linkRef = useRef<string>('')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const base = `${window.location.origin}/pay/${requestId}`
      linkRef.current = participantToken ? `${base}?p=${participantToken}` : base
    }
  }, [requestId, participantToken])

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(linkRef.current)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* ignore */ }
  }

  return (
    <div className="pt-1">
      <div className="mb-4 h-px bg-[var(--dark-border)]" />
      <button onClick={() => setOpen((v) => !v)} className="flex w-full items-center justify-between text-xs text-[var(--dark-text-2)] transition-colors">
        <span className="flex items-center gap-1.5"><QrIcon />Share this request</span>
        <ChevronIcon open={open} />
      </button>
      {open && (
        <div className="animate-rise-in mt-4 flex flex-col items-center gap-4">
          <div className="relative rounded-xl bg-white p-3">
            <QRCodeSVG value={linkRef.current || `/pay/${requestId}`} size={180} level="H" bgColor="#ffffff" fgColor="#000000" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-md bg-white p-1">
              <MistMark size={40} />
            </div>
          </div>
          <button
            onClick={copyLink}
            className={`flex items-center gap-2 rounded-lg border px-4 py-2 text-xs transition-all ${copied ? 'border-[rgba(46,158,107,0.3)] bg-[rgba(46,158,107,0.12)] text-[#2E9E6B]' : 'border-[var(--dark-border)] bg-[var(--dark-elevated)] text-[var(--dark-text-2)]'}`}
          >
            {copied ? <CheckIcon /> : <CopyIcon />}
            {copied ? 'Copied!' : 'Copy link'}
          </button>
          <p className="text-center text-xs text-[var(--dark-text-3)]">Scan to pay</p>
        </div>
      )}
    </div>
  )
}

// A stranger opening a payment link wants to know who is asking: only coarse, safe-to-show facts (see TrustLine).
function TrustLine({ trust }: { trust?: ReceiverTrust }) {
  if (!trust) return null
  const parts = [
    trust.verifiedPhone ? `✓ Phone verified ${trust.verifiedPhone}` : null,
    trust.fulfilledCount > 0 ? `${trust.fulfilledCount} ${trust.fulfilledCount === 1 ? 'payment' : 'payments'} received` : null,
    trust.location,
  ].filter(Boolean)
  if (parts.length === 0) return null
  return <p className="mt-1 text-center text-[11px] text-[var(--dark-text-3)]">{parts.join(' · ')}</p>
}

function PageShell({ children, merchantName, merchantLogo, trust }: { children: React.ReactNode; merchantName?: string | null; merchantLogo?: string | null; trust?: ReceiverTrust }) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[var(--dark-bg)] p-4">
      <div className="w-full max-w-sm space-y-6">
        {merchantName ? (
          <div>
            <div className="flex items-center justify-center gap-2">
              {merchantLogo && <img src={merchantLogo} alt="" className="h-7 w-7 shrink-0 rounded-[6px] object-cover" />}
              <span className="text-[15px] font-semibold text-[var(--dark-text)]">{merchantName}</span>
              <span className="font-mono text-[10px] text-[var(--dark-text-3)]">via MistPay</span>
            </div>
            <TrustLine trust={trust} />
          </div>
        ) : (
          <MistWordmark className="w-full justify-center" theme="dark" href="/" />
        )}
        <div className="rounded-2xl border border-[var(--dark-border)] bg-[var(--dark-surface)] p-6 shadow-[0_24px_48px_rgba(0,0,0,0.4)] sm:p-8">
          {children}
        </div>
        <p className="text-center text-xs text-[var(--dark-text-3)]">No account needed · No wallet required</p>
      </div>
    </div>
  )
}

function StatusCard({ icon, title, subtitle, badge }: { icon: React.ReactNode; title: string; subtitle: string; badge: React.ReactNode }) {
  return (
    <div className="animate-rise-in space-y-4 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[var(--dark-elevated)] text-[var(--dark-text-2)]">
        {icon}
      </div>
      {badge}
      <div>
        <p className="text-title-2 mb-1 text-[var(--dark-text)]">{title}</p>
        <p className="text-body-s text-[var(--dark-text-2)]">{subtitle}</p>
      </div>
    </div>
  )
}

function QrIcon() { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="3" width="7" height="7" /><rect x="14" y="3" width="7" height="7" /><rect x="3" y="14" width="7" height="7" /><path d="M14 14h.01M14 17h3M17 14h3M17 17v3M20 17v.01" /></svg> }
function ChevronIcon({ open }: { open: boolean }) { return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={`transition-transform duration-200 ${open ? 'rotate-180' : 'rotate-0'}`}><polyline points="6 9 12 15 18 9" /></svg> }
function CopyIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg> }
function CheckIcon() { return <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg> }
function ClockIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg> }
function XIcon() { return <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg> }
function ExternalLinkIcon() { return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6" /><polyline points="15 3 21 3 21 9" /><line x1="10" y1="14" x2="21" y2="3" /></svg> }
