import { createPublicClient, createWalletClient, custom, erc20Abi, http, parseAbi, parseSignature, type Address, type Chain, type Hex } from 'viem'
import { monad, monadTestnet } from 'viem/chains'
import { MONAD_CHAIN_ID, MONAD_NETWORK } from './chain'

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL ?? 'http://localhost:3333'
const chain: Chain = MONAD_NETWORK === 'mainnet' ? monad : monadTestnet
const rpc = process.env.NEXT_PUBLIC_MONAD_RPC_URL || undefined

/** The part of an EIP-1193 provider we use: browser wallets and Privy's embedded wallet both satisfy it. */
export interface EIP1193Provider {
  request(args: { method: string; params?: unknown }): Promise<unknown>
}

const routerPayAbi = parseAbi([
  'function pay(bytes32 requestId, uint8 index, address from, uint256 validAfter, uint256 validBefore, uint8 v, bytes32 r, bytes32 s) returns (uint256)',
])

/** An error whose message is already a plain sentence fit for the payer. */
export class PlainError extends Error {}

export interface MonadQuote {
  requestId: string
  index: number
  /** MistPayRouter: the recipient the payer signs for. */
  router: string
  requestedMicros: string
  /** The slot key: the authorization's nonce, which binds the signature to this share of this request. */
  memo: string
  token: { address: string }
}

/**
 * A payment is an EIP-3009 authorization: the payer signs "pay `to` this much", with the request's slot key as the nonce.
 * For a payment `to` is the MistPayRouter (it forwards the money to the receiver and enforces the rules on-chain), signed
 * as ReceiveWithAuthorization; for a refund `to` is the payer, signed as TransferWithAuthorization. MistPay's relayer
 * submits it and pays the MON gas, so the signer only needs USDC. Circle's USDC domain is name "USDC", version "2"
 * (matches backend/src/utils/sponsor.ts).
 */
export interface Authorization {
  from: Address
  to: Address
  value: bigint
  validAfter: bigint
  validBefore: bigint
  nonce: Hex
}

export function newAuthorization(from: string, to: string, valueMicros: bigint, nonce: string): Authorization {
  return {
    from: from as Address, to: to as Address, value: valueMicros,
    validAfter: BigInt(0), validBefore: BigInt(Math.floor(Date.now() / 1000) + 600), nonce: nonce as Hex,
  }
}

export function getInjectedProvider(): EIP1193Provider | null {
  return typeof window === 'undefined' ? null : ((window as unknown as { ethereum?: EIP1193Provider }).ethereum ?? null)
}

function walletClient(provider: EIP1193Provider, account: Address) {
  return createWalletClient({ account, chain, transport: custom(provider as never) })
}

/** Connects the browser wallet (MetaMask, Rabby, Phantom, …) and moves it to Monad. Returns its address. */
export async function connectWallet(provider: EIP1193Provider): Promise<Address> {
  const [account] = (await provider.request({ method: 'eth_requestAccounts' })) as Address[]
  if (!account) throw new Error('The wallet did not return an account')
  const client = walletClient(provider, account)
  try {
    await client.switchChain({ id: MONAD_CHAIN_ID })
  } catch {
    await client.addChain({ chain }) // the wallet does not know Monad yet
    await client.switchChain({ id: MONAD_CHAIN_ID })
  }
  return account
}

const authFields = [
  { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
  { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
] as const

/** The wallet signs the authorization (no gas, nothing is sent). Returns the signature. */
export async function signAuthorization(provider: EIP1193Provider, token: string, auth: Authorization, kind: 'receive' | 'transfer'): Promise<Hex> {
  const domain = { name: 'USDC', version: '2', chainId: MONAD_CHAIN_ID, verifyingContract: token as Address }
  const client = walletClient(provider, auth.from)
  return kind === 'receive'
    ? client.signTypedData({ domain, types: { ReceiveWithAuthorization: authFields }, primaryType: 'ReceiveWithAuthorization', message: auth })
    : client.signTypedData({ domain, types: { TransferWithAuthorization: authFields }, primaryType: 'TransferWithAuthorization', message: auth })
}

async function postRelayer(path: string, body: unknown): Promise<string | null> {
  const res = await fetch(`${BACKEND}${path}`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
  if (res.status === 404) return null // this deployment has no relayer
  const data = await res.json().catch(() => ({}))
  if (!res.ok) throw new PlainError(data?.error ?? 'The payment could not be submitted. Please try again.')
  return data.txHash as string
}

/** Hands a receiver's signed refund to MistPay's relayer, which pays the gas. Returns the tx hash, or null when there is no relayer. */
export function relayRefund(auth: Authorization, signature: Hex): Promise<string | null> {
  return postRelayer('/api/sponsor/refund', {
    from: auth.from, to: auth.to, value: auth.value.toString(), validAfter: auth.validAfter.toString(),
    validBefore: auth.validBefore.toString(), nonce: auth.nonce, signature,
  })
}

/** No relayer: the payer calls the router themselves and pays the gas in MON. */
async function submitToRouter(provider: EIP1193Provider, q: MonadQuote, auth: Authorization, signature: Hex): Promise<string> {
  const { v, r, s, yParity } = parseSignature(signature)
  return walletClient(provider, auth.from).writeContract({
    address: q.router as Address, abi: routerPayAbi, functionName: 'pay',
    args: [`0x${q.requestId}`, q.index, auth.from, auth.validAfter, auth.validBefore, Number(v ?? BigInt(27 + yParity)), r, s],
  })
}

/**
 * Pay a request share from the browser wallet: exactly the amount the router says is owed, gas paid by MistPay's relayer
 * when there is one. Returns the transaction hash for the backend to verify on-chain (it counts only the router's own events).
 */
export async function payWithWallet(provider: EIP1193Provider, owner: Address, q: MonadQuote): Promise<string> {
  const auth = newAuthorization(owner, q.router, BigInt(q.requestedMicros), q.memo)
  const signature = await signAuthorization(provider, q.token.address, auth, 'receive')
  const hash = await postRelayer('/api/sponsor/pay', {
    requestId: q.requestId, index: q.index, from: owner, validAfter: auth.validAfter.toString(), validBefore: auth.validBefore.toString(), signature,
  })
  return hash ?? submitToRouter(provider, q, auth, signature)
}

/** Token balance in micro-units, read straight from the chain. */
export async function tokenBalance(owner: string, token: string): Promise<bigint> {
  const client = createPublicClient({ chain, transport: http(rpc) })
  return client.readContract({ address: token as Address, abi: erc20Abi, functionName: 'balanceOf', args: [owner as Address] })
}

/** One plain sentence for the payer. The full error goes to the console for us, never to the screen. */
export function friendlyError(err: unknown): string {
  console.error('wallet error:', err)
  if (err instanceof PlainError) return err.message
  const e = err as { message?: string; details?: string; cause?: { message?: string } }
  const raw = `${e?.message ?? ''} ${e?.details ?? ''} ${e?.cause?.message ?? ''}`
  if (/user rejected|rejected|denied|cancel|closed/i.test(raw)) return 'You cancelled the request in your wallet. Please try again.'
  if (/insufficient/i.test(raw)) return "Your wallet doesn't have enough funds for this payment."
  return 'The payment could not be completed. Please try again.'
}
