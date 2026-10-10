import { encodeFunctionData, parseAbi, type Address, type Hex } from 'viem'

const abi = parseAbi(['function transferWithMemo(address to, uint256 amount, bytes32 memo)'])

/** The one call a refund is: a memo transfer from the receiver's wallet back to the payer (the memo is the request's refund memo). */
export function refundCalls(token: Address, to: Address, amountMicros: bigint, memo: Hex) {
  return [{ to: token, data: encodeFunctionData({ abi, functionName: 'transferWithMemo', args: [to, amountMicros, memo] }) }]
}

/** "12.5" → 12500000 micros (as a bigint) without ever touching a float; null unless it is a plain amount with at most `decimals` places. */
export function parseAmountMicros(text: string, decimals: number): bigint | null {
  const m = new RegExp(`^(\\d+)(?:\\.(\\d{1,${decimals}}))?$`).exec(text.trim())
  if (!m) return null
  return BigInt(m[1]) * BigInt(10) ** BigInt(decimals) + BigInt((m[2] ?? '').padEnd(decimals, '0') || '0')
}

/** 12500000 micros → "12.5" (exact, trailing zeros trimmed): what the amount box is pre-filled with. */
export function formatMicrosExact(micros: bigint, decimals: number): string {
  const base = BigInt(10) ** BigInt(decimals)
  const frac = (micros % base).toString().padStart(decimals, '0').replace(/0+$/, '')
  return frac ? `${micros / base}.${frac}` : `${micros / base}`
}
