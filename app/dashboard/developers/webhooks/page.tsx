'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter, usePathname } from 'next/navigation'
import Link from 'next/link'
import { BACKEND, authHeaders } from '@/lib/useAuth'

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

interface WebhookEvent {
  id: string
  type: string
  status: 'pending' | 'delivered' | 'failed'
  attempts: number
  last_error: string | null
  created_at: string
  delivered_at: string | null
}

const when = (unix: string | null) =>
  unix
    ? new Date(Number(unix) * 1000).toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      })
    : '—'

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

function WebhookIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function SendIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="22" y1="2" x2="11" y2="13" />
      <polygon points="22 2 15 22 11 13 2 9 22 2" />
    </svg>
  )
}

function SecretAlert({ label, value, onDismiss, theme }: { label: string; value: string; onDismiss: () => void; theme: 'dark' | 'light' }) {
  const [copied, setCopied] = useState(false)
  const isLight = theme === 'light'
  return (
    <div role="status" className={`relative mb-6 overflow-hidden rounded-xl border p-5 shadow-xl ${
      isLight ? 'border-[#007a6c]/40 bg-slate-50' : 'border-[#00d2b8]/40 bg-[#082028]'
    }`}>
      <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
        isLight ? 'from-[#007a6c] via-sky-500 to-[#007a6c]' : 'from-[#00d2b8] via-sky-400 to-[#00d2b8]'
      }`} />
      <p className={`mb-1 font-sans text-base font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{label}</p>
      <p className={`mb-4 text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
        Copy it now. For your security, this webhook signing secret will never be displayed again.
      </p>
      <div className="flex flex-wrap items-center gap-3">
        <code className={`select-all break-all rounded-lg border px-3.5 py-2 font-mono text-xs font-bold ${
          isLight ? 'border-slate-300 bg-white text-[#007a6c]' : 'border-white/10 bg-black/50 text-[#00d2b8]'
        }`}>
          {value}
        </code>
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(value)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
          }}
          className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3.5 py-2 font-sans text-xs font-semibold transition-all ${
            isLight
              ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:bg-[#007a6c] hover:text-white'
              : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
          }`}
        >
          {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy Secret</>}
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={`cursor-pointer rounded-lg border px-3.5 py-2 font-sans text-xs font-semibold transition-all ${
            isLight
              ? 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
              : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10 hover:text-paper'
          }`}
        >
          Done
        </button>
      </div>
    </div>
  )
}

export default function DeveloperWebhooksPage() {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [webhookUrl, setWebhookUrl] = useState('')
  const [savedUrl, setSavedUrl] = useState<string | null>(null)
  const [newSecret, setNewSecret] = useState<string | null>(null)
  const [events, setEvents] = useState<WebhookEvent[]>([])
  const [error, setError] = useState<string | null>(null)
  const [note, setNote] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async (token: string) => {
    const res = await fetch(`${BACKEND}/api/my/webhook`, { headers: authHeaders(token) })
    if (res.status === 401) {
      localStorage.removeItem('mistpay_auth')
      router.replace('/')
      return
    }
    if (res.ok) {
      const data = await res.json()
      setEvents(data.events ?? [])
      setSavedUrl(data.endpoint?.url ?? null)
      setWebhookUrl((cur) => cur || data.endpoint?.url || '')
    }
  }, [router])

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    load(token).catch(() => setError('Could not load your webhook settings.'))
  }, [load])

  async function saveWebhook() {
    if (!authToken || !webhookUrl.trim()) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/webhook`, {
        method: 'PUT',
        headers: authHeaders(authToken),
        body: JSON.stringify({ url: webhookUrl.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not save the webhook')
      if (data.secret) setNewSecret(data.secret)
      else setNote('Endpoint saved successfully. Your signing secret remains unchanged.')
      await load(authToken)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function sendTest() {
    if (!authToken) return
    setBusy(true)
    setError(null)
    setNote(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/webhook/test`, {
        method: 'POST',
        headers: authHeaders(authToken),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not send the test event')
      setNote('Test event queued successfully. It will be delivered in a few seconds.')
      await load(authToken)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="mb-2.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
            isLight
              ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]'
              : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> DEVELOPER PLATFORM
          </span>
        </div>
        <h1 className={`mb-1 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Webhooks & Outbox
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Receive signed real-time event notifications when requests are paid, cancelled, or refunded.
        </p>
      </div>

      {/* Sub-Tabs Bar */}
      <div className={`mb-8 flex border-b ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
        <Link
          href="/dashboard/developers"
          className={`border-b-2 px-4 py-2.5 font-sans text-sm font-semibold transition-all ${
            pathname === '/dashboard/developers'
              ? (isLight ? 'border-[#007a6c] text-[#007a6c]' : 'border-[#00d2b8] text-[#00d2b8]')
              : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-slate-400 hover:text-paper')
          }`}
        >
          API Keys
        </Link>
        <Link
          href="/dashboard/developers/webhooks"
          className={`border-b-2 px-4 py-2.5 font-sans text-sm font-semibold transition-all ${
            pathname === '/dashboard/developers/webhooks'
              ? (isLight ? 'border-[#007a6c] text-[#007a6c]' : 'border-[#00d2b8] text-[#00d2b8]')
              : (isLight ? 'border-transparent text-slate-600 hover:text-slate-900' : 'border-transparent text-slate-400 hover:text-paper')
          }`}
        >
          Webhooks & Outbox
        </Link>
      </div>

      {error && (
        <div className={`mb-5 rounded-xl border p-3.5 font-mono text-xs ${
          isLight ? 'border-red-200 bg-red-50 text-red-600' : 'border-red-500/30 bg-red-500/10 text-red-400'
        }`}>
          {error}
        </div>
      )}

      {note && (
        <div className={`mb-5 rounded-xl border p-3.5 font-mono text-xs ${
          isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] font-semibold' : 'border-[#00d2b8]/30 bg-[#00d2b8]/10 text-[#00d2b8]'
        }`}>
          {note}
        </div>
      )}

      {/* Webhook Secret Alert */}
      {newSecret && <SecretAlert label="Your Webhook Signing Secret" value={newSecret} onDismiss={() => setNewSecret(null)} theme={theme} />}

      {/* Webhook Endpoint Settings Card */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <div className="mb-4 flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
            isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
          }`}>
            <WebhookIcon className="h-3.5 w-3.5" />
          </div>
          <p className={`font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Webhook Endpoint Configuration
          </p>
        </div>

        <p className={`mb-5 font-sans text-xs leading-relaxed ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          MistPay dispatches <span className={`font-mono font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>request.paid</span>,{' '}
          <span className={`font-mono font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>request.cancelled</span>, and{' '}
          <span className={`font-mono font-semibold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>refund.created</span> events to your endpoint signed with your secret. Delivery is at-least-once.
        </p>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <div className="min-w-[280px] flex-1">
            <label htmlFor="wh-url" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              HTTPS Endpoint URL
            </label>
            <input
              id="wh-url"
              type="url"
              placeholder="https://example.com/mistpay-webhook"
              value={webhookUrl}
              onChange={(e) => setWebhookUrl(e.target.value)}
              className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                  : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
              }`}
            />
          </div>
          <button
            type="button"
            disabled={busy || !webhookUrl.trim()}
            onClick={saveWebhook}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-xs font-bold transition-all disabled:opacity-50 ${
              isLight
                ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20'
                : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-md shadow-[#00d2b8]/20'
            }`}
          >
            Save Endpoint
          </button>
          {savedUrl && (
            <button
              type="button"
              disabled={busy}
              onClick={sendTest}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-xl border px-3.5 py-2.5 font-sans text-xs font-semibold shadow-sm transition-all disabled:opacity-50 ${
                isLight
                  ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:bg-[#007a6c] hover:text-white'
                  : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
              }`}
            >
              <SendIcon /> Send Test Event
            </button>
          )}
        </div>

        <p className={`mb-6 font-sans text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-500'}`}>
          Must be a valid public HTTPS URL. Non-HTTPS and localhost addresses are rejected.
        </p>

        {/* Webhooks Delivery Outbox */}
        <p className={`mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Recent Event Delivery Outbox
        </p>

        {events.length === 0 ? (
          <p className={`py-6 text-center font-sans text-sm italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No webhook events logged in outbox yet.</p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${
            isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-black/20'
          }`}>
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr className={`border-b font-mono text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-white/10 bg-white/5 text-slate-400'
                }`}>
                  <th className="px-4 py-3">Event Type</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Attempts</th>
                  <th className="px-4 py-3">Delivered / Logged</th>
                  <th className="px-4 py-3">Last Error</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isLight ? 'divide-slate-100 text-slate-700' : 'divide-white/5 text-slate-300'
              }`}>
                {events.map((e) => (
                  <tr key={e.id} className={`transition-colors ${isLight ? 'hover:bg-slate-100/60' : 'hover:bg-white/5'}`}>
                    <td className={`px-4 py-3.5 font-mono text-xs font-semibold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{e.type}</td>
                    <td className="px-4 py-3.5">
                      {e.status === 'delivered' && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
                        }`}>
                          <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> Delivered
                        </span>
                      )}
                      {e.status === 'pending' && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isLight ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" /> Pending
                        </span>
                      )}
                      {e.status === 'failed' && (
                        <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                          isLight ? 'border-red-300 bg-red-50 text-red-700' : 'border-red-500/40 bg-red-500/15 text-red-400'
                        }`}>
                          <span className="h-1.5 w-1.5 rounded-full bg-current" /> Failed
                        </span>
                      )}
                    </td>
                    <td className={`px-4 py-3.5 font-mono ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>{e.attempts}</td>
                    <td className={`px-4 py-3.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{when(e.delivered_at ?? e.created_at)}</td>
                    <td className={`px-4 py-3.5 font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {e.last_error ? <span className="text-red-500">{e.last_error}</span> : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
