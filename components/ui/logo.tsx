import type { CSSProperties } from 'react'

/** MistPay brand mark — same italic-M tile used on the landing page */
export function MistMark({ size = 32, ghost = false }: { size?: number; ghost?: boolean }) {
  return (
    <div
      className={ghost ? 'mark ghost' : 'mark'}
      style={{ '--sz': `${size}px` } as CSSProperties}
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
  const textColor = theme === 'dark' ? 'var(--paper)' : 'var(--ink)'
  const content = (
    <>
      <MistMark size={size} ghost={theme === 'dark'} />
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
