'use client'

import { useEffect, useRef, useState } from 'react'
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

interface SplitSummary {
  request_id_hex: string
  amount_usdc: string
  label: string | null
  status: string
  split_total: number
  split_paid: number
  created_at: number
}

interface ParticipantRow {
  id: string
  participant_name: string
  participant_phone: string | null
  share_amount_usdc: number
  sub_link_token: string
  status: 'pending' | 'fulfilled'
  paid_at: number | null
}

interface ParticipantDraft { name: string; phone: string }

// ─── Validation ───────────────────────────────────────────────────────────────

function isE164(phone: string): boolean {
  return /^\+[1-9]\d{7,14}$/.test(phone.replace(/[\s\-().]/g, ''))
}

type ParticipantErrors = { name?: string; phone?: string }
function validateParticipant(p: ParticipantDraft): ParticipantErrors {
  const e: ParticipantErrors = {}
  if (!p.name.trim()) e.name = 'Name is required'
  else if (p.name.trim().length < 2) e.name = 'Must be at least 2 characters'
  if (p.phone.trim() && !isE164(p.phone)) e.phone = 'Use international format: +1 555 000 0000'
  return e
}

function amountError(val: string): string | null {
  if (!val.trim()) return 'Total amount is required'
  const n = parseFloat(val)
  if (isNaN(n) || n <= 0) return 'Must be greater than $0'
  if (n > 100_000) return 'Maximum $100,000'
  return null
}

function errClass(hasError: boolean): string {
  return hasError ? 'border-[rgba(224,84,84,0.5)] shadow-[0_0_0_3px_rgba(224,84,84,0.06)]' : ''
}

function avatarColor(name: string, isLight?: boolean): { bg: string; fg: string; border: string } {
  const brandThemes = isLight
    ? [
        { bg: '#ccfbf1', fg: '#007a6c', border: '#99f6e4' },
        { bg: '#e0f2fe', fg: '#0369a1', border: '#bae6fd' },
        { bg: '#d1fae5', fg: '#047857', border: '#a7f3d0' },
        { bg: '#f0fdf4', fg: '#15803d', border: '#bbf7d0' },
      ]
    : [
        { bg: 'rgba(0, 210, 184, 0.15)', fg: '#00d2b8', border: 'rgba(0, 210, 184, 0.35)' },
        { bg: 'rgba(56, 189, 248, 0.15)', fg: '#38bdf8', border: 'rgba(56, 189, 248, 0.35)' },
        { bg: 'rgba(52, 211, 153, 0.15)', fg: '#34d399', border: 'rgba(52, 211, 153, 0.35)' },
        { bg: 'rgba(45, 212, 191, 0.15)', fg: '#2dd4bf', border: 'rgba(45, 212, 191, 0.35)' },
      ]
  const n = name.trim() || '?'
  const charSum = (n.charCodeAt(0) || 0) + (n.charCodeAt(n.length - 1) || 0)
  return brandThemes[charSum % brandThemes.length]
}

function FieldError({ msg }: { msg?: string | null }) {
  if (!msg) return null
  return <p role="alert" className="mt-1 font-mono text-xs leading-[1.4] text-rose-500">{msg}</p>
}

function timeAgo(unix: number) {
  const diff = Math.floor(Date.now() / 1000) - unix
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

function Avatar({ name, size = 28, paid, isLight }: { name: string; size?: number; paid?: boolean; isLight?: boolean }) {
  const av = avatarColor(name, isLight)
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center rounded-full font-sans font-bold"
      style={{ width: size, height: size, fontSize: size * 0.42, background: av.bg, color: av.fg, border: `1px solid ${av.border}` }}
    >
      {(name.trim()[0] ?? '?').toUpperCase()}
      {paid && (
        <span className={`absolute -bottom-0.5 -right-0.5 flex h-3 w-3 items-center justify-center rounded-full text-[7px] font-sans font-bold ${
          isLight ? 'bg-[#007a6c] text-white border border-white' : 'bg-[#00d2b8] text-slate-950 border border-slate-900'
        }`}>✓</span>
      )}
    </span>
  )
}

function SegmentedBar({ colors }: { colors: string[] }) {
  return (
    <div className="flex gap-[3px]">
      {colors.map((c, i) => <div key={i} className="h-1.5 flex-1 rounded-[2px] transition-colors duration-300" style={{ background: c }} />)}
    </div>
  )
}

export default function SplitsPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'

  const [authToken, setAuthToken] = useState<string | null>(null)
  const [splits, setSplits] = useState<SplitSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [newResult, setNewResult] = useState<{ requestId: string; participants: Array<{ name: string; link: string }> } | null>(null)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [participantsMap, setParticipantsMap] = useState<Record<string, ParticipantRow[]>>({})
  const [reminding, setReminding] = useState<string | null>(null)
  const [copied, setCopied] = useState<string | null>(null)
  const [toast, setToast] = useState<string | null>(null)

  // Form state
  const [totalAmount, setTotalAmount] = useState('')
  const [splitLabel, setSplitLabel] = useState('')
  const [participants, setParticipants] = useState<ParticipantDraft[]>([
    { name: '', phone: '' }, { name: '', phone: '' },
  ])
  // Validation state
  const [amountTouched, setAmountTouched] = useState(false)
  const [partTouched, setPartTouched] = useState<Array<Set<string>>>([new Set(), new Set()])
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const amountRef = useRef<HTMLInputElement>(null)
  const firstNameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    fetchSplits(token)
  }, [])

  useEffect(() => {
    amountRef.current?.focus()
  }, [])

  async function fetchSplits(token: string) {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/splits`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 && token !== 'demo-token') { localStorage.removeItem('mistpay_auth'); router.replace('/'); return }
      const data = await res.json()
      setSplits(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  async function loadParticipants(requestId: string) {
    if (participantsMap[requestId] || !authToken) return
    const res = await fetch(`${BACKEND}/api/splits/${requestId}/participants`, { headers: { Authorization: `Bearer ${authToken}` } })
    const data = await res.json()
    setParticipantsMap(prev => ({ ...prev, [requestId]: data }))
  }

  function toggleExpand(id: string) {
    if (expandedId === id) setExpandedId(null)
    else { setExpandedId(id); loadParticipants(id) }
  }

  async function remindAll(requestId: string) {
    if (!authToken) return
    setReminding(requestId)
    try {
      const res = await fetch(`${BACKEND}/api/splits/${requestId}/remind`, { method: 'POST', headers: { Authorization: `Bearer ${authToken}` } })
      const data = await res.json()
      setToast(`Reminders sent to ${data.sent} participant${data.sent !== 1 ? 's' : ''}.`)
      setTimeout(() => setToast(null), 4000)
    } finally {
      setReminding(null)
    }
  }

  function touchParticipant(i: number, field: string) {
    setPartTouched(prev => {
      const next = [...prev]
      next[i] = new Set([...next[i], field])
      return next
    })
  }
  function addParticipant() {
    setParticipants(p => [...p, { name: '', phone: '' }])
    setPartTouched(p => [...p, new Set()])
    setTimeout(() => {
      const inputs = document.querySelectorAll<HTMLInputElement>('[data-part-name]')
      inputs[inputs.length - 1]?.focus()
    }, 50)
  }
  function removeParticipant(i: number) {
    if (participants.length <= 2) return
    setParticipants(p => p.filter((_, idx) => idx !== i))
    setPartTouched(p => p.filter((_, idx) => idx !== i))
  }
  function updateParticipant(i: number, field: keyof ParticipantDraft, val: string) {
    setParticipants(p => p.map((pt, idx) => idx === i ? { ...pt, [field]: val } : pt))
  }

  const shareAmount = totalAmount && parseFloat(totalAmount) > 0
    ? (parseFloat(totalAmount) / participants.length)
    : null

  const aErr = amountError(totalAmount)
  const pErrs = participants.map(validateParticipant)
  const isValid = !aErr && pErrs.every(e => Object.keys(e).length === 0)

  async function createSplit() {
    setSubmitAttempted(true)
    if (!isValid || !authToken) return
    setCreating(true)
    setCreateError(null)
    try {
      const res = await fetch(`${BACKEND}/api/splits`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          totalAmount: parseFloat(totalAmount),
          participants: participants.map(p => ({
            name: p.name.trim(),
            phone: p.phone.trim() ? p.phone.trim().replace(/[\s\-().]/g, '') : undefined,
          })),
          label: splitLabel.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Creation failed')
      setNewResult(data)
      setTotalAmount(''); setSplitLabel('')
      setParticipants([{ name: '', phone: '' }, { name: '', phone: '' }])
      setPartTouched([new Set(), new Set()])
      setAmountTouched(false); setSubmitAttempted(false)
      fetchSplits(authToken)
    } catch (err: any) {
      setCreateError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setCreating(false)
    }
  }

  function copyLink(link: string, key: string) {
    navigator.clipboard.writeText(link)
    setCopied(key)
    setTimeout(() => setCopied(null), 2000)
  }

  const showAmt = submitAttempted || (amountTouched && totalAmount.trim() !== '')
  const showPerPersonHint = !(showAmt && aErr) && shareAmount != null

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
  const btnSmallClass = `cursor-pointer rounded-xl px-3 py-1.5 font-sans text-xs font-semibold transition-colors ${
    isLight ? 'border border-slate-200 bg-slate-100 text-slate-800 hover:bg-slate-200' : 'border border-white/10 bg-white/5 text-slate-200 hover:bg-white/10'
  }`
  const btnGhostClass = `cursor-pointer rounded-xl border-none bg-transparent px-2 py-2 font-sans text-xs transition-colors ${
    isLight ? 'text-slate-500 hover:text-slate-900' : 'text-slate-400 hover:text-white'
  }`

  return (
    <div>
      {toast && (
        <div role="status" className={`fixed bottom-6 left-1/2 z-[100] -translate-x-1/2 whitespace-nowrap rounded-[10px] border px-5 py-2.5 font-mono text-[13px] shadow-lg ${
          isLight ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-[rgba(77,184,133,0.3)] bg-[var(--fn-teal-bg)] text-[var(--fn-teal-fg)] shadow-[0_8px_24px_rgba(0,0,0,0.4)]'
        }`}>
          ✓ {toast}
        </div>
      )}

      <div className="mb-8 px-1.5">
        <h1 className={`mb-1 font-sans text-[22px] font-semibold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Group Splits
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Split expenses easily with automated WhatsApp tracking & crypto payouts.
        </p>
      </div>

      {/* Compose + live ledger preview */}
      <div className="mb-10 grid grid-cols-1 items-start gap-6 lg:grid-cols-[1fr_360px] lg:gap-8">
        <section className={cardClass}>
          <p className={secLabelClass}>New split</p>

          <div className="mb-2 grid grid-cols-1 gap-3 sm:grid-cols-[1fr_2fr]">
            <div>
              <label htmlFor="split-amount" className={labelClass}>Total amount (USD)</label>
              <div className="relative">
                <span className={`pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[15px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>$</span>
                <input
                  id="split-amount" ref={amountRef}
                  type="number" min="0.01" step="any" placeholder="90.00"
                  value={totalAmount}
                  onChange={e => setTotalAmount(e.target.value)}
                  onBlur={() => setAmountTouched(true)}
                  onKeyDown={e => { if (e.key === 'Enter') firstNameRef.current?.focus() }}
                  className={`${inputBaseClass} pl-[26px] ${errClass(showAmt && !!aErr)}`}
                  aria-invalid={showAmt && !!aErr}
                  aria-describedby={showPerPersonHint ? 'split-per-person' : undefined}
                />
              </div>
              {showAmt && aErr
                ? <FieldError msg={aErr} />
                : showPerPersonHint && (
                    <p id="split-per-person" className={`mt-[5px] font-mono text-xs font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                      ${shareAmount!.toFixed(2)} per person
                    </p>
                  )}
            </div>
            <div>
              <label htmlFor="split-label" className={labelClass}>
                Label <span className={`font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>(optional)</span>
              </label>
              <input
                id="split-label" type="text"
                placeholder="Dinner at Casa Boca…"
                value={splitLabel}
                onChange={e => setSplitLabel(e.target.value)}
                className={inputBaseClass}
                autoComplete="off"
                maxLength={100}
              />
            </div>
          </div>

          {/* Participants */}
          <div className="mb-1 mt-5">
            <div className="mb-2.5 flex items-center justify-between">
              <label className={labelClass}>Participants <span className={`font-normal ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>({participants.length} people{shareAmount != null ? ` · $${shareAmount.toFixed(2)} each` : ''})</span></label>
            </div>

            <div className={`mb-2 grid grid-cols-[28px_1fr_1fr_32px] gap-2 border-b pb-2 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
              <span />
              <span className={colHeadClass}>Name *</span>
              <span className={colHeadClass}>WhatsApp <span className="font-normal opacity-60">(optional)</span></span>
              <span />
            </div>

            <div className="flex flex-col gap-2.5">
              {participants.map((p, i) => {
                const errs = pErrs[i]
                const touched = partTouched[i] ?? new Set()
                const showName = submitAttempted || (touched.has('name') && p.name.trim() !== '')
                const showPhone = submitAttempted || touched.has('phone')
                return (
                  <div key={i}>
                    <div className="grid grid-cols-[28px_1fr_1fr_32px] items-start gap-2">
                      <div className="flex items-center pt-2">
                        <Avatar name={p.name.trim() || `Person ${i + 1}`} size={26} isLight={isLight} />
                      </div>
                      <div>
                        <input
                          ref={i === 0 ? firstNameRef : undefined}
                          data-part-name=""
                          type="text"
                          placeholder={`Person ${i + 1}`}
                          value={p.name}
                          onChange={e => updateParticipant(i, 'name', e.target.value)}
                          onBlur={() => touchParticipant(i, 'name')}
                          className={`${inputBaseClass} ${errClass(showName && !!errs.name)}`}
                          aria-invalid={showName && !!errs.name}
                          autoComplete="name"
                        />
                        {showName && errs.name && <FieldError msg={errs.name} />}
                      </div>
                      <div>
                        <input
                          type="tel"
                          placeholder="+1 555 123 4567"
                          value={p.phone}
                          onChange={e => updateParticipant(i, 'phone', e.target.value)}
                          onBlur={() => touchParticipant(i, 'phone')}
                          className={`${inputBaseClass} ${errClass(showPhone && !!errs.phone)}`}
                          aria-invalid={showPhone && !!errs.phone}
                          autoComplete="tel"
                        />
                        {showPhone && errs.phone && <FieldError msg={errs.phone} />}
                      </div>
                      <div className="flex items-center pt-2.5">
                        <button
                          onClick={() => removeParticipant(i)}
                          disabled={participants.length <= 2}
                          aria-label={`Remove ${p.name || `person ${i + 1}`}`}
                          className={`border-none bg-transparent px-1 py-0 text-xl leading-none ${participants.length <= 2 ? (isLight ? 'cursor-default text-slate-300' : 'cursor-default text-slate-700') : 'cursor-pointer text-rose-500 hover:text-rose-600'}`}
                        >×</button>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>

            <button onClick={addParticipant} className={`${btnSecondaryClass} mt-3`}>
              + Add person
            </button>
          </div>

          {/* Create button */}
          <div className={`mt-5 flex flex-wrap items-center justify-between gap-3 border-t pt-5 ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
            <div>
              {shareAmount != null && (
                <div>
                  <p className={`mb-[3px] font-mono text-[11px] uppercase tracking-[0.06em] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>Per person</p>
                  <p className={`m-0 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>${shareAmount.toFixed(2)}</p>
                </div>
              )}
            </div>
            <div className="flex flex-col items-end gap-1.5">
              {createError && (
                <p role="alert" className="m-0 max-w-[240px] text-right font-mono text-xs text-rose-500">{createError}</p>
              )}
              <button
                onClick={createSplit}
                disabled={creating}
                className={`inline-flex items-center gap-2 rounded-xl border-none bg-[#00d2b8] px-5 py-2.5 font-sans text-sm font-bold text-slate-950 transition-all hover:bg-[#00b8a1] ${creating ? 'cursor-not-allowed opacity-70' : 'cursor-pointer opacity-100'}`}
              >
                {creating
                  ? <><span className="spinner" style={{ borderColor: 'rgba(0,0,0,0.3)', borderTopColor: '#0b1a14' }} /> Creating…</>
                  : `Create split · ${participants.length} people →`}
              </button>
            </div>
          </div>
        </section>

        <aside className="lg:sticky lg:top-8">
          {newResult ? (
            <div className={cardClass}>
              <p className={`mb-3.5 font-mono text-xs font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                ✓ Split created — share each person's link:
              </p>
              <div className="flex flex-col gap-2">
                {newResult.participants.map((p, i) => (
                  <div key={i} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${
                    isLight ? 'bg-slate-50 border-slate-200' : 'bg-black/40 border-white/10'
                  }`}>
                    <Avatar name={p.name} size={24} isLight={isLight} />
                    <span className={`min-w-0 flex-1 truncate text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{p.name}</span>
                    <button onClick={() => copyLink(p.link, `new-${i}`)} className={btnSmallClass}>
                      {copied === `new-${i}` ? '✓' : 'Copy'}
                    </button>
                    <a href={`https://wa.me/?text=${encodeURIComponent(`Your share of the split: ${p.link}`)}`} target="_blank" rel="noreferrer" aria-label="Share via WhatsApp" className={`${btnSmallClass} inline-flex items-center gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-600 no-underline hover:bg-emerald-500/25`}>
                      <WaIcon />
                    </a>
                  </div>
                ))}
              </div>
              <button onClick={() => setNewResult(null)} className={`${btnGhostClass} mt-2`}>Create another split →</button>
            </div>
          ) : (
            <div className={cardClass}>
              <p className={secLabelClass}>Split ledger</p>
              <p className={`mb-1 font-sans text-3xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                {totalAmount && parseFloat(totalAmount) > 0 ? `$${parseFloat(totalAmount).toFixed(2)}` : '$0.00'}
              </p>
              {splitLabel.trim() && <p className={`mb-4 text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{splitLabel}</p>}
              <div className={splitLabel.trim() ? '' : 'mt-4'}>
                <SegmentedBar colors={participants.map(p => avatarColor(p.name.trim() || 'x', isLight).fg)} />
              </div>
              <div className="mt-4 flex flex-col gap-2.5">
                {participants.map((p, i) => (
                  <div key={i} className="flex items-center gap-2.5">
                    <Avatar name={p.name.trim() || `Person ${i + 1}`} size={26} isLight={isLight} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${isLight ? 'text-slate-900' : 'text-paper'}`}>{p.name.trim() || `Person ${i + 1}`}</span>
                    <span className={`shrink-0 font-mono text-xs font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{shareAmount != null ? `$${shareAmount.toFixed(2)}` : '—'}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </aside>
      </div>

      {/* Splits list */}
      <p className={secLabelClass}>All splits</p>
      {loading ? (
        <div className="flex flex-col gap-3" role="status" aria-live="polite">
          <span className="sr-only">Loading splits…</span>
          {[0, 1, 2].map(i => <div key={i} className={`h-[86px] animate-pulse rounded-xl border ${isLight ? 'bg-slate-100 border-slate-200' : 'border-white/10 bg-[rgba(16,25,50,0.75)]'}`} />)}
        </div>
      ) : splits.length === 0 ? (
        <div className={`rounded-xl px-6 py-7 text-center backdrop-blur-md ${isLight ? 'bg-white border border-slate-200/80' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'}`}>
          <p className={`m-0 text-[15px] ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>No splits yet. Create one above.</p>
        </div>
      ) : (
        <ul className="flex flex-col gap-3">
          {splits.map(split => {
            const isExpanded = expandedId === split.request_id_hex
            const parts = participantsMap[split.request_id_hex] ?? []
            const barColors = Array.from({ length: split.split_total }, (_, i) => i < split.split_paid ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#e2e8f0' : 'rgba(255,255,255,0.1)'))
            const panelId = `split-panel-${split.request_id_hex}`

            return (
              <li key={split.request_id_hex} className={`overflow-hidden rounded-xl backdrop-blur-md ${
                isLight ? 'bg-white border border-slate-200/80 shadow-sm' : 'border-x border-b border-t-0 border-white/10 bg-[rgba(16,25,50,0.75)]'
              }`}>
                <button
                  onClick={() => toggleExpand(split.request_id_hex)}
                  className={`flex w-full cursor-pointer items-center gap-3.5 border-none bg-transparent px-6 py-4.5 text-left transition-colors ${
                    isLight ? 'hover:bg-slate-50 text-slate-900' : 'text-paper hover:bg-white/[0.02]'
                  }`}
                  aria-expanded={isExpanded}
                  aria-controls={panelId}
                >
                  <div className="flex-1">
                    <div className="mb-2 flex items-center gap-2.5">
                      <span className={`font-sans text-xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>${parseFloat(split.amount_usdc).toFixed(2)}</span>
                      {split.label && <span className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>{split.label}</span>}
                      <span className={`ml-auto font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{timeAgo(split.created_at)}</span>
                    </div>
                    <div className="mb-2 w-full max-w-[280px]">
                      <SegmentedBar colors={barColors} />
                    </div>
                    <p className={`m-0 font-mono text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                      {split.split_paid}/{split.split_total} paid
                    </p>
                  </div>
                  <span className={`shrink-0 font-mono text-[13px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>{isExpanded ? '▲' : '▼'}</span>
                </button>

                {isExpanded && (
                  <div id={panelId} className={`border-t px-6 py-4 ${isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/20'}`}>
                    {parts.length === 0 ? (
                      <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>Loading participants…</p>
                    ) : (
                      <div className="mb-3.5 flex flex-col gap-2">
                        {parts.map(p => {
                          const link = typeof window !== 'undefined' ? `${window.location.origin}/pay/${split.request_id_hex}?p=${p.sub_link_token}` : ''
                          const paid = p.status === 'fulfilled'
                          return (
                            <div key={p.id} className={`flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 ${
                              isLight ? 'bg-white border-slate-200' : 'bg-white/5 border-white/10'
                            }`}>
                              <Avatar name={p.participant_name} size={26} paid={paid} isLight={isLight} />
                              <span className={`min-w-[100px] text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{p.participant_name}</span>
                              <span className={`min-w-[60px] font-sans text-sm font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>${Number(p.share_amount_usdc).toFixed(2)}</span>
                              <span className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 font-mono text-[11px] font-semibold ${
                                paid
                                  ? (isLight ? 'border-emerald-300 bg-emerald-50 text-emerald-800' : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8]')
                                  : (isLight ? 'border-amber-300 bg-amber-50 text-amber-800' : 'border-amber-500/30 bg-amber-500/15 text-amber-400')
                              }`}>
                                <span className="h-1 w-1 rounded-full bg-current" />{p.status}
                              </span>
                              {p.participant_phone && <span className={`font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{p.participant_phone}</span>}
                              {!paid && link && (
                                <div className="ml-auto flex gap-1.5">
                                  <button onClick={() => copyLink(link, p.id)} className={btnSmallClass}>
                                    {copied === p.id ? '✓' : 'Copy link'}
                                  </button>
                                  <a href={`https://wa.me/?text=${encodeURIComponent(`Your share of the split: ${link}`)}`} target="_blank" rel="noreferrer" aria-label="Share via WhatsApp" className={`${btnSmallClass} inline-flex items-center gap-1 border-emerald-500/30 bg-emerald-500/15 text-emerald-600 no-underline hover:bg-emerald-500/25`}>
                                    <WaIcon />
                                  </a>
                                </div>
                              )}
                            </div>
                          )
                        })}
                      </div>
                    )}
                    {split.status === 'pending' && (
                      <button onClick={() => remindAll(split.request_id_hex)} disabled={reminding === split.request_id_hex}
                        className={`${btnSecondaryClass} inline-flex items-center gap-2 ${reminding === split.request_id_hex ? 'opacity-60' : 'opacity-100'}`}>
                        {reminding === split.request_id_hex ? <><span className="spinner" /> Sending…</> : 'Remind all unpaid →'}
                      </button>
                    )}
                  </div>
                )}
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}

function WaIcon() {
  return <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
}
