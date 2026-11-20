// Recover metadata from the two already acknowledged logins. Never repeats auth or a domain command.
import fs from 'node:fs';
import assert from 'node:assert/strict';
import { createContext } from './business/context.mjs';
import { processReference1351, verifyProcessRestart1351 } from './business/same-source-process1351.mjs';
import { prepareCookieScope27 } from './business/prepare-ui-cookie-scope27.mjs';
import { sha } from './business/pure.mjs';
const ctx = createContext({ epoch: 'g2-business12', run: 'main01' }); assert(!fs.existsSync(ctx.priv + '/driver.lock')); assert.equal(ctx.state.sequence, 7148); assert(!ctx.state.activeFault && !ctx.state.blockedObservation);
const registry = verifyProcessRestart1351(ctx, JSON.parse(fs.readFileSync(ctx.state.consumerAdmission54.registry.file)), { liveProcess: true }), reference = processReference1351(ctx);
const partialFile = ctx.priv + '/007148-auth1351-partial155.json'; assert.equal(sha(fs.readFileSync(partialFile)), '7256e39a222a40a1bc75b40b300cbce15025f8755dcfdf4ae599c432ad6d1729');
const receipts = fs.readdirSync(ctx.out).filter(file => /^\d{6}-http-http\.json$/.test(file) && Number(file.slice(0, 6)) > 7134 && Number(file.slice(0, 6)) < 7148).sort().map(file => { const full = ctx.out + '/' + file, raw = fs.readFileSync(full); return { full, raw, value: JSON.parse(raw) }; });
assert.equal(receipts.length, 6); for (const receipt of receipts) { assert.deepEqual(receipt.value.processBinding1351, reference); assert.equal(receipt.value.status, 200); assert(receipt.value.responseComplete && !receipt.value.transportFailure); }
const auth = receipts.filter(item => item.value.operationId === 'AuthController_createPasswordAuthSession'); assert.equal(auth.length, 2); assert.deepEqual(auth.map(item => item.value.actorKey), ['manager', 'execution']);
const current = receipts.filter(item => item.value.operationId === 'AuthController_getCurrentAuthSession'); assert.deepEqual(current.map(item => item.value.actorKey), ['manager', 'execution']);
const input = { apiProcess: reference.apiProcess, authReceipts: auth.map(item => ({ file: item.full, rawBytesSha256: sha(item.raw) })) }, ui = ctx.private + '/ui-config/runtime14';
const bytes = Buffer.from(JSON.stringify(input, null, 2) + '\n'), file = ui + '/api1351-cookie-scope-input157.json'; fs.writeFileSync(file, bytes, { flag: 'wx', mode: 0o600 });
const scope = prepareCookieScope27({ file, rawBytesSha256: sha(bytes) }, ui + '/api1351-cookie-scope-proof155.json');
const receipt = { kind: 'Root-actual-API1351-acknowledged-auth-cookie-metadata-recovery157', processBinding1351: reference, admittedSequence: registry.admittedSequence, originalMetadataPartial: { file: partialFile, rawBytesSha256: sha(fs.readFileSync(partialFile)) },
  actualAuthReceipts: input.authReceipts, newCookieScope: scope, metadataRecoveryOnly: true, authOrDomainCommandsReplayed: false, original155StillFailed: true, G3Certified: false };
fs.writeFileSync(ui + '/api1351-auth-receipt157.json', JSON.stringify(receipt, null, 2) + '\n', { flag: 'wx', mode: 0o600 }); console.log(JSON.stringify(receipt));
