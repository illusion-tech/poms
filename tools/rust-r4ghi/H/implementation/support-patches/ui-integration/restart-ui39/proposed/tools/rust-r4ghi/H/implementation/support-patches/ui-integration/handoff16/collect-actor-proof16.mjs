import {currentRestartFields1351, assertReceiptProcess1351} from '../../../../../business/ui-process-proof1351.mjs';
// Root execution proposal only. Sends actual recorded current-auth GETs using Root's original API/ledger.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { validatePlanIdentity } from '../runtime14/dom-common14.mjs';
import { validateInput, usedActorKeys, assertActorResponse, assertFinalFixtures, sha } from './binding-input16.mjs';
import { verifyPreparedPlan } from './source-closure16.mjs';
import { admittedPlanFixtures54 } from './consumer-fixtures54.mjs';
const ROOT = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', PRIVATE = '/home/wangzishi/.local/share/poms-r4ghi/private';
function readPin(item) {
  assert.equal(path.resolve(item.file), item.file);
  assert(item.file.startsWith(ROOT + '/') || item.file.startsWith(PRIVATE + '/'));
  const info = fs.lstatSync(item.file); assert(info.isFile() && !info.isSymbolicLink() && info.nlink === 1); assert.equal(fs.realpathSync(item.file), item.file);
  const bytes = fs.readFileSync(item.file); assert.equal(sha(bytes), item.rawBytesSha256); return JSON.parse(bytes);
}
export async function collect(input, inputBytes, approvedInputSHA256) {
  assert.equal(process.platform, 'linux'); validateInput(input, inputBytes, approvedInputSHA256, 'collect-real-current-auth16');
  const plan = readPin(input.plan), locations = validatePlanIdentity(plan); assert.equal(input.plan.file, locations.linuxPlan);
  assert.equal(plan.metadata16?.purpose, input.purpose); verifyPreparedPlan(ROOT, plan);
  assert.equal(fs.realpathSync(process.execPath), plan.metadata16.linuxNode.executable); assert.equal(sha(fs.readFileSync(process.execPath)), plan.metadata16.linuxNode.rawBytesSha256);
  const source = readPin(input.sourceManifest), candidate = readPin(input.candidateReceipt), processRecord = readPin(input.apiProcess);
  const priv = `${PRIVATE}/business/${plan.epoch}/${plan.run}`, lock = `${priv}/driver.lock`; assert(fs.existsSync(`${priv}/state.json`));
  fs.writeFileSync(lock, JSON.stringify({ pid: process.pid, mode: 'Root-real-current-auth16', approvedInputSHA256 }) + '\n', { flag: 'wx', mode: 0o600 });
  let ctx, label;
  try {
    const { createContext } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/context.mjs`).href), { createApi } = await import(pathToFileURL(`${ROOT}/tools/rust-r4ghi/business/http.mjs`).href);
    ctx = createContext({ epoch: plan.epoch, run: plan.run, 'api-process-record': input.apiProcess.file });
    assert.equal(source.sourcePinsSHA256, sha(Buffer.from(JSON.stringify(ctx.state.sourcePins)))); assert.deepEqual(source.sourcePins, ctx.state.sourcePins);
    assert.equal(candidate.epoch, ctx.epoch); assert.equal(candidate.run, ctx.run); assert.equal(candidate.marker, ctx.state.marker); assert.equal(candidate.sourcePinsSHA256, source.sourcePinsSHA256);
    assert.equal(candidate.migrations, ctx.migrations); assert.equal(candidate.tables, ctx.tables); assert.deepEqual(candidate.process.record, processRecord);
    assert.equal(candidate.process.rawBytesSha256, input.apiProcess.rawBytesSha256); assert.deepEqual(ctx.state.apiProcess.record, processRecord);
    const restart1351 = currentRestartFields1351(ctx.state, input.apiProcess, ctx.state.processRestart1351 ? readPin(ctx.state.processRestart1351.registry) : null);
    const api = createApi(ctx); if (input.purpose === 'dom') assertFinalFixtures(ctx.state, plan);
    const fixtureProducerAdmissions54 = admittedPlanFixtures54(ctx, plan);
    label = ctx.next('H-actual-actor-proof16'); ctx.persist(); const proofs = [];
    for (const actorKey of usedActorKeys(plan)) {
      const result = await api.request('AuthController_getCurrentAuthSession', {}, null, actorKey);
      assertActorResponse(result.body, ctx.state.actors[actorKey]);
      const bytes = fs.readFileSync(result.receiptId); const receipt = JSON.parse(bytes);
      assert.equal(receipt.operationId, result.operationId); assert.equal(receipt.actorKey, actorKey); assert.equal(receipt.status, 200);
      assertReceiptProcess1351(receipt, {file:result.receiptId,rawBytesSha256:sha(bytes)}, restart1351);
      proofs.push({ actorKey, httpReceipt: { file: result.receiptId, rawBytesSha256: sha(bytes) } });
    }
    if (input.purpose === 'dom') assertFinalFixtures(ctx.state, plan); verifyPreparedPlan(ROOT, plan);
    const index = { kind: 'actual-recorded-current-auth-session-index16', namespace: ctx.namespace, epoch: ctx.epoch, run: ctx.run, marker: ctx.state.marker,
      purpose: input.purpose, actorBindingsFinal: input.purpose === 'dom', actualInputRawSHA256: approvedInputSHA256, actualPlan: input.plan, fixtureProducerAdmissions54, proofs, ...(restart1351 ? {processRestart1351:restart1351.processRestart1351,apiProcess:restart1351.apiProcess} : {}) };
    const actorProofIndex = ctx.artifact(`${label}-index.json`, index, { kind: index.kind, purpose: index.purpose, actorBindingsFinal: index.actorBindingsFinal,
      actualGETCount: proofs.length, passwordOrCookiePublished: false, fixtureOrDOMExecuted: false, G3Certified: false });
    return { actorProofIndex, actorBindingsFinal: index.actorBindingsFinal, purpose: input.purpose, actualGETCount: proofs.length, browserExecuted: false, businessPOSTExecuted: false };
  } catch (error) {
    if (ctx && label) ctx.artifact(`${label}-partial.json`, { name: error.name, message: error.message }, { kind: 'actual-actor-proof16-partial', actorsFinalClaimed: false });
    throw error;
  } finally {
    if (fs.existsSync(lock) && JSON.parse(fs.readFileSync(lock)).pid === process.pid) fs.unlinkSync(lock);
  }
}
async function main() { const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--input' && args[2] === '--approved-input-sha' && args[4] === '--execute'); const bytes = fs.readFileSync(args[1]); console.log(JSON.stringify(await collect(JSON.parse(bytes), bytes, args[3]))); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main().catch(error => { console.error(error.message); process.exitCode = 1; });
