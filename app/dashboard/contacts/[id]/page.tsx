'use client'

import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'

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

interface Contact {
  id: string
  name: string
  phone: string | null
  wallet_address: string | null
}

interface HistoryRow {
  request_id_hex: string
  amount_usdc: string
  label: string | null
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired'
  created_at: number
  fulfilled_at: number | null
}

interface Statement {
  contact: Contact
  totals: { requested: number; paid: number; outstanding: number }
  history: HistoryRow[]
}

function timeAgo(unix: number) {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function StatusBadge({ status, theme }: { status: string; theme: 'dark' | 'light' }) {
  const isLight = theme === 'light'
  if (status === 'fulfilled') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
        isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
      }`}>
        <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> Paid
      </span>
    )
  }
  if (status === 'pending') {
    return (
      <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
        isLight ? 'border-sky-300 bg-sky-50 text-sky-700' : 'border-sky-500/40 bg-sky-500/15 text-sky-400'
      }`}>
        <span className="h-1.5 w-1.5 rounded-full bg-current" /> Pending
      </span>
    )
  }
  return (
    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
      isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-slate-700 bg-slate-800/60 text-slate-400'
    }`}>
      {status}
    </span>
  )
}

function StatCard({ label, value, highlight, theme }: { label: string; value: string; highlight?: 'cyan' | 'amber'; theme: 'dark' | 'light' }) {
  const isLight = theme === 'light'
  return (
    <div className={`rounded-xl border p-5 transition-all ${
      isLight
        ? 'border-slate-200 bg-white shadow-sm hover:border-[#007a6c]/30 hover:shadow-md'
        : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md hover:border-[#00d2b8]/30'
    }`}>
      <p className={`mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{label}</p>
      <p
        className={`m-0 font-sans text-3xl font-extrabold tracking-tight ${
          highlight === 'cyan'
            ? (isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]')
            : highlight === 'amber'
            ? (isLight ? 'text-amber-600' : 'text-amber-400')
            : (isLight ? 'text-slate-900' : 'text-white')
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function ArrowLeftIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="19" y1="12" x2="5" y2="12" />
      <polyline points="12 19 5 12 12 5" />
    </svg>
  )
}

export default function ContactStatementPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'
  const params = useParams<{ id: string }>()
  const [statement, setStatement] = useState<Statement | null>(null)
  const [loading, setLoading] = useState(true)
  const [notFound, setNotFound] = useState(false)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)

    async function load() {
      const res = await fetch(`${BACKEND}/api/contacts/${params.id}/statement`, {
        headers: { Authorization: `Bearer ${token}` },
      })
      if (res.status === 401) {
        localStorage.removeItem('mistpay_auth')
        router.replace('/')
        return
      }
      if (res.status === 404) {
        setNotFound(true)
        return
      }
      setStatement(await res.json())
    }

    load().finally(() => setLoading(false))
  }, [params.id, router])

  if (loading) {
    return (
      <div className="space-y-4">
        <div className={`h-6 w-32 animate-pulse rounded-lg ${isLight ? 'bg-slate-200' : 'bg-white/10'}`} />
        <div className={`h-20 w-full animate-pulse rounded-xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0c141d]/80'}`} />
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className={`h-24 animate-pulse rounded-xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0c141d]/80'}`} />
          ))}
        </div>
      </div>
    )
  }

  if (notFound || !statement) {
    return (
      <div className={`rounded-xl border px-6 py-10 text-center ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <p className={`mb-4 font-sans text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Contact not found.</p>
        <button
          onClick={() => router.push('/dashboard/contacts')}
          className={`inline-flex cursor-pointer items-center gap-2 rounded-xl border px-4 py-2 font-sans text-xs font-bold transition-all ${
            isLight
              ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:bg-[#007a6c] hover:text-white'
              : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
          }`}
        >
          <ArrowLeftIcon /> Back to Contacts
        </button>
      </div>
    )
  }

  const { contact, totals, history } = statement

  return (
    <div>
      <button
        onClick={() => router.push('/dashboard/contacts')}
        className={`mb-6 inline-flex cursor-pointer items-center gap-1.5 font-mono text-xs font-semibold transition-colors ${
          isLight ? 'text-slate-600 hover:text-[#007a6c]' : 'text-slate-400 hover:text-[#00d2b8]'
        }`}
      >
        <ArrowLeftIcon /> Back to Contacts
      </button>

      {/* Profile Header */}
      <div className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <div className="flex items-center gap-4">
          <div className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border font-sans text-2xl font-bold ${
            isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
          }`}>
            {contact.name[0].toUpperCase()}
          </div>
          <div className="min-w-0">
            <h1 className={`m-0 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>{contact.name}</h1>
            <p className={`m-0 mt-1 font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {contact.phone ?? 'No phone number'}
              {contact.wallet_address && (
                <span className={`ml-2 ${isLight ? 'text-[#007a6c] font-semibold' : 'text-[#00d2b8]'}`}>
                  · {contact.wallet_address.slice(0, 6)}…{contact.wallet_address.slice(-4)}
                </span>
              )}
            </p>
          </div>
        </div>
      </div>

      {/* Statement Metrics */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Total Requested" value={`$${totals.requested.toFixed(2)}`} theme={theme} />
        <StatCard label="Total Paid" value={`$${totals.paid.toFixed(2)}`} highlight="cyan" theme={theme} />
        <StatCard label="Outstanding Balance" value={`$${totals.outstanding.toFixed(2)}`} highlight={totals.outstanding > 0 ? 'amber' : undefined} theme={theme} />
      </div>

      {/* Transaction History */}
      <section className={`rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <p className={`mb-4 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
          Statement History
        </p>

        {history.length === 0 ? (
          <p className={`py-6 text-center font-sans text-sm italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            No requests linked to {contact.name} yet.
          </p>
        ) : (
          <div className="space-y-2.5">
            {history.map((r) => (
              <div
                key={r.request_id_hex}
                className={`flex flex-wrap items-center justify-between gap-3 rounded-xl border px-4 py-3 transition-colors ${
                  isLight
                    ? 'border-slate-200 bg-slate-50 hover:bg-slate-100/80'
                    : 'border-white/5 bg-black/20 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-base font-extrabold ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                    ${parseFloat(r.amount_usdc).toFixed(2)}
                  </span>
                  {r.label && (
                    <span className={`font-sans text-xs font-medium ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
                      {r.label}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(r.created_at)}</span>
                  <StatusBadge status={r.status} theme={theme} />
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
