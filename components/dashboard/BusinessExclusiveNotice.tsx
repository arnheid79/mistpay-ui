'use client'

import Link from 'next/link'

interface Props {
  featureName: string
  description?: string
  theme?: 'dark' | 'light'
}

export function BusinessExclusiveNotice({ featureName, description, theme = 'dark' }: Props) {
  const isLight = theme === 'light'

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '60vh',
        padding: '32px 20px',
        textAlign: 'center',
      }}
    >
      <div
        style={{
          maxWidth: 460,
          width: '100%',
          background: isLight ? '#ffffff' : 'rgba(255, 255, 255, 0.03)',
          border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: 16,
          padding: '36px 28px',
          boxShadow: isLight ? '0 10px 30px -5px rgba(0,0,0,0.05)' : '0 10px 30px -5px rgba(0,0,0,0.3)',
        }}
      >
        <div
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 52,
            height: 52,
            borderRadius: 12,
            background: isLight ? 'rgba(0, 168, 148, 0.1)' : 'rgba(0, 210, 184, 0.12)',
            color: isLight ? '#007a6c' : '#00d2b8',
            marginBottom: 20,
          }}
        >
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
            <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16" />
          </svg>
        </div>

        <h2
          style={{
            fontFamily: 'var(--font-sans)',
            fontSize: 20,
            fontWeight: 600,
            color: isLight ? '#0f172a' : '#FBFCFD',
            margin: '0 0 8px',
          }}
        >
          {featureName} is a Business Feature
        </h2>

        <p
          style={{
            fontSize: 14,
            lineHeight: '1.5',
            color: isLight ? '#64748b' : 'rgba(155, 167, 181, 0.75)',
            margin: '0 0 24px',
          }}
        >
          {description || `${featureName} and merchant tools are exclusive to MistPay Business accounts. Switch your account type in Settings to unlock business invoicing, API keys, and automated settlements.`}
        </p>

        <div style={{ display: 'flex', gap: 12, justifyContent: 'center' }}>
          <Link
            href="/dashboard"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              background: isLight ? '#f1f5f9' : 'rgba(255, 255, 255, 0.08)',
              color: isLight ? '#334155' : '#FBFCFD',
              textDecoration: 'none',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255, 255, 255, 0.12)',
            }}
          >
            Return to Overview
          </Link>

          <Link
            href="/dashboard/settings"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              padding: '9px 18px',
              borderRadius: 8,
              fontSize: 13.5,
              fontWeight: 500,
              background: isLight ? '#007a6c' : '#00d2b8',
              color: isLight ? '#ffffff' : '#070b16',
              textDecoration: 'none',
            }}
          >
            View Settings
          </Link>
        </div>
      </div>
    </div>
  )
}
