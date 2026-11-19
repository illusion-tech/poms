// Actual public auth only, followed by metadata-only cookie scope derivation.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { createApi } from './business/http.mjs';
import { processReference1351, verifyProcessRestart1351 } from './business/same-source-process1351.mjs';
import { prepareCookieScope27 } from './business/prepare-ui-cookie-scope27.mjs';
import { sha } from './business/pure.mjs';
assert.equal(process.platform, 'linux');
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }), registry = verifyProcessRestart1351(ctx, JSON.parse(fs.readFileSync(ctx.state.consumerAdmission54.registry.file)), { liveProcess: true }), reference = processReference1351(ctx);
assert.equal(reference.apiProcess.rawBytesSha256, 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1'); assert.equal(reference.registry.rawBytesSha256, '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b');
const lock = ctx.priv + '/driver.lock'; fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-API1351-actual-auth-cookie155', actors: ['manager', 'execution'] }) + '\n', { flag: 'wx', mode: 0o600 });
try {
  const sequenceBefore = ctx.state.sequence, api = createApi(ctx); for (const actor of ['manager', 'execution']) await api.login(actor);
  const authReceipts = fs.readdirSync(ctx.priv).filter(file => /^\d{6}-http\.json$/.test(file) && Number(file.slice(0, 6)) > sequenceBefore).sort().map(file => {
    const full = ctx.priv + '/' + file, raw = fs.readFileSync(full), value = JSON.parse(raw); return { full, raw, value };
  }).filter(item => item.value.operationId === 'AuthController_createPasswordAuthSession');
  assert.equal(authReceipts.length, 2); assert.deepEqual(authReceipts.map(item => item.value.actorKey), ['manager', 'execution']);
  for (const item of authReceipts) { assert.deepEqual(item.value.processBinding1351, reference); assert(Number(item.full.split('/').at(-1).slice(0, 6)) > registry.admittedSequence); assert.equal(item.value.status, 200); assert(item.value.responseComplete && !item.value.transportFailure); }
  const input = { apiProcess: reference.apiProcess, authReceipts: authReceipts.map(item => ({ file: item.full, rawBytesSha256: sha(item.raw) })) }, ui = ctx.private + '/ui-config/runtime14';
  const bytes = Buffer.from(JSON.stringify(input, null, 2) + '\n'), file = ui + '/api1351-cookie-scope-input155.json'; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
  const scope = prepareCookieScope27({ file, rawBytesSha256: sha(bytes) }, ui + '/api1351-cookie-scope-proof155.json');
  const receipt = { kind: 'Root-actual-API1351-auth-and-cookie-scope155', processBinding1351: reference, authReceipts: input.authReceipts, newCookieScope: scope, actualAuthOnly: true, domainCommandsExecuted: false, old135ProofReused: false, G3Certified: false };
  fs.writeFileSync(ui + '/api1351-auth-receipt155.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(receipt));
} catch (error) { const partial = ctx.artifact(ctx.next('auth1351-partial155') + '.json', { name: error.name, stack: error.stack }); ctx.persist(); console.error(JSON.stringify({ status: 'failed-or-partial-no-blind-retry', partial, privateDetailsPublished: false })); process.exitCode = 1; }
finally { assert.equal(JSON.parse(fs.readFileSync(lock)).pid, process.pid); fs.unlinkSync(lock); }
