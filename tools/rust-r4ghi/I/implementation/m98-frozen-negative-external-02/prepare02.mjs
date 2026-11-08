// Append-only I proposal preparation; no Root writes/runtime imports.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const here = path.dirname(fileURLToPath(import.meta.url)), old = path.resolve(here, '../m98-frozen-negative-external'), sha = value => createHash('sha256').update(value).digest('hex'), relative = 'proposed/tools/rust-r4ghi/probe-m98-frozen-external.mjs';
const prior = fs.readFileSync(old + '/' + relative); assert.equal(sha(prior), '26340aa2fa5cd1b8f99e8a0a54e6cbf552fd366d40343a096a2681310975ef60'); assert(!fs.existsSync(here + '/' + relative));
const lockHelper = `export async function withExternalM98Lock(phase, action, io = fs) {
  assert(/^[A-Za-z][A-Za-z0-9_-]{0,30}$/.test(phase));
  const priv = P + '/business/g2-business13/main01'; assert.equal(io.realpathSync(priv), priv);
  const lock = priv + '/driver.lock', nonce = randomUUID();
  io.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'external-M98-frozen-negative', phase }) + '\\n', { flag: 'wx', mode: 0o600 });
  try { return await action(); }
  finally {
    const stat = io.lstatSync(lock); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1);
    const owner = JSON.parse(io.readFileSync(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); io.unlinkSync(lock);
  }
}
`;
let next = prior.toString();
next = next.replace('async function runExternal(planFile, expectedSHA) {', lockHelper + 'async function runExternal(planFile, expectedSHA) {');
const loadStart = "  const load = async name => import(pathToFileURL(R + '/tools/rust-r4ghi/business/' + name + '.mjs').href)";
assert(next.includes(loadStart)); next = next.replace(loadStart, "  return withExternalM98Lock(plan.phase, async () => {\n" + loadStart);
const oldAcquire = "  const lock = ctx.priv + '/driver.lock', nonce = randomUUID(); fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, nonce, mode: 'external-M98-frozen-negative', phase: plan.phase }) + '\\n', { flag: 'wx', mode: 0o600 });\n  try {\n";
assert(next.includes(oldAcquire)); next = next.replace(oldAcquire, '');
const oldRelease = "  } finally { const owner = JSON.parse(fs.readFileSync(lock)); assert.equal(owner.pid, process.pid); assert.equal(owner.nonce, nonce); fs.unlinkSync(lock); }\n}";
assert(next.includes(oldRelease)); next = next.replace(oldRelease, '  });\n}');
fs.mkdirSync(path.dirname(here + '/' + relative), { recursive: true }); fs.writeFileSync(here + '/' + relative, next, { flag: 'wx' });
const tests = fs.readFileSync(old + '/frozen-external.test.mjs', 'utf8').replace('assertControlledFailureM98 }', 'assertControlledFailureM98, withExternalM98Lock }'); fs.writeFileSync(here + '/frozen-external.test.mjs', tests, { flag: 'wx' });
fs.copyFileSync(old + '/plan-template.json', here + '/plan-template.json', fs.constants.COPYFILE_EXCL);
const check = fs.readFileSync(old + '/check.mjs', 'utf8').replace('# pass 10$', '# pass 15$').replace('purePass: 10', 'purePass: 15').replace('I-M98-external-negative-pure-only-validation', 'I-M98-external-negative02-lock-before-context-pure-validation'); fs.writeFileSync(here + '/check.mjs', check, { flag: 'wx' });
process.stdout.write('Prepared independent 02 lock-before-context delta.\n');
