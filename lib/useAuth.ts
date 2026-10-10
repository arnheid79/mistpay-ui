'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'

export interface StoredAuth {
  authToken: string
  address: string
  phone: string
}

export function useAuth() {
  const router = useRouter()
  const [auth, setAuth] = useState<StoredAuth | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const raw = localStorage.getItem('mistpay_auth')
    if (!raw) {
      router.replace('/#cta')
      return
    }
    setAuth(JSON.parse(raw))
    setLoading(false)
  }, [router])

  function signOut() {
    localStorage.removeItem('mistpay_auth')
    router.replace('/')
  }

  return { auth, loading, signOut }
}

export const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'

export function authHeaders(authToken: string): Record<string, string> {
  return { Authorization: `Bearer ${authToken}`, 'Content-Type': 'application/json' }
}
