// Explicit same-Source12/M97 process overlay. Synchronous FS only; no mint,
// process launch/signal, DB or HTTP. The original schema2 registry is immutable.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
export const RESTART1351 = Object.freeze({ epoch: 'g2-business12', run: 'main01', sourceCount: 406,
  sourcePinsSHA256: '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa',
  binarySHA256: 'de8eaaf6ce15a2054380e25f3151c21611cf0bf760230c7336745d80850d9cff',
  envSHA256: '94afb04f3a551beee332e5fdd3372dc8ad4e01b80ab9759d8206653ac2f4cc61',
  oldEnvironmentSHA256: '3348d162c885566f81118418357f5049b6b60c2fc70a297dd16423c69cda955a',
  launcher: 'tools/rust-r4ghi/api-runtime01.mjs', launcherSHA256: '7f5702e6a086900e73fe0afde106bb252485b9a4893b3d5f66ed9a286072dfaf',
  originalRegistrySHA256: '3ed7bd387b6f4f3b8e44201e7985043b18b71cefceba3194f83ab19300f7d29c',
  oldProcessSHA256: 'a42333c74b7afd8aa7359bb3cf915444cc7cbbfebff9049a467c2cdb33ccef06',
  originalStateSHA256: '8e297fdb95b88442ebded8c37c44863b73838798b2fe0dbd9f798e4a5064c605',
  expenseFinalAfterSHA256: '9205a910aa03686a0f70973f8b4c606b001e54a49b055d80abdd10d07ddaa9df',
});
export const restartPin1351 = value => ({ file: value.file, rawBytesSha256: value.rawBytesSha256 });
const same = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
export function readRestartPin1351(pin) { assert(pin && path.isAbsolute(pin.file) && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); const stat = fs.lstatSync(pin.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); assert.equal(fs.realpathSync(pin.file), path.resolve(pin.file)); const bytes = fs.readFileSync(pin.file); assert.equal(sha(bytes), pin.rawBytesSha256); return bytes; }
const json = pin => JSON.parse(readRestartPin1351(pin));
const within = (root, file) => { const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative)); };
export function assertExactSnapshot1351(before, after) {
  assert.equal(before.marker, after.marker); assert.deepEqual(Object.keys(before.databases).sort(), ['poms_r4ghi_native', 'poms_r4ghi_rust']); assert.deepEqual(Object.keys(after.databases), Object.keys(before.databases)); assert.deepEqual(before.objects, after.objects);
  const cache = new Map(), rows = meta => { const key = meta.file + ':' + meta.rawBytesSha256; if (!cache.has(key)) cache.set(key, readRestartPin1351(meta).toString().split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return [row.key, row.sha256, row.xmin]; })); return cache.get(key); };
  for (const database of Object.keys(before.databases)) { const a = before.databases[database], b = after.databases[database]; assert.deepEqual(a.meta, b.meta); assert.deepEqual(Object.keys(a.tables), Object.keys(b.tables)); assert.equal(Object.keys(a.tables).length, 139); for (const table of Object.keys(a.tables)) assert.deepEqual(rows(a.tables[table]), rows(b.tables[table]), 'Same-source restart cannot change rows/xmin: ' + database + '.' + table); }
}
export function expectedLauncherEnvironment1351(privateRoot, edition) { return { PATH: '/home/wangzishi/.cargo/bin:/home/wangzishi/.local/share/fnm/node-versions/v24.19.0/installation/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', POMS_ENV_FILE: privateRoot + '/rust-api' + edition + '.env' }; }
export function launcherEnvironmentBytes1351(values) { return Buffer.from(Object.entries(values).map(([key, value]) => key + '=' + value + '\0').join('')); }
export function parseInitialEnvironment1351(bytes) { const output = {}; for (const item of bytes.toString().split('\0').filter(Boolean)) { const at = item.indexOf('='); assert(at > 0); const key = item.slice(0, at); assert(!Object.hasOwn(output, key)); output[key] = item.slice(at + 1); } return output; }
export function assertCandidateSourcePins1351(candidate, currentPins) {
  assert(Array.isArray(candidate.sourcePins), 'A candidate/sourceManifest must contain its full frozen source array');
  assert.deepEqual(candidate.sourcePins, currentPins, 'Candidate cannot substitute a different source array with an unchanged digest label');
  assert.equal(candidate.sourceCount, currentPins.length); assert.equal(candidate.sourcePinsSHA256, sha(JSON.stringify(candidate.sourcePins))); assert.equal(candidate.sourcePinsSHA256, sha(JSON.stringify(currentPins)));
}
export function verifyRestartEnvironment1351(ctx, processPin, oldAuthPin, live = true) {
  assert.equal(sha(fs.readFileSync(ctx.win + '/' + RESTART1351.launcher)), RESTART1351.launcherSHA256);
  const auth = json(oldAuthPin); assert.equal(auth.kind, 'actual-source-and-process-bound-auth-configuration'); assert.equal(auth.processRecord.rawBytesSHA256, RESTART1351.oldProcessSHA256); assert.equal(auth.initialProcessEnvironmentSHA256, RESTART1351.oldEnvironmentSHA256);
  assert.equal(sha(launcherEnvironmentBytes1351(expectedLauncherEnvironment1351(ctx.private, '135'))), RESTART1351.oldEnvironmentSHA256, 'The actual old complete environ hash must match the frozen explicit launcher, not guessed defaults');
  const oldEnv = { file: ctx.private + '/rust-api135.env', rawBytesSha256: RESTART1351.envSHA256 }; readRestartPin1351(oldEnv); assert.equal(auth.selectedFile.rawBytesSHA256, oldEnv.rawBytesSha256); assert.equal(auth.selectedFile.file, oldEnv.file);
  const record = json(processPin); assert.equal(processPin.file, ctx.private + '/rust-api1351-process.json'); assert.equal(record.namespace, ctx.namespace); assert.equal(record.root, ctx.mirror); assert.equal(record.port, 31441); assert.equal(record.binarySha256, RESTART1351.binarySHA256);
  const env = { file: ctx.private + '/rust-api1351.env', rawBytesSha256: RESTART1351.envSHA256 }; readRestartPin1351(env);
  if (live) {
    const proc = '/proc/' + record.pid, stat = fs.readFileSync(proc + '/stat', 'utf8'); assert.equal(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], record.startTime); assert.equal(fs.realpathSync(proc + '/exe'), record.binary); assert.equal(fs.realpathSync(proc + '/cwd'), ctx.mirror); assert.equal(sha(fs.readFileSync(record.binary)), RESTART1351.binarySHA256);
    const stable = value => JSON.stringify(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)));
    assert.equal(sha(stable(parseInitialEnvironment1351(fs.readFileSync(proc + '/environ')))), sha(stable(expectedLauncherEnvironment1351(ctx.private, '1351'))), 'Actual initial environment differs from fixed launcher; values are never included in an error');
    const fileStat = fs.lstatSync(env.file, { bigint: true }); assert.equal(fileStat.mode & 0o777n, 0o600n); assert.equal(fileStat.uid, fs.statSync(proc, { bigint: true }).uid); assert(fileStat.mtimeNs <= BigInt(Date.parse(record.startedAt)) * 1000000n && fileStat.ctimeNs <= BigInt(Date.parse(record.startedAt)) * 1000000n);
  }
  return record;
}
export function validateContainerRestart1351(transition, provision) {
  assert.equal(transition.kind, 'actual-existing-owned-container-restarted147'); assert.equal(transition.containerId, provision.containerId); assert.equal(transition.containerName, provision.container); assert.equal(transition.volume, provision.volume); assert.equal(transition.originalVolumeKept, true); assert.equal(transition.databaseRestoreExecuted, false); assert.equal(transition.oldAPI135StillStopped, true); assert.equal(transition.noAPIStarted, true); assert.equal(transition.PGReadiness, true);
  const beforeValue = json(transition.before), afterValue = json(transition.after), before = Array.isArray(beforeValue) ? beforeValue[0] : beforeValue, after = Array.isArray(afterValue) ? afterValue[0] : afterValue;
  for (const record of [before, after]) { assert.equal(record.Id, provision.containerId); assert.equal(record.Name.replace(/^\//, ''), provision.container); assert(record.Mounts.some(mount => mount.Name === provision.volume && mount.Type === 'volume')); }
  assert.equal(before.State.Running, false); assert.equal(after.State.Running, true); for (const key of ['Id', 'Name', 'Image', 'Config', 'Mounts']) assert.equal(sha(JSON.stringify(after[key])), sha(JSON.stringify(before[key])), 'Only the same existing container may start; private Config values are never printed'); return true;
}
export function verifyDataConservation148(pin, expensePin) {
  assert.equal(pin.rawBytesSha256, '22d159201edac5ea916fc069c7072afdb92d15fe0534b72e4f335e0ab64b6cb9'); const proof = json(pin);
  assert.equal(proof.kind, 'actual-original-volume-PG-restart-data-conservation148'); assert(same(proof.oldFinalSnapshot, expensePin)); assert.equal(proof.originalContextRawSHA256, RESTART1351.originalStateSHA256); assert.equal(proof.allNativeAndRustRowsRawXminCatalogSequencesObjectsEqual, true);
  for (const key of ['oldContextWrittenOrAPIRebound', 'APIStarted', 'databaseRestoreExecuted', 'DMLExecuted', 'G3Certified']) assert.equal(proof[key], false);
  const expense = json(expensePin); for (const fresh of [proof.fresh1, proof.fresh2]) assertExactSnapshot1351(expense, json(fresh)); return proof;
}
export function verifyProcessRestart1351(ctx, originalRegistry, { liveProcess = false, fullSnapshots = true } = {}) {
  const active = ctx.state.processRestart1351; assert(active?.registry); within(ctx.priv, active.registry.file); const registry = json(active.registry);
  assert.equal(registry.kind, 'verified-same-source-process-restart1351'); assert.equal(registry.epoch, ctx.epoch); assert.equal(registry.run, ctx.run); assert.equal(ctx.epoch, RESTART1351.epoch); assert.equal(ctx.run, RESTART1351.run); assert.equal(registry.namespace, ctx.namespace); assert.equal(registry.marker, ctx.state.marker);
  assert.equal(registry.sourcePinsSHA256, RESTART1351.sourcePinsSHA256); assert.equal(registry.sourcePinsSHA256, sha(JSON.stringify(ctx.pins))); assert.equal(registry.sourceCount, RESTART1351.sourceCount); assert.deepEqual(ctx.state.sourcePins, ctx.pins); assert.equal(registry.migrations, 97); assert.equal(ctx.migrations, 97);
  assert(same(registry.originalRegistry, ctx.state.consumerAdmission54.registry)); assert.equal(registry.originalRegistry.rawBytesSha256, RESTART1351.originalRegistrySHA256); assert.deepEqual(json(registry.originalRegistry), originalRegistry);
  assert(same(registry.oldApiProcess, originalRegistry.consumer.apiProcess)); assert.equal(registry.oldApiProcess.rawBytesSha256, RESTART1351.oldProcessSHA256); assert.equal(registry.originalState.rawBytesSha256, RESTART1351.originalStateSHA256); assert.equal(registry.expenseFinalAfter.rawBytesSha256, RESTART1351.expenseFinalAfterSHA256); const old = json(registry.oldApiProcess), beforeState = json(registry.originalState); assert(same(beforeState.baseline, ctx.state.baseline)); assert(same(originalRegistry.originalBaseline, ctx.state.baseline)); assert(same(beforeState.consumerAdmission54.registry, registry.originalRegistry));
  assert.equal(registry.oldEvidenceRelabelledAsNew, false); assert.equal(registry.businessStateBaselineReset, false); assert.equal(registry.businessWrites, 0); assert.equal(registry.HTTPRequests, 0); assert.equal(registry.G3Certified, false);
  const process = verifyRestartEnvironment1351(ctx, registry.newApiProcess, registry.oldAuthConfiguration, liveProcess); assert(!(process.pid === old.pid && process.startTime === old.startTime));
  assert.equal(process.binary, old.binary); assert(same(ctx.state.apiProcess, registry.newApiProcess)); assert.deepEqual(ctx.state.apiProcess.record, process);
  const candidate = json(registry.candidateReceipt); assert.equal(candidate.kind, 'actual-same-source-process-candidate1351'); assertCandidateSourcePins1351(candidate, ctx.pins); assert.equal(candidate.sourceCount, registry.sourceCount); assert.equal(candidate.sourcePinsSHA256, registry.sourcePinsSHA256); assert.equal(candidate.tables, 139); assert.equal(candidate.migrations, 97); assert(same(candidate.process, registry.newApiProcess)); assert.deepEqual(candidate.process.record, process);
  const prepared = json(registry.preparation); assert.equal(prepared.kind, 'actual-same-source-process-restart-preparation1351'); assert(same(prepared.originalState, registry.originalState)); assert(same(prepared.expenseFinalAfter, registry.expenseFinalAfter)); assert.equal(prepared.oldPhysicalProcessAbsent, true); assert.equal(prepared.businessWrites, 0); assert.equal(registry.startupFresh.length, 2);
  validateContainerRestart1351(json(prepared.containerTransition), json(prepared.provision));
  assert.equal(prepared.containerTransition.rawBytesSha256, '9751ef3caf3427c103997c2dcf0105a23e1bfa8d3f8ae5df8d9052a67ce5a682'); verifyDataConservation148(prepared.dataConservation, registry.expenseFinalAfter);
  if (fullSnapshots) { const expense = json(registry.expenseFinalAfter); for (const pin of [prepared.beforeStartup, ...registry.startupFresh]) assertExactSnapshot1351(expense, json(pin)); }
  return registry;
}
export function effectiveProcessBinding1351(ctx, originalRegistry) { return ctx.state.processRestart1351 ? verifyProcessRestart1351(ctx, originalRegistry).newApiProcess : originalRegistry.consumer.apiProcess; }
export function processReference1351(ctx) { return ctx.state.processRestart1351 ? { registry: restartPin1351(ctx.state.processRestart1351.registry), apiProcess: restartPin1351(ctx.state.apiProcess), generation: 'API1351' } : null; }
export function quarantineProcessRestartForEpochChange1351(next, old, producerStatePin) {
  if (!old.processRestart1351) return;
  assert.equal(old.epoch, RESTART1351.epoch); assert.notEqual(next.epoch, old.epoch); assert.notEqual(sha(JSON.stringify(next.sourcePins)), sha(JSON.stringify(old.sourcePins))); assert.notEqual(next.apiProcess.file, old.apiProcess.file);
  next.processRestartHistory1351 = [...(next.processRestartHistory1351 ?? []), { kind: 'archived-previous-consumer-active-process1351', producerState: producerStatePin, activeOverlay: structuredClone(old.processRestart1351), actualEffectiveApiProcess: structuredClone(old.apiProcess), labelsRemainOriginalEpoch: true }];
  delete next.processRestart1351; delete next.processRestartPreparation1351;
}
export function assertRestartBindingFields1351(reference, candidateReceipt, binding, actors, index) {
  assert(same(binding.processRestart1351, reference.registry)); assert(same(binding.apiProcess, reference.apiProcess)); assert(same(binding.candidateReceipt, candidateReceipt)); assert(same(actors.processRestart1351, reference.registry)); assert(same(actors.apiProcess, reference.apiProcess));
  assert(same(index.processRestart1351, reference.registry)); assert(same(index.apiProcess, reference.apiProcess)); assert(Array.isArray(actors.actors) && actors.actors.length > 0); assert.equal(index.kind, 'actual-recorded-current-auth-session-index16');
}
export function assertRestartAuthReceipt1351(http, actorKey, reference, admittedSequence, file) {
  assert.equal(http.operationId, 'AuthController_getCurrentAuthSession'); assert.equal(http.actorKey, actorKey); assert.equal(http.status, 200); assert.deepEqual(http.processBinding1351, reference); assert(Number(path.basename(file).slice(0, 6)) > admittedSequence);
}
export function assertRestartUIBinding1351(ctx, binding, actors) {
  if (!ctx.state.processRestart1351) return null;
  const registry = verifyProcessRestart1351(ctx, json(ctx.state.consumerAdmission54.registry), { liveProcess: true }); const reference = processReference1351(ctx);
  const index = json(actors.actualActorIndex); assertRestartBindingFields1351(reference, registry.candidateReceipt, binding, actors, index);
  assert.equal(index.namespace, ctx.namespace); assert.equal(index.epoch, ctx.epoch); assert.equal(index.run, ctx.run); assert.equal(index.marker, ctx.state.marker);
  for (const actor of actors.actors) { const proof = index.proofs.find(value => value.actorKey === actor.key); assert(proof); assertRestartAuthReceipt1351(json(proof.httpReceipt), actor.key, reference, registry.admittedSequence, proof.httpReceipt.file); }
  return registry;
}
