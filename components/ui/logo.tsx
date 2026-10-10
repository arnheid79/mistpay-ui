import type { CSSProperties } from 'react'

/** MistPay brand mark — same italic-M tile used on the landing page */
export function MistMark({ size = 32, ghost = false, theme }: { size?: number; ghost?: boolean; theme?: 'dark' | 'light' }) {
  const isLight = theme === 'light'
  return (
    <div
      className={ghost ? 'mark ghost' : 'mark'}
      style={{
        '--sz': `${size}px`,
        ...(isLight ? { background: '#0f172a', color: '#ffffff', border: 'none' } : {})
      } as CSSProperties}
    >
      <span className="g">M</span>
    </div>
  )
}

export function MistWordmark({
  className = '',
  theme = 'dark',
  href,
  size = 32,
}: {
  className?: string
  theme?: 'dark' | 'light'
  href?: string
  size?: number
}) {
  const textColor = theme === 'light' ? '#0f172a' : '#FBFCFD'
  const content = (
    <>
      <MistMark size={size} ghost={theme === 'dark'} theme={theme} />
      <span
        className="word"
        style={{
          font: '600 19px/1 var(--f-sans)',
          letterSpacing: '-.04em',
          color: textColor,
        }}
      >
        MistPay
      </span>
    </>
  )

  if (href) {
    return (
      <a href={href} className={`nav-brand ${className}`} style={{ textDecoration: 'none' }}>
        {content}
      </a>
    )
  }

  return (
    <div className={`nav-brand ${className}`}>
      {content}
    </div>
  )
}
