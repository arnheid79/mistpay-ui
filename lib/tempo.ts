import { connect, createConfig, getAccount, getConnectorClient, http, type Config } from '@wagmi/core'
import { tempoWallet } from '@wagmi/core/tempo'
import { tempo, tempoModerato } from 'viem/chains'
import { Actions } from 'viem/tempo'
import { createPublicClient, erc20Abi, formatUnits, type Address, type Chain, type Hex } from 'viem'
import { TEMPO_NETWORK } from './chain'

// Fee sponsorship: the public sponsor only exists for the testnet. On mainnet a sponsor must be provided
// explicitly (NEXT_PUBLIC_SPONSOR_URL); without one the payer simply pays the sub-cent fee in the token.
export const SPONSOR_URL: string | undefined =
  process.env.NEXT_PUBLIC_SPONSOR_URL || (TEMPO_NETWORK === 'moderato' ? 'https://sponsor.moderato.tempo.xyz' : undefined)

let config: Config | null = null

/** Created lazily: nothing here may run during server rendering. */
export function getWagmiConfig(): Config {
  if (!config) {
    const chain = (TEMPO_NETWORK === 'mainnet' ? tempo : tempoModerato) as unknown as Chain
    config = createConfig({
      chains: [chain],
      connectors: [tempoWallet({ feePayer: SPONSOR_URL })],
      transports: { [chain.id]: http(process.env.NEXT_PUBLIC_TEMPO_RPC_URL || undefined) },
    } as never)
  }
  return config
}

export interface TempoQuote {
  dest: string
  requestedMicros: string
  memo: string
  token: { address: string }
}

/**
 * Pay a request from a Tempo Wallet (passkey, no seed phrase): exactly the requested amount, carrying the request's
 * memo, fee sponsored when a sponsor is configured. Returns the transaction hash for the backend to verify on-chain.
 */
export async function payWithTempoWallet(q: TempoQuote): Promise<string> {
  const cfg = getWagmiConfig()
  await connectTempoWallet()
  const client = await getConnectorClient(cfg)
  const result = await Actions.token.transferSync(client as never, {
    to: q.dest as Address,
    amount: BigInt(q.requestedMicros),
    token: q.token.address as Address,
    memo: q.memo as Hex,
    feePayer: !!SPONSOR_URL,
  } as never)
  return (result as { receipt: { transactionHash: string } }).receipt.transactionHash
}

/** Connects the passkey wallet if needed and returns its address. */
export async function connectTempoWallet(): Promise<Address> {
  const cfg = getWagmiConfig()
  if (getAccount(cfg).status !== 'connected') await connect(cfg, { connector: cfg.connectors[0] })
  const address = getAccount(cfg).address
  if (!address) throw new Error('The wallet did not return an account')
  return address
}

/** Token balance in micro-units, read straight from the chain. */
export async function tempoTokenBalance(owner: string, token: string): Promise<bigint> {
  const chain = (TEMPO_NETWORK === 'mainnet' ? tempo : tempoModerato) as unknown as Chain
  const client = createPublicClient({ chain, transport: http(process.env.NEXT_PUBLIC_TEMPO_RPC_URL || undefined) })
  return client.readContract({ address: token as Address, abi: erc20Abi, functionName: 'balanceOf', args: [owner as Address] })
}

/**
 * Opens the wallet's own funding flow, pre-filled with the amount needed. On testnet that is the faucet; on mainnet
 * the wallet offers its card / Apple Pay / bridge options.
 */
export async function addFundsToTempoWallet(amountMicros: string, token: { address: string; decimals: number }): Promise<void> {
  const cfg = getWagmiConfig()
  await connectTempoWallet()
  const connector = getAccount(cfg).connector ?? cfg.connectors[0]
  const provider = (await connector.getProvider()) as { request: (a: { method: string; params?: unknown[] }) => Promise<unknown> }
  await provider.request({
    method: 'wallet_deposit',
    params: [{ amount: formatUnits(BigInt(amountMicros), token.decimals), token: token.address, ...(TEMPO_NETWORK === 'moderato' ? { intent: 'faucet' } : {}) }],
  })
}

/** One plain sentence for the payer. The full error goes to the console for us, never to the screen. */
export function friendlyError(err: unknown): string {
  console.error('tempo wallet error:', err)
  const e = err as { message?: string; details?: string; cause?: { message?: string } }
  const raw = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.cause?.message ?? ''}`
  if (/not allowed|timed out|NotAllowedError|rejected|denied|cancel|closed/i.test(raw)) return 'The passkey confirmation was cancelled or timed out. Please try again.'
  if (/InsufficientBalance|insufficient/i.test(raw)) return "Your wallet doesn't have enough funds for this payment."
  if (/popup|blocked/i.test(raw)) return 'Your browser blocked the wallet window. Allow pop-ups for this site and try again.'
  return 'The payment could not be completed. Please try again.'
}
