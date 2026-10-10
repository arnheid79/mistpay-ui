'use client'

interface Props {
  title: string
  subtitle: string
  icon?: string
}

export function ComingSoon({ title, subtitle, icon = '⚡' }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-[16px] border border-[rgba(255,255,255,0.07)] bg-[rgba(255,255,255,0.02)] px-8 py-16 text-center">
      <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-full border border-[rgba(99,91,255,0.3)] bg-[rgba(99,91,255,0.1)] text-2xl">
        {icon}
      </div>
      <span className="mb-2 inline-flex items-center gap-1.5 rounded-pill border border-[rgba(99,91,255,0.25)] bg-[rgba(99,91,255,0.12)] px-3 py-1 font-mono text-xs font-semibold text-[#8FA4FF]">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[var(--signal)]" />
        Coming Soon
      </span>
      <h2 className="mb-2 font-sans text-2xl font-semibold tracking-tight text-paper">{title}</h2>
      <p className="max-w-md text-sm text-[rgba(155,167,181,0.55)]">{subtitle}</p>
    </div>
  )
}
