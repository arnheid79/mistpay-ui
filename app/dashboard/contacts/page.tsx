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
    return () => window.removeEventListener('mistpay_theme_change', updateTheme)
  }, [])

  return theme
}

interface Contact {
  id: string
  name: string
  phone: string | null
  wallet_address: string | null
  created_at: number
}

// ─── Validation ───────────────────────────────────────────────────────────────

function nameError(val: string): string | null {
  if (!val.trim()) return 'Name is required'
  if (val.trim().length < 2) return 'Name must be at least 2 characters'
  return null
}
function phoneError(val: string): string | null {
  if (!val.trim()) return null
  const normalized = val.replace(/[\s\-().]/g, '')
  if (!/^\+[1-9]\d{7,14}$/.test(normalized)) return 'Use international format: +1 555 123 4567'
  return null
}
function walletError(val: string): string | null {
  if (!val.trim()) return null
  if (!/^0x[0-9a-fA-F]{40}$/.test(val.trim())) return 'Must be a valid 0x Ethereum address (42 chars)'
  return null
}

function errClass(hasError: boolean): string {
  return hasError ? 'border-red-500/50 ring-1 ring-red-500/30' : ''
}

function groupByLetter(contacts: Contact[]): Array<[string, Contact[]]> {
  const sorted = [...contacts].sort((a, b) => a.name.localeCompare(b.name))
  const groups: Array<[string, Contact[]]> = []
  for (const c of sorted) {
    const first = c.name.trim()[0]?.toUpperCase() ?? '#'
    const letter = /[A-Z]/.test(first) ? first : '#'
    const last = groups[groups.length - 1]
    if (last && last[0] === letter) last[1].push(c)
    else groups.push([letter, [c]])
  }
  return groups
}

// ─── Atoms ────────────────────────────────────────────────────────────────────

function FieldError({ msg, id }: { msg?: string | null; id?: string }) {
  if (!msg) return null
  return <p id={id} role="alert" className="mt-1 font-mono text-xs text-red-400">{msg}</p>
}

function PlusUserIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
      <circle cx="8.5" cy="7" r="4" />
      <line x1="20" y1="8" x2="20" y2="14" />
      <line x1="17" y1="11" x2="23" y2="11" />
    </svg>
  )
}

function SearchIcon({ className = 'w-3.5 h-3.5' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="11" cy="11" r="8" />
      <line x1="21" y1="21" x2="16.65" y2="16.65" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ContactsPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [contacts, setContacts] = useState<Contact[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [search, setSearch] = useState('')
  const [createError, setCreateError] = useState<string | null>(null)

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [walletAddress, setWalletAddress] = useState('')

  const [nameTouched, setNameTouched] = useState(false)
  const [phoneTouched, setPhoneTouched] = useState(false)
  const [walletTouched, setWalletTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  const nameRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)
    fetchContacts(token)
    nameRef.current?.focus()
  }, [])

  async function fetchContacts(token: string) {
    setLoading(true)
    try {
      const res = await fetch(`${BACKEND}/api/contacts`, { headers: { Authorization: `Bearer ${token}` } })
      if (res.status === 401 && token !== 'demo-token') {
        localStorage.removeItem('mistpay_auth')
        router.replace('/')
        return
      }
      const data = await res.json()
      setContacts(Array.isArray(data) ? data : [])
    } finally {
      setLoading(false)
    }
  }

  const nErr = nameError(name)
  const pErr = phoneError(phone)
  const wErr = walletError(walletAddress)
  const isValid = !nErr && !pErr && !wErr

  const showName = submitAttempted || (nameTouched && name.trim() !== '')
  const showPhone = phoneTouched || submitAttempted
  const showWallet = walletTouched || submitAttempted

  async function saveContact() {
    setSubmitAttempted(true)
    if (!isValid || !authToken) return
    setSaving(true)
    setCreateError(null)
    try {
      const normalized = phone.trim() ? phone.replace(/[\s\-().]/g, '') : undefined
      const res = await fetch(`${BACKEND}/api/contacts`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalized || undefined,
          walletAddress: walletAddress.trim() || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setName('')
      setPhone('')
      setWalletAddress('')
      setNameTouched(false)
      setPhoneTouched(false)
      setWalletTouched(false)
      setSubmitAttempted(false)
      nameRef.current?.focus()
      fetchContacts(authToken)
    } catch (err: any) {
      setCreateError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function deleteContact(id: string, contactName: string) {
    if (!authToken) return
    if (!confirm(`Remove ${contactName} from your contacts?`)) return
    await fetch(`${BACKEND}/api/contacts/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${authToken}` } })
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }

  const filtered = contacts.filter(
    (c) => c.name.toLowerCase().includes(search.toLowerCase()) || (c.phone ?? '').includes(search)
  )

  return (
    <div>
      {/* Header */}
      <div className="mb-8">
        <div className="mb-2.5 flex items-center gap-2">
          <span className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-mono text-[10px] font-bold uppercase tracking-wider ${
            isLight
              ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]'
              : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
          }`}>
            <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> CONTACTS BOOK
          </span>
        </div>
        <h1 className={`mb-1 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Contacts
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Save recipient phone numbers and wallet addresses for fast WhatsApp payment requests.
        </p>
      </div>

      {/* Add Contact Form Card */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <div className="mb-4 flex items-center gap-2">
          <div className={`flex h-7 w-7 items-center justify-center rounded-lg border ${
            isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
          }`}>
            <PlusUserIcon className="h-3.5 w-3.5" />
          </div>
          <p className={`font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Add New Contact
          </p>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <div>
            <label htmlFor="c-name" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Name <span className={isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}>*</span>
            </label>
            <input
              id="c-name"
              ref={nameRef}
              type="text"
              placeholder="e.g. Ana García"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => setNameTouched(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') document.getElementById('c-phone')?.focus()
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                  : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
              } ${errClass(showName && !!nErr)}`}
              aria-invalid={showName && !!nErr}
              aria-describedby={showName && nErr ? 'c-name-err' : undefined}
              autoComplete="name"
            />
            {showName && nErr ? <FieldError msg={nErr} id="c-name-err" /> : null}
          </div>

          <div>
            <label htmlFor="c-phone" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Phone <span className={`font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>(WhatsApp, optional)</span>
            </label>
            <input
              id="c-phone"
              type="tel"
              placeholder="+1 555 123 4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={() => setPhoneTouched(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') document.getElementById('c-wallet')?.focus()
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                  : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
              } ${errClass(showPhone && !!pErr)}`}
              aria-invalid={showPhone && !!pErr}
              aria-describedby={showPhone && pErr ? 'c-phone-err' : undefined}
              autoComplete="tel"
            />
            {showPhone && pErr ? <FieldError msg={pErr} id="c-phone-err" /> : null}
          </div>

          <div>
            <label htmlFor="c-wallet" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Wallet <span className={`font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>(0x..., optional)</span>
            </label>
            <input
              id="c-wallet"
              type="text"
              placeholder="0x…"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              onBlur={() => setWalletTouched(true)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') saveContact()
              }}
              className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs transition-all focus:outline-none focus:ring-1 ${
                isLight
                  ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                  : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
              } ${errClass(showWallet && !!wErr)}`}
              aria-invalid={showWallet && !!wErr}
              aria-describedby={showWallet && wErr ? 'c-wallet-err' : undefined}
              autoComplete="off"
            />
            {showWallet && wErr ? <FieldError msg={wErr} id="c-wallet-err" /> : null}
          </div>
        </div>

        <div className={`mt-5 flex items-center gap-3 border-t pt-4 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
          <button
            onClick={saveContact}
            disabled={saving}
            className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-sans text-xs font-bold transition-all disabled:opacity-50 ${
              isLight
                ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20'
                : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-md shadow-[#00d2b8]/20'
            }`}
          >
            {saving ? 'Saving…' : 'Save Contact'}
          </button>
          {createError && <p role="alert" className="m-0 font-mono text-xs text-red-500">{createError}</p>}
        </div>
      </section>

      {/* Search & Header Toolbar */}
      <div className="mb-4 flex flex-col justify-between gap-3 sm:flex-row sm:items-center">
        <p className={`font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          All Contacts Roster
        </p>

        {contacts.length > 0 && (
          <div className="flex items-center gap-3">
            <div className="relative w-full sm:w-64">
              <input
                type="search"
                placeholder="Search name or phone…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                aria-label="Search contacts"
                className={`w-full rounded-xl border pl-9 pr-3.5 py-2 font-sans text-xs transition-all focus:outline-none ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                    : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                }`}
              />
              <div className="absolute left-3 top-2.5 text-slate-400">
                <SearchIcon />
              </div>
            </div>
            <span className={`font-mono text-xs whitespace-nowrap ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
              {filtered.length} of {contacts.length}
            </span>
          </div>
        )}
      </div>

      {/* Contacts Directory List */}
      {loading ? (
        <div className="flex flex-col gap-2.5" role="status" aria-live="polite">
          <span className="sr-only">Loading contacts…</span>
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className={`h-14 animate-pulse rounded-xl border ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-[#0c141d]/80'}`} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={`rounded-xl border px-6 py-10 text-center ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
        }`}>
          <p className={`m-0 font-sans text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            {contacts.length === 0
              ? 'No contacts saved yet. Add one above or save directly in WhatsApp chat: "save Ana +15551234567"'
              : 'No contacts match your search query.'}
          </p>
        </div>
      ) : (
        <div className={`overflow-hidden rounded-xl border ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
        }`}>
          {groupByLetter(filtered).map(([letter, group]) => (
            <div key={letter}>
              <div className={`sticky top-0 z-10 border-b px-5 py-2 font-mono text-xs font-bold tracking-wider uppercase ${
                isLight ? 'border-slate-200 bg-slate-100 text-[#007a6c]' : 'border-[#00d2b8]/30 bg-[#082028] text-[#00d2b8]'
              }`}>
                {letter}
              </div>
              <div className={`divide-y ${isLight ? 'divide-slate-100' : 'divide-white/5'}`}>
                {group.map((c) => (
                  <div
                    key={c.id}
                    onClick={() => router.push(`/dashboard/contacts/${c.id}`)}
                    className={`flex cursor-pointer items-center justify-between gap-4 p-4 transition-colors group ${
                      isLight ? 'hover:bg-slate-50' : 'hover:bg-white/5'
                    }`}
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border font-sans text-base font-bold ${
                        isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/20 text-[#00d2b8]'
                      }`}>
                        {c.name[0].toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <p className={`m-0 truncate font-sans text-sm font-bold transition-colors ${
                          isLight ? 'text-slate-900 group-hover:text-[#007a6c]' : 'text-paper group-hover:text-[#00d2b8]'
                        }`}>
                          {c.name}
                        </p>
                        {c.phone && (
                          <span className={`font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>{c.phone}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      {c.wallet_address && (
                        <span className={`hidden font-mono text-xs sm:inline-block ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                          {c.wallet_address.slice(0, 6)}…{c.wallet_address.slice(-4)}
                        </span>
                      )}

                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        <button
                          onClick={() => router.push(`/dashboard/requests?label=${encodeURIComponent(c.name)}`)}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold transition-all ${
                            isLight
                              ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:bg-[#007a6c] hover:text-white'
                              : 'border-[#00d2b8]/30 bg-[#00d2b8]/15 text-[#00d2b8] hover:bg-[#00d2b8] hover:text-slate-950'
                          }`}
                        >
                          Request from
                        </button>
                        <button
                          onClick={() => deleteContact(c.id, c.name)}
                          className={`cursor-pointer rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold transition-all ${
                            isLight
                              ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                              : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                          }`}
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
