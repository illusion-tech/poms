// Private, hash-approved Source13 binding. No top-level IO or authority mint.
import fs from 'node:fs'; import path from 'node:path'; import assert from 'node:assert/strict';
import { sha } from './pure.mjs'; import { readPin54, assertAdmittedContext54 } from './consumer-admission54.mjs';
export const TEMPLATE46 = 'tools/rust-r4ghi/business/policy-boundary-bindings46.json';
const approved = new WeakMap();
const hash = value => assert(typeof value === 'string' && /^[a-f0-9]{64}$/.test(value));
const pin = value => { assert(value && path.isAbsolute(value.file)); hash(value.rawBytesSha256); };
const same = (a, b) => { pin(a); pin(b); assert.equal(a.file, b.file); assert.equal(a.rawBytesSha256, b.rawBytesSha256); };
const dynamic = ['plannedDate','sourcePinsSHA256','sourcePinCount','migrations','tables','apiProcess','binarySHA256','admission','candidateReceipt','retentionIndex','retainedProducerState','trustedSummaryBinary','nodeExecutable','sourcePins','helperPins','sourceBases'];
function contained(root, file) { const relative = path.relative(fs.realpathSync(root), fs.realpathSync(file)); assert(relative && relative !== '..' && !relative.startsWith('..' + path.sep) && !path.isAbsolute(relative), 'Binding must be inside the exact current consumer private directory'); }
export function assertUnboundPolicyTemplate46(template) { assert.equal(template.kind, 'Root-approved-Source13-real-H01-20percent-H04-producers26'); assert.equal(template.epoch, 'g2-business13'); assert.equal(template.run, 'main01'); for (const key of dynamic) assert.equal(template[key], null, 'H0 business template stays all-null: ' + key); }
export function assertPolicyRuntimeShape46(plan) {
  assert.equal(plan.kind, 'Root-approved-Source13-real-H01-20percent-H04-producers26'); assert.equal(plan.namespace, 'poms-r4ghi'); assert.equal(plan.epoch, 'g2-business13'); assert.equal(plan.run, 'main01'); assert.equal(plan.sourceGeneration, 13); assert.equal(plan.migrations, 98); assert.equal(plan.tables, 139);
  for (const key of dynamic) assert(plan[key] !== null && plan[key] !== undefined, 'Unbound Source13 input: ' + key);
  assert(Array.isArray(plan.sourcePins) && plan.sourcePins.length === plan.sourcePinCount && plan.sourcePinCount > 0); assert.equal(sha(JSON.stringify(plan.sourcePins)), plan.sourcePinsSHA256); hash(plan.binarySHA256);
  for (const key of ['apiProcess','admission','candidateReceipt','retentionIndex','retainedProducerState','trustedSummaryBinary','nodeExecutable']) pin(plan[key]);
  assert(Array.isArray(plan.helperPins) && plan.helperPins.length > 0); assert(plan.helperPins.some(item => item.file === TEMPLATE46));
  for (const list of [plan.sourcePins, plan.helperPins, plan.sourceBases]) { assert(Array.isArray(list)); const seen = new Set(); for (const item of list) { assert(typeof item.file === 'string' && !path.isAbsolute(item.file) && !item.file.includes('\\') && !item.file.split('/').includes('..') && !seen.has(item.file)); seen.add(item.file); hash(item.sha256); } }
  return plan;
}
export function loadApprovedPolicyRuntime46(source, privateDirectory) {
  pin(source); contained(privateDirectory, source.file); const stat = fs.lstatSync(source.file); assert(stat.isFile() && !stat.isSymbolicLink() && stat.nlink === 1); const bytes = readPin54(source), plan = assertPolicyRuntimeShape46(JSON.parse(bytes));
  approved.set(plan, Object.freeze({ file: source.file, rawBytesSha256: source.rawBytesSha256, bytes: bytes.length })); return plan;
}
export function assertApprovedPolicyRuntime46(ctx, plan) {
  const source = approved.get(plan); assert(source, 'Only an explicitly approved private binding is executable, never the H0 template or a hand-built plan'); contained(ctx.priv, source.file); const bytes = readPin54(source); assert.equal(bytes.length, source.bytes); assert.deepEqual(JSON.parse(bytes), plan); return source;
}
export function verifySchema3PolicyRuntime46(ctx, plan) {
  const binding = assertApprovedPolicyRuntime46(ctx, plan); assertPolicyRuntimeShape46(plan); assert(!ctx.state.processRestart1351 && !ctx.state.processRestartPreparation1351, 'Source12 active restart overlays must be quarantined, not reused');
  const registry = assertAdmittedContext54(ctx, { liveProcess: true, sourceFiles: true }); assert.equal(registry.schemaVersion, 3); assert.equal(ctx.migrations, 98); assert(ctx.state.schemaComparison108);
  assert.deepEqual(ctx.state.consumerAdmission54.registry, plan.admission); assert.deepEqual(registry.retentionIndex, plan.retentionIndex); assert.deepEqual(registry.producerState, plan.retainedProducerState); same(registry.consumer.apiProcess, plan.apiProcess);
  assert.deepEqual(ctx.pins, plan.sourcePins); assert.deepEqual(ctx.helperPins, plan.helperPins); assert.deepEqual(JSON.parse(readPin54(registry.consumer.helperPins)), ctx.helperPins, 'Runtime graph must be exactly H0 admitted by R3; no post-mint refreeze');
  const union = new Map(); for (const item of [...ctx.pins, ...ctx.helperPins]) { if (union.has(item.file)) assert.equal(union.get(item.file), item.sha256); union.set(item.file, item.sha256); }
  assert.deepEqual(plan.sourceBases, [...union].map(([file, sha256]) => ({file,sha256})).sort((a,b)=>a.file.localeCompare(b.file)));
  const templateBytes = fs.readFileSync(ctx.win + '/' + TEMPLATE46); assertUnboundPolicyTemplate46(JSON.parse(templateBytes)); assert.equal(ctx.helperPins.find(item => item.file === TEMPLATE46).sha256, sha(templateBytes));
  const relative = path.relative(ctx.priv, plan.candidateReceipt.file); assert(relative && relative !== '..' && !relative.startsWith('..'+path.sep) && !path.isAbsolute(relative)); contained(ctx.priv, plan.candidateReceipt.file);
  const candidate = JSON.parse(readPin54(plan.candidateReceipt)); assert.equal(candidate.epoch,ctx.epoch); assert.equal(candidate.run,ctx.run); assert.equal(candidate.sourcePinsSHA256,plan.sourcePinsSHA256); assert.deepEqual(candidate.sourcePins,ctx.pins); assert.equal(candidate.sourcePins.length,plan.sourcePinCount); assert.equal(candidate.readiness,200); assert(candidate.formalG3Certified !== true); same(candidate.process,plan.apiProcess); assert.deepEqual(candidate.process.record,ctx.state.apiProcess.record); assert.equal(candidate.process.record.binarySha256,plan.binarySHA256); assert.deepEqual(candidate.consumerAdmission.registry,plan.admission);
  return {binding,registry};
}
// Root-only metadata preparation after B1/R3. This creates no business authority
// or actor proof; the returned raw pin still needs Root review before the CLI.
export function preparePolicyRuntime46(ctx, input, outputFile) {
  assert.equal(process.platform, 'linux'); assert.equal(ctx.epoch, 'g2-business13'); assert.equal(ctx.run, 'main01'); assert.equal(ctx.migrations, 98); assert.equal(ctx.tables, 139); assert(!ctx.state.processRestart1351 && !ctx.state.processRestartPreparation1351);
  assert.deepEqual(Object.keys(input).sort(), ['candidateReceipt','materialityRationale','plannedDate','trustedSummaryBinary']); pin(input.candidateReceipt); pin(input.trustedSummaryBinary); assert(/^\d{4}-\d{2}-\d{2}$/.test(input.plannedDate)); assert(input.materialityRationale.trim());
  const registry = assertAdmittedContext54(ctx,{liveProcess:true,sourceFiles:true}); assert.equal(registry.schemaVersion,3); assert.deepEqual(JSON.parse(readPin54(registry.consumer.helperPins)),ctx.helperPins);
  const template = JSON.parse(fs.readFileSync(ctx.win+'/'+TEMPLATE46)); assertUnboundPolicyTemplate46(template);
  const all = new Map(); for(const item of [...ctx.pins,...ctx.helperPins]){if(all.has(item.file))assert.equal(all.get(item.file),item.sha256);all.set(item.file,item.sha256);}
  const plan = {...template,plannedDate:input.plannedDate,sourcePinsSHA256:sha(JSON.stringify(ctx.pins)),sourcePinCount:ctx.pins.length,migrations:ctx.migrations,tables:ctx.tables,apiProcess:registry.consumer.apiProcess,binarySHA256:ctx.state.apiProcess.record.binarySha256,admission:ctx.state.consumerAdmission54.registry,candidateReceipt:input.candidateReceipt,retentionIndex:registry.retentionIndex,retainedProducerState:registry.producerState,trustedSummaryBinary:input.trustedSummaryBinary,nodeExecutable:{file:process.execPath,rawBytesSha256:sha(fs.readFileSync(process.execPath)),version:process.version},sourcePins:ctx.pins,helperPins:ctx.helperPins,sourceBases:[...all].map(([file,sha256])=>({file,sha256})).sort((a,b)=>a.file.localeCompare(b.file)),materialityRationale:input.materialityRationale};
  assertPolicyRuntimeShape46(plan); const rel=path.relative(fs.realpathSync(ctx.priv),path.resolve(outputFile));assert(rel&&!rel.startsWith('..'+path.sep)&&rel!=='..'&&!path.isAbsolute(rel));assert.equal(fs.realpathSync(path.dirname(outputFile)),path.dirname(outputFile));
  const bytes=Buffer.from(JSON.stringify(plan,null,2)+'\n');fs.writeFileSync(outputFile,bytes,{flag:'wx',mode:0o600});const output={file:outputFile,rawBytesSha256:sha(bytes)};
  verifySchema3PolicyRuntime46(ctx,loadApprovedPolicyRuntime46(output,ctx.priv));
  return {runtimeBindings:output,RootReviewStillRequired:true,actorProofMinted:false,businessExecuted:false,commandAfterRootApproval:[process.execPath,ctx.win+'/tools/rust-r4ghi/business/policy-boundary-run26.mjs','--bindings',output.file,'--approved-bindings-sha',output.rawBytesSha256,'--execute']};
}
export function assertClassificationOnly26(p, costId) {
  assert(costId && p.intent === 'snapshot-create' && p.selectedBaselinePackageRef); assert.deepEqual(p.allowedCommandCodes,[]); assert.deepEqual(p.blockingReasonCodes,['cost-classification-required']); assert.deepEqual(p.formalEligibility.blockingReasonCodes,['cost-classification-required']);
  const rows = p.sourceRows.filter(row => ['direct-cost','allocation-share','supporting-source','receipt'].includes(row.rowKind) && row.state !== 'ready' && !row.blockingReasonCodes.includes('outside-business-cutoff'));
  assert.equal(rows.length,1); const row=rows[0]; assert.equal(row.rowKind,'direct-cost'); assert.equal(row.sourceRef.id,costId); assert.equal(row.currentDecisionRef,null); assert.equal(row.state,'unclassified'); assert.deepEqual(row.blockingReasonCodes,['cost-classification-required']); return row;
}
