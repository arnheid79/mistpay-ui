
// Chain constants only (no wallet import) so light pages like Settings don't pull in the wallet stack.
export type MonadNetwork = 'testnet' | 'mainnet'

export const MONAD_NETWORK: MonadNetwork = process.env.NEXT_PUBLIC_MONAD_NETWORK === 'mainnet' ? 'mainnet' : 'testnet'
export const MONAD_CHAIN_ID = MONAD_NETWORK === 'mainnet' ? 143 : 10143
export const MONAD_CHAIN_NAME = MONAD_NETWORK === 'mainnet' ? 'Monad' : 'Monad Testnet'
