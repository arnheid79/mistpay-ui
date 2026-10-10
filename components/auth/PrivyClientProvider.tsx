'use client'

import { PrivyProvider } from '@privy-io/react-auth'

const PRIVY_APP_ID = process.env.NEXT_PUBLIC_PRIVY_APP_ID

export function PrivyClientProvider({ children }: { children: React.ReactNode }) {
  const appId = PRIVY_APP_ID || 'cm00000000000000000000000'

  return (
    <PrivyProvider
      appId={appId}
      config={{ loginMethods: ['sms'], embeddedWallets: { ethereum: { createOnLogin: 'users-without-wallets' } } }}
    >
      {children}
    </PrivyProvider>
  )
}
