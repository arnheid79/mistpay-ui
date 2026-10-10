// Runnable self-check: what the browser wallet signs must be exactly what the backend relayer verifies.
// The expected payload is written out here and in backend/src/utils/sponsor.test.ts (Circle USDC: name "USDC", version "2").
// Run from apps/:  ../backend/node_modules/.bin/tsx lib/monad.test.ts
import assert from 'node:assert'
import { verifyTypedData } from 'viem'
import { generatePrivateKey, privateKeyToAccount } from 'viem/accounts'
import { newAuthorization, signAuthorization, type EIP1193Provider } from './monad'

const account = privateKeyToAccount(generatePrivateKey())
const TOKEN = '0x754704Bc059F8C67012fEd69BC8A327a5aafb603'
// A wallet that answers eth_signTypedData_v4 the way MetaMask does: it receives the typed data as JSON text.
const wallet = {
  request: async ({ method, params }: { method: string; params?: unknown }) => {
    assert.strictEqual(method, 'eth_signTypedData_v4')
    const [, json] = params as [string, string]
    const { domain, types, primaryType, message } = JSON.parse(json)
    delete types.EIP712Domain
    return account.signTypedData({ domain, types, primaryType, message: { ...message, value: BigInt(message.value), validAfter: BigInt(message.validAfter), validBefore: BigInt(message.validBefore) } })
  },
} as EIP1193Provider

async function main() {
  const auth = newAuthorization(account.address, '0x2222222222222222222222222222222222222222', BigInt(1_500_000), `0x${'ab'.repeat(32)}`)
  assert.ok(auth.validBefore > BigInt(Math.floor(Date.now() / 1000)), 'authorization is valid for a while')
  const signature = await signAuthorization(wallet, TOKEN, auth, 'receive')
  // The default network in tests is testnet (10143).
  const ok = await verifyTypedData({
    address: account.address,
    signature,
    domain: { name: 'USDC', version: '2', chainId: 10143, verifyingContract: TOKEN },
    types: {
      ReceiveWithAuthorization: [
        { name: 'from', type: 'address' }, { name: 'to', type: 'address' }, { name: 'value', type: 'uint256' },
        { name: 'validAfter', type: 'uint256' }, { name: 'validBefore', type: 'uint256' }, { name: 'nonce', type: 'bytes32' },
      ],
    },
    primaryType: 'ReceiveWithAuthorization',
    message: auth,
  })
  assert.ok(ok, 'the signature the wallet produced verifies against the expected USDC ReceiveWithAuthorization payload')
  console.log('monad.test: all assertions passed ✓')
}
main()
