// Pure Node JSON.stringify vectors; original beta02 wire observation stays immutable.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
const root = resolve(import.meta.dirname, '../..');
const option = process.argv.indexOf('--native-report');
const sourceFile = 'tmp/rust-r2k/k-http-nest-beta02.json';
const file = option >= 0 ? process.argv[option + 1] : resolve(root, sourceFile);
const raw = readFileSync(file), digest = createHash('sha256').update(raw).digest('hex');
assert.equal(digest, 'c1aecaf329e5b2d65a5e254451bd81da69a881af053cc739a5b48b2f62c86a28');
const report = JSON.parse(raw); assert.equal(report.backend, 'nest');
const response = report.requests.find(item => item.name === 'k.package.summary').response;
assert.equal(response.status, 200);
const expectedBodyRaw = JSON.stringify(response.body);
assert.equal(Buffer.byteLength(expectedBodyRaw), Number(response.contentLength));
const originalHelper = JSON.parse(readFileSync(resolve(root, 'tools/rust-r2k/k-zip-golden.json'), 'utf8'));
const inputs = [
    ['original-manifest-pretty-to-compact', originalHelper.manifest.expectedUtf8],
    ['native-package-body-pretty-to-compact', JSON.stringify(response.body, null, 2)],
    ['strings-whitespace-quote-slash-unicode-lone', JSON.stringify({ z: '  项目 😀\t\n"\\ \ud800  ', sourceRefs: [{ label: ' 项目 附件 ', sourceId: 'synthetic' }] }, null, 2)],
    ['js-integer-property-order', '{ "10": "ten", "2": "two", "name": "名称" }']
];
const output = { formatVersion: 1, kind: 'pure-Node-JSON-stringify-and-native-beta02-regression', source: { file: sourceFile, sha256: digest }, execution: 'Only Node JSON parsing/stringifying existing source/wire inputs; no HTTP/PG/storage', cases: inputs.map(([name, inputRaw]) => ({ name, inputRaw, expectedRaw: JSON.stringify(JSON.parse(inputRaw)) })), package: { body: response.body, inputManifestSummaryRaw: JSON.stringify(response.body.manifestSummary, null, 2), expectedBodyRaw, contentLength: Number(response.contentLength) } };
const text = JSON.stringify(output, null, 2) + '\n', destination = resolve(root, 'tools/rust-r2k/k-wire-golden.json');
if (process.argv.includes('--check')) assert.equal(readFileSync(destination, 'utf8').replace(/\r\n/g, '\n'), text); else writeFileSync(destination, text);
console.log(JSON.stringify({ mode: process.argv.includes('--check') ? 'check' : 'export', cases: output.cases.length, nativePackageBytes: output.package.contentLength, execution: 'pure Node serialization only' }));
