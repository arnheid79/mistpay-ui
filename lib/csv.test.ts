// Runnable self-check for CSV quoting (the one place this can silently corrupt an accountant's export).
// Run from apps/:  ../backend/node_modules/.bin/tsx lib/csv.test.ts
import assert from 'node:assert'
import { toCsv } from './csv'

interface Row { a: string | null | undefined; b: string | undefined }
const cols: Array<[keyof Row, string]> = [['a', 'A'], ['b', 'B']]

assert.strictEqual(toCsv<Row>([{ a: '1', b: '2' }], cols), 'A,B\r\n1,2', 'plain values are unquoted')
assert.strictEqual(toCsv<Row>([{ a: 'x,y', b: '2' }], cols), 'A,B\r\n"x,y",2', 'a comma forces quoting')
assert.strictEqual(toCsv<Row>([{ a: 'he said "hi"', b: '2' }], cols), 'A,B\r\n"he said ""hi""",2', 'quotes are doubled')
assert.strictEqual(toCsv<Row>([{ a: 'line1\nline2', b: '2' }], cols), 'A,B\r\n"line1\nline2",2', 'a newline forces quoting')
assert.strictEqual(toCsv<Row>([{ a: null, b: undefined }], cols), 'A,B\r\n,', 'null/undefined become an empty cell')
assert.strictEqual(toCsv<Row>([], cols), 'A,B', 'no rows still gets a header')

console.log('csv.test: all assertions passed ✓')
