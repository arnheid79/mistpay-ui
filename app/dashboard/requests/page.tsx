'use client'

import { Fragment, useEffect, useMemo, useRef, useState, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { downloadCsv } from '@/lib/csv'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

interface PaymentRequest {
  request_id_hex: string
  amount_usdc: string
  label: string | null
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired'
  split_total: number
  split_paid: number
  expires_at: number
  created_at: number
  fulfilled_at: number | null
  payer_address: string | null
  token_symbol: string
  tx_hash: string | null
  explorer_url: string | null
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
    window.addEventListener('storage', updateTheme)
    return () => {
      window.removeEventListener('mistpay_theme_change', updateTheme)
      window.removeEventListener('storage', updateTheme)
    }
  }, [])

  return theme
}

// ─── Validation ───────────────────────────────────────────────────────────────

function amountError(val: string): string | null {
  if (!val.trim()) return 'Amount is required'
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return 'Must be greater than $0'
  if (n > 100_000) return 'Maximum $100,000'
  return null
}
function splitError(val: string): string | null {
  const n = parseInt(val)
  if (isNaN(n) || n < 1) return 'Must be at least 1'
  if (n > 20) return 'Maximum 20 people'
  return null
}

function errClass(hasError: boolean): string {
  return hasError ? 'border-[rgba(224,84,84,0.5)] shadow-[0_0_0_3px_rgba(224,84,84,0.06)]' : ''
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function FieldError({ msg, id }: { msg?: string | null; id?: string }) {
  if (!msg) return null
  return <p id={id} role="alert" className="mt-1 font-mono text-xs leading-[1.4] text-rose-500">{msg}</p>
}

const STATUS_CLASSES: Record<string, { darkBadge: string; lightBadge: string; darkText: string; lightText: string }> = {
  fulfilled: {
    darkBadge: 'bg-[var(--fn-teal-bg)] border-[rgba(77,184,133,0.25)]',
    lightBadge: 'bg-emerald-50 border-emerald-200',
    darkText: 'text-[var(--fn-teal-fg)]',
    lightText: 'text-emerald-700',
  },
  pending: {
    darkBadge: 'bg-[rgba(75,107,255,0.1)] border-[rgba(75,107,255,0.2)]',
    lightBadge: 'bg-blue-50 border-blue-200',
    darkText: 'text-[#8FA4FF]',
    lightText: 'text-blue-700',
  },
  cancelled: {
    darkBadge: 'bg-[var(--fn-gray-bg)] border-[rgba(143,160,176,0.12)]',
    lightBadge: 'bg-slate-100 border-slate-200',
    darkText: 'text-[var(--fn-gray-fg)]',
    lightText: 'text-slate-600',
  },
  expired: {
    darkBadge: 'bg-[var(--fn-gray-bg)] border-[rgba(143,160,176,0.12)]',
    lightBadge: 'bg-slate-100 border-slate-200',
    darkText: 'text-[var(--fn-gray-fg)]',
    lightText: 'text-slate-600',
  },
}

function StatusBadge({ status, isLight }: { status: string; isLight?: boolean }) {
  const c = STATUS_CLASSES[status] ?? STATUS_CLASSES.expired
  const badge = isLight ? c.lightBadge : c.darkBadge
  const text = isLight ? c.lightText : c.darkText
  return (
    <span className={`inline-flex items-center gap-[5px] rounded-pill border px-[9px] py-[3px] font-mono text-[11px] font-semibold tracking-[0.04em] ${badge} ${text}`}>
      <span className="h-1 w-1 shrink-0 rounded-full bg-current" />
      {status}
    </span>
  )
}

function DetailField({ label, value, mono, isLight }: { label: string; value: string; mono?: boolean; isLight?: boolean }) {
  return (
    <div>
      <p className={`mb-1 font-mono text-[11px] uppercase tracking-[0.06em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`m-0 ${isLight ? 'text-slate-900' : 'text-paper'} ${mono ? 'font-mono text-xs' : 'text-sm'}`}>{value}</p>
    </div>
  )
}

function timeAgo(unix: number) {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function fmtDateTime(unix: number) {
  return new Date(unix * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function RequestsContent() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'

  const [authToken, setAuthToken] = useState<string | null>(null)
  const [requests, setRequests] = useState<PaymentRequest[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [cancelling, setCancelling] = useState<string | null>(null)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newRequest, setNewRequest] = useState<{ requestId: string; link: string } | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [expandedHistoryId, setExpandedHistoryId] = useState<string | null>(null)

  // Form fields
  const [amount, setAmount] = useState('')
  const [label, setLabel] = useState(searchParams.get('label') ?? '')
  const [splitTotal, setSplitTotal] = useState('1')

  // Validation state
  const [amountTouched, setAmountTouched] = useState(false)
  const [splitTouched, setSplitTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    fetchRequests(token)
  }, [])

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  useEffect(() => {
    const param = searchParams.get('label')
    if (param) setLabel(param)
  }, [searchParams])

  async function fetchRequests(token: string) {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/my/requests`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 && token !== 'demo-token') { localStorage.removeItem('mistpay_auth'); router.replace('/'); return }
      const data = await res.json()
      setRequests(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const aErr = amountError(amount)
  const sErr = splitError(splitTotal)
  const isValid = !aErr && !sErr

  const showAmt = submitAttempted || (amountTouched && amount.trim() !== '')
  const showSplit = submitAttempted || (splitTouched && splitTotal.trim() !== '')

  const splitCount = parseInt(splitTotal) || 1
  const perPerson = amount && parseFloat(amount) > 0 && splitCount > 1
    ? parseFloat(amount) / splitCount
    : null

  async function handleCreate() {
    setSubmitAttempted(true)
    if (!isValid || !authToken) return
    setCreating(true)
    setCreateError(null)
    setNewRequest(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/requests`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amount: parseFloat(amount),
          label: label.trim() || undefined,
          splitTotal: splitCount,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Creation failed')
      setNewRequest(data)
      setAmount(''); setLabel(''); setSplitTotal('1')
      setAmountTouched(false); setSplitTouched(false); setSubmitAttempted(false)
      fetchRequests(authToken)
    } catch (err: any) {
      setCreateError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  async function cancelRequest(id: string) {
    if (!authToken) return
    if (!confirm("Cancel this payment request? Your payer's link will stop working.")) return
    setCancelling(id)
    try {
      await fetch(`${BACKEND}/api/my/requests/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } })
      setRequests(prev => prev.map(r => r.request_id_hex === id ? { ...r, status: 'cancelled' as const } : r))
    } finally {
      setCancelling(null)
    }
  }

  const pending = requests.filter(r => r.status === 'pending')
  const allHistory = requests.filter(r => r.status !== 'pending')

  const [statusFilter, setStatusFilter] = useState<'all' | 'fulfilled' | 'cancelled' | 'expired'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const history = useMemo(() => allHistory.filter(r => {
    if (statusFilter !== 'all' && r.status !== statusFilter) return false
    if (dateFrom && r.created_at < new Date(dateFrom).getTime() / 1000) return false
    if (dateTo && r.created_at > new Date(dateTo).getTime() / 1000 + 86400) return false
    return true
  }), [allHistory, statusFilter, dateFrom, dateTo])

  function exportCsv() {
    downloadCsv(`mistpay-requests-${new Date().toISOString().slice(0, 10)}.csv`, history, [
      ['amount_usdc', 'Amount (USD)'],
      ['label', 'Memo'],
      ['status', 'Status'],
      ['created_at', 'Created (unix)'],
      ['fulfilled_at', 'Paid (unix)'],
      ['payer_address', 'Payer'],
      ['tx_hash', 'Tx hash'],
    ])
  }

  const payLink = (id: string) => typeof window !== 'undefined' ? `${window.location.origin}/pay/${id}` : `/pay/${id}`
  const waLink = (link: string, lbl?: string | null) =>
    `https://wa.me/?text=${encodeURIComponent(`Here's your payment link${lbl ? ` for ${lbl}` : ''}: ${link}`)}`

  function copyLink(text: string, id: string) {
    navigator.clipboard.writeText(text)
    setCopied(id)
    setTimeout(() => setCopied(null), 2000)
  }

  const secLabelClass = `mb-3.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`
  const cardClass = `mb-8 rounded-xl px-7 py-6 backdrop-blur-md transition-all ${
    isLight
      ? 'bg-white border border-slate-200/80 shadow-sm shadow-slate-200/50'
      : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'
  }`
  const labelClass = `mb-2 flex items-baseline gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] ${isLight ? 'text-slate-600' : 'text-slate-300'}`
  const inputBaseClass = `w-full rounded-xl px-4 py-2.5 font-sans text-sm outline-none transition-all duration-150 ${
    isLight
      ? 'border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-1 focus:ring-[#007a6c]/30'
      : 'border border-white/10 bg-black/40 text-paper focus:border-[#00d2b8]/50'
  }`
  const btnSecondaryClass = `cursor-pointer rounded-xl px-4 py-2 font-sans text-xs font-semibold transition-colors ${
    isLight
      ? 'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200'
      : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
  }`
  const btnSmallClass = `cursor-pointer rounded-lg px-3 py-1.5 font-sans text-xs font-medium transition-colors ${
    isLight
      ? 'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200'
      : 'border border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
  }`
  const thClass = `px-5 py-3.5 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.07em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`
  const tdClass = `px-5 py-4 text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`

  return (
    <div>
      <div className="mb-8 px-1.5">
        <h1 className={`mb-1 font-sans text-[22px] font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Payment Requests
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-[rgba(155,167,181,0.5)]'}`}>
          Create, track, and manage all your digital USDC payment links.
        </p>
      </div>

      {/* Create form */}
      <section className={cardClass}>
        <p className={secLabelClass}>New request</p>

        <div className="mb-1 grid grid-cols-1 md:grid-cols-12 gap-4">
          {/* Amount */}
          <div className="md:col-span-3">
            <label htmlFor="req-amount" className={labelClass}>Amount (USD)</label>
            <div className="relative">
              <span className={`pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 font-sans text-sm ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>$</span>
              <input
                id="req-amount" ref={amountRef}
                type="number" min="0.01" max="100000" step="any"
                placeholder="50.00"
                value={amount}
                onChange={e => { setAmount(e.target.value); if (submitAttempted) setSubmitAttempted(false) }}
                onBlur={() => setAmountTouched(true)}
                onKeyDown={e => { if (e.key === 'Enter') document.getElementById('req-label')?.focus() }}
                className={`${inputBaseClass} pl-7 ${errClass(showAmt && !!aErr)}`}
                aria-invalid={showAmt && !!aErr}
                aria-describedby={showAmt && aErr ? 'amt-err' : undefined}
                autoComplete="off"
              />
            </div>
            {showAmt && aErr ? <FieldError msg={aErr} id="amt-err" /> : null}
          </div>

          {/* Memo */}
          <div className="md:col-span-6">
            <label htmlFor="req-label" className={labelClass}>
              Memo <span className={`font-normal tracking-normal lowercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
            </label>
            <input
              id="req-label" type="text"
              placeholder="Dinner split, Invoice #42…"
              value={label}
              onChange={e => setLabel(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') document.getElementById('req-split')?.focus() }}
              className={inputBaseClass}
              autoComplete="off"
              maxLength={100}
            />
          </div>

          {/* Split */}
          <div className="md:col-span-3">
            <label htmlFor="req-split" className={labelClass}>Split between</label>
            <input
              id="req-split"
              type="number" min="1" max="20" step="1"
              value={splitTotal}
              onChange={e => setSplitTotal(e.target.value)}
              onBlur={() => setSplitTouched(true)}
              onKeyDown={e => { if (e.key === 'Enter') handleCreate() }}
              className={`${inputBaseClass} ${errClass(showSplit && !!sErr)}`}
              aria-invalid={showSplit && !!sErr}
              aria-describedby={showSplit && sErr ? 'split-err' : undefined}
            />
            {showSplit && sErr
              ? <FieldError msg={sErr} id="split-err" />
              : perPerson != null
              ? <p className={`mt-[5px] font-mono text-xs font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>${perPerson.toFixed(2)} per person</p>
              : null}
          </div>
        </div>

        <div className="mt-5 flex items-center gap-3">
          <button
            onClick={handleCreate}
            disabled={creating}
            className={`inline-flex items-center gap-2 rounded-xl border-none bg-[#00d2b8] px-6 py-3 font-sans text-sm font-bold text-slate-950 transition-all hover:bg-[#00b8a1] cursor-pointer ${creating ? 'cursor-not-allowed opacity-70' : 'opacity-100'}`}
          >
            {creating ? <><span className="spinner" /> Creating…</> : 'Generate payment link'}
          </button>
          {createError && (
            <p role="alert" className="m-0 font-mono text-xs text-rose-500">{createError}</p>
          )}
        </div>

        {newRequest && (
          <div className={`mt-6 flex flex-col sm:flex-row items-start gap-5 rounded-2xl border p-5 ${
            isLight
              ? 'border-[#00a894]/40 bg-teal-50/60'
              : 'border-[#00d2b8]/30 bg-[#00d2b8]/10'
          }`}>
            <img src={`/api/pay/${newRequest.requestId}/qr`} alt="QR code" className="h-[110px] w-[110px] shrink-0 rounded-xl bg-white p-1 border border-slate-200" />
            <div className="min-w-0 flex-1">
              <span className={`mb-2 inline-flex items-center gap-1.5 rounded-full border px-3 py-0.5 font-mono text-[11px] font-bold ${
                isLight ? 'border-[#00a894]/40 bg-[#00d2b8]/20 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
              }`}>
                <span className={`h-1.5 w-1.5 rounded-full animate-pulse ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} />Link ready
              </span>
              <p className={`mb-3 break-all font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{payLink(newRequest.requestId)}</p>
              <div className="flex flex-wrap gap-2.5">
                <button onClick={() => copyLink(payLink(newRequest.requestId), newRequest.requestId)} className={btnSecondaryClass}>
                  {copied === newRequest.requestId ? '✓ Copied' : 'Copy link'}
                </button>
                <a href={waLink(payLink(newRequest.requestId))} target="_blank" rel="noreferrer"
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 font-sans text-xs font-semibold no-underline transition-colors ${
                    isLight
                      ? 'border-emerald-300 bg-emerald-100/80 text-emerald-800 hover:bg-emerald-200'
                      : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
                  }`}>
                  <WaIcon /> Share via WhatsApp
                </a>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* List */}
      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <span className="sr-only">Loading requests…</span>
          {[0, 1, 2].map(i => <div key={i} className={`h-20 animate-pulse rounded-2xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'border-white/10 bg-white/5'}`} />)}
        </div>
      ) : requests.length === 0 ? (
        <div className={`rounded-2xl px-6 py-8 text-center backdrop-blur-md ${isLight ? 'bg-white border border-slate-200/80' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'}`}>
          <p className={`m-0 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No payment requests yet. Generate your first link above.</p>
        </div>
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <p className={secLabelClass}>Pending <span className={`font-normal normal-case tracking-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>({pending.length})</span></p>
              <ul className={`flex flex-col gap-3 list-none p-0 ${history.length > 0 ? 'mb-8' : ''}`}>
                {pending.map(r => (
                  <li key={r.request_id_hex} className={`flex flex-col sm:flex-row items-start sm:items-center gap-4 rounded-2xl px-6 py-4 backdrop-blur-md ${
                    isLight ? 'bg-white border border-slate-200/80 shadow-sm' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'
                  }`}>
                    <img src={`/api/pay/${r.request_id_hex}/qr`} alt="QR" className="h-14 w-14 shrink-0 rounded-xl bg-white p-1 border border-slate-200" />
                    <div className="min-w-0 flex-1 w-full">
                      <div className="mb-1 flex items-center justify-between gap-3">
                        <div className="flex items-center gap-2.5">
                          <span className={`font-sans text-xl font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>${parseFloat(r.amount_usdc).toFixed(2)}</span>
                          {r.split_total > 1 && <span className={`rounded-md border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                            isLight ? 'border-[#00a894]/40 bg-[#00d2b8]/15 text-[#007a6c]' : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8]'
                          }`}>÷ {r.split_total}</span>}
                        </div>
                        <StatusBadge status={r.status} isLight={isLight} />
                      </div>
                      {r.label && <p className={`mb-2 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{r.label}</p>}
                      <div className="flex flex-wrap items-center gap-2.5 mt-2">
                        <span className={`font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(r.created_at)}</span>
                        <button onClick={() => copyLink(payLink(r.request_id_hex), r.request_id_hex)} className={btnSmallClass}>
                          {copied === r.request_id_hex ? '✓ Copied' : 'Copy link'}
                        </button>
                        <a href={waLink(payLink(r.request_id_hex), r.label)} target="_blank" rel="noreferrer" className={`inline-flex items-center gap-1 rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold no-underline transition-colors ${
                          isLight ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500/20'
                        }`}>
                          <WaIcon /> WhatsApp
                        </a>
                        <a href={payLink(r.request_id_hex)} target="_blank" rel="noreferrer" className={`${btnSmallClass} no-underline`}>Open ↗</a>
                        <button onClick={() => cancelRequest(r.request_id_hex)} disabled={cancelling === r.request_id_hex}
                          className="ml-auto rounded-lg border border-rose-500/25 bg-rose-500/10 px-3 py-1.5 font-sans text-xs font-semibold text-rose-500 hover:bg-rose-500/20 cursor-pointer transition-colors">
                          {cancelling === r.request_id_hex ? 'Cancelling…' : 'Cancel'}
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}

          {allHistory.length > 0 && (
            <>
              <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
                <p className={`${secLabelClass} mb-0`}>History <span className={`font-normal normal-case tracking-normal ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>({history.length}{history.length !== allHistory.length ? ` of ${allHistory.length}` : ''})</span></p>
                <div className="flex flex-wrap items-center gap-2.5">
                  <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs outline-none cursor-pointer ${
                      isLight ? 'border border-slate-200 bg-white text-slate-900' : 'border border-white/10 bg-black/40 text-paper'
                    }`}>
                    <option value="all">All statuses</option>
                    <option value="fulfilled">Fulfilled</option>
                    <option value="cancelled">Cancelled</option>
                    <option value="expired">Expired</option>
                  </select>
                  <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="From date"
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs outline-none ${
                      isLight ? 'border border-slate-200 bg-white text-slate-900' : 'border border-white/10 bg-black/40 text-paper'
                    }`} />
                  <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="To date"
                    className={`rounded-xl px-3 py-1.5 font-mono text-xs outline-none ${
                      isLight ? 'border border-slate-200 bg-white text-slate-900' : 'border border-white/10 bg-black/40 text-paper'
                    }`} />
                  <button onClick={exportCsv} disabled={history.length === 0} className={`rounded-xl border px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors cursor-pointer disabled:opacity-40 ${
                    isLight ? 'border-[#00a894]/40 bg-[#00d2b8]/15 text-[#007a6c] hover:bg-[#00d2b8]/25' : 'border-[#00d2b8]/30 bg-[#00d2b8]/10 text-[#00d2b8] hover:bg-[#00d2b8]/20'
                  }`}>
                    Export CSV
                  </button>
                </div>
              </div>
              {history.length === 0 ? (
                <div className={`mb-8 rounded-2xl px-6 py-8 text-center backdrop-blur-md ${isLight ? 'bg-white border border-slate-200/80' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'}`}>
                  <p className={`m-0 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No history matches these filters.</p>
                </div>
              ) : (
              <div className={`overflow-hidden rounded-2xl backdrop-blur-md ${
                isLight ? 'bg-white border border-slate-200/80 shadow-sm' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'
              }`}>
                <table className="w-full min-w-[640px] border-collapse">
                  <thead>
                    <tr className={`border-b ${isLight ? 'bg-slate-50 border-slate-200' : 'border-white/10 bg-black/30'}`}>
                      <th className={thClass}>Amount</th>
                      <th className={thClass}>Memo</th>
                      <th className={thClass}>Date</th>
                      <th className={thClass}>Status</th>
                      <th className={thClass}>Explorer</th>
                      <th className={thClass} aria-hidden="true" />
                    </tr>
                  </thead>
                  <tbody>
                    {history.map(r => {
                      const isOpen = expandedHistoryId === r.request_id_hex
                      const panelId = `hist-panel-${r.request_id_hex}`
                      return (
                        <Fragment key={r.request_id_hex}>
                          <tr
                            onClick={() => setExpandedHistoryId(isOpen ? null : r.request_id_hex)}
                            onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedHistoryId(isOpen ? null : r.request_id_hex) } }}
                            tabIndex={0}
                            role="button"
                            aria-expanded={isOpen}
                            aria-controls={panelId}
                            className={`cursor-pointer border-b transition-colors ${
                              isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-white/5 hover:bg-white/5'
                            }`}
                          >
                            <td className={`${tdClass} font-sans font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                              ${parseFloat(r.amount_usdc).toFixed(2)}
                              {r.split_total > 1 && <span className={`ml-2 rounded-md border px-2 py-0.5 font-mono text-[10px] font-semibold ${
                                isLight ? 'border-[#00a894]/40 bg-[#00d2b8]/15 text-[#007a6c]' : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8]'
                              }`}>÷ {r.split_total}</span>}
                            </td>
                            <td className={tdClass}>{r.label ?? <span className={isLight ? 'text-slate-400' : 'text-slate-400'}>—</span>}</td>
                            <td className={`${tdClass} font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{timeAgo(r.created_at)}</td>
                            <td className={tdClass}><StatusBadge status={r.status} isLight={isLight} /></td>
                            <td className={tdClass} onClick={e => e.stopPropagation()}>
                              {r.tx_hash && r.explorer_url ? (
                                <a href={r.explorer_url} target="_blank" rel="noreferrer" className={`font-mono text-xs no-underline hover:underline ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>View ↗</a>
                              ) : <span className={isLight ? 'text-slate-400' : 'text-slate-400'}>—</span>}
                            </td>
                            <td className={`${tdClass} text-right ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{isOpen ? '▲' : '▼'}</td>
                          </tr>
                          {isOpen && (
                            <tr>
                              <td id={panelId} colSpan={6} className={`border-b px-6 py-5 ${
                                isLight ? 'border-slate-200 bg-slate-50' : 'border-white/5 bg-black/40'
                              }`}>
                                <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-3">
                                  <DetailField label="Request ID" value={truncateAddr(r.request_id_hex)} mono isLight={isLight} />
                                  <DetailField label="Created" value={fmtDateTime(r.created_at)} isLight={isLight} />
                                  {r.split_total > 1 && <DetailField label="Split progress" value={`${r.split_paid}/${r.split_total} paid`} isLight={isLight} />}
                                  {r.fulfilled_at && <DetailField label="Paid" value={fmtDateTime(r.fulfilled_at)} isLight={isLight} />}
                                  {r.payer_address && <DetailField label="Payer" value={truncateAddr(r.payer_address)} mono isLight={isLight} />}
                                  {r.tx_hash && (
                                    <div>
                                      <p className={`mb-1 font-mono text-[11px] uppercase tracking-[0.06em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Transaction</p>
                                      {r.explorer_url ? (
                                        <a href={r.explorer_url} target="_blank" rel="noreferrer" className={`font-mono text-xs no-underline hover:underline ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                                          {truncateAddr(r.tx_hash)} ↗
                                        </a>
                                      ) : <p className={`m-0 font-mono text-xs ${isLight ? 'text-slate-900' : 'text-paper'}`}>{truncateAddr(r.tx_hash)}</p>}
                                    </div>
                                  )}
                                </div>
                              </td>
                            </tr>
                          )}
                        </Fragment>
                      )
                    })}
                  </tbody>
                </table>
              </div>
              )}
            </>
          )}
        </>
      )}
    </div>
  )
}

export default function RequestsPage() {
  return <Suspense><RequestsContent /></Suspense>
}

function WaIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
