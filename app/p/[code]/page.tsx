import { notFound, redirect } from 'next/navigation'

interface Props {
  params: Promise<{ code: string }>
  searchParams: Promise<{ p?: string }>
}

// Short WhatsApp-friendly link (mistpay.xyz/p/<code>) — resolves server-side
// and redirects to the real /pay/<requestId> page before any client code
// runs, so the payment flow itself (including on-chain calls, which need the
// full bytes32 id) is completely untouched.
export default async function ShortLinkRedirect({ params, searchParams }: Props) {
  const { code } = await params
  const { p: participantToken } = await searchParams
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

  const res = await fetch(`${backendUrl}/api/pay/resolve/${code}`, { cache: 'no-store' })
  if (!res.ok) notFound()

  const { requestId } = await res.json()
  redirect(participantToken ? `/pay/${requestId}?p=${participantToken}` : `/pay/${requestId}`)
}
