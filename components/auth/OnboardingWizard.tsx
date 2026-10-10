'use client'

import { useRef, useState } from 'react'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

export interface OnboardingProfile {
  onboarded: boolean
  displayName: string | null
  accountType: 'individual' | 'business'
  avatarUrl: string | null
  businessName: string | null
  websiteUrl: string | null
}

function resizeToDataUrl(file: File, maxSize = 256, quality = 0.82): Promise<string> {
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

export function OnboardingWizard({ authToken, onComplete }: { authToken: string; onComplete: (profile: OnboardingProfile) => void }) {
  const fileRef = useRef<HTMLInputElement>(null)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [displayName, setDisplayName] = useState('')
  const [accountType, setAccountType] = useState<'individual' | 'business'>('individual')
  const [businessName, setBusinessName] = useState('')
  const [websiteUrl, setWebsiteUrl] = useState('')
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function pickAvatar(file: File | undefined) {
    if (!file) return
    try {
      setAvatarPreview(await resizeToDataUrl(file))
    } catch {
      setError('Could not read that image. Try a different file.')
    }
  }

  async function submit() {
    setError(null)
    if (!displayName.trim()) { setError('Your name is required.'); return }
    if (accountType === 'business' && !businessName.trim()) { setError('Business name is required.'); return }

    setSaving(true)
    try {
      const res = await fetch(`${BACKEND}/api/auth/onboarding`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          displayName: displayName.trim(),
          avatarData: avatarPreview ?? undefined,
          accountType,
          businessName: accountType === 'business' ? businessName.trim() : undefined,
          websiteUrl: accountType === 'business' && websiteUrl.trim() ? websiteUrl.trim() : undefined,
        }),
      })
      if (!res.ok) throw new Error((await res.json()).error ?? 'Could not save your profile')
      onComplete({
        onboarded: true,
        displayName: displayName.trim(),
        accountType,
        avatarUrl: avatarPreview,
        businessName: accountType === 'business' ? businessName.trim() : null,
        websiteUrl: accountType === 'business' && websiteUrl.trim() ? websiteUrl.trim() : null,
      })
    } catch (err: any) {
      setError(err.message ?? 'Something went wrong. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={{ width: '100%', maxWidth: 440, background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 18, padding: 32 }}>
      <h1 style={{ fontFamily: 'Instrument Serif, Georgia, serif', fontStyle: 'italic', fontSize: 28, fontWeight: 400, color: '#FBFCFD', margin: '0 0 6px' }}>
        Set up your profile
      </h1>
      <p style={{ fontSize: 14, color: 'rgba(155,167,181,0.6)', margin: '0 0 26px' }}>One-time setup — this won&apos;t show again.</p>

      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 24 }}>
        <button
          onClick={() => fileRef.current?.click()}
          style={{
            width: 64, height: 64, borderRadius: '50%', flexShrink: 0, cursor: 'pointer',
            background: avatarPreview ? `url(${avatarPreview}) center/cover` : 'rgba(255,255,255,0.06)',
            border: '1px solid rgba(255,255,255,0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label="Upload profile picture"
        >
          {!avatarPreview && (
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="rgba(155,167,181,0.6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" /><circle cx="12" cy="13" r="4" /></svg>
          )}
        </button>
        <div>
          <button onClick={() => fileRef.current?.click()} style={{ fontSize: 13, fontWeight: 600, color: 'var(--fn-purp-fg)', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}>
            {avatarPreview ? 'Change photo' : 'Upload photo'}
          </button>
          <p style={{ fontSize: 12, color: 'rgba(107,120,136,0.5)', margin: '3px 0 0' }}>Optional</p>
        </div>
        <input ref={fileRef} type="file" accept="image/png,image/jpeg,image/webp" style={{ display: 'none' }} onChange={(e) => pickAvatar(e.target.files?.[0])} />
      </div>

      <label style={fieldLabel} htmlFor="ob-name">Your name</label>
      <input id="ob-name" type="text" placeholder="Ana Vargas" value={displayName} maxLength={80}
        onChange={(e) => setDisplayName(e.target.value)} style={{ ...fieldInput, marginBottom: 20 }} autoFocus />

      <label style={fieldLabel}>Account type</label>
      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {(['individual', 'business'] as const).map((t) => (
          <button
            key={t}
            onClick={() => setAccountType(t)}
            style={{
              flex: 1, padding: '10px 14px', borderRadius: 10, fontSize: 14, fontWeight: 600, cursor: 'pointer',
              textTransform: 'capitalize', fontFamily: 'var(--f-sans)',
              background: accountType === t ? 'rgba(99,91,255,0.16)' : 'rgba(255,255,255,0.03)',
              color: accountType === t ? '#FBFCFD' : 'rgba(155,167,181,0.65)',
              border: accountType === t ? '1px solid rgba(99,91,255,0.4)' : '1px solid rgba(255,255,255,0.08)',
            }}
          >
            {t}
          </button>
        ))}
      </div>

      {accountType === 'business' && (
        <>
          <label style={fieldLabel} htmlFor="ob-biz-name">Business name</label>
          <input id="ob-biz-name" type="text" placeholder="Acme Studio" value={businessName} maxLength={80}
            onChange={(e) => setBusinessName(e.target.value)} style={{ ...fieldInput, marginBottom: 20 }} />

          <label style={fieldLabel} htmlFor="ob-biz-url">Business website <span style={{ fontWeight: 400, opacity: 0.6 }}>(optional)</span></label>
          <input id="ob-biz-url" type="text" placeholder="acmestudio.com" value={websiteUrl}
            onChange={(e) => setWebsiteUrl(e.target.value)} style={{ ...fieldInput, marginBottom: 20 }} />
        </>
      )}

      {error && <p role="alert" style={{ fontSize: 13, color: '#e05454', margin: '0 0 16px' }}>{error}</p>}

      <button
        onClick={submit}
        disabled={saving}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          background: 'var(--signal)', color: '#fff', border: 'none', borderRadius: 10, padding: '12px 20px',
          fontSize: 15, fontWeight: 600, fontFamily: 'var(--f-sans)', cursor: saving ? 'not-allowed' : 'pointer', opacity: saving ? 0.7 : 1,
        }}
      >
        {saving ? <><span className="spinner" style={{ borderColor: 'rgba(255,255,255,0.3)', borderTopColor: '#fff' }} /> Saving…</> : 'Continue to dashboard'}
      </button>
    </div>
  )
}

const fieldLabel: React.CSSProperties = { display: 'block', fontFamily: 'JetBrains Mono, monospace', fontSize: 11, fontWeight: 600, letterSpacing: '0.07em', textTransform: 'uppercase', color: 'var(--mist-400)', marginBottom: 7 }
const fieldInput: React.CSSProperties = { width: '100%', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10, padding: '10px 14px', fontSize: 15, color: '#FBFCFD', fontFamily: 'Inter, system-ui, sans-serif', outline: 'none', boxSizing: 'border-box' }
