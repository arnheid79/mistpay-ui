'use client'

import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { ButtonHTMLAttributes, ReactNode } from 'react'

type Variant = 'primary' | 'signal' | 'secondary' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  loading?: boolean
  icon?: ReactNode
  children: ReactNode
}

const variantClasses: Record<Variant, string> = {
  primary: 'bg-ink-900 text-paper hover:bg-ink-800 active:bg-ink-700 border border-transparent',
  signal: 'bg-signal-500 text-white hover:bg-signal-600 active:bg-signal-700 border border-transparent',
  secondary: 'bg-paper border border-mist-200 text-ink-900 hover:bg-mist-50 active:bg-mist-100',
  ghost: 'bg-transparent border border-transparent text-ink-700 hover:bg-mist-50 active:bg-mist-100',
  danger: 'bg-danger-50 border border-danger-500/20 text-danger-500 hover:bg-danger-500 hover:text-white',
}

const sizeClasses: Record<Size, string> = {
  sm: 'h-8 px-3 text-xs gap-1.5 rounded-sm',
  md: 'h-10 px-4 text-sm gap-2 rounded-md',
  lg: 'h-12 px-6 text-base gap-2.5 rounded-lg',
}

export function Button({
  variant = 'primary',
  size = 'md',
  loading = false,
  icon,
  className,
  disabled,
  children,
  ...props
}: ButtonProps) {
  return (
    <button
      className={twMerge(
        clsx(
          'inline-flex items-center justify-center font-medium font-sans',
          'transition-all duration-fast ease-mist-out',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal-500/60 focus-visible:ring-offset-1',
          'disabled:opacity-50 disabled:pointer-events-none',
          'select-none cursor-pointer',
          variantClasses[variant],
          sizeClasses[size],
          className
        )
      )}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
        </svg>
      ) : icon}
      {children}
    </button>
  )
}
