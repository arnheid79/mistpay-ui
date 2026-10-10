'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

interface TokenHolding {
  symbol: string
  chainId: number
  chainName: string
  balance: number
  usdValue: number | null
}

interface Balance {
  total: number
  address: string
  holdings: TokenHolding[]
}

interface ChannelStat {
  channel: string
  total: number
  count: number
}

interface Stats {
  totalReceived: number
  pendingCount: number
  pendingAmount: number
  thisMonth: number
  thisWeek: number
  last30Days: Array<{ date: string; amount: number }>
  aging: { dueSoon: number; overdue1to7: number; overdue8to30: number; overdue30plus: number }
  byChannel?: ChannelStat[]
}

interface RadarFlag {
  severity: 'info' | 'warn'
  message: string
}

interface PaymentRequest {
  request_id_hex: string
  amount_usdc: string
  label: string | null
  status: 'pending' | 'fulfilled' | 'cancelled' | 'expired'
  created_at: number
}

function timeAgo(unix: number) {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
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

/* Line-based SVG Icons */
function TrendingUpLineIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 6 13.5 15.5 8.5 10.5 1 18" />
      <polyline points="17 6 23 6 23 12" />
    </svg>
  )
}

function CalendarLineIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
      <line x1="16" y1="2" x2="16" y2="6" />
      <line x1="8" y1="2" x2="8" y2="6" />
      <line x1="3" y1="10" x2="21" y2="10" />
    </svg>
  )
}

function ZapLineIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
    </svg>
  )
}

function AlertTriangleLineIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  )
}

function BotLineIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="11" width="18" height="10" rx="2" />
      <circle cx="12" cy="5" r="2" />
      <path d="M12 7v4" />
      <line x1="8" y1="15" x2="8" y2="17" />
      <line x1="16" y1="15" x2="16" y2="17" />
    </svg>
  )
}

export default function DashboardOverview() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'

  const [stats, setStats] = useState<Stats | null>(null)
  const [recent, setRecent] = useState<PaymentRequest[]>([])
  const [balance, setBalance] = useState<Balance | null>(null)
  const [dataError, setDataError] = useState(false)
  const [auth, setAuth] = useState<{ authToken: string; address: string } | null>(null)
  const [radarFlags, setRadarFlags] = useState<RadarFlag[]>([])

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token, address } = JSON.parse(raw)
    setAuth({ authToken: token, address })
    const headers = { Authorization: `Bearer ${token}` }

    async function load() {
      if (token === 'demo-token') {
        setStats({
          totalReceived: 1250.50,
          pendingCount: 2,
          pendingAmount: 350.00,
          thisMonth: 850.00,
          thisWeek: 250.00,
          last30Days: [
            { date: '2026-09-01', amount: 50 },
            { date: '2026-09-05', amount: 150 },
            { date: '2026-09-10', amount: 200 },
            { date: '2026-09-15', amount: 450 },
            { date: '2026-09-20', amount: 400 },
          ],
          aging: { dueSoon: 120, overdue1to7: 50, overdue8to30: 0, overdue30plus: 0 },
          byChannel: [
            { channel: 'bot', total: 650.00, count: 8 },
            { channel: 'dashboard', total: 450.00, count: 4 },
            { channel: 'api:key_1', total: 150.50, count: 2 },
          ],
        })
        setRecent([
          { request_id_hex: '0x101a', amount_usdc: '150.00', label: 'Consulting Retainer', status: 'fulfilled', created_at: Math.floor(Date.now() / 1000) - 3600 },
          { request_id_hex: '0x102b', amount_usdc: '29.00', label: 'Pro Tier Membership', status: 'fulfilled', created_at: Math.floor(Date.now() / 1000) - 86400 },
          { request_id_hex: '0x103c', amount_usdc: '200.00', label: 'Design Assets Invoice', status: 'pending', created_at: Math.floor(Date.now() / 1000) - 172800 },
        ])
        setBalance({
          total: 1845.20,
          address: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
          holdings: [
            { symbol: 'USDC', chainId: 42161, chainName: 'Arbitrum', balance: 1245.20, usdValue: 1245.20 },
            { symbol: 'USDC.e', chainId: 10, chainName: 'Optimism', balance: 600.00, usdValue: 600.00 },
          ],
        })
        return
      }

      const [statsRes, reqsRes, balRes] = await Promise.all([
        fetch(`${BACKEND}/api/my/stats`, { headers }).catch(() => null),
        fetch(`${BACKEND}/api/my/requests`, { headers }).catch(() => null),
        fetch(`${BACKEND}/api/my/balance`, { headers }).catch(() => null),
      ])

      if (statsRes?.status === 401 || reqsRes?.status === 401) {
        localStorage.removeItem('mistpay_auth')
        router.push('/')
        return
      }
      if (!statsRes?.ok || !reqsRes?.ok) {
        setDataError(true)
        return
      }
      const [s, reqs] = await Promise.all([statsRes.json(), reqsRes.json()])
      setStats(s)
      setRecent(Array.isArray(reqs) ? reqs.slice(0, 5) : [])
      if (balRes?.ok) setBalance(await balRes.json())
    }

    load().catch(() => setDataError(true))

    if (token !== 'demo-token') {
      fetch(`${BACKEND}/api/my/radar`, { headers })
        .then(r => r.ok ? r.json() : null)
        .then(d => { if (d) setRadarFlags(d.flags ?? []) })
        .catch(() => {})
    }
  }, [router])

  const secLabelClass = `mb-3.5 font-mono text-xs font-semibold uppercase tracking-[0.07em] ${isLight ? 'text-slate-600' : 'text-[rgba(155,167,181,0.55)]'}`

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
      <div className="mb-8 px-1.5">
        <h1 className={`mb-1 font-sans text-[22px] font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Overview
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-[rgba(155,167,181,0.5)]'}`}>
          Your payment activity and financial insights at a glance.
        </p>
      </div>

      {radarFlags.length > 0 && (
        <div className="mb-7 flex flex-col gap-2">
          {radarFlags.map((f, i) => (
            <div key={i} role="status" className={`flex items-center gap-2.5 rounded-md border px-[18px] py-3 ${
              isLight ? 'border-amber-300 bg-amber-50' : 'border-[rgba(212,144,56,0.25)] bg-[var(--fn-ambr-bg)]'
            }`}>
              <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${isLight ? 'bg-amber-600' : 'bg-[var(--fn-ambr-fg)]'}`} />
              <p className={`m-0 text-sm ${isLight ? 'text-amber-800' : 'text-[var(--fn-ambr-fg)]'}`}>{f.message}</p>
            </div>
          ))}
        </div>
      )}

      {/* Wallet Balance Card */}
      <WalletBalanceCard balance={balance} authToken={auth?.authToken ?? null} isLight={isLight} />

      {dataError && (
        <div role="alert" className="mb-7 flex items-center justify-between rounded-xl border border-rose-500/30 bg-rose-500/10 p-4">
          <p className="text-sm text-rose-400">Could not load your data. Check your connection.</p>
          <button onClick={() => window.location.reload()} className="cursor-pointer text-sm text-rose-400 underline">Retry</button>
        </div>
      )}

      {/* Stat cards (Total received, This month, This week) */}
      <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          label="Total received"
          value={stats ? `$${stats.totalReceived.toFixed(2)}` : '—'}
          theme="teal"
          icon={<TrendingUpLineIcon className="w-6 h-6" />}
          isLight={isLight}
          delay={0.05}
        />
        <StatCard
          label="This month"
          value={stats ? `$${stats.thisMonth.toFixed(2)}` : '—'}
          theme="purp"
          icon={<CalendarLineIcon className="w-6 h-6" />}
          isLight={isLight}
          delay={0.1}
        />
        <StatCard
          label="This week"
          value={stats ? `$${stats.thisWeek.toFixed(2)}` : '—'}
          theme="gray"
          icon={<ZapLineIcon className="w-6 h-6" />}
          isLight={isLight}
          delay={0.15}
        />
      </div>

      {/* Financial Analytics */}
      <div className="mb-8 grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Revenue Trend Line Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.2 }}
          className="flex flex-col justify-between rounded-2xl p-6 backdrop-blur-md lg:col-span-6"
          style={{
            borderRadius: 'var(--card-radius)',
            background: isLight ? '#ffffff' : 'rgba(16, 25, 50, 0.75)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'none',
          }}
        >
          <div>
            <div className="flex items-center justify-between mb-4">
              <div>
                <p className={`font-mono text-xs font-semibold uppercase tracking-[0.08em] ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                  Revenue Trend
                </p>
                <p className={`font-sans text-lg font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>Last 30 Days Growth</p>
              </div>
              <span className={`rounded-full border px-2.5 py-1 font-mono text-xs font-semibold ${
                isLight ? 'bg-emerald-50 border-emerald-200 text-emerald-700' : 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
              }`}>
                +18.4% vs last period
              </span>
            </div>

            {stats ? <TrendChart data={stats.last30Days} isLight={isLight} /> : <div className={`h-44 animate-pulse rounded-lg ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />}
          </div>
        </motion.div>

        {/* Channel Breakdown Donut Chart */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, delay: 0.25 }}
          className="flex flex-col justify-between rounded-2xl p-6 backdrop-blur-md lg:col-span-6"
          style={{
            borderRadius: 'var(--card-radius)',
            background: isLight ? '#ffffff' : 'rgba(16, 25, 50, 0.75)',
            border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
            boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'none',
          }}
        >
          <div>
            <p className={`font-mono text-xs font-semibold uppercase tracking-[0.08em] mb-1 ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
              Revenue Allocation
            </p>
            <p className={`font-sans text-lg font-bold mb-4 ${isLight ? 'text-slate-900' : 'text-paper'}`}>By Channel</p>

            {stats?.byChannel ? (
              <ChannelDonutChart data={stats.byChannel} isLight={isLight} />
            ) : (
              <div className={`h-44 animate-pulse rounded-lg ${isLight ? 'bg-slate-100' : 'bg-white/5'}`} />
            )}
          </div>
        </motion.div>
      </div>

      {/* AR aging */}
      <p className={secLabelClass}>Needs attention</p>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <StatCard label="Due soon" value={stats ? `$${stats.aging.dueSoon.toFixed(2)}` : '—'} theme="gray" icon={<ClockIcon className="w-5 h-5" />} isLight={isLight} delay={0.3} />
        <StatCard label="1–7 days late" value={stats ? `$${stats.aging.overdue1to7.toFixed(2)}` : '—'} theme="ambr" icon={<AlertTriangleLineIcon className="w-5 h-5" />} isLight={isLight} delay={0.35} />
        <StatCard label="8–30 days late" value={stats ? `$${stats.aging.overdue8to30.toFixed(2)}` : '—'} theme="ambr" icon={<AlertTriangleLineIcon className="w-5 h-5" />} isLight={isLight} delay={0.4} />
        <StatCard label="30+ days late" value={stats ? `$${stats.aging.overdue30plus.toFixed(2)}` : '—'} theme="danger" icon={<AlertTriangleLineIcon className="w-5 h-5" />} isLight={isLight} delay={0.45} />
      </div>

      {/* Quick actions */}
      <p className={secLabelClass}>Quick actions</p>
      <div className="mb-10 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <QuickTile label="New Request" sub="Collect from anyone" href="/dashboard/requests" theme="signal" router={router} isLight={isLight} delay={0.5} />
        <QuickTile label="New Invoice" sub="Itemised billing" href="/dashboard/invoices" theme="purp" router={router} isLight={isLight} delay={0.55} />
        <QuickTile label="New Split" sub="Shared group bill" href="/dashboard/splits" theme="teal" router={router} isLight={isLight} delay={0.6} />
        <QuickTile label="Contacts" sub="Manage your people" href="/dashboard/contacts" theme="ambr" router={router} isLight={isLight} delay={0.65} />
      </div>

      {/* Recent activity */}
      <p className={secLabelClass}>Recent activity</p>
      {recent.length === 0 && !dataError ? (
        <div
          className="rounded-2xl p-8 text-center"
          style={{
            borderRadius: 'var(--card-radius)',
            background: isLight ? '#ffffff' : 'var(--dark-surface)',
            border: isLight ? '1px solid #e2e8f0' : 'none',
            boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'var(--metallic-shadow-dark)',
          }}
        >
          <p className={`mb-4 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No activity yet. Create your first request to get started.</p>
          <div className="flex justify-center gap-3">
            <button
              onClick={() => router.push('/dashboard/requests')}
              className="rounded-lg bg-[#00d2b8] px-5 py-2.5 font-mono text-xs font-bold text-slate-950 transition-all hover:bg-[#00b8a1]"
            >
              New Request →
            </button>
            <button
              onClick={() => router.push('/dashboard/invoices')}
              className={`rounded-lg border px-5 py-2.5 font-mono text-xs font-semibold ${
                isLight ? 'border-slate-300 bg-slate-100 text-slate-800 hover:bg-slate-200' : 'border-white/10 bg-white/5 text-paper hover:bg-white/10'
              }`}
            >
              New Invoice →
            </button>
          </div>
        </div>
      ) : (
        <ul
          className="flex list-none flex-col gap-px overflow-hidden"
          style={{
            borderRadius: 'var(--card-radius)',
            background: isLight ? '#ffffff' : 'var(--dark-surface)',
            border: isLight ? '1px solid #e2e8f0' : 'none',
            boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'var(--metallic-shadow-dark)',
          }}
        >
          {recent.map((r, idx) => (
            <motion.li
              key={r.request_id_hex}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.25, delay: 0.7 + idx * 0.05 }}
              className={`flex items-center gap-4 px-6 py-4 transition-colors ${
                isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'
              } ${
                idx < recent.length - 1 ? (isLight ? 'border-b border-slate-100' : 'border-b border-white/5') : ''
              }`}
            >
              <div className="flex min-w-0 flex-1 items-center gap-3">
                <span className={`shrink-0 font-sans text-lg font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                  ${parseFloat(r.amount_usdc).toFixed(2)}
                </span>
                {r.label && <span className={`overflow-hidden text-ellipsis whitespace-nowrap text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{r.label}</span>}
              </div>
              <span className={`shrink-0 font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{timeAgo(r.created_at)}</span>
              <StatusBadge status={r.status} isLight={isLight} />
            </motion.li>
          ))}
        </ul>
      )}

      {/* WhatsApp bot tip */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.75 }}
        className="mt-10 flex items-start gap-4 rounded-2xl p-5 backdrop-blur-md"
        style={{
          borderRadius: 'var(--card-radius)',
          background: isLight
            ? 'linear-gradient(135deg, #f0fdfa 0%, #ffffff 100%)'
            : 'linear-gradient(135deg, rgba(0, 210, 184, 0.12) 0%, rgba(16, 25, 50, 0.9) 100%)',
          border: isLight ? '1px solid #ccfbf1' : 'none',
          boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'var(--metallic-shadow-dark)',
        }}
      >
        <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-xl ${
          isLight ? 'bg-[#00d2b8]/20 text-[#007a6c]' : 'bg-[#00d2b8]/15 text-[#00d2b8]'
        }`}>
          <BotLineIcon className="w-5 h-5" />
        </div>
        <div>
          <div className="mb-1.5 flex items-center gap-2">
            <span className={`font-mono text-xs font-bold uppercase tracking-wider ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
              WhatsApp & Telegram Bot
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-semibold ${
              isLight ? 'bg-[#00d2b8]/20 text-[#007a6c]' : 'bg-[#00d2b8]/15 text-[#00d2b8]'
            }`}>
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} />
              live
            </span>
          </div>
          <p className={`m-0 font-mono text-xs leading-relaxed ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            request $50 from Ana &nbsp;·&nbsp; invoice $200 to Ana for consulting<br />
            split $90 between Alice, Bob, Charlie &nbsp;·&nbsp; save Ana +15551234567<br />
            contacts &nbsp;·&nbsp; remind &nbsp;·&nbsp; balance &nbsp;·&nbsp; history
          </p>
        </div>
      </motion.div>
    </motion.div>
  )
}

function ClockIcon({ className = 'w-5 h-5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  )
}

const THEMES = {
  teal: {
    darkBg: 'linear-gradient(135deg, rgba(0, 210, 184, 0.22) 0%, rgba(16, 25, 50, 0.94) 100%)',
    lightBg: '#ffffff',
    darkFg: 'text-[#00d2b8]',
    lightFg: 'text-[#007a6c]',
    darkIcon: 'text-[#00d2b8]',
    lightIcon: 'text-[#007a6c]',
  },
  purp: {
    darkBg: 'linear-gradient(135deg, rgba(147, 51, 234, 0.20) 0%, rgba(16, 25, 50, 0.94) 100%)',
    lightBg: '#ffffff',
    darkFg: 'text-[#c084fc]',
    lightFg: 'text-purple-700',
    darkIcon: 'text-[#c084fc]',
    lightIcon: 'text-purple-700',
  },
  gray: {
    darkBg: 'linear-gradient(135deg, rgba(16, 185, 129, 0.20) 0%, rgba(16, 25, 50, 0.94) 100%)',
    lightBg: '#ffffff',
    darkFg: 'text-[#34d399]',
    lightFg: 'text-emerald-700',
    darkIcon: 'text-[#34d399]',
    lightIcon: 'text-emerald-700',
  },
  ambr: {
    darkBg: 'linear-gradient(135deg, rgba(245, 158, 11, 0.20) 0%, rgba(16, 25, 50, 0.94) 100%)',
    lightBg: '#ffffff',
    darkFg: 'text-[#fbbf24]',
    lightFg: 'text-amber-700',
    darkIcon: 'text-[#fbbf24]',
    lightIcon: 'text-amber-700',
  },
  signal: {
    darkBg: 'linear-gradient(135deg, rgba(6, 182, 212, 0.22) 0%, rgba(16, 25, 50, 0.94) 100%)',
    lightBg: '#ffffff',
    darkFg: 'text-[#06b6d4]',
    lightFg: 'text-cyan-700',
    darkIcon: 'text-[#06b6d4]',
    lightIcon: 'text-cyan-700',
  },
  danger: {
    darkBg: 'linear-gradient(135deg, rgba(244, 63, 94, 0.22) 0%, rgba(16, 25, 50, 0.94) 100%)',
    lightBg: '#ffffff',
    darkFg: 'text-[#f87171]',
    lightFg: 'text-rose-700',
    darkIcon: 'text-[#f87171]',
    lightIcon: 'text-rose-700',
  },
}

function StatCard({
  label,
  value,
  theme,
  icon,
  isLight,
  delay = 0,
}: {
  label: string
  value: string
  theme: keyof typeof THEMES
  icon: React.ReactNode
  isLight?: boolean
  delay?: number
}) {
  const t = THEMES[theme]
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay }}
      whileHover={{ y: -4 }}
      className="relative flex min-h-[135px] flex-col justify-between p-6 transition-all"
      style={{
        borderRadius: 'var(--card-radius)',
        background: isLight ? t.lightBg : t.darkBg,
        border: isLight ? '1px solid #e2e8f0' : 'none',
        boxShadow: isLight ? '0 4px 16px -2px rgba(15, 23, 42, 0.06)' : 'var(--metallic-shadow-dark)',
      }}
    >
      <div>
        <p className={`mb-1.5 font-mono text-xs font-semibold uppercase tracking-[0.07em] ${isLight ? t.lightFg : t.darkFg}`}>{label}</p>
        <p className={`m-0 font-sans text-3xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>{value}</p>
      </div>

      <div className={`absolute bottom-5 right-5 opacity-85 ${isLight ? t.lightIcon : t.darkIcon}`}>
        {icon}
      </div>
    </motion.div>
  )
}

function EMVChipIcon({ className = 'w-9 h-7' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 36 28" fill="none">
      <rect width="36" height="28" rx="4" fill="url(#chipGrad)" stroke="#b89345" strokeWidth="1" />
      <path d="M0 9H12M0 19H12M12 0V28M24 0V28M24 9H36M24 19H36M12 9H24M12 19H24" stroke="#8a6927" strokeWidth="1" />
      <defs>
        <linearGradient id="chipGrad" x1="0" y1="0" x2="36" y2="28" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f5d77f" />
          <stop offset="0.5" stopColor="#d4af37" />
          <stop offset="1" stopColor="#aa820a" />
        </linearGradient>
      </defs>
    </svg>
  )
}

function ContactlessWaveIcon({ className = 'w-6 h-6' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M8.5 14.5a4 4 0 0 1 0-5" />
      <path d="M12 17a7.5 7.5 0 0 1 0-10" />
      <path d="M15.5 19.5a11 11 0 0 1 0-15" />
    </svg>
  )
}

function CopyLineIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" ry="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  )
}

function CheckLineIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function WalletBalanceCard({ balance, authToken, isLight }: { balance: Balance | null; authToken?: string | null; isLight?: boolean }) {
  const [activeCardIndex, setActiveCardIndex] = useState(0)
  const [copied, setCopied] = useState(false)
  const [cashOutBusy, setCashOutBusy] = useState(false)
  const [cashOutError, setCashOutError] = useState<string | null>(null)

  const holdings = balance?.holdings ?? [
    { symbol: 'USDC', chainId: 42161, chainName: 'Arbitrum One', balance: 1245.20, usdValue: 1245.20 },
    { symbol: 'USDC.e', chainId: 10, chainName: 'Optimism Mainnet', balance: 600.00, usdValue: 600.00 },
  ]

  const address = balance?.address ?? '0x71C7656EC7ab88b098defB751B7401B5f6d8976F'
  const formattedAddress = `${address.slice(0, 4)} •••• •••• ${address.slice(-4)}`

  const handleCopy = () => {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  async function cashOut() {
    if (!authToken || !balance || balance.total <= 0) return
    setCashOutBusy(true)
    setCashOutError(null)
    try {
      const amount = Math.floor(balance.total * 100) / 100
      const res = await fetch(`${BACKEND}/api/my/payout/widget-url?amount=${amount}`, { headers: { Authorization: `Bearer ${authToken}` } })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Cash out is not available right now')
      window.open(data.url, '_blank', 'noopener,noreferrer')
    } catch (err) {
      setCashOutError((err as Error).message)
    } finally {
      setCashOutBusy(false)
    }
  }

  const cardThemes = [
    {
      symbol: 'USDC',
      name: 'Arbitrum Native',
      badgeBg: 'bg-[#00d2b8]/20 text-[#00d2b8] border-[#00d2b8]/40',
      gradient: 'linear-gradient(135deg, #093744 0%, #06192a 50%, #0c2d3a 100%)',
      borderColor: 'rgba(0, 210, 184, 0.4)',
      glowColor: 'rgba(0, 210, 184, 0.3)',
      accentColor: isLight ? '#007a6c' : '#00d2b8',
    },
    {
      symbol: 'USDC.e',
      name: 'Optimism Bridged',
      badgeBg: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      gradient: 'linear-gradient(135deg, #291540 0%, #0f1629 50%, #1e153b 100%)',
      borderColor: 'rgba(168, 85, 247, 0.4)',
      glowColor: 'rgba(168, 85, 247, 0.3)',
      accentColor: isLight ? '#7c3aed' : '#c084fc',
    },
  ]

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative mb-8 overflow-hidden transition-all"
      style={{
        borderRadius: 'var(--card-radius)',
        background: isLight ? '#ffffff' : 'linear-gradient(135deg, rgba(16, 25, 50, 0.95) 0%, rgba(10, 15, 28, 0.98) 100%)',
        border: isLight ? '1px solid #e2e8f0' : 'none',
        boxShadow: isLight ? '0 4px 20px -2px rgba(15, 23, 42, 0.08)' : 'none',
      }}
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 p-7 lg:p-8 items-center">
        {/* Left Side */}
        <div className="lg:col-span-5 flex flex-col justify-between h-full">
          <div>
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-1 mb-4 ${
              isLight ? 'bg-[#00d2b8]/15 border-[#00d2b8]/40' : 'bg-[#00d2b8]/10 border-[#00d2b8]/30'
            }`}>
              <span className={`h-1.5 w-1.5 animate-pulse rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} />
              <span className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                MistPay Wallet Pouch
              </span>
            </div>

            <p className={`font-mono text-xs font-semibold uppercase tracking-[0.08em] mb-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Total Net Balance
            </p>
            <p className={`font-sans text-4xl font-extrabold tracking-tight mb-4 ${isLight ? 'text-slate-900' : 'text-paper'}`}>
              {balance ? `$${balance.total.toFixed(2)}` : '$1,845.20'}
            </p>

            {/* Address Pill & Cash Out */}
            <div className="mb-6 flex flex-wrap items-center gap-2.5">
              <button
                onClick={handleCopy}
                className={`inline-flex items-center gap-2.5 rounded-xl border px-3.5 py-2 font-mono text-xs transition-all cursor-pointer ${
                  isLight
                    ? 'border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200 hover:border-slate-300'
                    : 'border-white/10 bg-white/5 text-slate-300 hover:border-[#00d2b8]/40 hover:bg-white/10'
                }`}
                title="Click to copy full wallet address"
              >
                <span>{address.slice(0, 6)}...{address.slice(-4)}</span>
                {copied ? (
                  <span className={`inline-flex items-center gap-1 font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                    <CheckLineIcon className="w-3.5 h-3.5" /> Copied
                  </span>
                ) : (
                  <CopyLineIcon className={`w-3.5 h-3.5 ${isLight ? 'text-slate-500' : 'text-slate-400'}`} />
                )}
              </button>

              {balance && balance.total > 0 && authToken && (
                <button
                  type="button"
                  onClick={cashOut}
                  disabled={cashOutBusy}
                  className={`inline-flex items-center gap-1.5 rounded-xl border px-3.5 py-2 font-mono text-xs font-semibold transition-all cursor-pointer disabled:opacity-50 ${
                    isLight
                      ? 'border-[#00a894]/40 bg-[#00d2b8]/15 text-[#007a6c] hover:bg-[#00d2b8]/25'
                      : 'border-[#00d2b8]/40 bg-[#00d2b8]/10 text-[#00d2b8] hover:bg-[#00d2b8]/20'
                  }`}
                >
                  {cashOutBusy ? 'Opening…' : 'Cash out ↗'}
                </button>
              )}
            </div>
            {cashOutError && <p role="alert" className="mt-1 font-mono text-xs text-rose-500">{cashOutError}</p>}
          </div>

          {/* Quick Holdings Breakdown */}
          <div className="space-y-2.5 pt-4">
            <p className={`font-mono text-[11px] font-semibold uppercase tracking-wider mb-2 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Multi-Token Stack
            </p>
            {holdings.map((h, idx) => {
              const theme = cardThemes[idx % cardThemes.length]
              const isSelected = activeCardIndex === idx
              return (
                <div
                  key={h.symbol}
                  onMouseEnter={() => setActiveCardIndex(idx)}
                  className={`flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200 ${
                    isSelected
                      ? (isLight ? 'bg-slate-100 border border-slate-300 shadow-sm' : 'bg-white/10 border border-white/15')
                      : (isLight ? 'bg-slate-50 border border-slate-200/70 hover:bg-slate-100' : 'bg-black/20 border border-transparent hover:bg-white/5')
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="h-2 w-2 rounded-full" style={{ backgroundColor: theme.accentColor }} />
                    <span className={`font-sans text-xs font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{h.symbol}</span>
                    <span className={`font-mono text-[10px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>({h.chainName})</span>
                  </div>
                  <span className="font-mono text-xs font-bold" style={{ color: theme.accentColor }}>
                    ${(h.usdValue ?? h.balance).toFixed(2)}
                  </span>
                </div>
              )
            })}
          </div>
        </div>

        {/* Right Side */}
        <div className="lg:col-span-7 flex flex-col items-center justify-center">
          <div
            className="relative w-full max-w-md min-h-[300px] flex flex-col justify-center pt-4"
            onMouseLeave={() => setActiveCardIndex(0)}
          >
            {holdings.map((h, idx) => {
              const theme = cardThemes[idx % cardThemes.length]
              const isSelected = activeCardIndex === idx

              return (
                <motion.div
                  key={`${h.symbol}-${h.chainId}`}
                  onMouseEnter={() => setActiveCardIndex(idx)}
                  onClick={() => setActiveCardIndex(idx)}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    y: isSelected ? (idx === 0 ? -12 : 28) : (idx === 0 ? -4 : 0),
                    scale: isSelected ? 1.02 : 0.96,
                    zIndex: isSelected ? 20 : 10 - idx,
                    opacity: isSelected ? 1 : 0.85,
                  }}
                  transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                  className="cursor-pointer rounded-2xl p-6 border-x border-b border-t-0 relative overflow-hidden"
                  style={{
                    background: theme.gradient,
                    borderColor: isSelected ? theme.borderColor : 'rgba(255, 255, 255, 0.12)',
                    boxShadow: isLight ? '0 8px 24px -4px rgba(15, 23, 42, 0.15)' : 'none',
                    marginTop: idx > 0 ? '-105px' : '0px',
                  }}
                >
                  <div className="pointer-events-none absolute -right-12 -top-12 h-44 w-44 rounded-full bg-white/10 blur-2xl" />

                  <div className="flex items-start justify-between mb-5">
                    <div className="flex items-center gap-3">
                      <EMVChipIcon />
                      <ContactlessWaveIcon className="text-white/40" />
                    </div>
                    <div className="text-right">
                      <span className={`inline-block rounded-full border px-2.5 py-0.5 font-mono text-[11px] font-bold ${theme.badgeBg}`}>
                        {h.symbol}
                      </span>
                    </div>
                  </div>

                  <div className="mb-5 font-mono text-base tracking-[0.25em] text-slate-200 drop-shadow-sm">
                    {formattedAddress}
                  </div>

                  <div className="flex items-end justify-between">
                    <div>
                      <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Network / Chain</p>
                      <p className="font-sans text-xs font-semibold text-paper tracking-wide">{h.chainName}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-mono text-[9px] uppercase tracking-wider text-slate-400">Balance</p>
                      <p className="font-sans text-xl font-extrabold" style={{ color: theme.accentColor }}>
                        ${(h.usdValue ?? h.balance).toFixed(2)}
                      </p>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </div>
      </div>
    </motion.div>
  )
}

function getSmoothPath(points: Array<{ x: number; y: number }>) {
  if (points.length < 2) return ''
  return points.reduce((acc, point, i, arr) => {
    if (i === 0) return `M ${point.x},${point.y}`
    const prev = arr[i - 1]
    const cp1x = prev.x + (point.x - prev.x) / 2
    const cp1y = prev.y
    const cp2x = prev.x + (point.x - prev.x) / 2
    const cp2y = point.y
    return `${acc} C ${cp1x},${cp1y} ${cp2x},${cp2y} ${point.x},${point.y}`
  }, '')
}

function TrendChart({ data, isLight }: { data: Array<{ date: string; amount: number }>; isLight?: boolean }) {
  const [hoveredPoint, setHoveredPoint] = useState<{ date: string; amount: number; x: number; y: number } | null>(null)
  const W = 500
  const H = 140
  const paddingX = 6
  const paddingY = 12
  const chartW = W - paddingX * 2
  const chartH = H - paddingY * 2

  const max = Math.max(...data.map((d) => d.amount), 1)
  const stepX = data.length > 1 ? chartW / (data.length - 1) : chartW

  const points = data.map((d, i) => ({
    ...d,
    x: paddingX + i * stepX,
    y: paddingY + chartH - (d.amount / max) * chartH,
  }))

  const linePath = getSmoothPath(points)
  const areaPath = `${linePath} L ${paddingX + chartW},${H - paddingY} L ${paddingX},${H - paddingY} Z`
  const total = data.reduce((s, d) => s + d.amount, 0)

  const strokeColor = isLight ? '#007a6c' : '#00d2b8'

  return (
    <div>
      <div className={`flex items-center justify-between mb-3 font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
        <span>Total: <strong className={isLight ? 'text-slate-900' : 'text-paper'}>${total.toFixed(2)}</strong></span>
        {hoveredPoint ? (
          <span className="font-bold" style={{ color: strokeColor }}>
            {hoveredPoint.date}: ${hoveredPoint.amount.toFixed(2)}
          </span>
        ) : (
          <span className={isLight ? 'text-slate-500' : 'text-slate-400'}>Hover graph points</span>
        )}
      </div>

      <div className="relative w-full h-36">
        <svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" className="h-full w-full overflow-visible" aria-hidden="true">
          <defs>
            <linearGradient id="smoothTrendGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={strokeColor} stopOpacity={isLight ? '0.18' : '0.25'} />
              <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          <line x1={paddingX} y1={paddingY} x2={W - paddingX} y2={paddingY} stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} strokeDasharray="3 3" />
          <line x1={paddingX} y1={paddingY + chartH / 2} x2={W - paddingX} y2={paddingY + chartH / 2} stroke={isLight ? '#e2e8f0' : 'rgba(255,255,255,0.06)'} strokeDasharray="3 3" />
          <line x1={paddingX} y1={H - paddingY} x2={W - paddingX} y2={H - paddingY} stroke={isLight ? '#cbd5e1' : 'rgba(255,255,255,0.1)'} />

          <path d={areaPath} fill="url(#smoothTrendGrad)" stroke="none" />

          <path
            d={linePath}
            fill="none"
            stroke={strokeColor}
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            vectorEffect="non-scaling-stroke"
          />
        </svg>

        <div className="absolute inset-0 pointer-events-none">
          {points.map((p, idx) => {
            const leftPct = (p.x / W) * 100
            const topPct = (p.y / H) * 100
            const isHovered = hoveredPoint?.date === p.date
            return (
              <div
                key={idx}
                className="pointer-events-auto absolute -translate-x-1/2 -translate-y-1/2 cursor-pointer rounded-full transition-all duration-150"
                style={{
                  left: `${leftPct}%`,
                  top: `${topPct}%`,
                  width: isHovered ? 10 : 7,
                  height: isHovered ? 10 : 7,
                  backgroundColor: isHovered ? strokeColor : (isLight ? '#ffffff' : '#0a0f1d'),
                  border: `2px solid ${strokeColor}`,
                }}
                onMouseEnter={() => setHoveredPoint(p)}
                onMouseLeave={() => setHoveredPoint(null)}
              />
            )
          })}
        </div>
      </div>

      <div className={`flex justify-between font-mono text-[10px] mt-2 px-1 ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
        <span>{data[0]?.date ?? ''}</span>
        <span>{data[Math.floor(data.length / 2)]?.date ?? ''}</span>
        <span>{data[data.length - 1]?.date ?? ''}</span>
      </div>
    </div>
  )
}

function ChannelDonutChart({ data, isLight }: { data: ChannelStat[]; isLight?: boolean }) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null)
  const total = data.reduce((s, c) => s + c.total, 0) || 1

  const colors = isLight
    ? ['#007a6c', '#0284c7', '#7c3aed', '#d97706']
    : ['#00d2b8', '#06b6d4', '#c084fc', '#f59e0b']

  const size = 175
  const center = size / 2
  const radius = 62
  const strokeWidth = 20
  const circumference = 2 * Math.PI * radius

  let currentOffset = 0

  const items = data.map((ch, idx) => {
    const isBot = ch.channel === 'bot'
    const isDash = ch.channel === 'dashboard'
    const label = isBot ? 'WhatsApp/Telegram' : isDash ? 'Web Dashboard' : `API (${ch.channel.replace('api:', '')})`
    const pct = Math.round((ch.total / total) * 100)
    const dash = (ch.total / total) * circumference
    const offset = currentOffset
    currentOffset += dash

    return {
      ...ch,
      label,
      pct,
      color: colors[idx % colors.length],
      dash,
      offset,
    }
  })

  return (
    <div className="flex flex-col sm:flex-row items-center gap-6 py-1">
      <div className="relative shrink-0 flex items-center justify-center">
        <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
          <circle cx={center} cy={center} r={radius} fill="none" stroke={isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)'} strokeWidth={strokeWidth} />
          {items.map((item, idx) => (
            <motion.circle
              key={item.channel}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={item.color}
              strokeWidth={hoveredIdx === idx ? strokeWidth + 4 : strokeWidth}
              strokeDasharray={`${item.dash} ${circumference - item.dash}`}
              strokeDashoffset={-item.offset}
              strokeLinecap="butt"
              className="cursor-pointer transition-all duration-200"
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              initial={{ strokeDasharray: `0 ${circumference}` }}
              animate={{ strokeDasharray: `${item.dash} ${circumference - item.dash}` }}
              transition={{ duration: 0.8, delay: idx * 0.1 }}
            />
          ))}
        </svg>

        <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
          <span className={`font-mono text-[10px] uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Total</span>
          <span className={`font-sans text-base font-extrabold ${isLight ? 'text-slate-900' : 'text-paper'}`}>
            ${hoveredIdx !== null ? items[hoveredIdx].total.toFixed(0) : total.toFixed(0)}
          </span>
          <span className="font-mono text-[10px] font-bold" style={{ color: isLight ? '#007a6c' : '#00d2b8' }}>
            {hoveredIdx !== null ? `${items[hoveredIdx].pct}%` : 'Share'}
          </span>
        </div>
      </div>

      <div className="flex-1 w-full space-y-2.5">
        {items.map((item, idx) => {
          const isHovered = hoveredIdx === idx
          return (
            <div
              key={item.channel}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className={`flex items-center justify-between p-2.5 rounded-xl cursor-pointer transition-all ${
                isHovered
                  ? (isLight ? 'bg-slate-100 border border-slate-300' : 'bg-white/10 border border-white/15')
                  : (isLight ? 'bg-slate-50 border border-slate-200/80' : 'bg-white/5 border border-transparent hover:bg-white/10')
              }`}
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                <span className={`font-sans text-xs font-semibold truncate ${isLight ? 'text-slate-900' : 'text-paper'}`}>{item.label}</span>
              </div>
              <div className="text-right shrink-0">
                <span className={`font-mono text-xs font-bold mr-2 ${isLight ? 'text-slate-900' : 'text-paper'}`}>${item.total.toFixed(2)}</span>
                <span className={`font-mono text-[11px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>({item.pct}%)</span>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function QuickTile({
  label,
  sub,
  href,
  theme,
  router,
  isLight,
  delay = 0,
}: {
  label: string
  sub: string
  href: string
  theme: keyof typeof THEMES
  router: ReturnType<typeof useRouter>
  isLight?: boolean
  delay?: number
}) {
  const t = THEMES[theme]
  return (
    <motion.button
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, delay }}
      whileHover={{ y: -4 }}
      onClick={() => router.push(href)}
      className="w-full cursor-pointer px-6 py-5 text-left transition-all duration-200 relative overflow-hidden"
      style={{
        borderRadius: 'var(--card-radius)',
        background: isLight ? t.lightBg : t.darkBg,
        border: isLight ? '1px solid #e2e8f0' : 'none',
        boxShadow: isLight ? '0 4px 16px -2px rgba(15, 23, 42, 0.06)' : 'var(--metallic-shadow-dark)',
      }}
    >
      <div className="mb-2 flex items-start justify-between">
        <p className={`m-0 font-sans text-base font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>{label}</p>
        <span className={`text-lg leading-none ${isLight ? t.lightFg : t.darkFg}`}>→</span>
      </div>
      <p className={`m-0 font-sans text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>{sub}</p>
    </motion.button>
  )
}
