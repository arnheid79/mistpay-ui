import { clsx } from 'clsx'
import type { ReactNode } from 'react'

type BadgeVariant = 'default' | 'success' | 'warn' | 'danger' | 'signal'

interface BadgeProps {
  variant?: BadgeVariant
  children: ReactNode
  className?: string
}

const variantClasses: Record<BadgeVariant, string> = {
  default: 'bg-mist-100 text-mist-500',
  success: 'bg-success-50 text-success-500',
  warn: 'bg-warn-50 text-warn-500',
  danger: 'bg-danger-50 text-danger-500',
  signal: 'bg-signal-50 text-signal-600',
}

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1 px-2 py-0.5',
        'text-xs font-medium font-sans rounded-pill',
        variantClasses[variant],
        className
      )}
    >
      {children}
    </span>
  )
}
