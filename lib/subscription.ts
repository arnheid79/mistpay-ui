export type Interval = 'weekly' | 'monthly' | 'yearly'

export interface SubscriptionView {
  id: string
  name: string
  amount: string
  currency: string
  interval: Interval
  status: 'active' | 'past_due' | 'cancelled'
  cancelReason: string | null
  cycle: number
  nextDueAt: number | null
  subscriberName: string
  subscriberPhone: string | null
  cyclesPaid: number
  lastPaidAt: number | null
  currentRequestLink: string | null
}

export interface Plan {
  id: string
  code: string
  name: string
  amount_usdc: string
  interval: Interval
  token_symbol: string
  active: boolean
  link: string
}

export const INTERVAL_NOUN: Record<Interval, string> = { weekly: 'week', monthly: 'month', yearly: 'year' }

/** "$20.00 / month" */
export const priceLabel = (amount: number | string, interval: Interval) => `$${Number(amount).toFixed(2)} / ${INTERVAL_NOUN[interval]}`

export const fmtDate = (unix: number | null) =>
  unix ? new Date(unix * 1000).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—'
