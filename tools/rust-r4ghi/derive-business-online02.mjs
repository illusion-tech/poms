// Preserve the first TLS readback failure. The successful dependency POST is
// discovered on the next GET and is never blindly repeated. Only GET retries.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sourcePath = 'tools/rust-r4ghi/freeze-business-online01.mjs';
let source = fs.readFileSync(sourcePath, 'utf8');
assert(source.includes("const out = 'tmp/rust-r4ghi/root/business-g1-online01';"));
source = source.replace("const out = 'tmp/rust-r4ghi/root/business-g1-online01';", "const out = 'tmp/rust-r4ghi/root/business-g1-online02';");
const start = source.indexOf('function api('), end = source.indexOf("\nassert.equal(api('feature-ref'", start);
assert(start > 0 && end > start);
const replacement = [
  "function api(label, endpoint, method = 'GET', body) {",
  "  for (let attempt = 1; attempt <= (method === 'GET' ? 3 : 1); attempt++) {",
  "    const prefix = out + '/' + String(++sequence).padStart(3, '0') + '-' + label + '-attempt' + attempt;",
  "    const args = ['api', endpoint, '--method', method];",
  "    if (body !== undefined) { fs.writeFileSync(prefix + '-input.json', JSON.stringify(body, null, 2) + '\\n', { flag: 'wx' }); args.push('--input', prefix + '-input.json'); }",
  "    const result = spawnSync('gh', args, { encoding: null, windowsHide: true, timeout: 55000, maxBuffer: 12000000 });",
  "    fs.writeFileSync(prefix + '-stdout.json', result.stdout ?? Buffer.alloc(0), { flag: 'wx' });",
  "    fs.writeFileSync(prefix + '-stderr.bin', result.stderr ?? Buffer.alloc(0), { flag: 'wx' });",
  "    calls.push({ label, attempt, endpoint, method, exitCode: result.status, file: prefix + '-stdout.json', rawBytesSHA256: sha(result.stdout ?? Buffer.alloc(0)) });",
  "    fs.writeFileSync(out + '/progress.json', JSON.stringify(calls, null, 2) + '\\n');",
  "    if (result.status === 0) return result.stdout?.length ? JSON.parse(result.stdout) : null;",
  "    if (method !== 'GET' || attempt === 3) assert.equal(result.status, 0, 'inspect partial read/write acknowledgement before proceeding');",
  "  }",
  "}",
].join('\n');
source = source.slice(0, start) + replacement + source.slice(end);
const target = 'tools/rust-r4ghi/freeze-business-online02.mjs';
fs.writeFileSync(target, source, { flag: 'wx' });
console.log(JSON.stringify({ target, sourceSHA256: createHash('sha256').update(fs.readFileSync(sourcePath)).digest('hex'), behaviorDelta: 'new evidence directory; GET-only bounded retries; identical source, certificate and business admission guards' }));
