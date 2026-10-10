export interface InvoiceItem {
  description: string
  quantity: number
  unitPrice: number
  invoiceNumber: string | null
  dueDate: number | null
  notes: string | null
}

export interface SplitParticipant {
  name: string
  shareAmount: number
  status: 'pending' | 'fulfilled'
  token: string
}

// What a payer may learn about who is asking (all coarse: see backend trust.service.ts)
export interface ReceiverTrust {
  verifiedPhone: string | null
  memberSince: number | null
  fulfilledCount: number
  location: string | null
  category: string | null
}

export interface PaymentRequest {
  requestId: string
  status: 'pending' | 'fulfilled' | 'expired' | 'cancelled'
  amount: number
  label: string | null
  receiverAddress: string
  expiresAt: number
  splitTotal: number
  splitPaid: number
  txHash: string | null
  // Token metadata — defaults to USDC if absent
  tokenSymbol: string
  tokenAddress: string | null
  tokenDecimals: number
  // Present when fetched with ?p=<token>
  participant?: SplitParticipant
  // Present when request has invoice_items
  invoiceItems?: InvoiceItem[]
  // The receiver's own business branding, if they've set any
  merchantName: string | null
  merchantLogo: string | null
  trust?: ReceiverTrust
  // Present when this request is one cycle of a subscription
  subscription?: { id: string; name: string; interval: 'weekly' | 'monthly' | 'yearly'; cycle: number; status: string; manageUrl: string } | null
  // Tax the total already includes (basis points); subtotal and tax are present on invoices
  taxBps?: number
  subtotal?: number
  tax?: number
  // Settlement network + which payment doors this deployment offers
  chainId: number
  chainName: string
  explorerUrl: string | null
  paidMicros: string
  network: 'moderato' | 'mainnet'
  cardEnabled: boolean
  crossChainEnabled: boolean
  // True on testnet or with sandbox settlement: anything that is not real money on mainnet is labelled in the UI
  sandbox: boolean
  demoSettlement: boolean
}

export async function fetchPaymentRequest(requestId: string, participantToken?: string): Promise<PaymentRequest> {
  const url = participantToken ? `/api/pay/${requestId}?p=${participantToken}` : `/api/pay/${requestId}`
  const res = await fetch(url, { cache: 'no-store' })
  if (!res.ok) throw new Error('Payment request not found')
  const data = await res.json()
  // Ensure token fields always present
  return {
    tokenSymbol: 'USDC',
    tokenAddress: null,
    tokenDecimals: 6,
    ...data,
  }
}

// Tells the backend about a transaction we just sent. This is only a pointer: the backend reads the receipt from chain
// and counts the payment only if its memo and recipient match this request.
export async function recordFulfillment(requestId: string, txHash: string, participantToken?: string): Promise<{ status: string | null }> {
  const res = await fetch(`/api/pay/${requestId}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ txHash, participantToken }),
  })
  const data = await res.json().catch(() => ({}))
  return { status: data?.status ?? null }
}

export type PaymentMethod = 'apple_pay' | 'credit_debit_card' | 'google_pay'

export interface Quote {
  door: 'tempo' | 'card' | 'chain'
  paymentMethod?: PaymentMethod | string
  /** What the receiver gets: always exactly the requested amount. */
  receiverGets: number
  requestedMicros: string
  dest: string
  token: { address: string; symbol: string; decimals: number }
  // tempo
  memo?: string
  // tempo + card
  payTotal?: number
  fee?: number
  // card
  widgetUrl?: string
  sandbox?: boolean
  // chain
  depositAddress?: string
  payAmount?: number
  refundTo?: string
}

export async function fetchQuote(
  requestId: string,
  body: {
    door: Quote['door']
    participantToken?: string
    paymentMethod?: PaymentMethod | string
    originChainId?: number
    originCurrency?: string
    refundTo?: string
  },
): Promise<Quote> {
  const res = await fetch(`/api/pay/${requestId}/quote`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Could not get a quote. Please try again.')
  return data as Quote
}

export function formatTimeRemaining(expiresAt: number): string {
  const remaining = expiresAt - Math.floor(Date.now() / 1000)
  if (remaining <= 0) return 'Expired'
  const days = Math.floor(remaining / 86400)
  const hours = Math.floor((remaining % 86400) / 3600)
  const minutes = Math.floor((remaining % 3600) / 60)
  if (days > 0) return `${days}d ${hours}h remaining`
  if (hours > 0) return `${hours}h ${minutes}m remaining`
  return `${minutes}m remaining`
}

export function shortenAddress(addr: string): string {
  if (!addr || addr.length < 10) return addr
  return `${addr.slice(0, 6)}…${addr.slice(-4)}`
}

// Human-readable amount string: "$50.00 USDC" or "0.1 ETH"
export function formatTokenAmount(amount: number, symbol: string): string {
  const isStable = symbol === 'USDC' || symbol === 'USDT'
  if (isStable) return `$${amount.toFixed(2)} ${symbol}`
  if (symbol === 'ETH' || symbol === 'WBTC') return `${amount} ${symbol}`
  return `${amount} ${symbol}`
}
