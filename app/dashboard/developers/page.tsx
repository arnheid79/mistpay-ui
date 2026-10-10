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

interface ApiKey {
  id: string
  label: string
  prefix: string
  created_at: string
  last_used_at: string | null
  revoked_at: string | null
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

function KeyIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 2l-2 2m-1.5 1.5l-3 3m-2 2l-3 3m-2 2l-3 3M3 21l3-3m-2-2l3-3m2 2l3-3m-2-2l3-3" />
      <circle cx="7.5" cy="7.5" r="4.5" />
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
        Copy it now. For your security, this key will never be shown again.
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
          {copied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy Key</>}
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

export default function DeveloperApiKeysPage() {
  const router = useRouter()
  const pathname = usePathname()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [keys, setKeys] = useState<ApiKey[]>([])
  const [label, setLabel] = useState('')
  const [newKey, setNewKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)
  const [curlCopied, setCurlCopied] = useState(false)

  const load = useCallback(async (token: string) => {
    const res = await fetch(`${BACKEND}/api/my/api-keys`, { headers: authHeaders(token) })
    if (res.status === 401) {
      localStorage.removeItem('mistpay_auth')
      router.replace('/')
      return
    }
    if (res.ok) setKeys(await res.json())
  }, [router])

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    load(token).catch(() => setError('Could not load your API keys.'))
  }, [load])

  async function createKey() {
    if (!authToken || !label.trim()) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/api-keys`, {
        method: 'POST',
        headers: authHeaders(authToken),
        body: JSON.stringify({ label: label.trim() }),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not create the key')
      setNewKey(data.key)
      setLabel('')
      await load(authToken)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  async function revokeKey(id: string, keyLabel: string) {
    if (!authToken) return
    if (!window.confirm(`Revoke "${keyLabel}"? Anything using it stops working immediately.`)) return
    setBusy(true)
    setError(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/api-keys/${id}`, {
        method: 'DELETE',
        headers: authHeaders(authToken),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data.error ?? 'Could not revoke the key')
      await load(authToken)
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setBusy(false)
    }
  }

  const activeKeys = keys.filter((k) => !k.revoked_at)
  const curlExample = `curl -X POST ${BACKEND}/v1/requests \\
  -H "Authorization: Bearer <your_api_key>" \\
  -H "Content-Type: application/json" \\
  -d '{"amount": 50, "externalId": "order-1001"}'`

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
          API Keys & Authentication
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Authenticate programmatic payment creation from your app, online shop, or ERP backend.
        </p>
      </div>

      {/* Developer Section Sub-Tabs Bar */}
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

      {/* Secret Key Alert */}
      {newKey && <SecretAlert label="Your New API Key" value={newKey} onDismiss={() => setNewKey(null)} theme={theme} />}

      {/* Create Key Card */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <div className="mb-4 flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
            isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
          }`}>
            <KeyIcon className="h-3.5 w-3.5" />
          </div>
          <p className={`font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Create Secret API Key
          </p>
        </div>

        <div className="mb-6 flex flex-wrap items-end gap-3">
          <div className="min-w-[240px] flex-1">
            <label htmlFor="key-label" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Key Label / Application Name
            </label>
            <input
              id="key-label"
              type="text"
              placeholder="e.g. Online Store Backend"
              maxLength={40}
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && label.trim()) createKey()
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                  : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
              }`}
            />
          </div>
          <button
            type="button"
            disabled={busy || !label.trim()}
            onClick={createKey}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-xs font-bold transition-all disabled:opacity-50 ${
              isLight
                ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20'
                : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-md shadow-[#00d2b8]/20'
            }`}
          >
            <PlusIcon /> Create Key
          </button>
        </div>

        {activeKeys.length >= 10 && (
          <p className={`mb-5 rounded-lg border p-2.5 font-mono text-xs ${
            isLight ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-amber-500/30 bg-amber-500/10 text-amber-400'
          }`}>
            You have reached the maximum of 10 active API keys. Revoke an unused key to generate a new one.
          </p>
        )}

        {/* API Keys Roster Table */}
        <p className={`mb-3 font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Active API Keys
        </p>

        {keys.length === 0 ? (
          <p className={`py-6 text-center font-sans text-sm italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No API keys generated yet.</p>
        ) : (
          <div className={`overflow-x-auto rounded-xl border ${
            isLight ? 'border-slate-200 bg-slate-50/50' : 'border-white/10 bg-black/20'
          }`}>
            <table className="w-full min-w-[540px] border-collapse text-left">
              <thead>
                <tr className={`border-b font-mono text-[11px] font-semibold uppercase tracking-wider ${
                  isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-white/10 bg-white/5 text-slate-400'
                }`}>
                  <th className="px-4 py-3">Label</th>
                  <th className="px-4 py-3">Key Prefix</th>
                  <th className="px-4 py-3">Last Used</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className={`divide-y text-xs ${
                isLight ? 'divide-slate-100 text-slate-700' : 'divide-white/5 text-slate-300'
              }`}>
                {keys.map((k) => (
                  <tr key={k.id} className={`transition-colors ${isLight ? 'hover:bg-slate-100/60' : 'hover:bg-white/5'}`}>
                    <td className={`px-4 py-3.5 font-sans font-medium ${isLight ? 'text-slate-900' : 'text-paper'}`}>{k.label}</td>
                    <td className={`px-4 py-3.5 font-mono font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{k.prefix}…</td>
                    <td className={`px-4 py-3.5 font-mono ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                      {k.revoked_at ? (
                        <span className="font-semibold text-red-500">Revoked</span>
                      ) : (
                        when(k.last_used_at)
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-right whitespace-nowrap">
                      {!k.revoked_at && (
                        <button
                          type="button"
                          disabled={busy}
                          onClick={() => revokeKey(k.id, k.label)}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold transition-all ${
                            isLight
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          Revoke
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* cURL Example Code Snippet */}
        <div className={`mt-8 pt-6 border-t ${isLight ? 'border-slate-200' : 'border-white/10'}`}>
          <div className="mb-2 flex items-center justify-between">
            <p className={`font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Quick Start Request Example (cURL)
            </p>
            <button
              onClick={() => {
                navigator.clipboard.writeText(curlExample)
                setCurlCopied(true)
                setTimeout(() => setCurlCopied(false), 2000)
              }}
              className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 font-sans text-xs font-semibold transition-all ${
                isLight
                  ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:bg-[#007a6c] hover:text-white'
                  : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
              }`}
            >
              {curlCopied ? <><CheckIcon /> Copied</> : <><CopyIcon /> Copy cURL</>}
            </button>
          </div>
          <pre className={`overflow-x-auto rounded-xl border p-4 font-mono text-xs leading-relaxed ${
            isLight
              ? 'border-slate-200 bg-slate-900 text-slate-100'
              : 'border-white/10 bg-black/60 text-slate-200'
          }`}>
            {curlExample}
          </pre>
        </div>
      </section>
    </div>
  )
}
