// Chain constants only (no wagmi import) so light pages like Settings don't pull in the wallet stack.
export type TempoNetwork = 'moderato' | 'mainnet'

export const TEMPO_NETWORK: TempoNetwork = process.env.NEXT_PUBLIC_TEMPO_NETWORK === 'mainnet' ? 'mainnet' : 'moderato'
export const TEMPO_CHAIN_ID = TEMPO_NETWORK === 'mainnet' ? 4217 : 42431
export const TEMPO_CHAIN_NAME = TEMPO_NETWORK === 'mainnet' ? 'Tempo' : 'Tempo Testnet'
