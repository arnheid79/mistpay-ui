// Runnable self-check for the refund amount helpers (money handling: no floats). No test runner in this package, so:
// Run from apps/:  ../backend/node_modules/.bin/tsx lib/refund.test.ts
import assert from 'node:assert'
import { formatMicrosExact, parseAmountMicros } from './refund'

const B = BigInt // the frontend targets ES2017, which has no bigint literals

assert.strictEqual(parseAmountMicros('12.5', 6), B(12_500_000))
assert.strictEqual(parseAmountMicros('12', 6), B(12_000_000))
assert.strictEqual(parseAmountMicros(' 0.000001 ', 6), B(1), 'the smallest unit, and surrounding spaces are ignored')
assert.strictEqual(parseAmountMicros('0.1', 6), B(100_000), 'no float error: 0.1 is exactly 100000 micros')
assert.strictEqual(parseAmountMicros('19.99', 6), B(19_990_000))
assert.strictEqual(parseAmountMicros('0', 6), B(0), 'zero parses (the caller rejects it)')
for (const bad of ['', '-1', '1e3', '1,5', '1.', '.5', 'abc', '1.0000001', '1 000', '0x10']) {
  assert.strictEqual(parseAmountMicros(bad, 6), null, `${JSON.stringify(bad)} is not an amount`)
}
assert.strictEqual(parseAmountMicros('1.2345', 2), null, 'more places than the token has')

assert.strictEqual(formatMicrosExact(B(12_500_000), 6), '12.5')
assert.strictEqual(formatMicrosExact(B(50_000_000), 6), '50')
assert.strictEqual(formatMicrosExact(B(1), 6), '0.000001')
assert.strictEqual(formatMicrosExact(B(0), 6), '0')
for (const n of [B(1), B(999_999), B(30_000_000), B(123_456_789)]) assert.strictEqual(parseAmountMicros(formatMicrosExact(n, 6), 6), n, `round-trips ${n}`)

console.log('refund.test: all assertions passed ✓')
