import {createRequire} from 'node:module';
import {currentRestartFields1351, assertReceiptProcess1351, assertIndexProcess1351, actorRestartFields1351} from '../../../../../business/ui-process-proof1351.mjs';
// Metadata-only Root wrapper: no HTTP, DB, child process or browser execution.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { validateBindingShape } from '../runtime13/binding13.mjs';
import { validatePlanIdentity } from '../runtime14/dom-common14.mjs';
import { validateInput, usedActorKeys, assertActorResponse, assertFinalFixtures, sha } from './binding-input16.mjs';
import { verifyPreparedPlan } from './source-closure16.mjs';
import { admittedPlanFixtures54, readAdmittedConsumerContext54 } from './consumer-fixtures54.mjs';

const sourceRoot = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', stateRoot = '/home/wangzishi/.local/share/poms-r4ghi';
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
function original(item, prefixes) {
  assert.equal(path.resolve(item.file), item.file);
  assert(prefixes.some(prefix => item.file.startsWith(prefix + '/'))); const stat = fs.lstatSync(item.file);
  assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(item.file), path.resolve(item.file));
  const bytes = fs.readFileSync(item.file); assert.equal(sha(bytes), item.rawBytesSha256); return JSON.parse(bytes);
}
export function generate(input, inputBytes, approvedInputSHA256) {
  assert.equal(process.platform, 'linux'); validateInput(input, inputBytes, approvedInputSHA256, 'generate-real-recorded-binding16');
  const roots = [sourceRoot, `${stateRoot}/private`], plan = original(input.plan, roots), locations = validatePlanIdentity(plan);
  assert.equal(input.plan.file, locations.linuxPlan);
  assert.equal(plan.metadata16?.purpose, input.purpose); verifyPreparedPlan(sourceRoot, plan);
  assert.equal(fs.realpathSync(process.execPath), plan.metadata16.linuxNode.executable); assert.equal(sha(fs.readFileSync(process.execPath)), plan.metadata16.linuxNode.rawBytesSha256);
  const priv = `${stateRoot}/private/business/${plan.epoch}/${plan.run}`, state = JSON.parse(fs.readFileSync(`${priv}/state.json`));
  assert(state.namespace === 'poms-r4ghi' && state.epoch === plan.epoch && state.run === plan.run); assert(!state.cleaned && !state.cleanupPlan && !state.activeFault && !state.blockedObservation);
  const source = original(input.sourceManifest, roots), candidate = original(input.candidateReceipt, roots), processRecord = original(input.apiProcess, roots), index = original(input.actorProofIndex, roots);
  const sourcePinsSHA256 = sha(Buffer.from(JSON.stringify(state.sourcePins))); assert.equal(source.sourcePinsSHA256, sourcePinsSHA256); assert.deepEqual(source.sourcePins, state.sourcePins);
  assert.equal(candidate.epoch, state.epoch); assert.equal(candidate.run, state.run); assert.equal(candidate.marker, state.marker); assert.equal(candidate.tables, 139); assert.equal(candidate.migrations, 97); assert.equal(candidate.sourcePinsSHA256, sourcePinsSHA256);
  assert.equal(processRecord.namespace, 'poms-r4ghi'); assert.equal(processRecord.port, 31441); assert.equal(processRecord.binarySha256, candidate.process.record.binarySha256);
  assert.equal(state.apiProcess.file, input.apiProcess.file); assert.deepEqual(state.apiProcess.record, processRecord); assert.equal(input.apiProcess.rawBytesSha256, state.apiProcess.rawBytesSha256); assert.equal(input.apiProcess.rawBytesSha256, candidate.process.rawBytesSha256);
  const stat = fs.readFileSync(`/proc/${processRecord.pid}/stat`, 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], processRecord.startTime);
  assert.equal(fs.realpathSync(`/proc/${processRecord.pid}/exe`), processRecord.binary); assert.equal(sha(fs.readFileSync(processRecord.binary)), processRecord.binarySha256);
  assert.equal(index.kind, 'actual-recorded-current-auth-session-index16'); assert.equal(index.epoch, state.epoch); assert.equal(index.run, state.run); assert.equal(index.marker, state.marker); assert.equal(index.purpose, input.purpose);
  assert.deepEqual(index.actualPlan, input.plan);
  const restart1351 = currentRestartFields1351(state, input.apiProcess, state.processRestart1351 ? original(state.processRestart1351.registry, roots) : null);
  assertIndexProcess1351(index, restart1351);
  const stateFile = `${priv}/state.json`;
  const admittedContext = readAdmittedConsumerContext54({ file: stateFile, rawBytesSha256: sha(fs.readFileSync(stateFile)) });
  assert.deepEqual(admittedContext.state, state); assert.deepEqual(admittedPlanFixtures54(admittedContext, plan), index.fixtureProducerAdmissions54);
  assert.equal(index.actorBindingsFinal, input.purpose === 'dom', 'Only the actual collector purpose/final checks may produce final actors');
  if (input.purpose === 'dom') assertFinalFixtures(state, plan);
  const actors = [];
  assert.deepEqual(index.proofs.map(item => item.actorKey).sort(), usedActorKeys(plan).sort());
  for (const key of usedActorKeys(plan)) {
    const proof = index.proofs.find(item => item.actorKey === key);
    const http = original(proof.httpReceipt, [`${sourceRoot}/tmp/rust-r4ghi/business/${state.epoch}/${state.run}`]);
    assert.equal(http.operationId, 'AuthController_getCurrentAuthSession'); assert.equal(http.actorKey, key); assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200); assert(http.responseComplete && !http.transportFailure);
    assertReceiptProcess1351(http, proof.httpReceipt, restart1351);
    const response = original(http.originals.responseBody, [priv]), actor = state.actors[key], permissions = assertActorResponse(response, actor);
    actors.push({ key, id: actor.id, roleId: actor.roleId, orgId: actor.orgId, permissions, actualCurrentAuthReceipt: proof.httpReceipt });
  }
  const actorFile = `${path.dirname(locations.linuxBinding)}/${plan.uiRun}-actors.json`; assert(!fs.existsSync(actorFile) && !fs.existsSync(locations.linuxBinding));
  const actorManifestValue = { schemaVersion: 1, namespace: state.namespace, epoch: state.epoch, run: state.run, marker: state.marker, actorBindingsFinal: index.actorBindingsFinal, purpose: input.purpose, sourceActualProofIndex: input.actorProofIndex, actors, ...actorRestartFields1351(restart1351, input.actorProofIndex) };
  fs.writeFileSync(actorFile, JSON.stringify(actorManifestValue, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  const compatibilityFixtures = [];
  if (plan.cases.some(scene => scene.kind === 'legacy-anchor')) {
    const scene = plan.cases.find(scene => scene.kind === 'legacy-anchor'), record = state.fixtures.legacyCompatibilityFixture;
    assert.equal(scene.projectIdPointer, '/fixtures/legacyCompatibilityFixture/projectId'); assert(record?.projectId && record.receipt?.file && record.receipt.rawBytesSha256);
    compatibilityFixtures.push({ kind: 'legacy-anchor', qualification: 'controlled-compatibility-negative', businessProducer: false, projectId: record.projectId,
      seedReceipt: { file: record.receipt.file, rawBytesSha256: record.receipt.rawBytesSha256 } });
  }
  const binding = { schemaVersion: 1, namespace: state.namespace, epoch: state.epoch, run: state.run, marker: state.marker, database: 'poms_r4ghi_rust', tables: 139, migrations: 97,
    sourcePinsSHA256, expectedCandidateBinarySHA256: processRecord.binarySha256, sourceManifest: input.sourceManifest, candidateReceipt: input.candidateReceipt, actorManifest: pin(actorFile), apiProcess: input.apiProcess,
    writeActionsSHA256: sha(Buffer.from(JSON.stringify(plan.writeActions))), actorBindingsFinal: index.actorBindingsFinal, purpose: input.purpose, plan: input.plan, metadata16: plan.metadata16,
    fixtureProducerAdmissions54: index.fixtureProducerAdmissions54, compatibilityFixtures, ...(restart1351 ? {processRestart1351:restart1351.processRestart1351} : {}) };
  validateBindingShape(binding);
  if (restart1351) {
    const {assertRestartUIBinding1351} = createRequire(import.meta.url)('../../../../../business/same-source-process1351.mjs');
    const proof = assertRestartUIBinding1351(admittedContext, binding, actorManifestValue); assert(!(proof && typeof proof.then === 'function'), 'Restart binding must be verified synchronously before publication');
  }
  fs.writeFileSync(locations.linuxBinding, JSON.stringify(binding, null, 2) + '\n', { flag: 'wx', mode: 0o600 });
  return { kind: 'generated-real-recorded-input-closed-binding-only', purpose: input.purpose, actorsFinal: index.actorBindingsFinal, actualRootInputRawSHA256: approvedInputSHA256, actorManifest: pin(actorFile), closedBinding: pin(locations.linuxBinding), candidateBinarySHA256: processRecord.binarySha256, HTTPExecuted: false, DBExecuted: false, browserExecuted: false };
}
function main() { const args = process.argv.slice(2); assert(args.length === 5 && args[0] === '--input' && args[2] === '--approved-input-sha' && args[4] === '--execute'); const bytes = fs.readFileSync(args[1]); console.log(JSON.stringify(generate(JSON.parse(bytes), bytes, args[3]))); }
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) main();
