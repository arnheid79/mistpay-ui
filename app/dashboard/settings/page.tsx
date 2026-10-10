'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { TEMPO_CHAIN_ID, TEMPO_CHAIN_NAME } from '@/lib/chain'

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

interface TeamMember {
  id: string
  member_phone: string
  role: 'admin' | 'viewer'
  invited_at: string
  accepted_at: string | null
}

interface KybInfo {
  status: 'unverified' | 'pending' | 'verified' | 'rejected'
  taxId: string
  country: string
  city: string
  category: string
}

interface BusinessProfile {
  business_name: string
  tagline: string | null
  invoice_prefix: string
  invoice_counter: number
  notify_on_payment: boolean
  logo_data: string | null
  preferred_chain_id: number | null
  preferred_token_symbol: string | null
  country: string | null
  city: string | null
  category: string | null
  tax_id: string | null
  default_tax_bps: number
}

const CHAINS: Array<{ id: number; name: string }> = [
  { id: TEMPO_CHAIN_ID, name: TEMPO_CHAIN_NAME },
]
const CHAIN_TOKENS: Record<number, string[]> = {
  [TEMPO_CHAIN_ID]: ['USDC', 'USDT'],
}

function resizeToDataUrl(file: File, maxSize = 256, quality = 0.85): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(new Error('Could not read file'))
    reader.onload = () => {
      const img = new Image()
      img.onerror = () => reject(new Error('Could not read image'))
      img.onload = () => {
        const scale = Math.min(1, maxSize / Math.max(img.width, img.height))
        const w = Math.round(img.width * scale)
        const h = Math.round(img.height * scale)
        const canvas = document.createElement('canvas')
        canvas.width = w
        canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', quality))
      }
      img.src = reader.result as string
    }
    reader.readAsDataURL(file)
  })
}

// ─── Validation ───────────────────────────────────────────────────────────────

function nameError(val: string): string | null {
  if (!val.trim()) return 'Business name is required'
  if (val.trim().length < 2) return 'Must be at least 2 characters'
  if (val.trim().length > 80) return 'Maximum 80 characters'
  return null
}
function prefixError(val: string): string | null {
  if (!val.trim()) return 'Invoice prefix is required'
  if (!/^[A-Z0-9]{2,6}$/.test(val.trim())) return '2–6 uppercase letters or numbers only (e.g. INV, ACME)'
  return null
}

function errClass(hasError: boolean): string {
  return hasError ? 'border-red-500/50 ring-1 ring-red-500/30' : ''
}

function FieldError({ msg, id }: { msg?: string | null; id?: string }) {
  if (!msg) return null
  return <p id={id} role="alert" className="mt-1 font-mono text-xs text-red-400">{msg}</p>
}

function CheckIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function UploadIcon({ className = 'w-4 h-4' }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function SettingsPage() {
  const router = useRouter()
  const theme = useDashboardTheme()
  const isLight = theme === 'light'
  const [authToken, setAuthToken] = useState<string | null>(null)
  const [profile, setProfile] = useState<BusinessProfile | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual')
  const [displayName, setDisplayName] = useState('')

  const [businessName, setBusinessName] = useState('')
  const [tagline, setTagline] = useState('')
  const [invoicePrefix, setInvoicePrefix] = useState('INV')
  const [logoData, setLogoData] = useState<string | null>(null)
  const [logoError, setLogoError] = useState<string | null>(null)
  const [notifyOnPayment, setNotifyOnPayment] = useState(true)
  const [preferredChainId, setPreferredChainId] = useState(TEMPO_CHAIN_ID)
  const [preferredTokenSymbol, setPreferredTokenSymbol] = useState('USDC')
  const [country, setCountry] = useState('')
  const [city, setCity] = useState('')
  const [category, setCategory] = useState('')
  const [taxId, setTaxId] = useState('')
  const [defaultTaxPct, setDefaultTaxPct] = useState('')

  const [nameTouched, setNameTouched] = useState(false)
  const [prefixTouched, setPrefixTouched] = useState(false)
  const [submitAttempted, setSubmitAttempted] = useState(false)

  // Team
  const [team, setTeam] = useState<TeamMember[]>([])
  const [yourRole, setYourRole] = useState<'owner' | 'admin' | 'viewer'>('owner')
  const [invitePhone, setInvitePhone] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin' | 'viewer'>('viewer')
  const [teamBusy, setTeamBusy] = useState(false)
  const [teamError, setTeamError] = useState<string | null>(null)
  const [teamNote, setTeamNote] = useState<string | null>(null)

  // Personal profile
  const [avatarData, setAvatarData] = useState<string | null>(null)
  const [avatarError, setAvatarError] = useState<string | null>(null)
  const [phone, setPhone] = useState('')
  const [walletAddress, setWalletAddress] = useState('')
  const [addressCopied, setAddressCopied] = useState(false)

  // KYB
  const [kyb, setKyb] = useState<KybInfo | null>(null)
  const [kybBusy, setKybBusy] = useState(false)
  const [kybError, setKybError] = useState<string | null>(null)

  const nameRef = useRef<HTMLInputElement>(null)
  const logoFileRef = useRef<HTMLInputElement>(null)
  const avatarFileRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    setAuthToken(token)

    fetch(`${BACKEND}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => (r.ok ? r.json() : null))
      .then((me) => {
        if (me) {
          if (me.accountType) setAccountType(me.accountType)
          if (me.displayName) setDisplayName(me.displayName)
          if (me.phone) setPhone(me.phone)
          if (me.walletAddress) setWalletAddress(me.walletAddress)
          if (me.avatarUrl) setAvatarData(me.avatarUrl)
        }
      })
      .catch(() => {})

    fetch(`${BACKEND}/api/business/profile`, { headers: { Authorization: `Bearer ${token}` } })
      .then((r) => {
        if (r.status === 401 && token !== 'demo-token') {
          localStorage.removeItem('mistpay_auth')
          router.replace('/')
          return null
        }
        return r.json()
      })
      .then((data) => {
        if (data) {
          setProfile(data)
          setBusinessName(data.business_name ?? '')
          setTagline(data.tagline ?? '')
          setInvoicePrefix(data.invoice_prefix ?? 'INV')
          setLogoData(data.logo_data ?? null)
          setNotifyOnPayment(data.notify_on_payment ?? true)
          setPreferredChainId(data.preferred_chain_id ?? TEMPO_CHAIN_ID)
          setPreferredTokenSymbol(data.preferred_token_symbol ?? 'USDC')
          setCountry(data.country ?? '')
          setCity(data.city ?? '')
          setCategory(data.category ?? '')
          setTaxId(data.tax_id ?? '')
          setDefaultTaxPct(data.default_tax_bps ? String(data.default_tax_bps / 100) : '')
        }
      })
      .finally(() => setLoading(false))
  }, [router])

  const loadTeam = async (token: string) => {
    const res = await fetch(`${BACKEND}/api/my/team`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) {
      const data = await res.json()
      setTeam(data.members ?? [])
      setYourRole(data.yourRole ?? 'owner')
    }
  }
  const loadKyb = async (token: string) => {
    const res = await fetch(`${BACKEND}/api/my/kyb`, { headers: { Authorization: `Bearer ${token}` } })
    if (res.ok) setKyb(await res.json())
  }

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) return
    const { authToken: token } = JSON.parse(raw)
    if (token === 'demo-token') return
    loadTeam(token).catch(() => {})
    loadKyb(token).catch(() => {})
  }, [])

  async function inviteMember() {
    if (!authToken || !invitePhone.trim()) return
    setTeamBusy(true)
    setTeamError(null)
    setTeamNote(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/team/invite`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: invitePhone.trim(), role: inviteRole }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not send the invite')
      setInvitePhone('')
      setTeamNote(`Invited. Share this sign-in link with them: ${data.link}`)
      await loadTeam(authToken)
    } catch (err) {
      setTeamError((err as Error).message)
    } finally {
      setTeamBusy(false)
    }
  }

  async function removeMember(id: string, phone: string) {
    if (!authToken) return
    if (!window.confirm(`Remove ${phone} from your team? Access will be revoked immediately.`)) return
    setTeamBusy(true)
    setTeamError(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/team/${id}/remove`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}` },
      })
      if (!res.ok) throw new Error((await res.json().catch(() => ({}))).error ?? 'Could not remove member')
      await loadTeam(authToken)
    } catch (err) {
      setTeamError((err as Error).message)
    } finally {
      setTeamBusy(false)
    }
  }

  async function submitKybForm() {
    if (!authToken || !kyb) return
    setKybBusy(true)
    setKybError(null)
    try {
      const res = await fetch(`${BACKEND}/api/my/kyb/submit`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ taxId: kyb.taxId, country: kyb.country, city: kyb.city, category: kyb.category }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Could not submit for verification')
      setKyb({ ...kyb, status: data.status })
    } catch (err) {
      setKybError((err as Error).message)
    } finally {
      setKybBusy(false)
    }
  }

  async function pickLogo(file: File | undefined) {
    if (!file) return
    try {
      setLogoData(await resizeToDataUrl(file))
      setLogoError(null)
    } catch {
      setLogoError('Could not read that image. Try a different file.')
    }
  }

  async function pickAvatar(file: File | undefined) {
    if (!file) return
    try {
      setAvatarData(await resizeToDataUrl(file))
      setAvatarError(null)
    } catch {
      setAvatarError('Could not read image. Try a different file.')
    }
  }

  function handleCopyAddress() {
    if (!walletAddress) return
    navigator.clipboard.writeText(walletAddress)
    setAddressCopied(true)
    setTimeout(() => setAddressCopied(false), 1500)
  }

  async function savePersonalProfile() {
    if (!authToken || !displayName.trim()) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch(`${BACKEND}/api/auth/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatarData: avatarData ?? undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not save profile')
      setSaved(true)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save profile.')
    } finally {
      setSaving(false)
    }
  }

  const nErr = nameError(businessName)
  const pErr = prefixError(invoicePrefix)
  const taxPct = defaultTaxPct.trim() === '' ? undefined : Number(defaultTaxPct)
  const taxErr = taxPct !== undefined && (!Number.isFinite(taxPct) || taxPct < 0 || taxPct > 100) ? 'Enter a rate from 0 to 100' : null
  const countryErr = country.trim() !== '' && !/^[A-Za-z]{2}$/.test(country.trim()) ? '2-letter country code, e.g. DE' : null
  const taxIdErr = taxId.trim() !== '' && !/^[A-Za-z0-9 .\-/]{1,40}$/.test(taxId.trim()) ? 'Letters, digits, spaces and . - / only' : null
  const isValid = !nErr && !pErr && !taxErr && !countryErr && !taxIdErr

  const showName = submitAttempted || (nameTouched && businessName.trim() !== '')
  const showPrefix = submitAttempted || (prefixTouched && invoicePrefix.trim() !== '')

  const effectivePrefix = /^[A-Z0-9]{2,6}$/.test(invoicePrefix.trim()) ? invoicePrefix.trim() : 'INV'
  const nextInvoice = profile ? `${effectivePrefix}-${String(profile.invoice_counter + 1).padStart(3, '0')}` : null

  async function save() {
    setSubmitAttempted(true)
    if (!isValid || !authToken) return
    setSaving(true)
    setSaveError(null)
    setSaved(false)
    try {
      const res = await fetch(`${BACKEND}/api/business/profile`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          businessName: businessName.trim(),
          tagline: tagline.trim() || undefined,
          invoicePrefix: invoicePrefix.trim(),
          logoData: logoData ?? undefined,
          notifyOnPayment,
          preferredChainId,
          preferredTokenSymbol,
          country: country.trim().toUpperCase() || undefined,
          city: city.trim() || undefined,
          category: category.trim() || undefined,
          taxId: taxId.trim() || undefined,
          defaultTaxBps: taxPct === undefined ? undefined : Math.round(taxPct * 100),
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Save failed')
      setProfile(data)
      setSaved(true)
      setNameTouched(false)
      setPrefixTouched(false)
      setSubmitAttempted(false)
      setTimeout(() => setSaved(false), 3000)
    } catch (err: unknown) {
      setSaveError(err instanceof Error ? err.message : 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

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
            <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> SETTINGS & ACCOUNT
          </span>
        </div>
        <h1 className={`mb-1 font-sans text-2xl font-bold tracking-tight ${isLight ? 'text-slate-900' : 'text-paper'}`}>
          Settings
        </h1>
        <p className={`text-sm ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Manage your account profile, notification preferences, and settlement settings.
        </p>
      </div>

      {/* Account Type Read-Only View */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
              Account Type
            </p>
            <p className={`m-0 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
              Configured during profile setup.
            </p>
          </div>
          <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 font-mono text-xs font-bold uppercase tracking-wider ${
            accountType === 'business'
              ? (isLight ? 'border-[#007a6c]/40 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]')
              : (isLight ? 'border-slate-300 bg-slate-100 text-slate-700' : 'border-white/20 bg-white/10 text-slate-300')
          }`}>
            <span className={`h-2 w-2 rounded-full ${accountType === 'business' ? (isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]') : 'bg-slate-400'}`} />
            {accountType === 'business' ? 'Business Account' : 'Personal Account'}
          </div>
        </div>
      </section>

      {/* Personal Profile Section (for Personal / Individual Accounts) */}
      {accountType === 'individual' && (
        <section className={`mb-8 rounded-xl border p-6 ${
          isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
        }`}>
          <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
            Personal Profile
          </p>
          <p className={`mb-6 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
            Your personal name and photo appear on shareable payment request links and settlement confirmations.
          </p>

          <div className="space-y-6">
            {/* Avatar Upload */}
            <div className={`flex items-center gap-4 border-b pb-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <button
                type="button"
                onClick={() => avatarFileRef.current?.click()}
                aria-label={avatarData ? 'Change photo' : 'Upload photo'}
                className={`flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-full border bg-cover bg-center transition-all ${
                  isLight
                    ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:border-[#007a6c]'
                    : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8] hover:border-[#00d2b8]'
                }`}
                style={avatarData ? { backgroundImage: `url(${avatarData})` } : undefined}
              >
                {!avatarData && (
                  <span className={`font-mono text-base font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
                    {(displayName?.[0] ?? 'P').toUpperCase()}
                  </span>
                )}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => avatarFileRef.current?.click()}
                  className={`inline-flex cursor-pointer items-center gap-1.5 font-sans text-xs font-bold hover:underline ${
                    isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'
                  }`}
                >
                  <UploadIcon /> {avatarData ? 'Change Photo' : 'Upload Photo'}
                </button>
                <p className={`mt-1 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  PNG, JPG or WebP. Displayed on public payment request pages.
                </p>
                <FieldError msg={avatarError} />
              </div>
              <input
                ref={avatarFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => pickAvatar(e.target.files?.[0])}
              />
            </div>

            {/* Display Name & Phone Inputs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="p-name" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Display Name <span className={isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}>*</span>
                </label>
                <input
                  id="p-name"
                  type="text"
                  placeholder="e.g. John Doe"
                  value={displayName}
                  maxLength={80}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                      : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
                  }`}
                  autoComplete="name"
                />
              </div>

              <div>
                <label className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Verified Phone Number
                </label>
                <div className={`flex items-center justify-between rounded-xl border px-3.5 py-2.5 ${
                  isLight ? 'border-slate-200 bg-slate-50 text-slate-800' : 'border-white/10 bg-slate-900/40 text-paper'
                }`}>
                  <span className="font-mono text-xs font-semibold">{phone || 'Connected Account'}</span>
                  <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-mono text-[10px] font-bold ${
                    isLight ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                  }`}>
                    ✓ WhatsApp Verified
                  </span>
                </div>
              </div>
            </div>

            {/* Wallet Address Display */}
            <div>
              <label className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Connected Wallet Address
              </label>
              <div className={`flex items-center justify-between gap-3 rounded-xl border px-3.5 py-2.5 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-slate-900/40'
              }`}>
                <span className={`font-mono text-xs overflow-hidden text-ellipsis whitespace-nowrap ${isLight ? 'text-slate-900' : 'text-paper'}`}>
                  {walletAddress || '0x...'}
                </span>
                <button
                  type="button"
                  onClick={handleCopyAddress}
                  className={`inline-flex items-center gap-1 shrink-0 rounded-lg px-2.5 py-1 font-mono text-xs font-semibold transition-all ${
                    isLight ? 'bg-slate-200 text-slate-800 hover:bg-slate-300' : 'bg-white/10 text-paper hover:bg-white/20'
                  }`}
                >
                  {addressCopied ? 'Copied ✓' : 'Copy'}
                </button>
              </div>
            </div>

            {/* Notification Switch */}
            <div className={`border-t pt-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <p className={`mb-3 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Payment Notifications
              </p>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifyOnPayment}
                  onChange={(e) => setNotifyOnPayment(e.target.checked)}
                  className={`h-4 w-4 ${isLight ? 'accent-[#007a6c]' : 'accent-[#00d2b8]'}`}
                />
                <span className={`font-sans text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  Receive instant WhatsApp / Telegram alerts when a payment request is fulfilled
                </span>
              </label>
            </div>

            {/* Save Button Bar */}
            <div className={`flex items-center gap-3 border-t pt-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <button
                type="button"
                onClick={savePersonalProfile}
                disabled={saving || !displayName.trim()}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-sans text-xs font-bold transition-all ${
                  saved
                    ? (isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-400 text-slate-950')
                    : (isLight ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20' : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-lg shadow-[#00d2b8]/20')
                } ${saving ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                {saving ? 'Saving Profile…' : saved ? <><CheckIcon /> Profile Saved</> : 'Save Profile'}
              </button>
              {saveError && <p role="alert" className="m-0 font-mono text-xs text-red-500">{saveError}</p>}
            </div>
          </div>
        </section>
      )}

      {/* Business Profile, KYB & Team Sections - FOR BUSINESS ACCOUNTS ONLY */}
      {accountType === 'business' && (
        <>
          {/* Business Profile Section */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          Business Profile
        </p>
        <p className={`mb-6 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Your business name, logo, and invoice prefix appear on shareable invoices and payment checkout pages.
        </p>

        {loading ? (
          <div className="flex flex-col gap-3" role="status" aria-live="polite">
            <span className="sr-only">Loading business profile…</span>
            {[1, 2, 3].map((i) => (
              <div key={i} className={`h-12 animate-pulse rounded-xl border ${isLight ? 'border-slate-200 bg-slate-100' : 'border-white/10 bg-slate-900/60'}`} />
            ))}
          </div>
        ) : (
          <div className="space-y-6">
            {/* Logo Upload */}
            <div className={`flex items-center gap-4 border-b pb-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <button
                type="button"
                onClick={() => logoFileRef.current?.click()}
                aria-label={logoData ? 'Change logo' : 'Upload logo'}
                className={`flex h-16 w-16 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-2xl border bg-cover bg-center transition-all ${
                  isLight
                    ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] hover:border-[#007a6c]'
                    : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8] hover:border-[#00d2b8]'
                }`}
                style={logoData ? { backgroundImage: `url(${logoData})` } : undefined}
              >
                {!logoData && <span className={`font-mono text-xs font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>Logo</span>}
              </button>
              <div>
                <button
                  type="button"
                  onClick={() => logoFileRef.current?.click()}
                  className={`inline-flex cursor-pointer items-center gap-1.5 font-sans text-xs font-bold hover:underline ${
                    isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'
                  }`}
                >
                  <UploadIcon /> {logoData ? 'Change Logo' : 'Upload Logo'}
                </button>
                <p className={`mt-1 font-mono text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                  PNG, JPG or WebP. Displayed on public checkout links and PDF receipts.
                </p>
                <FieldError msg={logoError} />
              </div>
              <input
                ref={logoFileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp"
                className="hidden"
                onChange={(e) => pickLogo(e.target.files?.[0])}
              />
            </div>

            {/* Name & Prefix Inputs */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              <div className="md:col-span-2">
                <label htmlFor="s-name" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Business Name <span className={isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}>*</span>
                </label>
                <input
                  id="s-name"
                  ref={nameRef}
                  type="text"
                  placeholder="e.g. Acme Studio"
                  value={businessName}
                  maxLength={80}
                  onChange={(e) => setBusinessName(e.target.value)}
                  onBlur={() => setNameTouched(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') document.getElementById('s-prefix')?.focus()
                  }}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                      : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
                  } ${errClass(showName && !!nErr)}`}
                  aria-invalid={showName && !!nErr}
                  aria-describedby={showName && nErr ? 's-name-err' : undefined}
                  autoComplete="organization"
                />
                {showName && nErr ? (
                  <FieldError msg={nErr} id="s-name-err" />
                ) : (
                  <p className={`mt-1 font-mono text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{businessName.length}/80 characters</p>
                )}
              </div>

              <div>
                <label htmlFor="s-prefix" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                  Invoice Prefix <span className={isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}>*</span>
                </label>
                <input
                  id="s-prefix"
                  type="text"
                  placeholder="INV"
                  maxLength={6}
                  value={invoicePrefix}
                  onChange={(e) => setInvoicePrefix(e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''))}
                  onBlur={() => setPrefixTouched(true)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') document.getElementById('s-tagline')?.focus()
                  }}
                  className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm font-bold transition-all focus:outline-none focus:ring-1 ${
                    isLight
                      ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                      : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
                  } ${errClass(showPrefix && !!pErr)}`}
                  aria-invalid={showPrefix && !!pErr}
                  aria-describedby={showPrefix && pErr ? 's-prefix-err' : undefined}
                  autoComplete="off"
                />
                {showPrefix && pErr ? (
                  <FieldError msg={pErr} id="s-prefix-err" />
                ) : nextInvoice ? (
                  <p className={`mt-1 font-mono text-[10px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Next: <span className={`font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{nextInvoice}</span>
                  </p>
                ) : null}
              </div>
            </div>

            {/* Tagline */}
            <div>
              <label htmlFor="s-tagline" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Tagline / Service Subtitle <span className={`font-normal ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>(optional)</span>
              </label>
              <input
                id="s-tagline"
                type="text"
                placeholder="e.g. Premium Freelance Design & Engineering"
                value={tagline}
                maxLength={120}
                onChange={(e) => setTagline(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') save()
                }}
                className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none focus:ring-1 ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c] focus:ring-[#007a6c]/50'
                    : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8] focus:ring-[#00d2b8]/50'
                }`}
                autoComplete="off"
              />
              <p className={`mt-1 font-mono text-[10px] ${isLight ? 'text-slate-400' : 'text-slate-500'}`}>{tagline.length}/120 characters</p>
            </div>

            {/* Location & Tax Info Grid */}
            <div className={`border-t pt-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <p className={`mb-3 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Location & Tax Preferences
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                <div>
                  <label htmlFor="s-country" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Country Code (2 Letters)
                  </label>
                  <input
                    id="s-country"
                    type="text"
                    placeholder="DE"
                    maxLength={2}
                    value={country}
                    onChange={(e) => setCountry(e.target.value.toUpperCase())}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm transition-all focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    } ${errClass(!!countryErr)}`}
                    autoComplete="country"
                  />
                  <FieldError msg={countryErr} />
                </div>

                <div>
                  <label htmlFor="s-city" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    City
                  </label>
                  <input
                    id="s-city"
                    type="text"
                    placeholder="Berlin"
                    maxLength={60}
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    }`}
                    autoComplete="address-level2"
                  />
                </div>

                <div>
                  <label htmlFor="s-category" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Industry Category
                  </label>
                  <input
                    id="s-category"
                    type="text"
                    placeholder="Software & Services"
                    maxLength={40}
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm transition-all focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    }`}
                    autoComplete="off"
                  />
                </div>

                <div>
                  <label htmlFor="s-taxid" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Tax / VAT ID
                  </label>
                  <input
                    id="s-taxid"
                    type="text"
                    placeholder="DE123456789"
                    maxLength={40}
                    value={taxId}
                    onChange={(e) => setTaxId(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm transition-all focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    } ${errClass(!!taxIdErr)}`}
                    autoComplete="off"
                  />
                  <FieldError msg={taxIdErr} />
                </div>

                <div>
                  <label htmlFor="s-tax" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Default Tax Rate (%)
                  </label>
                  <input
                    id="s-tax"
                    type="number"
                    inputMode="decimal"
                    min={0}
                    max={100}
                    step="0.01"
                    placeholder="0"
                    value={defaultTaxPct}
                    onChange={(e) => setDefaultTaxPct(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm transition-all focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                    } ${errClass(!!taxErr)}`}
                  />
                  <FieldError msg={taxErr} />
                </div>
              </div>
            </div>

            {/* Invoice Counter Card Stats */}
            {profile && (
              <div className={`grid grid-cols-2 gap-4 rounded-xl border p-4 ${
                isLight ? 'border-slate-200 bg-slate-50' : 'border-white/10 bg-black/40'
              }`}>
                <div>
                  <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Invoices Created
                  </p>
                  <p className={`font-mono text-xl font-bold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{profile.invoice_counter}</p>
                </div>
                <div>
                  <p className={`font-mono text-[10px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    Next Serial ID
                  </p>
                  <p className={`font-mono text-xl font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{nextInvoice}</p>
                </div>
              </div>
            )}

            {/* Settlement Chain & Token */}
            <div className={`border-t pt-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <p className={`mb-3 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Payment Settlement Default
              </p>
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label htmlFor="s-chain" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Settlement Network
                  </label>
                  <select
                    id="s-chain"
                    value={preferredChainId}
                    onChange={(e) => {
                      const chainId = Number(e.target.value)
                      setPreferredChainId(chainId)
                      if (!CHAIN_TOKENS[chainId].includes(preferredTokenSymbol)) {
                        setPreferredTokenSymbol(CHAIN_TOKENS[chainId][0])
                      }
                    }}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-sm focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
                    }`}
                  >
                    {CHAINS.map((c) => (
                      <option key={c.id} value={c.id} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="s-token" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                    Default Settlement Token
                  </label>
                  <select
                    id="s-token"
                    value={preferredTokenSymbol}
                    onChange={(e) => setPreferredTokenSymbol(e.target.value)}
                    className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-sm focus:outline-none ${
                      isLight
                        ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                        : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
                    }`}
                  >
                    {CHAIN_TOKENS[preferredChainId].map((sym) => (
                      <option key={sym} value={sym} className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>
                        {sym}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            {/* Notification Switch */}
            <div className={`border-t pt-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <p className={`mb-3 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
                Payment Notifications
              </p>
              <label className="flex cursor-pointer items-center gap-3">
                <input
                  type="checkbox"
                  checked={notifyOnPayment}
                  onChange={(e) => setNotifyOnPayment(e.target.checked)}
                  className={`h-4 w-4 ${isLight ? 'accent-[#007a6c]' : 'accent-[#00d2b8]'}`}
                />
                <span className={`font-sans text-xs font-medium ${isLight ? 'text-slate-700' : 'text-slate-200'}`}>
                  Receive instant WhatsApp / Telegram alerts when a payment request is fulfilled
                </span>
              </label>
            </div>

            {/* Save Button Bar */}
            <div className={`flex items-center gap-3 border-t pt-6 ${isLight ? 'border-slate-100' : 'border-white/10'}`}>
              <button
                onClick={save}
                disabled={saving}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-5 py-2.5 font-sans text-xs font-bold transition-all ${
                  saved
                    ? (isLight ? 'bg-emerald-600 text-white' : 'bg-emerald-400 text-slate-950')
                    : (isLight ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20' : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-lg shadow-[#00d2b8]/20')
                } ${saving ? 'cursor-not-allowed opacity-70' : ''}`}
              >
                {saving ? 'Saving Profile…' : saved ? <><CheckIcon /> Profile Saved</> : 'Save Profile'}
              </button>
              {saveError && <p role="alert" className="m-0 font-mono text-xs text-red-500">{saveError}</p>}
            </div>
          </div>
        )}
      </section>

      {/* Business Verification (KYB) */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          Business Verification (KYB)
        </p>
        <p className={`mb-5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Verify your business entity to unlock live API keys and elevated processing limits.
        </p>
        {kyb && (
          <div className="space-y-4">
            <div className="flex items-center gap-3">
              {kyb.status === 'verified' && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
                  isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
                }`}>
                  <span className={`h-1.5 w-1.5 rounded-full ${isLight ? 'bg-[#007a6c]' : 'bg-[#00d2b8]'}`} /> Verified Business
                </span>
              )}
              {kyb.status === 'pending' && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
                  isLight ? 'border-amber-300 bg-amber-50 text-amber-700' : 'border-amber-500/40 bg-amber-500/15 text-amber-400'
                }`}>
                  <span className="h-1.5 w-1.5 rounded-full bg-current" /> Review Pending
                </span>
              )}
              {kyb.status === 'unverified' && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
                  isLight ? 'border-slate-200 bg-slate-100 text-slate-600' : 'border-slate-700 bg-slate-800/60 text-slate-400'
                }`}>
                  Unverified
                </span>
              )}
              {kyb.status === 'rejected' && (
                <span className={`inline-flex items-center gap-1 rounded-full border px-3 py-1 font-mono text-[10px] font-bold ${
                  isLight ? 'border-red-300 bg-red-50 text-red-700' : 'border-red-500/40 bg-red-500/15 text-red-400'
                }`}>
                  Verification Rejected
                </span>
              )}
            </div>

            {kybError && <p role="alert" className="font-mono text-xs text-red-500">{kybError}</p>}

            {kyb.status !== 'verified' && (
              <button
                onClick={submitKybForm}
                disabled={kybBusy || !taxId.trim() || !country.trim() || !city.trim() || !category.trim()}
                className={`inline-flex cursor-pointer items-center gap-2 rounded-xl px-4 py-2.5 font-sans text-xs font-bold transition-all disabled:opacity-50 ${
                  isLight
                    ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20'
                    : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-md shadow-[#00d2b8]/20'
                }`}
              >
                {kybBusy ? 'Submitting…' : kyb.status === 'rejected' ? 'Resubmit for Verification' : 'Submit for KYB Verification'}
              </button>
            )}
          </div>
        )}
      </section>

      {/* Team Management */}
      <section className={`mb-8 rounded-xl border p-6 ${
        isLight ? 'border-slate-200 bg-white shadow-sm' : 'border-white/10 bg-[#0c141d]/80 backdrop-blur-md'
      }`}>
        <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-slate-700' : 'text-slate-300'}`}>
          Team Management
        </p>
        <p className={`mb-5 text-xs ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
          Invite teammates by WhatsApp number to collaborate on payment management.
        </p>

        {teamError && (
          <div className={`mb-4 rounded-xl border p-3 font-mono text-xs ${
            isLight ? 'border-red-200 bg-red-50 text-red-600' : 'border-red-500/30 bg-red-500/10 text-red-400'
          }`}>
            {teamError}
          </div>
        )}
        {teamNote && (
          <div className={`mb-4 rounded-xl border p-3 font-mono text-xs ${
            isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c] font-semibold' : 'border-[#00d2b8]/30 bg-[#00d2b8]/10 text-[#00d2b8]'
          }`}>
            {teamNote}
          </div>
        )}

        {yourRole !== 'viewer' && (
          <div className="mb-6 flex flex-wrap items-end gap-3">
            <div className="min-w-[220px] flex-1">
              <label htmlFor="team-phone" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                WhatsApp Phone Number
              </label>
              <input
                id="team-phone"
                type="text"
                placeholder="+15551234567"
                value={invitePhone}
                onChange={(e) => setInvitePhone(e.target.value)}
                className={`w-full rounded-xl border px-3.5 py-2.5 font-mono text-xs transition-all focus:outline-none ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-[#007a6c]'
                    : 'border-white/10 bg-slate-900/70 text-paper placeholder:text-slate-500 focus:border-[#00d2b8]'
                }`}
                autoComplete="off"
              />
            </div>
            <div>
              <label htmlFor="team-role" className={`mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-wider ${isLight ? 'text-slate-600' : 'text-slate-400'}`}>
                Assigned Role
              </label>
              <select
                id="team-role"
                value={inviteRole}
                onChange={(e) => setInviteRole(e.target.value as 'admin' | 'viewer')}
                className={`w-full rounded-xl border px-3.5 py-2.5 font-sans text-xs focus:outline-none ${
                  isLight
                    ? 'border-slate-200 bg-white text-slate-900 focus:border-[#007a6c]'
                    : 'border-white/10 bg-slate-900/70 text-paper focus:border-[#00d2b8]'
                }`}
              >
                <option value="viewer" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Viewer</option>
                <option value="admin" className={isLight ? 'bg-white text-slate-900' : 'bg-slate-900 text-paper'}>Admin</option>
              </select>
            </div>
            <button
              onClick={inviteMember}
              disabled={teamBusy || !invitePhone.trim()}
              className={`cursor-pointer rounded-xl px-4 py-2.5 font-sans text-xs font-bold transition-all disabled:opacity-50 ${
                isLight
                  ? 'bg-[#007a6c] text-white hover:bg-[#006357] shadow-md shadow-[#007a6c]/20'
                  : 'bg-[#00d2b8] text-slate-950 hover:bg-[#00e6cb] shadow-md shadow-[#00d2b8]/20'
              }`}
            >
              {teamBusy ? 'Inviting…' : 'Invite Teammate'}
            </button>
          </div>
        )}

        {team.length === 0 ? (
          <p className={`py-4 text-center font-sans text-sm italic ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>No team members added yet.</p>
        ) : (
          <ul className={`divide-y overflow-hidden rounded-xl border ${
            isLight ? 'border-slate-200 bg-slate-50/50 divide-slate-100' : 'border-white/10 bg-black/20 divide-white/5'
          }`}>
            {team.map((m) => (
              <li key={m.id} className={`flex flex-wrap items-center justify-between gap-3 p-4 transition-colors ${
                isLight ? 'hover:bg-slate-100/60' : 'hover:bg-white/5'
              }`}>
                <div className="flex items-center gap-3">
                  <span className={`font-mono text-sm font-semibold ${isLight ? 'text-slate-900' : 'text-paper'}`}>{m.member_phone}</span>
                  <span className={`rounded-full border px-2.5 py-0.5 font-mono text-[10px] font-bold uppercase ${
                    isLight ? 'border-[#007a6c]/30 bg-[#007a6c]/10 text-[#007a6c]' : 'border-[#00d2b8]/40 bg-[#00d2b8]/15 text-[#00d2b8]'
                  }`}>
                    {m.role}
                  </span>
                  <span className={`font-mono text-xs ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>
                    {m.accepted_at ? 'Active Member' : 'Invite Sent (Pending Acceptance)'}
                  </span>
                </div>
                {yourRole !== 'viewer' && (
                  <button
                    onClick={() => removeMember(m.id, m.member_phone)}
                    disabled={teamBusy}
                    className={`cursor-pointer rounded-lg border px-3 py-1.5 font-sans text-xs font-semibold transition-all ${
                      isLight
                        ? 'border-red-200 bg-red-50 text-red-600 hover:bg-red-100'
                        : 'border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20'
                    }`}
                  >
                    Remove
                  </button>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>
        </>
      )}

      {/* WhatsApp Bot Reference */}
      <section className={`relative overflow-hidden rounded-xl border p-6 shadow-xl ${
        isLight ? 'border-[#007a6c]/30 bg-slate-50' : 'border-[#00d2b8]/30 bg-[#082028]'
      }`}>
        <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${
          isLight ? 'from-[#007a6c] via-sky-500 to-[#007a6c]' : 'from-[#00d2b8] via-sky-400 to-[#00d2b8]'
        }`} />
        <p className={`mb-1 font-mono text-xs font-semibold uppercase tracking-wider ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>
          WhatsApp Bot Commands Cheatsheet
        </p>
        <p className={`mb-4 font-sans text-xs ${isLight ? 'text-slate-600' : 'text-slate-300'}`}>
          All dashboard functions are available directly via WhatsApp commands linked to your phone number.
        </p>

        <div className={`rounded-xl border p-4 ${isLight ? 'border-slate-200 bg-white' : 'border-white/10 bg-black/40'}`}>
          <dl className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
            {[
              ['request $50 from Ana', 'Basic payment request'],
              ['invoice $200 to Ana for consulting', 'Create invoice'],
              ['split $90 between Alice, Bob, Charlie', 'Group split'],
              ['save Ana +15551234567', 'Save contact'],
              ['contacts', 'List contacts'],
              ['remind', 'Nudge unpaid splits'],
              ['balance / history / cancel', 'Utilities'],
            ].map(([cmd, desc]) => (
              <div key={cmd} className="flex flex-col gap-0.5">
                <dt className={`font-mono text-xs font-bold ${isLight ? 'text-[#007a6c]' : 'text-[#00d2b8]'}`}>{cmd}</dt>
                <dd className={`font-sans text-[11px] ${isLight ? 'text-slate-500' : 'text-slate-400'}`}>— {desc}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>
    </div>
  )
}
