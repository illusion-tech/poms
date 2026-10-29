// Finite actual Node Headers/WebIDL oracle. No fetch, socket, service, or DB.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
const source = process.binding('natives')['internal/deps/undici/undici'];
const coreRegex = /var headerCharRegex = (\/[^\n]+\/);/.exec(source)?.[1];
assert.equal(coreRegex, '/[^\\t\\x20-\\x7e\\x80-\\xff]/', 'Review changed native undici header grammar');
const coreHeaderValid = value => !new RegExp(coreRegex.slice(1, -1)).test(value);
const values = ['a\nb', 'a\r\nb', ' text/plain \t', '\r\ntext/plain\n', 'café', '\u00a0a\u00a0', 'a\u0100', 'a\ud800', 'a\0b', 'a\tb', ' \n ', 'a\u007fb', 'a\u0080b', 'a\u0001b', '😀', ''];
const cases = [];
for (const name of ['authorization', 'content-type']) for (const value of values) {
    let expected;
    try {
        const headers = new Headers({ [name]: value });
        const normalized = headers.get(name);
        expected = coreHeaderValid(normalized) ? { success: true, bytes: Array.from(normalized, c => c.charCodeAt(0)) } : { success: false, message: `fetch failed / UND_ERR_INVALID_ARG / invalid ${name} header`, stage: 'native core grammar; wrapper follows original source, no fetch invoked' };
    } catch (error) { expected = { success: false, message: error.message, stage: 'actual native Headers/WebIDL constructor' }; }
    cases.push({ name, valueUnits: Array.from({ length: value.length }, (_, i) => value.charCodeAt(i)), expected });
}
const result = { kind: 'Actual Node Headers/WebIDL plus source-bound native core header grammar; finite source-only, not fetch/HTTP validation', node: process.version, undici: process.versions.undici, nativeRawUtf8Sha256: createHash('sha256').update(source).digest('hex'), coreRegex, cases };
const output = JSON.stringify(result, null, 2) + '\n';
const path = new URL('./i-header-golden.json', import.meta.url);
if (process.argv.includes('--check')) assert.equal(readFileSync(path, 'utf8').replace(/\r\n/g, '\n'), output); else writeFileSync(path, output);
console.log(JSON.stringify({ check: process.argv.includes('--check'), cases: cases.length, node: process.version, execution: 'Headers construction/native source only; no fetch/network' }));
