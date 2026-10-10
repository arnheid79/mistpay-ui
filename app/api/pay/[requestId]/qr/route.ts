import { NextRequest, NextResponse } from 'next/server'

const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ requestId: string }> },
) {
  const { requestId } = await params
  try {
    const res = await fetch(`${BACKEND_URL}/api/pay/${requestId}/qr`, {
      next: { revalidate: 86400 },
    })
    if (!res.ok) {
      return new NextResponse(null, { status: res.status })
    }
    const png = await res.arrayBuffer()
    return new NextResponse(png, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=86400, immutable',
      },
    })
  } catch {
    return new NextResponse(null, { status: 503 })
  }
}
