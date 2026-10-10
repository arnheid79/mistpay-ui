'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { BACKEND, authHeaders } from '@/lib/useAuth'
import { fmtDate, priceLabel, type Interval, type Plan, type SubscriptionView } from '@/lib/subscription'

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

interface Summary {
  activeCount: number
  pastDueCount: number
  mrr: string
}

function CopyIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function UserPlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  )
}

function Stat({ label, value, highlight, isLight }: { label: string; value: string; highlight?: 'cyan' | 'amber'; isLight?: boolean }) {
  return (
    <div className={`rounded-xl border p-5 backdrop-blur-md transition-all ${
      isLight
        ? 'bg-white border-slate-200/80 shadow-sm hover:border-[#00a894]/40'
        : 'border-white/10 bg-[#0c141d]/80 hover:border-[#00d2b8]/30'
    }`}>
      <p className={`mb-1.5 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{label}</p>
      <p
        className={`m-0 font-sans text-3xl font-extrabold tracking-tight ${
          highlight === 'cyan'
            ? (isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]')
            : highlight === 'amber'
            ? (isLight ? 'text-amber-700' : 'text-amber-400')
            : (isLight ? 'text-slate-900' : 'text-white')
        }`}
      >
        {value}
      </p>
    </div>
  )
}

function IntervalSelect({ value, onChange, id, isLight }: { value: Interval; onChange: (v: Interval) => void; id: string; isLight?: boolean }) {
  return (
    <select
      id={id}
      className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none ${
        isLight
          ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
          : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
      }`}
      value={value}
      onChange={(e) => onChange(e.target.value as Interval)}
    >
      <option value="weekly" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Weekly</option>
      <option value="monthly" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Monthly</option>
      <option value="yearly" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Yearly</option>
    </select>
  )
}

export default function SubscribersPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'

  const [authToken, setAuthToken] = useState<string | null>(null)
  const [subs, setSubs] = useState<SubscriptionView[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [plans, setPlans] = useState<Plan[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'past_due' | 'cancelled'>('all')

  // Add subscriber modal state
  const [showModal, setShowModal] = useState(false)
  const [pick, setPick] = useState('custom')
  const [subName, setSubName] = useState('')
  const [subPhone, setSubPhone] = useState('')
  const [custName, setCustName] = useState('')
  const [custAmount, setCustAmount] = useState('')
  const [custInterval, setCustInterval] = useState<Interval>('monthly')

  const load = useCallback(async (token: string) => {
    const [s, p] = await Promise.all([
      fetch(`${BACKEND}/api/my/subscriptions`, { headers: authHeaders(token) }),
      fetch(`${BACKEND}/api/my/subscription-plans`, { headers: authHeaders(token) }),
    ])
    if (s.status === 401 || p.status === 401) {
      localStorage.removeItem('mistpay_auth')
      router.replace('/')
      return
    }
    if (s.ok) {
      const d = await s.json()
      setSubs(d.subscriptions)
      setSummary(d.summary)
    }
    if (p.ok) setPlans(await p.json())
  }, [router])

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    load(token).catch(() => setError('Could not load your subscribers.'))
  }, [load])

  async function call<T = Record<string, never>>(path: string, init: RequestInit): Promise<T | null> {
    if (!authToken) return null
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const res = await fetch(`${BACKEND}${path}`, { ...init, headers: authHeaders(authToken) })
      const data = (await res.json().catch(() => ({}))) as T & { error?: string }
      if (!res.ok) throw new Error(data.error ?? 'Something went wrong. Please try again.')
      await load(authToken)
      return data
    } catch (e) {
      setError((e as Error).message)
      return null
    } finally {
      setBusy(false)
    }
  }

  async function addSubscriber() {
    const terms = pick === 'custom' ? { name: custName.trim(), amount: Number(custAmount), interval: custInterval } : { planId: pick }
    const d = await call<{ link: string | null }>('/api/my/subscriptions', {
      method: 'POST',
      body: JSON.stringify({ ...terms, subscriberName: subName.trim(), subscriberPhone: subPhone.trim() || undefined }),
    })
    if (d) {
      setSubName('')
      setSubPhone('')
      setCustName('')
      setCustAmount('')
      setShowModal(false)
      setNote(subPhone.trim() ? 'Subscription started. The first payment link was sent to them via WhatsApp.' : `Subscription started. Share the first payment link: ${d.link ?? ''}`)
    }
  }

  const copy = (text: string, key: string) => {
    navigator.clipboard.writeText(text)
    setCopied(key)
    setTimeout(() => setCopied(null), 1500)
  }

  const canAdd = subName.trim() !== '' && (pick !== 'custom' || (custName.trim() !== '' && Number(custAmount) > 0))

  const filtered = subs.filter((s) => {
    const q = search.trim().toLowerCase()
    const matchesSearch = !q || s.subscriberName.toLowerCase().includes(q) || (s.subscriberPhone ?? '').includes(q) || s.name.toLowerCase().includes(q)
    const matchesStatus = statusFilter === 'all' || s.status === statusFilter
    return matchesSearch && matchesStatus
  })

  return (
    <div>
      {/* Page Header */}
      <div className="mb-8 flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <h1 className={`mb-1 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>Subscribers</h1>
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Manage recurring subscribers and billing requests with automated WhatsApp reminders.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowModal(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#00d2b8] px-4 py-2.5 font-sans text-sm font-bold text-slate-950 shadow-lg shadow-[#00d2b8]/20 transition-all hover:bg-[#00b8a1]"
        >
          <UserPlusIcon /> Add Subscriber
        </button>
      </div>

      {error && <div className="mb-5 rounded-xl border border-red-500/30 bg-red-500/10 p-3.5 font-mono text-xs text-rose-500">{error}</div>}
      {note && <div className={`mb-5 rounded-xl border p-3.5 font-mono text-xs ${
        isLight ? 'border-[#00a894]/40 bg-teal-50 text-[#007a6c]' : 'border-[#00d2b8]/30 bg-[#00d2b8]/10 text-[#00d2b8]'
      }`}>{note}</div>}

      {/* Stats Summary Grid */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Stat label="Monthly Recurring Revenue" value={summary ? `$${summary.mrr}` : '—'} highlight="cyan" isLight={isLight} />
        <Stat label="Active Subscribers" value={summary ? String(summary.activeCount) : '—'} isLight={isLight} />
        <Stat label="Past Due Subscribers" value={summary ? String(summary.pastDueCount) : '—'} highlight={summary && summary.pastDueCount > 0 ? 'amber' : undefined} isLight={isLight} />
      </div>

      {/* Search & Filter Controls */}
      <div className="mb-5 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <input
          type="text"
          placeholder="Search by subscriber name, phone, or plan..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className={`w-full max-w-md rounded-xl border px-4 py-2.5 font-sans text-sm outline-none transition-all ${
            isLight
              ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-1 focus:ring-[#007a6c]/30'
              : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-1 focus:ring-[#00d2b8]/50'
          }`}
        />
        <div className={`inline-flex rounded-xl border p-1 backdrop-blur-sm ${
          isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-slate-900/60'
        }`}>
          {(['all', 'active', 'past_due', 'cancelled'] as const).map((st) => (
            <button
              key={st}
              type="button"
              onClick={() => setStatusFilter(st)}
              className={`cursor-pointer rounded-lg px-3 py-1.5 font-sans text-xs font-semibold capitalize transition-all ${
                statusFilter === st
                  ? (isLight ? 'bg-[#00d2b8]/25 text-[#007a6c] border border-[#00a894]/40 shadow-sm font-bold' : 'bg-[#00d2b8]/20 text-[#00d2b8] border border-[#00d2b8]/40 shadow-sm')
                  : (isLight ? 'text-slate-600 hover:text-slate-900 border border-transparent' : 'text-slate-400 hover:text-paper border border-transparent')
              }`}
            >
              {st === 'past_due' ? 'Past Due' : st}
            </button>
          ))}
        </div>
      </div>

      {/* Subscribers Table Container */}
      <section className={`rounded-xl border p-6 backdrop-blur-md ${
        isLight ? 'bg-white border-slate-200/80 shadow-sm' : 'border-white/10 bg-[#0c141d]/80'
      }`}>
        <p className={`mb-4 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Subscribers Roster
        </p>

        {filtered.length === 0 ? (
          <p className={`py-8 text-center font-sans text-sm italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
            {search || statusFilter !== 'all' ? 'No subscribers match your search or filter.' : 'No subscribers recorded yet.'}
          </p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${isLight ? 'bg-white border-slate-200' : 'bg-black/20 border-white/10'}`}>
            <table className="w-full min-w-[760px] border-collapse text-left">
              <thead>
                <tr className={`border-b font-mono text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'bg-slate-50 border-slate-200 text-slate-600' : 'bg-white/5 border-white/10 text-slate-400'
                }`}>
                  <th className="px-4 py-3">Subscriber</th>
                  <th className="px-4 py-3">For / Plan</th>
                  <th className="px-4 py-3">Price</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Next Charge</th>
                  <th className="px-4 py-3">Cycles Paid</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${isLight ? 'divide-slate-100 text-slate-800' : 'divide-white/5 text-slate-300'}`}>
                {filtered.map((s) => (
                  <tr key={s.id} className={`transition-colors ${isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'}`}>
                    <td className={`px-4 py-3.5 font-sans font-medium ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                      {s.subscriberName}
                      {s.subscriberPhone && (
                        <span className={`block font-mono text-[11px] font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{s.subscriberPhone}</span>
                      )}
                    </td>
                    <td className={`px-4 py-3.5 font-sans font-medium ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>{s.name}</td>
                    <td className={`px-4 py-3.5 font-mono font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                      {priceLabel(s.amount, s.interval)}
                    </td>
                    <td className="px-4 py-3.5">
                      {s.status === 'active' && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isLight ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-emerald-600' : 'bg-[#00d2b8]'}`} /> Active
                        </span>
                      )}
                      {s.status === 'past_due' && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-amber-600' : 'bg-amber-400'}`} /> Past Due
                        </span>
                      )}
                      {s.status === 'cancelled' && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isLight ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-slate-700 bg-slate-800/60 text-slate-400'
                        }`}>
                          Cancelled {s.cancelReason === 'unpaid' && '(unpaid)'}
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3.5 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                      {s.status === 'cancelled' ? '—' : fmtDate(s.nextDueAt)}
                    </td>
                    <td className="px-4 py-3.5">
                      <span className={`font-mono font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{s.cyclesPaid} cycles</span>
                      {s.lastPaidAt && (
                        <span className={`block font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>last {fmtDate(s.lastPaidAt)}</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {s.currentRequestLink && (
                        <button
                          type="button"
                          onClick={() => copy(s.currentRequestLink!, s.id)}
                          className={`mr-2 inline-flex cursor-pointer items-center gap-1 rounded-lg border px-2.5 py-1.5 font-sans text-xs font-semibold transition-all ${
                            isLight
                              ? 'border-[#00a894]/40 bg-[#00d2b8]/15 text-[#007a6c] hover:bg-[#00d2b8] hover:text-slate-950'
                              : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
                          }`}
                        >
                          {copied === s.id ? <><CheckIcon /> Copied</> : <><CopyIcon /> Pay Link</>}
                        </button>
                      )}
                      {s.status !== 'cancelled' && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => {
                            if (window.confirm(`Cancel ${s.subscriberName}'s subscription to "${s.name}"?`)) {
                              call(`/api/my/subscriptions/${s.id}/cancel`, { method: 'POST' })
                            }
                          }}
                          className={`cursor-pointer rounded-lg border px-2.5 py-1.5 font-sans text-xs font-semibold transition-all ${
                            isLight
                              ? 'border-red-300 bg-red-50 text-red-700 hover:bg-red-100'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          Cancel
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Add Subscriber Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`relative w-full max-w-lg overflow-hidden rounded-2xl border p-6 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'border-[#00d2b8]/30 bg-[#082028] text-paper shadow-cyan-950/50'
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${isLight ? 'bg-[#007a6c]' : 'bg-gradient-to-r from-[#00d2b8] via-sky-400 to-[#00d2b8]'}`} />

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                  isLight ? 'bg-teal-50 border-teal-200 text-[#007a6c]' : 'bg-[#00d2b8]/20 border-[#00d2b8]/40 text-[#00d2b8]'
                }`}>
                  <UserPlusIcon className="h-4 w-4" />
                </div>
                <h2 className={`font-sans text-lg font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>Add a Subscriber</h2>
              </div>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className={`cursor-pointer rounded-lg border border-transparent p-1 transition-colors ${
                  isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-800' : 'text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-paper'
                }`}
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label htmlFor="sub-plan" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Plan
                  </label>
                  <select
                    id="sub-plan"
                    className={`w-full rounded-xl border px-3 py-2.5 font-sans text-sm outline-none ${
                      isLight ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]' : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
                    }`}
                    value={pick}
                    onChange={(e) => setPick(e.target.value)}
                  >
                    <option value="custom" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Custom terms</option>
                    {plans.filter((p) => p.active).map((p) => (
                      <option key={p.id} value={p.id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>
                        {p.name} · {priceLabel(p.amount_usdc, p.interval)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="sub-name" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Subscriber Name
                  </label>
                  <input
                    id="sub-name"
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none ${
                      isLight ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]' : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    }`}
                    placeholder="e.g. Ana Smith"
                    maxLength={80}
                    value={subName}
                    onChange={(e) => setSubName(e.target.value)}
                  />
                </div>
                <div>
                  <label htmlFor="sub-phone" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    WhatsApp (optional)
                  </label>
                  <input
                    id="sub-phone"
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none ${
                      isLight ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]' : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    }`}
                    placeholder="+15551234567"
                    value={subPhone}
                    onChange={(e) => setSubPhone(e.target.value)}
                  />
                </div>
              </div>

              {pick === 'custom' && (
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                  <div>
                    <label htmlFor="cust-name" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Purpose / Label
                    </label>
                    <input
                      id="cust-name"
                      className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none ${
                        isLight ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]' : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                      }`}
                      placeholder="e.g. Design Retainer"
                      maxLength={80}
                      value={custName}
                      onChange={(e) => setCustName(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="cust-amount" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Amount ($)
                    </label>
                    <input
                      id="cust-amount"
                      className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none ${
                        isLight ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]' : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                      }`}
                      inputMode="decimal"
                      placeholder="20.00"
                      value={custAmount}
                      onChange={(e) => setCustAmount(e.target.value)}
                    />
                  </div>
                  <div>
                    <label htmlFor="cust-interval" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      Cycle Interval
                    </label>
                    <IntervalSelect id="cust-interval" value={custInterval} onChange={setCustInterval} isLight={isLight} />
                  </div>
                </div>
              )}

              <p className={`font-sans text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                With a WhatsApp number, payment links and overdue notices are sent automatically each cycle.
              </p>

              <div className={`mt-6 flex justify-end gap-2.5 border-t pt-3 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className={`cursor-pointer rounded-xl border px-4 py-2 font-sans text-xs font-semibold transition-all ${
                    isLight
                      ? 'border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200'
                      : 'border-white/10 bg-transparent text-slate-300 hover:bg-white/5 hover:text-paper'
                  }`}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={busy || !canAdd}
                  onClick={addSubscriber}
                  className="cursor-pointer rounded-xl bg-[#00d2b8] px-4 py-2 font-sans text-xs font-bold text-slate-950 shadow-md shadow-[#00d2b8]/20 transition-all hover:bg-[#00b8a1] disabled:opacity-50"
                >
                  Start Subscription
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
