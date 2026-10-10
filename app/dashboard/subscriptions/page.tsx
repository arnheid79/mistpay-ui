'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

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

export interface Plan {
  id: string
  name: string
  amount_usdc: string
  interval: 'weekly' | 'monthly' | 'yearly'
  token_symbol: string
  code: string
  active: boolean
  link: string
  created_at?: number
  features?: string[]
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

function RepeatIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 2l4 4-4 4" />
      <path d="M3 11v-1a4 4 0 0 1 4-4h14" />
      <path d="M7 22l-4-4 4-4" />
      <path d="M21 13v1a4 4 0 0 1-4 4H3" />
    </svg>
  )
}

function ExternalLinkIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
      <polyline points="15 3 21 3 21 9" />
      <line x1="10" y1="14" x2="21" y2="3" />
    </svg>
  )
}

function PlusIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="5" x2="12" y2="19" />
      <line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  )
}

export default function SubscriptionsPlansPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'

  const [plans, setPlans] = useState<Plan[]>([])
  const [loading, setLoading] = useState(true)
  const [showModal, setShowModal] = useState(false)
  const [copiedCode, setCopiedCode] = useState<string | null>(null)

  // Modal Form State
  const [name, setName] = useState('')
  const [amount, setAmount] = useState('20')
  const [interval, setInterval] = useState<'weekly' | 'monthly' | 'yearly'>('monthly')
  const [currency, setCurrency] = useState('USDC')
  const [featuresText, setFeaturesText] = useState('')
  const [creating, setCreating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)

    async function load() {
      if (token === 'demo-token') {
        setPlans([
          {
            id: 'plan-1',
            name: 'Pro Tier Membership',
            amount_usdc: '29.00',
            interval: 'monthly',
            token_symbol: 'USDC',
            code: 'plan_pro_29',
            active: true,
            link: 'https://mistpay.in/subscribe/plan_pro_29',
            features: [
              'Automated USDC Recurring Billing',
              'On-Chain USDC Settlement',
              'Automated WhatsApp Renewal Reminders',
            ],
          },
          {
            id: 'plan-2',
            name: 'Weekly Consulting Retainer',
            amount_usdc: '150.00',
            interval: 'weekly',
            token_symbol: 'USDC',
            code: 'plan_consulting_wk',
            active: true,
            link: 'https://mistpay.in/subscribe/plan_consulting_wk',
            features: [
              'Weekly Retainer USDC Auto-Charge',
              'Zero Escrow / Instant Wallet Payout',
              'Automated WhatsApp Receipts & Reminders',
            ],
          },
          {
            id: 'plan-3',
            name: 'Annual VIP Pass',
            amount_usdc: '299.00',
            interval: 'yearly',
            token_symbol: 'USDC',
            code: 'plan_vip_yr',
            active: false,
            link: 'https://mistpay.in/subscribe/plan_vip_yr',
            features: [
              'Annual USDC Recurring Settlement',
              'Direct API & Webhook Synchronization',
              'Self-Serve Subscriber Portal Link',
            ],
          },
        ])
        setLoading(false)
        return
      }

      try {
        const res = await fetch(`${BACKEND}/api/my/subscription-plans`, {
          headers: { Authorization: `Bearer ${token}` },
        })
        if (res.status === 401) {
          localStorage.removeItem('mistpay_auth')
          router.replace('/')
          return
        }
        const data = await res.json()
        setPlans(Array.isArray(data) ? data : [])
      } catch (err) {
        console.error('Failed to load plans:', err)
      } finally {
        setLoading(false)
      }
    }

    load()
  }, [router])

  async function handleToggleActive(plan: Plan) {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)

    const updatedActive = !plan.active
    setPlans(plans.map((p) => (p.id === plan.id ? { ...p, active: updatedActive } : p)))

    if (token === 'demo-token') return

    try {
      await fetch(`${BACKEND}/api/my/subscription-plans/${plan.id}`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ active: updatedActive }),
      })
    } catch (err) {
      console.error('Failed to update plan:', err)
    }
  }

  async function handleCreatePlan(e: React.FormEvent) {
    e.preventDefault()
    if (!name.trim()) {
      setError('Plan name is required.')
      return
    }
    if (!amount || parseFloat(amount) <= 0) {
      setError('Amount must be greater than zero.')
      return
    }

    setError(null)
    setCreating(true)

    const parsedFeatures = featuresText.trim()
      ? featuresText.split(',').map((s) => s.trim()).filter(Boolean)
      : ['Automated USDC Settlement', 'WhatsApp Renewal Reminders']

    const raw = localStorage.getItem('mistpay_auth')
    const token = raw ? JSON.parse(raw).authToken : 'demo-token'

    if (token === 'demo-token') {
      const newPlan: Plan = {
        id: `plan-${Date.now()}`,
        name: name.trim(),
        amount_usdc: parseFloat(amount).toFixed(2),
        interval,
        token_symbol: currency,
        code: `plan_${name.toLowerCase().replace(/[^a-z0-9]/g, '_')}_${Math.floor(Math.random() * 1000)}`,
        active: true,
        link: `https://mistpay.in/subscribe/plan_demo_${Date.now()}`,
        features: parsedFeatures,
      }
      setPlans([newPlan, ...plans])
      setCreating(false)
      setShowModal(false)
      setName('')
      setAmount('20')
      setFeaturesText('')
      return
    }

    try {
      const res = await fetch(`${BACKEND}/api/my/subscription-plans`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: name.trim(),
          amount: parseFloat(amount),
          interval,
          currency,
          features: parsedFeatures,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? 'Could not create plan')
      }

      const createdPlan = await res.json()
      setPlans([{ ...createdPlan, features: parsedFeatures }, ...plans])
      setShowModal(false)
      setName('')
      setAmount('20')
      setFeaturesText('')
    } catch (err: any) {
      setError(err.message ?? 'Failed to create plan')
    } finally {
      setCreating(false)
    }
  }

  function handleCopyLink(code: string, link: string) {
    navigator.clipboard.writeText(link)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 1500)
  }

  return (
    <div>
      <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className={`mb-1 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
            Subscription Plans
          </h1>
          <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Create recurring billing tiers with shareable checkout links.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#00d2b8] px-4 py-2.5 font-sans text-sm font-bold text-slate-950 shadow-lg shadow-[#00d2b8]/20 transition-all hover:bg-[#00b8a1]"
        >
          <PlusIcon /> Create Plan
        </button>
      </div>

      {loading ? (
        <div className="flex flex-col gap-5 w-full">
          {[1, 2, 3].map((i) => (
            <div key={i} className={`h-56 animate-pulse rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'border-white/10 bg-[#0c141d]/80'}`} />
          ))}
        </div>
      ) : plans.length === 0 ? (
        <div className={`rounded-xl px-8 py-14 text-center backdrop-blur-md ${
          isLight ? 'bg-white border border-slate-200 shadow-sm' : 'border border-white/10 bg-[#0c141d]/80'
        }`}>
          <div className={`mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl border ${
            isLight ? 'bg-teal-50 border-teal-200 text-[#007a6c]' : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8]'
          }`}>
            <RepeatIcon className="h-7 w-7" />
          </div>
          <h3 className={`mb-1 font-sans text-lg font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>No subscription plans yet</h3>
          <p className={`mx-auto mb-6 max-w-md text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Create your first recurring tier to start accepting automated recurring USDC payments.
          </p>
          <button
            onClick={() => setShowModal(true)}
            className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-[#00d2b8] px-4 py-2.5 font-sans text-xs font-bold text-slate-950 shadow-md shadow-[#00d2b8]/20 transition-all hover:bg-[#00b8a1]"
          >
            <PlusIcon /> Create Plan
          </button>
        </div>
      ) : (
        <div className="flex flex-col gap-6 w-full">
          {plans.map((plan) => {
            const planFeatures =
              plan.features && plan.features.length > 0
                ? plan.features
                : ['Automated USDC Settlement', 'WhatsApp Renewal Reminders']

            return (
              <div
                key={plan.id}
                className={`group relative min-h-[220px] flex flex-col justify-between overflow-hidden rounded-xl border transition-all duration-300 ${
                  plan.active
                    ? (isLight
                        ? 'border-slate-200 bg-white shadow-md shadow-slate-200/50 hover:border-[#00a894]/50 hover:shadow-lg'
                        : 'border-[#00d2b8]/30 bg-gradient-to-r from-[#082830]/90 via-[#061e24]/90 to-[#041418]/95 shadow-xl shadow-black/50 hover:border-[#00d2b8]/60 hover:shadow-[0_12px_36px_-10px_rgba(0,210,184,0.25)]')
                    : (isLight
                        ? 'border-slate-200 bg-slate-50/80 opacity-75'
                        : 'border-slate-800/80 bg-slate-900/40 opacity-65 hover:opacity-90')
                }`}
              >
                {/* Left Cyan Highlight Strip */}
                {plan.active && (
                  <div className={`absolute top-0 bottom-0 left-0 w-1.5 ${isLight ? 'bg-[#007a6c]' : 'bg-gradient-to-b from-[#00d2b8] via-sky-400 to-[#00d2b8]'}`} />
                )}

                <div className="p-7 sm:p-8">
                  <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
                    {/* Column 1: Plan Title, Price & Interval Badge */}
                    <div className="min-w-[260px] space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-wider ${
                            plan.active
                              ? (isLight ? 'border-teal-200 bg-teal-50 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]')
                              : (isLight ? 'border-slate-300 bg-slate-200/60 text-slate-600' : 'border-slate-700 bg-slate-800/60 text-slate-400')
                          }`}
                        >
                          <RepeatIcon className="h-3.5 w-3.5" />
                          {plan.interval} PASS
                        </span>

                        <div className="flex items-center gap-2">
                          <span
                            className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${
                              plan.active ? (isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]') : (isLight ? 'text-slate-500' : 'text-slate-500')
                            }`}
                          >
                            {plan.active ? 'Active' : 'Paused'}
                          </span>
                          <label className="relative inline-flex cursor-pointer items-center">
                            <input
                              type="checkbox"
                              checked={plan.active}
                              onChange={() => handleToggleActive(plan)}
                              className="peer sr-only"
                            />
                            <div className={`peer h-5 w-9 rounded-full border after:absolute after:top-[2px] after:left-[2px] after:h-4 after:w-4 after:rounded-full after:transition-all after:content-[''] peer-checked:bg-[#00d2b8] peer-checked:after:translate-x-full peer-checked:after:bg-slate-950 peer-focus:outline-none ${
                              isLight ? 'border-slate-300 bg-slate-200 after:bg-white' : 'border-white/10 bg-slate-800 after:bg-slate-400'
                            }`} />
                          </label>
                        </div>
                      </div>

                      <h3 className={`font-sans text-2xl font-bold tracking-tight transition-colors ${
                        isLight ? 'text-slate-900 group-hover:text-[#007a6c]' : 'text-paper group-hover:text-[#00d2b8]'
                      }`}>
                        {plan.name}
                      </h3>

                      <div className="flex items-baseline gap-2.5">
                        <span className={`font-sans text-4xl font-extrabold tracking-tight ${isLight ? 'text-slate-900' : 'text-white'}`}>
                          ${parseFloat(plan.amount_usdc).toFixed(2)}
                        </span>
                        <span className={`inline-flex items-center gap-1 rounded-md border px-2.5 py-1 font-mono text-xs font-semibold ${
                          isLight ? 'border-teal-200 bg-teal-50 text-[#007a6c]' : 'border-[#00d2b8]/20 bg-[#00d2b8]/10 text-[#00d2b8]'
                        }`}>
                          USDC / {plan.interval}
                        </span>
                      </div>
                    </div>

                    {/* Column 2: Perks Checklist */}
                    <div className="flex-1 min-w-[300px]">
                      <div className={`rounded-xl border p-4 sm:p-5 space-y-3 ${
                        isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
                      }`}>
                        <div className="flex items-center justify-between font-mono text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          <span>Plan Payment Perks</span>
                          <span className={`font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{planFeatures.length} Features</span>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                          {planFeatures.map((feature, i) => (
                            <div key={i} className={`flex items-center gap-2.5 font-sans text-xs ${isLight ? 'text-slate-800' : 'text-slate-200'}`}>
                              <span className={`flex h-4.5 w-4.5 shrink-0 items-center justify-center rounded-full border text-[10px] font-bold ${
                                isLight ? 'bg-teal-100 border-teal-300 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
                              }`}>
                                ✓
                              </span>
                              <span className="truncate">{feature}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Column 3: Link Bar & Actions */}
                    <div className="w-full lg:w-80 space-y-2.5 shrink-0">
                      <div className="flex items-center justify-between font-mono text-[11px] uppercase tracking-wider text-slate-500">
                        <span>Checkout Link</span>
                        <span className="text-slate-500">{plan.code}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className={`flex-1 select-all truncate rounded-xl border px-3.5 py-2.5 font-mono text-xs ${
                          isLight ? 'bg-slate-100 border-slate-200 text-slate-800' : 'bg-slate-900/90 border-white/10 text-slate-300'
                        }`}>
                          {plan.link}
                        </div>
                        <button
                          onClick={() => handleCopyLink(plan.code, plan.link)}
                          className={`flex cursor-pointer shrink-0 items-center gap-1.5 rounded-xl px-3.5 py-2.5 font-sans text-xs font-semibold transition-all ${
                            copiedCode === plan.code
                              ? (isLight ? 'border border-emerald-300 bg-emerald-100 text-emerald-800' : 'border border-emerald-500/30 bg-emerald-500/20 text-emerald-400')
                              : (isLight ? 'border border-[#00a894]/40 bg-[#00d2b8]/15 text-[#007a6c] hover:bg-[#00d2b8] hover:text-slate-950' : 'border border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950')
                          }`}
                        >
                          {copiedCode === plan.code ? (
                            <>
                              <CheckIcon /> Copied
                            </>
                          ) : (
                            <>
                              <CopyIcon /> Copy
                            </>
                          )}
                        </button>
                        <a
                          href={plan.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={`flex shrink-0 items-center justify-center rounded-xl border p-2.5 transition-colors ${
                            isLight ? 'border-slate-200 bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900' : 'border-white/10 bg-white/5 text-slate-400 hover:bg-white/10 hover:text-paper'
                          }`}
                          title="Open checkout link preview"
                        >
                          <ExternalLinkIcon />
                        </a>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {/* Create Plan Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
          <div className={`relative w-full max-w-md overflow-hidden rounded-2xl border p-6 shadow-2xl ${
            isLight ? 'bg-white border-slate-200 text-slate-900' : 'border-[#00d2b8]/30 bg-[#082028] text-paper shadow-cyan-950/50'
          }`}>
            <div className={`absolute top-0 left-0 right-0 h-1 ${isLight ? 'bg-[#007a6c]' : 'bg-gradient-to-r from-[#00d2b8] via-sky-400 to-[#00d2b8]'}`} />

            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`flex h-8 w-8 items-center justify-center rounded-lg border ${
                  isLight ? 'bg-teal-50 border-teal-200 text-[#007a6c]' : 'bg-[#00d2b8]/20 border-[#00d2b8]/40 text-[#00d2b8]'
                }`}>
                  <RepeatIcon className="h-4 w-4" />
                </div>
                <h2 className={`font-sans text-lg font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>Create Subscription Plan</h2>
              </div>
              <button
                onClick={() => setShowModal(false)}
                className={`cursor-pointer rounded-lg border border-transparent p-1 transition-colors ${
                  isLight ? 'text-slate-400 hover:bg-slate-100 hover:text-slate-800' : 'text-slate-400 hover:border-white/10 hover:bg-white/5 hover:text-paper'
                }`}
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div>
                <label className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Plan Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Pro Tier Membership"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none transition-all ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-1 focus:ring-[#007a6c]/30'
                      : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-1 focus:ring-[#00d2b8]/50'
                  }`}
                  autoFocus
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Amount (USDC)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    placeholder="20.00"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none transition-all ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-1 focus:ring-[#007a6c]/30'
                        : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-1 focus:ring-[#00d2b8]/50'
                    }`}
                  />
                </div>

                <div>
                  <label className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Billing Interval
                  </label>
                  <select
                    value={interval}
                    onChange={(e) => setInterval(e.target.value as any)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none transition-all ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
                    }`}
                  >
                    <option value="weekly" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Weekly</option>
                    <option value="monthly" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Monthly</option>
                    <option value="yearly" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Yearly</option>
                  </select>
                </div>
              </div>

              <div>
                <label className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Included Plan Perks (comma-separated)
                </label>
                <input
                  type="text"
                  placeholder="e.g. Automated USDC Settlement, WhatsApp Reminders"
                  value={featuresText}
                  onChange={(e) => setFeaturesText(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm outline-none transition-all ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-1 focus:ring-[#007a6c]/30'
                      : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-1 focus:ring-[#00d2b8]/50'
                  }`}
                />
              </div>

              {error && (
                <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-2.5 text-xs text-rose-500">
                  {error}
                </div>
              )}

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
                  type="submit"
                  disabled={creating}
                  className="cursor-pointer rounded-xl bg-[#00d2b8] px-4 py-2 font-sans text-xs font-bold text-slate-950 shadow-md shadow-[#00d2b8]/20 transition-all hover:bg-[#00b8a1] disabled:opacity-50"
                >
                  {creating ? 'Creating…' : 'Save Plan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
