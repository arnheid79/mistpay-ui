'use client'

import { Fragment, useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { downloadCsv } from '@/lib/csv'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

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

// ─── Types ────────────────────────────────────────────────────────────────────

interface LineItemDraft {
  description: string
  quantity: string
  unit_price: string
}

interface Invoice {
  request_id_hex: string
  amount_usdc: string
  label: string | null
  status: string
  created_at: number
  fulfilled_at: number | null
  payer_address: string | null
  tx_hash: string | null
  explorer_url: string | null
  invoice_number: string | null
  due_date: number | null
  notes: string | null
  items: Array<{ description: string; quantity: number; unit_price_usdc: number }>
}

interface BusinessProfile {
  business_name: string
  invoice_prefix: string
  invoice_counter: number
  logo_data: string | null
  default_tax_bps?: number
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function parseNum(s: string): number {
  const n = parseFloat(s)
  return isNaN(n) ? 0 : n
}
function rowTotal(item: LineItemDraft) {
  return parseNum(item.quantity) * parseNum(item.unit_price)
}
function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
function fmtDateTime(unix: number) {
  return new Date(unix * 1000).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: 'numeric', minute: '2-digit' })
}
function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}
function dueDateLabel(days: string) {
  const n = parseInt(days)
  if (!n || n < 1 || n > 365) return null
  return new Date(Date.now() + n * 86_400_000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

type ItemErrors = { description?: string; quantity?: string; unit_price?: string }
function validateItem(item: LineItemDraft): ItemErrors {
  const e: ItemErrors = {}
  if (!item.description.trim()) e.description = 'Description is required'
  if (!item.quantity || parseNum(item.quantity) <= 0) e.quantity = 'Enter a quantity > 0'
  if (!item.unit_price || parseNum(item.unit_price) <= 0) e.unit_price = 'Enter a price > 0'
  return e
}
function allItemsValid(items: LineItemDraft[]) {
  return items.every(i => Object.keys(validateItem(i)).length === 0)
}

function errClass(hasError: boolean): string {
  return hasError ? 'border-[rgba(224,84,84,0.5)] shadow-[0_0_0_3px_rgba(224,84,84,0.06)]' : ''
}

function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null
  return <p role="alert" className="mt-1 font-mono text-xs leading-[1.4] text-rose-500">{msg}</p>
}

const STATUS_CLASSES: Record<string, { darkBadge: string; lightBadge: string; darkText: string; lightText: string }> = {
  fulfilled: {
    darkBadge: 'bg-[var(--fn-teal-bg)] border-[rgba(77,184,133,0.25)]',
    lightBadge: 'bg-emerald-50 border-emerald-200',
    darkText: 'text-[var(--fn-teal-fg)]',
    lightText: 'text-emerald-700',
  },
  pending: {
    darkBadge: 'bg-[#00d2b8]/15 border-[#00d2b8]/30',
    lightBadge: 'bg-blue-50 border-blue-200',
    darkText: 'text-[#00d2b8]',
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

function OverdueBadge({ isLight }: { isLight?: boolean }) {
  return (
    <span className={`inline-flex items-center gap-[5px] rounded-pill border px-[9px] py-[3px] font-mono text-[11px] font-semibold tracking-[0.04em] ${
      isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-500/30 bg-amber-500/15 text-amber-400'
    }`}>
      <span className="h-1 w-1 shrink-0 rounded-full bg-current" />
      overdue
    </span>
  )
}

function ZigzagTopBorder({ className = 'h-3.5 w-full text-[#00d2b8]' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 120 12" preserveAspectRatio="none" fill="none">
      <path
        d="M0 12 L4 2 L8 12 L12 2 L16 12 L20 2 L24 12 L28 2 L32 12 L36 2 L40 12 L44 2 L48 12 L52 2 L56 12 L60 2 L64 12 L68 2 L72 12 L76 2 L80 12 L84 2 L88 12 L92 2 L96 12 L100 2 L104 12 L108 2 L112 12 L116 2 L120 12"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CheckLineIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function InvoiceDocument({
  businessName, logoData, invoiceNumber, status, clientLabel, dueDate, items, notes, isLight,
}: {
  businessName: string
  logoData?: string | null
  invoiceNumber: string
  status?: string
  clientLabel: string
  dueDate: number | null
  items: Array<{ description: string; quantity: number; unitPrice: number }>
  notes: string
  isLight?: boolean
}) {
  const total = items.reduce((s, it) => s + it.quantity * it.unitPrice, 0)
  return (
    <div
      className={`relative flex min-h-[460px] flex-col justify-between rounded-b-xl rounded-t-sm p-7 transition-all ${
        isLight
          ? 'bg-white border-x border-b border-t-0 border-slate-300 text-slate-900 shadow-lg shadow-slate-200/60'
          : 'border-x border-b border-t-0 border-[#00d2b8]/40 text-paper'
      }`}
      style={{
        background: isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(8, 48, 56, 0.98) 0%, rgba(5, 26, 32, 0.99) 100%)',
        boxShadow: isLight ? '0 8px 30px rgba(15,23,42,0.08)' : '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 12px 24px -8px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div className="absolute -top-2 left-0 right-0 z-20 pointer-events-none">
        <ZigzagTopBorder className={`h-4 w-full ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`} />
      </div>

      <div className="relative z-10 pt-2">
        {/* Document Header */}
        <div className={`mb-6 flex items-start justify-between border-b pb-4 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="flex items-center gap-3">
            {logoData ? (
              <img src={logoData} alt="" className={`h-10 w-10 rounded-lg object-cover border shadow-sm ${isLight ? 'border-slate-200' : 'border-[#00d2b8]/30'}`} />
            ) : (
              <div className={`flex h-10 w-10 items-center justify-center rounded-lg font-sans font-bold text-lg ${
                isLight ? 'bg-teal-50 border border-teal-200 text-[#007a6c]' : 'bg-[#00d2b8]/20 border border-[#00d2b8]/40 text-[#00d2b8]'
              }`}>
                {(businessName.trim()[0] || 'B').toUpperCase()}
              </div>
            )}
            <div>
              <div className={`font-sans text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>{businessName}</div>
              <div className={`font-mono text-xs font-semibold tracking-wider ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{invoiceNumber}</div>
            </div>
          </div>

          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 font-mono text-[11px] font-bold ${
            status === 'fulfilled'
              ? (isLight ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]')
              : (isLight ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-white/15 bg-white/5 text-slate-300')
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${status === 'fulfilled' ? (isLight ? 'bg-emerald-600' : 'bg-[#00d2b8]') : (isLight ? 'bg-slate-500' : 'bg-slate-400')}`} />
            {status === 'fulfilled' ? 'PAID' : 'INVOICE PREVIEW'}
          </span>
        </div>

        {/* Bill Metadata Grid */}
        <div className={`mb-6 grid grid-cols-2 gap-4 rounded-lg border p-4 ${
          isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
        }`}>
          <div>
            <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Billed To</p>
            <p className={`font-sans text-xs font-bold truncate ${isLight ? 'text-slate-900' : 'text-paper'}`}>{clientLabel.trim() || 'Client'}</p>
          </div>
          <div>
            <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider mb-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Payment Due</p>
            <p className={`font-sans text-xs font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{dueDate ? fmtDate(dueDate) : 'On Receipt'}</p>
          </div>
        </div>

        {/* Line Items Table */}
        <div className="mb-6">
          <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Line Items</p>
          <div className={`rounded-lg border p-3.5 space-y-2.5 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/30 border-white/10'}`}>
            {items.length === 0 ? (
              <p className={`font-mono text-xs italic py-1 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No line items specified</p>
            ) : (
              items.map((it, i) => (
                <div key={i} className={`flex items-center justify-between text-xs py-1.5 border-b last:border-b-0 ${isLight ? 'border-slate-200/80' : 'border-white/5'}`}>
                  <div className="min-w-0 flex-1 pr-3 truncate">
                    <span className={`font-sans font-medium ${isLight ? 'text-slate-900' : 'text-slate-200'}`}>{it.description.trim() || `Item ${i + 1}`}</span>
                    <span className={`ml-2 font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({it.quantity} × ${it.unitPrice.toFixed(2)})</span>
                  </div>
                  <span className={`font-mono font-bold shrink-0 ${isLight ? 'text-slate-900' : 'text-paper'}`}>${(it.quantity * it.unitPrice).toFixed(2)}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Bill Footer Total */}
      <div className={`relative z-10 pt-4 border-t ${isLight ? 'border-slate-200' : 'border-white/15'}`}>
        <div className="flex items-end justify-between">
          <div>
            <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Amount Due</p>
            <p className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>USDC Settlement</p>
          </div>
          <div className="text-right">
            <p className={`font-sans text-3xl font-extrabold tracking-tight ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
              ${total.toFixed(2)}
            </p>
          </div>
        </div>

        {notes.trim() && (
          <div className={`mt-4 pt-3 border-t border-dashed font-sans text-xs ${isLight ? 'border-slate-200 text-slate-700' : 'border-white/10 text-slate-300'}`}>
            <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider mb-0.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Notes & Terms</p>
            <p className="m-0 leading-relaxed">{notes}</p>
          </div>
        )}
      </div>
    </div>
  )
}

function CreatedCard({ invoiceNumber, total, link, copied, onCopy, onReset, isLight }: {
  invoiceNumber: string
  total: number
  link: string
  copied: boolean
  onCopy: () => void
  onReset: () => void
  isLight?: boolean
}) {
  const btnSecondaryClass = `cursor-pointer rounded-xl px-4 py-2 font-sans text-xs font-semibold transition-colors ${
    isLight ? 'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
  }`
  return (
    <div
      className={`relative flex min-h-[460px] flex-col justify-between rounded-b-xl rounded-t-none p-7 text-center transition-all ${
        isLight
          ? 'bg-white border-x border-b border-t-0 border-slate-300 text-slate-900 shadow-lg shadow-slate-200/60'
          : 'border-x border-b border-t-0 border-[#00d2b8]/40 text-paper'
      }`}
      style={{
        background: isLight ? '#ffffff' : 'linear-gradient(180deg, rgba(8, 48, 56, 0.98) 0%, rgba(5, 26, 32, 0.99) 100%)',
        boxShadow: isLight ? '0 8px 30px rgba(15,23,42,0.08)' : '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 12px 24px -8px rgba(0, 0, 0, 0.6)',
      }}
    >
      <div className="absolute -top-3 left-0 right-0 z-20 pointer-events-none">
        <ZigzagTopBorder className={`h-4 w-full ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`} />
      </div>

      <div className="relative z-10 my-auto pt-3">
        <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full border ${
          isLight ? 'bg-teal-50 border-teal-200 text-[#007a6c]' : 'bg-[#00d2b8]/20 border-[#00d2b8]/40 text-[#00d2b8]'
        }`}>
          <CheckLineIcon className="w-7 h-7" />
        </div>
        <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{invoiceNumber} Created</p>
        <p className={`mb-6 font-sans text-4xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>${total.toFixed(2)}</p>
        <div className={`mb-6 rounded-lg border px-4 py-3 ${isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'}`}>
          <p className={`m-0 break-all font-mono text-xs ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{link}</p>
        </div>
        <div className="flex flex-wrap justify-center gap-2.5">
          <button onClick={onCopy} className={btnSecondaryClass}>{copied ? '✓ Copied' : 'Copy link'}</button>
          <a href={`https://wa.me/?text=${encodeURIComponent(`Here's your invoice ${invoiceNumber}: ${link}`)}`}
            target="_blank" rel="noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-xl border px-4 py-2 font-sans text-xs font-semibold no-underline transition-colors ${
              isLight ? 'border-emerald-300 bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'border-emerald-500/30 bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'
            }`}>
            <WaIcon /> Share via WhatsApp
          </a>
          <button onClick={onReset} className={`cursor-pointer rounded-xl border-none bg-transparent px-2 py-2 font-sans text-xs ${
            isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
          }`}>Create another →</button>
        </div>
      </div>
    </div>
  )
}

export default function InvoicesPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'

  const [authToken, setAuthToken] = useState<string | null>(null)
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<'all' | 'fulfilled' | 'pending' | 'cancelled' | 'expired'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [listCopied, setListCopied] = useState<string | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [taxPct, setTaxPct] = useState('')

  // Form fields
  const [clientLabel, setClientLabel] = useState('')
  const [dueInDays, setDueInDays] = useState('30')
  const [dueError, setDueError] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [items, setItems] = useState<LineItemDraft[]>([{ description: '', quantity: '1', unit_price: '' }])
  const [itemsTouched, setItemsTouched] = useState<Array<Set<string>>>([new Set()])
  const [showAllItemErrors, setShowAllItemErrors] = useState(false)

  // Create / result
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [result, setResult] = useState<{ requestId: string; invoiceNumber: string; total: number } | null>(null)
  const [copied, setCopied] = useState(false)

  const clientLabelRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    fetchInvoices(token)
    fetch(`${BACKEND}/api/business/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (!data) return
        setProfile(data)
        setTaxPct(data.default_tax_bps ? String(data.default_tax_bps / 100) : '')
      })
    clientLabelRef.current?.focus()
  }, [])

  async function fetchInvoices(token: string) {
    setListLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/invoices`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 && token !== 'demo-token') { localStorage.removeItem('mistpay_auth'); router.replace('/'); return }
      const data = await res.json()
      setInvoices(Array.isArray(data) ? data : [])
    } finally {
      setListLoading(false)
    }
  }

  function touchField(i: number, field: string) {
    setItemsTouched(prev => {
      const next = [...prev]
      next[i] = new Set([...next[i], field])
      return next
    })
  }
  function addItem() {
    setItems(p => [...p, { description: '', quantity: '1', unit_price: '' }])
    setItemsTouched(p => [...p, new Set()])
  }
  function removeItem(i: number) {
    if (items.length <= 1) return
    setItems(p => p.filter((_, idx) => idx !== i))
    setItemsTouched(p => p.filter((_, idx) => idx !== i))
  }
  function updateItem(i: number, field: keyof LineItemDraft, value: string) {
    setItems(p => p.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  async function handleCreate() {
    if (!allItemsValid(items)) { setShowAllItemErrors(true); return }
    const n = parseInt(dueInDays)
    if (dueInDays && (isNaN(n) || n < 1)) { setDueError('Must be at least 1 day'); return }
    if (dueInDays && n > 365) { setDueError('Maximum 365 days'); return }
    if (!authToken) return
    if (!taxValid) { setCreateError('Tax must be between 0 and 100%'); return }

    setCreating(true)
    setCreateError(null)
    try {
      const dueDate = dueInDays ? Math.floor(Date.now() / 1000) + parseInt(dueInDays) * 86_400 : undefined
      const res = await fetch(`${BACKEND}/api/invoices`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(it => ({
            description: it.description.trim(),
            quantity: parseNum(it.quantity),
            unit_price_usdc: parseNum(it.unit_price),
          })),
          label: clientLabel.trim() || undefined,
          dueDate,
          notes: notes.trim() || undefined,
          taxBps: Math.round(taxRate * 100),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Creation failed')
      setResult({ requestId: data.requestId, invoiceNumber: data.invoiceNumber, total: invoiceTotal })
      resetForm()
      fetchInvoices(authToken)
    } catch (err: any) {
      setCreateError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  function resetForm() {
    setClientLabel(''); setDueInDays('30'); setNotes(''); setDueError(null)
    setItems([{ description: '', quantity: '1', unit_price: '' }])
    setItemsTouched([new Set()])
    setShowAllItemErrors(false)
  }

  const grandTotal = items.reduce((s, it) => s + rowTotal(it), 0)
  const taxRate = taxPct.trim() === '' ? 0 : Number(taxPct)
  const taxValid = Number.isFinite(taxRate) && taxRate >= 0 && taxRate <= 100
  const taxAmount = taxValid ? (grandTotal * taxRate) / 100 : 0
  const invoiceTotal = grandTotal + taxAmount
  const payLink = (id: string) => typeof window !== 'undefined' ? `${window.location.origin}/pay/${id}` : `/pay/${id}`

  function copyLink(text: string, key: string) {
    navigator.clipboard.writeText(text)
    setListCopied(key)
    setTimeout(() => setListCopied(null), 2000)
  }
  function copyResult(text: string) {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const businessName = profile?.business_name?.trim() || 'Your business'
  const nextInvoiceNumber = profile ? `${profile.invoice_prefix}-${String(profile.invoice_counter + 1).padStart(3, '0')}` : 'DRAFT'
  const previewDueDate = dueInDays ? Math.floor(Date.now() / 1000) + parseInt(dueInDays) * 86_400 : null
  const nowSec = Math.floor(Date.now() / 1000)

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    if (statusFilter !== 'all' && inv.status !== statusFilter) return false
    if (dateFrom && inv.created_at < new Date(dateFrom).getTime() / 1000) return false
    if (dateTo && inv.created_at > new Date(dateTo).getTime() / 1000 + 86400) return false
    return true
  }), [invoices, statusFilter, dateFrom, dateTo])

  function exportCsv() {
    downloadCsv(`mistpay-invoices-${new Date().toISOString().slice(0, 10)}.csv`, filteredInvoices, [
      ['invoice_number', 'Invoice #'],
      ['label', 'Client'],
      ['amount_usdc', 'Amount (USD)'],
      ['status', 'Status'],
      ['created_at', 'Created (unix)'],
      ['due_date', 'Due (unix)'],
      ['fulfilled_at', 'Paid (unix)'],
      ['tx_hash', 'Tx hash'],
    ])
  }

  const secLabelClass = `mb-3.5 font-mono text-xs font-semibold uppercase tracking-[0.08em] ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`
  const cardClass = `rounded-xl px-7 py-6 backdrop-blur-md transition-all ${
    isLight
      ? 'bg-white border border-slate-200/80 shadow-sm shadow-slate-200/50'
      : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'
  }`
  const labelClass = `mb-2 flex items-baseline gap-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.07em] ${isLight ? 'text-slate-600' : 'text-slate-300'}`
  const colHeadClass = `font-mono text-[11px] font-semibold uppercase tracking-[0.07em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`
  const inputBaseClass = `w-full rounded-xl px-4 py-2.5 font-sans text-sm outline-none transition-all duration-150 ${
    isLight
      ? 'border border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-1 focus:ring-[#007a6c]/30'
      : 'border border-white/10 bg-black/40 text-paper focus:border-[#00d2b8]/50'
  }`
  const btnSecondaryClass = `cursor-pointer rounded-xl px-4 py-2 font-sans text-xs font-semibold transition-colors ${
    isLight ? 'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
  }`
  const thClass = `px-5 py-3.5 text-left font-mono text-[11px] font-semibold uppercase tracking-[0.07em] ${isLight ? 'text-slate-600' : 'text-slate-400'}`
  const tdClass = `px-5 py-4 text-sm ${isLight ? 'text-slate-800' : 'text-slate-200'}`

  return (
    <div>
      <div className="mb-8 px-1.5">
        <h1 className={`mb-1 font-sans text-[22px] font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Invoices
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-[rgba(155,167,181,0.5)]'}`}>
          Create itemized professional crypto invoices with automated client billing.
        </p>
      </div>

      {/* Compose + live preview */}
      <div className="mb-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_380px] lg:gap-8">
        <section className={cardClass}>
          <p className={secLabelClass}>New invoice</p>

          <div className="mb-5 grid grid-cols-1 gap-4 sm:grid-cols-[2fr_1fr]">
            <div>
              <label htmlFor="inv-client" className={labelClass}>
                Client / label <OptLabel isLight={isLight} />
              </label>
              <input
                id="inv-client" ref={clientLabelRef}
                type="text" autoComplete="off"
                placeholder="Ana García — consulting"
                value={clientLabel}
                onChange={e => setClientLabel(e.target.value)}
                maxLength={120}
                className={inputBaseClass}
              />
            </div>
            <div>
              <label htmlFor="inv-due" className={labelClass}>Due in (days)</label>
              <input
                id="inv-due" type="number" min="1" max="365"
                value={dueInDays}
                onChange={e => { setDueInDays(e.target.value); setDueError(null) }}
                onBlur={() => {
                  const n = parseInt(dueInDays)
                  if (dueInDays && (isNaN(n) || n < 1)) setDueError('Must be at least 1 day')
                  else if (n > 365) setDueError('Maximum 365 days')
                }}
                className={`${inputBaseClass} ${errClass(!!dueError)}`}
                aria-invalid={!!dueError}
                aria-describedby={dueDateLabel(dueInDays) ? 'due-hint' : undefined}
              />
              {dueError
                ? <FieldError msg={dueError} />
                : dueDateLabel(dueInDays) && (
                  <p id="due-hint" className={`mt-[5px] font-mono text-[13px] ${isLight ? 'text-slate-500' : 'text-[rgba(155,167,181,0.5)]'}`}>
                    Due {dueDateLabel(dueInDays)}
                  </p>
                )}
            </div>
          </div>

          <div className="mb-6">
            <label htmlFor="inv-notes" className={labelClass}>
              Notes <OptLabel isLight={isLight} />
            </label>
            <textarea
              id="inv-notes"
              placeholder="Payment terms, bank details, thank you note…"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={2}
              maxLength={500}
              className={`${inputBaseClass} resize-y leading-[1.6]`}
            />
          </div>

          <div className={`mb-3 border-t pt-5 ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'}`}>
            <div className={`mb-3 grid grid-cols-[1fr_88px_128px_64px_32px] gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'}`}>
              {['Description', 'Qty', 'Unit price', 'Total', ''].map((h, i) => (
                <span key={i} className={`${colHeadClass} ${i >= 1 && i <= 3 ? 'text-right' : 'text-left'}`}>{h}</span>
              ))}
            </div>

            <div className="mb-1 flex flex-col gap-2.5">
              {items.map((item, i) => {
                const errs = validateItem(item)
                const touched = itemsTouched[i] ?? new Set()
                const show = (field: keyof LineItemDraft) => showAllItemErrors || (touched.has(field) && item[field].trim() !== '')
                const total = rowTotal(item)

                return (
                  <div key={i}>
                    <div className="grid grid-cols-[1fr_88px_128px_64px_32px] items-start gap-2">
                      <div>
                        <input
                          type="text" placeholder="e.g. Design work · 10h"
                          value={item.description}
                          onChange={e => updateItem(i, 'description', e.target.value)}
                          onBlur={() => touchField(i, 'description')}
                          className={`${inputBaseClass} ${errClass(show('description') && !!errs.description)}`}
                          aria-invalid={show('description') && !!errs.description}
                          autoComplete="off"
                        />
                      </div>
                      <div>
                        <input
                          type="number" min="0.01" step="any" placeholder="1"
                          value={item.quantity}
                          onChange={e => updateItem(i, 'quantity', e.target.value)}
                          onBlur={() => touchField(i, 'quantity')}
                          className={`${inputBaseClass} text-right ${errClass(show('quantity') && !!errs.quantity)}`}
                          aria-invalid={show('quantity') && !!errs.quantity}
                        />
                      </div>
                      <div className="relative">
                        <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>$</span>
                        <input
                          type="number" min="0.01" step="any" placeholder="0.00"
                          value={item.unit_price}
                          onChange={e => updateItem(i, 'unit_price', e.target.value)}
                          onBlur={() => touchField(i, 'unit_price')}
                          className={`${inputBaseClass} pl-[26px] text-right ${errClass(show('unit_price') && !!errs.unit_price)}`}
                          aria-invalid={show('unit_price') && !!errs.unit_price}
                        />
                      </div>
                      <div className="flex items-center justify-end pt-2.5">
                        <span className={`whitespace-nowrap font-mono text-sm font-semibold ${
                          total > 0 ? (isLight ? 'text-slate-900' : 'text-paper') : (isLight ? 'text-slate-400' : 'text-[rgba(107,120,136,0.3)]')
                        }`}>
                          ${total.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center pt-[9px]">
                        <button onClick={() => removeItem(i)} disabled={items.length === 1} aria-label="Remove item"
                          className={`border-none bg-transparent px-1 py-0 text-xl leading-none ${
                            items.length === 1 ? 'cursor-default text-slate-300' : 'cursor-pointer text-rose-500 hover:text-rose-600'
                          }`}>
                          ×
                        </button>
                      </div>
                    </div>
                    {show('description') && errs.description && <FieldError msg={errs.description} />}
                    {show('quantity') && errs.quantity && <FieldError msg={errs.quantity} />}
                    {show('unit_price') && errs.unit_price && <FieldError msg={errs.unit_price} />}
                  </div>
                )
              })}
            </div>

            <button onClick={addItem} className={`${btnSecondaryClass} mt-1`}>+ Add line item</button>
          </div>

          {showAllItemErrors && !allItemsValid(items) && (
            <p role="alert" className="mb-3.5 font-mono text-[13px] text-rose-500">
              Complete all line items before continuing.
            </p>
          )}

          <div className={`flex flex-wrap items-center justify-between gap-3 border-t pt-5 ${isLight ? 'border-slate-200' : 'border-[rgba(255,255,255,0.06)]'}`}>
            <div>
              <div className="mb-2 flex items-center gap-2">
                <label htmlFor="inv-tax" className={`font-mono text-[11px] uppercase tracking-[0.06em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Tax %</label>
                <input id="inv-tax" type="number" inputMode="decimal" min={0} max={100} step="0.01" placeholder="0" value={taxPct}
                  onChange={e => setTaxPct(e.target.value)}
                  aria-invalid={!taxValid}
                  className={`w-20 rounded-[8px] border px-2.5 py-1.5 font-mono text-sm outline-none ${
                    isLight
                      ? 'bg-white border-slate-200 text-slate-900 focus:border-[#007a6c]'
                      : 'bg-[rgba(255,255,255,0.05)] border-[rgba(255,255,255,0.1)] text-paper'
                  }`} />
              </div>
              {taxAmount > 0 && (
                <p className={`mb-1 font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Subtotal ${grandTotal.toFixed(2)} · Tax ${taxAmount.toFixed(2)}</p>
              )}
              <p className={`mb-[3px] font-mono text-[11px] uppercase tracking-[0.06em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total</p>
              <p className={`m-0 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>${invoiceTotal.toFixed(2)}</p>
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {createError && <p role="alert" className="m-0 max-w-[240px] text-right font-mono text-xs text-rose-500">{createError}</p>}
              <button onClick={handleCreate} disabled={creating || grandTotal === 0}
                className={`inline-flex items-center gap-2 rounded-xl border-none bg-[#00d2b8] px-5 py-2.5 font-sans text-sm font-bold text-slate-950 transition-all hover:bg-[#00b8a1] ${creating || grandTotal === 0 ? 'cursor-not-allowed opacity-60' : 'cursor-pointer opacity-100'}`}>
                {creating ? <><span className="spinner" /> Creating…</> : `Create invoice · $${invoiceTotal.toFixed(2)} →`}
              </button>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-8">
          {result ? (
            <CreatedCard
              invoiceNumber={result.invoiceNumber}
              total={result.total}
              link={payLink(result.requestId)}
              copied={copied}
              onCopy={() => copyResult(payLink(result.requestId))}
              onReset={() => { setResult(null); setCopied(false) }}
              isLight={isLight}
            />
          ) : (
            <InvoiceDocument
              businessName={businessName}
              logoData={profile?.logo_data}
              invoiceNumber={nextInvoiceNumber}
              clientLabel={clientLabel}
              dueDate={previewDueDate}
              items={items.map(it => ({ description: it.description, quantity: parseNum(it.quantity), unitPrice: parseNum(it.unit_price) }))}
              notes={notes}
              isLight={isLight}
            />
          )}
        </aside>
      </div>

      {/* Invoice list */}
      <div className="mb-3.5 flex flex-wrap items-center justify-between gap-3">
        <p className={`${secLabelClass} mb-0`}>All invoices</p>
        {invoices.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as typeof statusFilter)}
              className={`rounded-xl px-3 py-1.5 font-sans text-xs outline-none cursor-pointer ${
                isLight ? 'border border-slate-200 bg-white text-slate-900' : 'border border-white/10 bg-black/40 text-slate-200 focus:border-[#00d2b8]/50'
              }`}>
              <option value="all">All statuses</option>
              <option value="pending">Pending</option>
              <option value="fulfilled">Fulfilled</option>
              <option value="cancelled">Cancelled</option>
              <option value="expired">Expired</option>
            </select>
            <input type="date" value={dateFrom} onChange={e => setDateFrom(e.target.value)} aria-label="From date"
              className={`rounded-xl px-3 py-1.5 font-sans text-xs outline-none ${
                isLight ? 'border border-slate-200 bg-white text-slate-900' : 'border border-white/10 bg-black/40 text-slate-200 focus:border-[#00d2b8]/50'
              }`} />
            <input type="date" value={dateTo} onChange={e => setDateTo(e.target.value)} aria-label="To date"
              className={`rounded-xl px-3 py-1.5 font-sans text-xs outline-none ${
                isLight ? 'border border-slate-200 bg-white text-slate-900' : 'border border-white/10 bg-black/40 text-slate-200 focus:border-[#00d2b8]/50'
              }`} />
            <button onClick={exportCsv} disabled={filteredInvoices.length === 0}
              className={btnSecondaryClass}>
              Export CSV
            </button>
          </div>
        )}
      </div>
      {listLoading ? (
        <div className="flex flex-col gap-2.5" role="status" aria-live="polite">
          <span className="sr-only">Loading invoices…</span>
          {[0, 1, 2].map(i => <div key={i} className={`h-[52px] animate-pulse rounded-2xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'border-white/10 bg-[rgba(16,25,50,0.75)]'}`} />)}
        </div>
      ) : invoices.length === 0 ? (
        <div className={`rounded-2xl px-6 py-7 text-center backdrop-blur-md ${isLight ? 'bg-white border border-slate-200/80' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'}`}>
          <p className={`m-0 text-[15px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No invoices yet. Create one above.</p>
        </div>
      ) : filteredInvoices.length === 0 ? (
        <div className={`rounded-2xl px-6 py-7 text-center backdrop-blur-md ${isLight ? 'bg-white border border-slate-200/80' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'}`}>
          <p className={`m-0 text-[15px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No invoices match these filters.</p>
        </div>
      ) : (
        <div className={`overflow-x-auto rounded-2xl backdrop-blur-md ${
          isLight ? 'bg-white border border-slate-200/80 shadow-sm' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'
        }`}>
          <table className="w-full min-w-[640px] border-collapse">
            <thead>
              <tr className={`border-b ${isLight ? 'bg-slate-50 border-slate-200' : 'border-white/10 bg-white/[0.02]'}`}>
                <th className={thClass}>Invoice</th>
                <th className={thClass}>Client</th>
                <th className={`${thClass} text-right`}>Amount</th>
                <th className={thClass}>Due</th>
                <th className={thClass}>Status</th>
                <th className={thClass}>Explorer</th>
                <th className={thClass} aria-hidden="true" />
              </tr>
            </thead>
            <tbody>
              {filteredInvoices.map(inv => {
                const isOpen = expandedId === inv.request_id_hex
                const overdue = inv.status === 'pending' && inv.due_date != null && inv.due_date < nowSec
                const panelId = `inv-panel-${inv.request_id_hex}`
                return (
                  <Fragment key={inv.request_id_hex}>
                    <tr
                      onClick={() => setExpandedId(isOpen ? null : inv.request_id_hex)}
                      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setExpandedId(isOpen ? null : inv.request_id_hex) } }}
                      tabIndex={0}
                      role="button"
                      aria-expanded={isOpen}
                      aria-controls={panelId}
                      className={`cursor-pointer border-t transition-colors ${
                        isLight ? 'border-slate-100 hover:bg-slate-50' : 'border-white/5 hover:bg-white/[0.03]'
                      }`}
                    >
                      <td className={`font-mono text-xs font-semibold ${tdClass} ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{inv.invoice_number ?? '—'}</td>
                      <td className={tdClass}>{inv.label ?? <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>—</span>}</td>
                      <td className={`${tdClass} text-right font-sans text-sm font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>${parseFloat(inv.amount_usdc).toFixed(2)}</td>
                      <td className={`${tdClass} font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{inv.due_date ? fmtDate(inv.due_date) : '—'}</td>
                      <td className={tdClass}>{overdue ? <OverdueBadge isLight={isLight} /> : <StatusBadge status={inv.status} isLight={isLight} />}</td>
                      <td className={tdClass} onClick={e => e.stopPropagation()}>
                        {inv.tx_hash && inv.explorer_url ? (
                          <a href={inv.explorer_url} target="_blank" rel="noreferrer" className={`font-mono text-xs no-underline hover:underline ${isLight ? 'text-[#007a6c]' : 'text-[var(--fn-teal-fg)]'}`}>View ↗</a>
                        ) : <span className={isLight ? 'text-slate-400' : 'text-slate-400'}>—</span>}
                      </td>
                      <td className={`${tdClass} text-right ${isLight ? 'text-slate-400' : 'text-slate-400'}`}>{isOpen ? '▲' : '▼'}</td>
                    </tr>
                    {isOpen && (
                      <tr>
                        <td id={panelId} colSpan={7} className={`border-t px-5 py-5 ${
                          isLight ? 'border-slate-200 bg-slate-50' : 'border-white/6 bg-black/15'
                        }`}>
                          <div className="mx-auto max-w-[480px]">
                            <InvoiceDocument
                              businessName={businessName}
                              logoData={profile?.logo_data}
                              invoiceNumber={inv.invoice_number ?? '—'}
                              status={inv.status}
                              clientLabel={inv.label ?? ''}
                              dueDate={inv.due_date}
                              items={inv.items.map(it => ({ description: it.description, quantity: it.quantity, unitPrice: Number(it.unit_price_usdc) }))}
                              notes={inv.notes ?? ''}
                              isLight={isLight}
                            />
                            {inv.status === 'pending' && (
                              <div className="mt-3.5 flex flex-wrap gap-1.5">
                                <button onClick={() => copyLink(payLink(inv.request_id_hex), inv.request_id_hex)} className={btnSecondaryClass}>
                                  {listCopied === inv.request_id_hex ? '✓ Copied' : 'Copy link'}
                                </button>
                                <a href={payLink(inv.request_id_hex)} target="_blank" rel="noreferrer" className={`${btnSecondaryClass} no-underline`}>Open ↗</a>
                              </div>
                            )}
                            <div className={`mt-4 grid grid-cols-2 gap-x-6 gap-y-3 border-t pt-4 sm:grid-cols-3 ${isLight ? 'border-slate-200' : 'border-white/6'}`}>
                              <DetailField label="Request ID" value={truncateAddr(inv.request_id_hex)} mono isLight={isLight} />
                              <DetailField label="Created" value={fmtDateTime(inv.created_at)} isLight={isLight} />
                              {inv.fulfilled_at && <DetailField label="Paid" value={fmtDateTime(inv.fulfilled_at)} isLight={isLight} />}
                              {inv.payer_address && <DetailField label="Payer" value={truncateAddr(inv.payer_address)} mono isLight={isLight} />}
                              {inv.tx_hash && (
                                <div>
                                  <p className={`mb-1 font-mono text-[11px] uppercase tracking-[0.06em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Transaction</p>
                                  {inv.explorer_url ? (
                                    <a href={inv.explorer_url} target="_blank" rel="noreferrer" className={`font-mono text-xs no-underline hover:underline ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                                      {truncateAddr(inv.tx_hash)} ↗
                                    </a>
                                  ) : <p className={`m-0 font-mono text-xs ${isLight ? 'text-slate-900' : 'text-paper'}`}>{truncateAddr(inv.tx_hash)}</p>}
                                </div>
                              )}
                            </div>
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
    </div>
  )
}

function OptLabel({ isLight }: { isLight?: boolean }) {
  return <span className={`font-normal tracking-normal lowercase ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
}

function WaIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
