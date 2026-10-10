'use client'

import { Fragment, useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import { RefundPanel } from '@/components/dashboard/RefundPanel'
import { downloadCsv } from '@/lib/csv'

const PRIVY_CONFIGURED = !!process.env.NEXT_PUBLIC_PRIVY_APP_ID
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
    return () => window.removeEventListener('mistpay_theme_change', updateTheme)
  }, [])

  return theme
}

interface CompletedRow {
  request_id_hex: string
  kind: 'request' | 'invoice' | 'split'
  amount_usdc: string
  label: string | null
  participant_name: string | null
  payer_address: string | null
  token_symbol: string
  tx_hash: string | null
  paid_at: number
  explorer_url: string | null
}

function fmtDate(unix: number) {
  return new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

function fmtDateTime(unix: number) {
  return new Date(unix * 1000).toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

function truncateAddr(addr: string) {
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

function KindBadge({ kind, theme }: { kind: string; theme: 'dark' | 'light' }) {
  const isLight = theme === 'light'
  const classes: Record<string, { badge: string; text: string; label: string }> = {
    request: {
      badge: isLight ? 'border-sky-300 bg-sky-50' : 'border-sky-500/40 bg-sky-500/15',
      text: isLight ? 'text-sky-700' : 'text-sky-400',
      label: 'Request',
    },
    invoice: {
      badge: isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15',
      text: isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]',
      label: 'Invoice',
    },
    split: {
      badge: isLight ? 'border-purple-300 bg-purple-50' : 'border-purple-500/40 bg-purple-500/15',
      text: isLight ? 'text-purple-700' : 'text-purple-300',
      label: 'Split',
    },
  }

  const c = classes[kind] ?? classes.request
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider ${c.badge} ${c.text}`}>
      <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-current" />
      {c.label}
    </span>
  )
}

function DetailField({ label, value, mono, theme }: { label: string; value: string; mono?: boolean; theme: 'dark' | 'light' }) {
  return (
    <div>
      <p className={`mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${theme === 'light' ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`m-0 break-all ${theme === 'light' ? 'text-slate-900' : 'text-paper'} ${mono ? 'font-mono text-xs' : 'text-sm font-medium'}`}>{value}</p>
    </div>
  )
}

function Stat({ label, value, highlight, theme }: { label: string; value: string; highlight?: boolean; theme: 'dark' | 'light' }) {
  const isLight = theme === 'light'
  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isLight
        ? 'border-slate-200 bg-white shadow-sm hover:border-[#007a6c]/30 hover:shadow-md'
        : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md hover:border-[#00d2b8]/30'
    }`}>
      <p className={`mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p className={`m-0 font-sans text-3xl font-extrabold tracking-tight ${
        highlight
          ? (isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]')
          : (isLight ? 'text-slate-900' : 'text-white')
      }`}>
        {value}
      </p>
    </div>
  )
}

function DownloadIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" y1="15" x2="12" y2="3" />
    </svg>
  )
}

function ExternalLinkIcon({ className = 'w-3 h-3' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

export default function CompletedPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'
  const [rows, setRows] = useState<CompletedRow[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedKey, setExpandedKey] = useState<string | null>(null)
  const [auth, setAuth] = useState<{ authToken: string; address: string } | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token, address } = JSON.parse(raw)
    setAuth({ authToken: token, address })

    async function load() {
      const res = await fetch(`${BACKEND}/api/my/completed`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 && token !== 'demo-token') {
        localStorage.removeItem('mistpay_auth')
        router.replace('/')
        return
      }
      const data = await res.json()
      setRows(Array.isArray(data) ? data : [])
      setLoading(false)
    }
    load().catch(() => setLoading(false))
  }, [router])

  const [kindFilter, setKindFilter] = useState<'all' | 'request' | 'invoice' | 'split'>('all')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kindFilter !== 'all' && r.kind !== kindFilter) return false
      if (dateFrom && r.paid_at < new Date(dateFrom).getTime() / 1000) return false
      if (dateTo && r.paid_at > new Date(dateTo).getTime() / 1000 + 86400) return false
      return true
    })
  }, [rows, kindFilter, dateFrom, dateTo])

  function exportCsv() {
    downloadCsv(`mistpay-completed-${new Date().toISOString().slice(0, 10)}.csv`, filtered, [
      ['kind', 'Type'],
      ['amount_usdc', 'Amount (USD)'],
      ['token_symbol', 'Token'],
      ['label', 'Description'],
      ['participant_name', 'Participant'],
      ['paid_at', 'Paid (unix)'],
      ['payer_address', 'From'],
      ['tx_hash', 'Tx hash'],
    ])
  }

  const totalCollected = rows.reduce((s, r) => s + parseFloat(r.amount_usdc), 0)
  const filteredTotal = filtered.reduce((s, r) => s + parseFloat(r.amount_usdc), 0)
  const latestDate = rows.length > 0 ? fmtDate(Math.max(...rows.map((r) => r.paid_at))) : '—'

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8">
        <div className="mb-2.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
            isLight
              ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]'
              : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> COMPLETED PAYMENTS
          </span>
        </div>
        <h1 className={`mb-1 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Completed Payments
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Review settled transactions, export audit logs, and initiate on-chain refunds.
        </p>
      </div>

      {/* Top Metrics Cards */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Total Volume Settled" value={`$${totalCollected.toFixed(2)}`} highlight theme={theme} />
        <Stat label="Settled Payments" value={String(rows.length)} theme={theme} />
        <Stat label="Latest Settlement" value={latestDate} theme={theme} />
      </div>

      {/* Toolbar & Filters Bar */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <div className={`font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Showing <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{filtered.length}</span> of <span className={`font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{rows.length}</span> settlements
          {filtered.length > 0 && (
            <span className={`ml-2 rounded-md px-2 py-0.5 ${
              isLight ? 'bg-slate-100 font-semibold text-[#007a6c]' : 'bg-white/5 text-[#00d2b8]'
            }`}>
              (${filteredTotal.toFixed(2)})
            </span>
          )}
        </div>

        {rows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2.5">
            <select
              value={kindFilter}
              onChange={(e) => setKindFilter(e.target.value as typeof kindFilter)}
              className={`rounded-xl border px-3 py-2 font-sans text-xs focus:outline-none transition-all ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                  : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
              }`}
            >
              <option value="all" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>All Types</option>
              <option value="request" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Request</option>
              <option value="invoice" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Invoice</option>
              <option value="split" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Split</option>
            </select>

            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              aria-label="From date"
              className={`rounded-xl border px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                  : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
              }`}
            />

            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              aria-label="To date"
              className={`rounded-xl border px-3 py-2 font-mono text-xs focus:outline-none transition-all ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                  : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
              }`}
            />

            <button
              onClick={exportCsv}
              disabled={filtered.length === 0}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2 font-sans text-xs font-bold shadow-sm transition-all disabled:cursor-not-allowed disabled:opacity-40 ${
                isLight
                  ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:bg-[#007a6c] hover:text-white'
                  : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
              }`}
            >
              <DownloadIcon /> Export CSV
            </button>
          </div>
        )}
      </div>

      {/* Main Table / List View */}
      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <span className="sr-only">Loading completed payments…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-14 animate-pulse rounded-xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0c141d]/80'}`} />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className={`rounded-xl border px-6 py-12 text-center ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
        }`}>
          <p className={`m-0 font-sans text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No completed payments recorded yet.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-xl border px-6 py-12 text-center ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
        }`}>
          <p className={`m-0 font-sans text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No settlements match your selected filters.</p>
        </div>
      ) : (
        <section className={`overflow-hidden rounded-xl border ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left">
              <thead>
                <tr className={`border-b font-mono text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-600' : 'border-white/10 bg-white/5 text-slate-400'
                }`}>
                  <th className="px-4 py-3.5">Date</th>
                  <th className="px-4 py-3.5">Type</th>
                  <th className="px-4 py-3.5">Description / Participant</th>
                  <th className="px-4 py-3.5 text-right">Amount</th>
                  <th className="px-4 py-3.5">Transaction</th>
                  <th className="px-4 py-3.5">Payer Wallet</th>
                  <th className="px-4 py-3.5 text-right" aria-hidden="true" />
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isLight ? 'divide-slate-100 text-slate-700' : 'divide-white/5 text-slate-300'
              }`}>
                {filtered.map((row, i) => {
                  const key = `${row.request_id_hex}-${row.participant_name ?? 'main'}-${i}`
                  const isOpen = expandedKey === key
                  const panelId = `completed-panel-${key}`
                  return (
                    <Fragment key={key}>
                      <tr
                        onClick={() => setExpandedKey(isOpen ? null : key)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault()
                            setExpandedKey(isOpen ? null : key)
                          }
                        }}
                        tabIndex={0}
                        role="button"
                        aria-expanded={isOpen}
                        aria-controls={panelId}
                        className={`cursor-pointer transition-colors ${
                          isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'
                        }`}
                      >
                        <td className={`px-4 py-4 whitespace-nowrap font-mono ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                          {fmtDate(row.paid_at)}
                        </td>
                        <td className="px-4 py-4">
                          <KindBadge kind={row.kind} theme={theme} />
                        </td>
                        <td className={`px-4 py-4 font-sans font-medium ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                          {row.label ?? <span className={`${isLight ? 'text-slate-400' : 'text-slate-500'} italic`}>No description</span>}
                          {row.participant_name && (
                            <span className={`ml-1.5 font-mono text-[11px] ${isLight ? 'text-[#007a6c] font-semibold' : 'text-[#00d2b8]'}`}>
                              · {row.participant_name}
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-4 text-right font-mono text-base font-extrabold whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                          ${parseFloat(row.amount_usdc).toFixed(2)}{' '}
                          <span className={`font-sans text-xs font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                            {row.token_symbol}
                          </span>
                        </td>
                        <td className="px-4 py-4 font-mono">
                          {row.explorer_url ? (
                            <a
                              href={row.explorer_url}
                              target="_blank"
                              rel="noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className={`inline-flex items-center gap-1 font-semibold hover:underline ${
                                isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'
                              }`}
                            >
                              {truncateAddr(row.tx_hash!)} <ExternalLinkIcon />
                            </a>
                          ) : (
                            <span className={isLight ? 'text-slate-400' : 'text-slate-500'}>—</span>
                          )}
                        </td>
                        <td className={`px-4 py-4 font-mono ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                          {row.payer_address ? (
                            truncateAddr(row.payer_address)
                          ) : row.participant_name ? (
                            '—'
                          ) : (
                            <span className={`rounded px-2 py-0.5 font-sans text-[11px] ${
                              isLight ? 'bg-slate-100 text-slate-700 font-medium' : 'bg-white/5 text-slate-300'
                            }`}>
                              Card Payment
                            </span>
                          )}
                        </td>
                        <td className={`px-4 py-4 text-right ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          <span className="inline-block transition-transform duration-200">
                            {isOpen ? '▲' : '▼'}
                          </span>
                        </td>
                      </tr>

                      {isOpen && (
                        <tr>
                          <td colSpan={7} className={`p-5 shadow-inner ${
                            isLight ? 'border-t border-slate-200 bg-slate-50/80' : 'border-t border-[#00d2b8]/30 bg-[#082028]'
                          }`}>
                            <div id={panelId} className="space-y-4">
                              <div className="grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
                                <DetailField label="Request ID" value={truncateAddr(row.request_id_hex)} mono theme={theme} />
                                <DetailField label="Paid At" value={fmtDateTime(row.paid_at)} theme={theme} />
                                <DetailField label="Amount" value={`$${parseFloat(row.amount_usdc).toFixed(2)} ${row.token_symbol}`} theme={theme} />
                                {row.participant_name && <DetailField label="Participant" value={row.participant_name} theme={theme} />}
                                <DetailField
                                  label="From Wallet"
                                  value={row.payer_address ? truncateAddr(row.payer_address) : 'Card Payment (MoonPay)'}
                                  mono={!!row.payer_address}
                                  theme={theme}
                                />
                                {row.tx_hash && (
                                  <div>
                                    <p className={`mb-1 font-mono text-[10px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                                      Transaction Hash
                                    </p>
                                    {row.explorer_url ? (
                                      <a
                                        href={row.explorer_url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className={`inline-flex items-center gap-1 font-mono text-xs font-semibold hover:underline ${
                                          isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'
                                        }`}
                                      >
                                        {truncateAddr(row.tx_hash)} <ExternalLinkIcon />
                                      </a>
                                    ) : (
                                      <p className={`m-0 font-mono text-xs ${isLight ? 'text-slate-900' : 'text-paper'}`}>{truncateAddr(row.tx_hash)}</p>
                                    )}
                                  </div>
                                )}
                              </div>

                              {PRIVY_CONFIGURED && auth && (
                                <RefundPanel requestId={row.request_id_hex} authToken={auth.authToken} walletAddress={auth.address} />
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
        </section>
      )}
    </div>
  )
}
