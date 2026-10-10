import { getAccount } from '@wagmi/core'
import { BACKEND } from './useAuth'
import { connectTempoWallet, getWagmiConfig } from './tempo'

// Autopay from the subscriber's side. The Tempo Wallet signs a scoped, capped, revocable key for MistPay (one token, one
// function, the merchant as the only recipient) and hands the signed authorization back; the backend checks it against the
// terms it asked for, has the chain accept it, and only then turns autopay on. Nothing here moves any money.

export interface AutopayState {
  available: boolean
  status: 'off' | 'pending' | 'active'
  payerAddress: string | null
  delegateAddress: string | null
  lastError: string | null
}

type Provider = { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }

async function walletProvider(): Promise<{ provider: Provider; address: string }> {
  const cfg = getWagmiConfig()
  const address = await connectTempoWallet()
  const connector = getAccount(cfg).connector ?? cfg.connectors[0]
  return { provider: (await connector.getProvider()) as Provider, address }
}

async function step(id: string, name: 'prepare' | 'confirm' | 'off', body: unknown = {}) {
  const res = await fetch(`${BACKEND}/api/subscription/${id}/autopay/${name}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new Error(data?.error ?? 'Could not update autopay. Please try again.')
  return data
}

export async function enableAutopay(id: string): Promise<void> {
  const { provider, address } = await walletProvider()
  const t = await step(id, 'prepare', { payerAddress: address })
  const approved = await provider.request({
    method: 'wallet_authorizeAccessKey',
    params: [{
      address: t.delegateAddress,
      keyType: 'secp256k1',
      expiry: t.expiresAt,
      limits: [{ token: t.token, limit: `0x${BigInt(t.limitMicros).toString(16)}`, period: t.periodSec }],
      scopes: [{ address: t.token, selector: t.selector, recipients: [t.recipient] }],
    }],
  })
  const { rootAddress, keyAuthorization } = approved as { rootAddress?: string; keyAuthorization?: unknown }
  if (String(rootAddress).toLowerCase() !== address.toLowerCase()) throw new Error('Please approve autopay with the same wallet you connected.')
  await step(id, 'confirm', { keyAuthorization })
}

/**
 * Stops MistPay first (it destroys its copy of the key), then asks the wallet to remove the key too. The second part is
 * best effort: with our copy gone the key is already useless, removing it just tidies the wallet.
 */
export async function disableAutopay(id: string, state: AutopayState): Promise<{ removedFromWallet: boolean }> {
  await step(id, 'off')
  if (!state.delegateAddress || !state.payerAddress) return { removedFromWallet: false }
  try {
    const { provider } = await walletProvider()
    await provider.request({ method: 'wallet_revokeAccessKey', params: [{ address: state.payerAddress, accessKeyAddress: state.delegateAddress }] })
    return { removedFromWallet: true }
  } catch (err) {
    console.error('could not remove the autopay key from the wallet:', err)
    return { removedFromWallet: false }
  }
}
