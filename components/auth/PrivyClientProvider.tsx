'use client'

import { PrivyProvider } from '@privy-io/react-auth'
import { monad, monadTestnet } from 'viem/chains'
import { MONAD_NETWORK } from '@/lib/chain'

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID

export function PrivyClientProvider({ children }: { children: React.ReactNode }) {
  // No configured app ID (e.g. local dev without real credentials) — render
  // children directly rather than crashing the whole dashboard. PrivySignIn
  // itself will fail when actually used, which is the correct place to fail.
  if (!PRIVY_APP_ID) return <>{children}</>

  return (
    <PrivyProvider
      appId={PRIVY_APP_ID}
      config={{
        loginMethods: ['sms'],
        embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } },
        defaultChain: MONAD_NETWORK === 'mainnet' ? monad : monadTestnet,
        supportedChains: [monad, monadTestnet],
      }}
    >
      {children}
    </PrivyProvider>
  )
}
