import { Suspense } from 'react'
import type { Metadata } from 'next'
import { PaymentPageClient } from './PaymentPageClient'

interface Props {
  params: Promise<{ requestId: string }>
  searchParams: Promise<{ p?: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { requestId } = await params
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'
  const title = 'Pay via MistPay'
  const description = 'Pay with your credit card or any crypto — no wallet setup needed.'

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: [`${backendUrl}/api/pay/${requestId}/qr`],
    },
  }
}

export default async function PayPage({ params, searchParams }: Props) {
  const { requestId } = await params
  const { p: participantToken } = await searchParams
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

  let request = null
  try {
    const url = participantToken
      ? `${backendUrl}/api/pay/${requestId}?p=${participantToken}`
      : `${backendUrl}/api/pay/${requestId}`
    const res = await fetch(url, { cache: 'no-store' })
    if (res.ok) request = await res.json()
  } catch {
    // Fall through to client-side fetch
  }

  return (
    <Suspense fallback={<PaymentSkeleton />}>
      <PaymentPageClient requestId={requestId} initialData={request} participantToken={participantToken} />
    </Suspense>
  )
}

function PaymentSkeleton() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--dark-bg)] p-4" role="status" aria-live="polite">
      <span className="sr-only">Loading payment details…</span>
      <div className="w-full max-w-sm">
        <div className="mb-8 h-8 w-24 animate-pulse rounded-md bg-[var(--dark-elevated)]" />
        <div className="space-y-4 rounded-2xl border border-[var(--dark-border)] bg-[var(--dark-surface)] p-6">
          <div className="h-4 w-32 animate-pulse rounded bg-[var(--dark-elevated)]" />
          <div className="h-12 w-48 animate-pulse rounded-lg bg-[var(--dark-elevated)]" />
          <div className="h-px bg-[var(--dark-border)]" />
          <div className="h-10 animate-pulse rounded-md bg-[var(--dark-elevated)]" />
          <div className="h-10 animate-pulse rounded-md bg-[var(--dark-elevated)]" />
        </div>
      </div>
    </div>
  )
}
