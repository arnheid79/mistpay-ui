'use client'

import { MistWordmark } from '@/components/ui/logo'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useEffect, useState } from 'react'

const WHATSAPP_BOT_URL = process.env.NEXT_PUBLIC_WHATSAPP_BOT_URL || 'https://wa.me/14155238886'
const TELEGRAM_BOT_URL = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL || 'https://t.me/mistpaybot'

function BotLink({ href, label, isLight, size = 30, children }: { href: string; label: string; isLight?: boolean; size?: number; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      aria-label={label}
      className="dash-bot-link"
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: size,
        height: size,
        borderRadius: 7,
        background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.06)',
        border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.1)',
        color: isLight ? '#475569' : 'rgba(155,167,181,0.85)',
        transition: 'color .12s, background .12s',
      }}
    >
      {children}
    </a>
  )
}

function WhatsAppIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  )
}

function TelegramIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
      <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71l-4.14-3.05-2 1.92c-.21.21-.4.4-.82.4z" />
    </svg>
  )
}

function CopyIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
    </svg>
  )
}

function CheckIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="#4db885" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" />
      <line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
      <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" />
      <line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
      <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  )
}

function CollapseIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      style={{ transform: collapsed ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s ease' }}
    >
      <polyline points="15 18 9 12 15 6" />
    </svg>
  )
}

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: HomeIcon, exact: true },
  { href: '/dashboard/requests', matchPrefixes: ['/dashboard/requests', '/dashboard/invoices', '/dashboard/splits', '/dashboard/payments'], label: 'Payments', icon: PaymentIcon },
  { href: '/dashboard/subscriptions', matchPrefixes: ['/dashboard/subscriptions'], label: 'Subscriptions', icon: SubscriptionIcon },
  { href: '/dashboard/completed', matchPrefixes: ['/dashboard/completed', '/dashboard/activity'], label: 'Activity', icon: HistoryIcon },
  { href: '/dashboard/contacts', matchPrefixes: ['/dashboard/contacts'], label: 'Contacts', icon: ContactIcon },
  { href: '/dashboard/developers', matchPrefixes: ['/dashboard/developers'], label: 'Developers', icon: DeveloperIcon },
  { href: '/dashboard/settings', matchPrefixes: ['/dashboard/settings'], label: 'Settings', icon: SettingsIcon },
]

const SUB_NAVS: Record<string, Array<{ href: string; label: string; exact?: boolean }>> = {
  payments: [
    { href: '/dashboard/requests', label: 'All Requests' },
    { href: '/dashboard/invoices', label: 'Invoices' },
    { href: '/dashboard/splits', label: 'Group Splits' },
  ],
  subscriptions: [
    { href: '/dashboard/subscriptions', label: 'Plans', exact: true },
    { href: '/dashboard/subscriptions/subscribers', label: 'Subscribers' },
  ],
  developers: [
    { href: '/dashboard/developers', label: 'API Keys', exact: true },
    { href: '/dashboard/developers/webhooks', label: 'Webhooks & Outbox' },
  ],
}

interface Props {
  children: React.ReactNode
  address: string
  displayName?: string | null
  avatarUrl?: string | null
  onSignOut: () => void
}

export function DashboardShell({ children, address, displayName, avatarUrl, onSignOut }: Props) {
  const pathname = usePathname()
  const [copied, setCopied] = useState(false)
  const [theme, setTheme] = useState<'dark' | 'light'>('dark')
  const [isCollapsed, setIsCollapsed] = useState(false)

  useEffect(() => {
    const storedTheme = localStorage.getItem('mistpay_theme') as 'dark' | 'light' | null
    if (storedTheme) {
      setTheme(storedTheme)
    }
    const storedCollapsed = localStorage.getItem('mistpay_sidebar_collapsed')
    if (storedCollapsed) {
      setIsCollapsed(storedCollapsed === 'true')
    }
  }, [])

  function toggleTheme() {
    const nextTheme = theme === 'dark' ? 'light' : 'dark'
    setTheme(nextTheme)
    localStorage.setItem('mistpay_theme', nextTheme)
    window.dispatchEvent(new Event('mistpay_theme_change'))
  }

  function toggleCollapse() {
    const nextCollapsed = !isCollapsed
    setIsCollapsed(nextCollapsed)
    localStorage.setItem('mistpay_sidebar_collapsed', String(nextCollapsed))
  }

  function handleCopyAddress() {
    navigator.clipboard.writeText(address)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  let currentSubKey = ''
  if (pathname.startsWith('/dashboard/requests') || pathname.startsWith('/dashboard/invoices') || pathname.startsWith('/dashboard/splits') || pathname.startsWith('/dashboard/payments')) {
    currentSubKey = 'payments'
  } else if (pathname.startsWith('/dashboard/subscriptions')) {
    currentSubKey = 'subscriptions'
  } else if (pathname.startsWith('/dashboard/developers')) {
    currentSubKey = 'developers'
  }

  const activeSubTabs = SUB_NAVS[currentSubKey]

  const isLight = theme === 'light'
  const sidebarWidth = isCollapsed ? 74 : 236

  return (
    <div
      data-theme={theme}
      className="mist-dashboard"
      style={{
        display: 'flex',
        height: '100vh',
        overflow: 'hidden',
        background: isLight ? '#f1f5f9' : '#0a0f1d',
        color: isLight ? '#0f172a' : '#FBFCFD',
        fontFamily: 'var(--font-sans)',
        padding: 10,
        boxSizing: 'border-box',
      }}
    >
      {/* Floatable Collapsible Sidebar */}
      <aside
        style={{
          width: sidebarWidth,
          flexShrink: 0,
          background: isLight ? '#ffffff' : 'var(--metallic-sidebar-bg-dark)',
          backdropFilter: 'blur(var(--card-backdrop-blur))',
          WebkitBackdropFilter: 'blur(var(--card-backdrop-blur))',
          border: isLight ? '1px solid #e2e8f0' : 'none',
          borderRadius: 'var(--sidebar-radius)',
          display: 'flex',
          flexDirection: 'column',
          position: 'relative',
          overflow: 'hidden',
          transition: 'width 0.22s cubic-bezier(0.22, 1, 0.36, 1), background 0.22s ease',
          boxShadow: isLight ? '0 4px 20px -2px rgba(15,23,42,0.06)' : 'var(--metallic-shadow-dark)',
          marginRight: 10,
        }}
        className="sidebar-desktop"
      >
        {/* Top Header inside Sidebar: Logo & Collapse Button */}
        <div
          style={{
            padding: isCollapsed ? '20px 10px 16px' : '20px 16px 16px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: isCollapsed ? 'center' : 'space-between',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {!isCollapsed && <MistWordmark theme={isLight ? 'light' : 'dark'} href="/dashboard" />}
          <button
            onClick={toggleCollapse}
            title={isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label="Toggle sidebar"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 28,
              height: 28,
              borderRadius: 'var(--button-radius)',
              background: isLight ? '#f1f5f9' : 'rgba(255,255,255,0.08)',
              border: isLight ? '1px solid #cbd5e1' : '1px solid rgba(255,255,255,0.14)',
              color: isLight ? '#334155' : 'rgba(255,255,255,0.8)',
              cursor: 'pointer',
              transition: 'background 0.15s ease',
            }}
          >
            <CollapseIcon collapsed={isCollapsed} />
          </button>
        </div>

        <div
          style={{
            height: 1,
            background: isLight ? '#e2e8f0' : 'rgba(255,255,255,0.08)',
            margin: '0 12px 10px',
          }}
        />

        {/* Navigation Items */}
        <nav
          style={{
            flex: 1,
            padding: '4px 8px',
            position: 'relative',
            zIndex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'stretch',
            justifyContent: 'flex-start',
            height: 'auto',
          }}
        >
          {NAV.map(({ href, matchPrefixes, exact, label, icon: Icon }) => {
            const active = exact
              ? pathname === href
              : matchPrefixes
                ? matchPrefixes.some((prefix) => pathname.startsWith(prefix))
                : pathname.startsWith(href)

            return (
              <Link
                key={href}
                href={href}
                title={isCollapsed ? label : undefined}
                className="dash-nav-link"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: isCollapsed ? 'center' : 'flex-start',
                  gap: isCollapsed ? 0 : 12,
                  padding: isCollapsed ? '10px 0' : '10px 14px',
                  borderRadius: 'var(--button-radius)',
                  fontSize: 14,
                  fontWeight: active ? 600 : 400,
                  color: active
                    ? (isLight ? '#007a6c' : '#00d2b8')
                    : (isLight ? '#475569' : 'rgba(255,255,255,0.65)'),
                  background: active
                    ? (isLight ? 'rgba(0, 168, 148, 0.12)' : 'rgba(0, 210, 184, 0.15)')
                    : 'transparent',
                  textDecoration: 'none',
                  marginBottom: 4,
                  transition: 'all .15s ease',
                  position: 'relative',
                }}
              >
                {active && (
                  <span
                    style={{
                      position: 'absolute',
                      left: 0,
                      top: '50%',
                      transform: 'translateY(-50%)',
                      width: 3,
                      height: 18,
                      borderRadius: '0 3px 3px 0',
                      background: isLight ? '#007a6c' : 'var(--btn-primary)',
                    }}
                  />
                )}
                <Icon active={active} isLight={isLight} />
                {!isCollapsed && <span>{label}</span>}
              </Link>
            )
          })}
        </nav>

        {/* User Card & Bot Links */}
        <div
          style={{
            padding: isCollapsed ? '12px 8px 16px' : '16px 14px 20px',
            borderTop: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.08)',
            position: 'relative',
            zIndex: 1,
          }}
        >
          {!isCollapsed ? (
            <>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: '10px 12px',
                  background: isLight ? '#f8fafc' : 'rgba(255,255,255,0.06)',
                  border: isLight ? '1px solid #e2e8f0' : '1px solid rgba(255,255,255,0.1)',
                  borderRadius: 'var(--button-radius)',
                  marginBottom: 10,
                }}
              >
                <span style={{ position: 'relative', flexShrink: 0, width: 34, height: 34 }}>
                  {avatarUrl ? (
                    <span style={{ display: 'block', width: 34, height: 34, borderRadius: '50%', background: `url(${avatarUrl}) center/cover` }} />
                  ) : (
                    <span
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        background: isLight ? '#00a894' : 'var(--btn-primary)',
                        fontFamily: 'var(--font-sans)',
                        fontSize: 14,
                        fontWeight: 600,
                        color: isLight ? '#ffffff' : '#070b16',
                      }}
                    >
                      {(displayName?.[0] ?? address[2]).toUpperCase()}
                    </span>
                  )}
                </span>
                <span style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: 1, minWidth: 0 }}>
                  {displayName && (
                    <span style={{ fontSize: 13.5, fontWeight: 600, color: isLight ? '#0f172a' : '#FBFCFD', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {displayName}
                    </span>
                  )}
                  <span style={{ fontFamily: 'JetBrains Mono, monospace', fontSize: 11.5, color: isLight ? '#64748b' : 'rgba(255,255,255,0.6)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {address.slice(0, 6)}…{address.slice(-4)}
                  </span>
                </span>
                <button
                  onClick={handleCopyAddress}
                  aria-label="Copy wallet address"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    width: 26,
                    height: 26,
                    borderRadius: 6,
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: isLight ? '#64748b' : 'rgba(255,255,255,0.7)',
                  }}
                >
                  {copied ? <CheckIcon /> : <CopyIcon />}
                </button>
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <BotLink href={WHATSAPP_BOT_URL} label="Chat with the WhatsApp bot" isLight={isLight} size={32}><WhatsAppIcon /></BotLink>
                <BotLink href={TELEGRAM_BOT_URL} label="Chat with the Telegram bot" isLight={isLight} size={32}><TelegramIcon /></BotLink>
                <span style={{ flex: 1 }} />
                <button
                  onClick={onSignOut}
                  style={{
                    fontSize: 13,
                    fontWeight: 500,
                    color: isLight ? '#475569' : 'rgba(255,255,255,0.7)',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    padding: '2px 4px',
                    transition: 'color .15s',
                  }}
                >
                  Sign out →
                </button>
              </div>
            </>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 10 }}>
              <button
                onClick={handleCopyAddress}
                title={`Copy address: ${address}`}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: '50%',
                  background: isLight ? '#00a894' : 'var(--btn-primary)',
                  color: isLight ? '#ffffff' : '#070b16',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 600,
                  fontSize: 14,
                }}
              >
                {(displayName?.[0] ?? address[2]).toUpperCase()}
              </button>
              <button
                onClick={onSignOut}
                title="Sign Out"
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: isLight ? '#64748b' : 'rgba(255,255,255,0.7)',
                  fontSize: 12,
                }}
              >
                ↳
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Right Content Area (Floating Cards on Page Background) */}
      <div
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          minWidth: 0,
          height: 'calc(100vh - 20px)',
          overflow: 'hidden',
        }}
      >
        {/* Top Header Section: Split into 2 Floating Rounded Divs */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 12,
            marginBottom: 12,
          }}
        >
          {/* Div 1: Left Floating Rounded Div (~85% Width) */}
          <div
            style={{
              flex: '1 1 85%',
              height: 52,
              borderRadius: 'var(--card-radius)',
              background: isLight ? '#ffffff' : 'var(--metallic-card-bg-dark)',
              backdropFilter: 'blur(var(--card-backdrop-blur))',
              WebkitBackdropFilter: 'blur(var(--card-backdrop-blur))',
              border: isLight ? '1px solid #e2e8f0' : 'none',
              padding: '0 20px',
              display: 'flex',
              alignItems: 'center',
              boxShadow: isLight ? '0 4px 12px rgba(15,23,42,0.05)' : 'var(--metallic-shadow-dark)',
            }}
          >
            <span style={{ fontSize: 14, fontWeight: 600, color: isLight ? '#0f172a' : '#ffffff' }}>
              MistPay Dashboard
            </span>
          </div>

          {/* Div 2: Right Floating Rounded Div (Theme Toggle) */}
          <button
            onClick={toggleTheme}
            style={{
              height: 52,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              padding: '0 18px',
              borderRadius: 'var(--card-radius)',
              fontSize: 12,
              fontWeight: 600,
              background: isLight ? '#ffffff' : 'var(--metallic-card-bg-dark)',
              backdropFilter: 'blur(var(--card-backdrop-blur))',
              WebkitBackdropFilter: 'blur(var(--card-backdrop-blur))',
              border: isLight ? '1px solid #e2e8f0' : 'none',
              color: isLight ? '#0f172a' : '#ffffff',
              cursor: 'pointer',
              boxShadow: isLight ? '0 4px 12px rgba(15,23,42,0.05)' : 'var(--metallic-shadow-dark)',
              transition: 'all 0.15s ease',
            }}
          >
            {isLight ? <MoonIcon /> : <SunIcon />}
            <span>{isLight ? 'Dark Mode' : 'Light Mode'}</span>
          </button>
        </div>

        {/* Main Content Viewport */}
        <main style={{ flex: 1, minHeight: 0, overflowY: 'auto', padding: '16px 8px' }}>
          <div style={{ maxWidth: 1320, margin: '0 auto' }}>
            {activeSubTabs && (
              <div
                className="mb-6 flex items-center gap-1.5 p-1.5 w-fit"
                style={{
                  borderRadius: 'var(--card-radius)',
                  background: isLight ? '#ffffff' : 'var(--metallic-card-bg-dark)',
                  backdropFilter: 'blur(var(--card-backdrop-blur))',
                  WebkitBackdropFilter: 'blur(var(--card-backdrop-blur))',
                  boxShadow: isLight ? '0 4px 12px rgba(15,23,42,0.05)' : 'var(--metallic-shadow-dark)',
                  border: isLight ? '1px solid #e2e8f0' : 'none',
                }}
              >
                {activeSubTabs.map((tab) => {
                  const isTabActive = tab.exact ? pathname === tab.href : pathname.startsWith(tab.href)
                  return (
                    <Link
                      key={tab.href}
                      href={tab.href}
                      style={{ borderRadius: 'var(--button-radius)' }}
                      className={`px-4 py-1.5 font-sans text-xs font-semibold transition-all text-decoration-none ${
                        isTabActive
                          ? 'bg-[#00d2b8] text-slate-950 font-bold shadow-[0_0_12px_rgba(0,210,184,0.3)]'
                          : isLight
                            ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                            : 'text-slate-300 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {tab.label}
                    </Link>
                  )
                })}
              </div>
            )}
            {children}
          </div>
        </main>
      </div>

      <style>{`
        @media (min-width: 768px) {
          .mobile-header { display: none !important; }
          .mobile-bottom-nav { display: none !important; }
        }
        @media (max-width: 767px) {
          .sidebar-desktop { display: none !important; }
          .mist-dashboard main { padding: 20px 16px 84px !important; }
        }
        .mist-dashboard input:focus,
        .mist-dashboard textarea:focus {
          outline: none !important;
          border-color: #465bf5 !important;
          box-shadow: 0 0 0 3px rgba(70,91,245,.2) !important;
        }
        .mist-dashboard button:hover { opacity: 0.92; }
        .mist-dashboard[data-theme="light"] .dash-nav-link:hover { background: #f1f5f9 !important; color: #0f172a !important; }
        .mist-dashboard[data-theme="dark"] .dash-nav-link:hover { background: rgba(255,255,255,0.1) !important; color: #ffffff !important; }
        .mist-dashboard[data-theme="light"] .dash-bot-link:hover { background: #e2e8f0 !important; color: #0f172a !important; }
        .mist-dashboard[data-theme="dark"] .dash-bot-link:hover { background: rgba(255,255,255,0.14) !important; color: #ffffff !important; }
      `}</style>
    </div>
  )
}

function HomeIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
}
function PaymentIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><rect x="2" y="5" width="20" height="14" rx="2"/><line x1="2" y1="10" x2="22" y2="10"/></svg>
}
function SubscriptionIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M21.5 2v6h-6"/><path d="M21.34 15.57a10 10 0 11-.57-8.38l5.67-5.67"/></svg>
}
function HistoryIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 106 5.3L3 8"/><polyline points="12 7 12 12 16 14"/></svg>
}
function ContactIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
}
function DeveloperIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
}
function SettingsIcon({ active, isLight }: { active: boolean; isLight?: boolean }) {
  const c = active ? (isLight ? '#007a6c' : '#00d2b8') : (isLight ? '#64748b' : 'rgba(255,255,255,0.7)')
  return <svg width="16" height="16" fill="none" stroke={c} strokeWidth="1.75" viewBox="0 0 24 24" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>
}

