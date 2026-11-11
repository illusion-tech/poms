// Historical14 is read through the explicit344 map. Never redirects ctx.win or
// invokes the old252 current14 guard against current15 product bytes.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { C15, sha15, pin15, samePin15, keys15, pointer15 } from './source15-admission-core.mjs';
import { C252, sha252, samePin252, pointer252, assertPlanShape252, assertFinalProducer252, assertDataEqual252, sourceDeltas252, projectAnchors252, resourceProjection252, verifyProducerProjectBirth252, verifyRetainedMain252, assertApprovals252, producerHistory252, assertImmutableParents252 } from './same-m98-code-core252.mjs';
import { verifyLossEvidence25203, assertSupplementUnion25203 } from './same-m98-code-runtime-loss25203.mjs';
import { assertAuthorities25203, assertClosureDelta25203 } from './same-m98-code-composition25203.mjs';
import { verifySchemaBinding108 } from './schema-comparison108.mjs';
import { validateRegistryLineage62 } from './registry-lineage62.mjs';
import { verifyRetainedToolAdmission119252 } from './resource-tool-admission119.mjs';
import { assertRecorded } from './ledger.mjs';
import { bootstrapBody252, admittedBody252, registryBody252 } from './same-m98-code-admission252.mjs';

export function readPin15(pin) {
  pin15(pin); assert.equal(path.resolve(pin.file), pin.file);
  const st = fs.lstatSync(pin.file); assert(st.isFile() && !st.isSymbolicLink() && st.nlink === 1, 'Single-link regular source/receipt required');
  assert.equal(fs.realpathSync(pin.file), pin.file); const b = fs.readFileSync(pin.file);
  assert.equal(sha15(b), pin.rawBytesSha256); if (pin.bytes !== undefined) assert.equal(b.length, pin.bytes); return b;
}
export const json15 = p => JSON.parse(readPin15(p));
export function rows15(meta) { const values = readPin15(meta).toString().split('\n').filter(Boolean).map(JSON.parse); assert.equal(values.length, meta.count); for (const r of values) { assert.equal(sha15(r.raw), r.sha256); assert(typeof r.xmin === 'string'); } return values; }
export function binary15(pin, facts) {
  pin15(pin); assert(Array.isArray(facts)); const f = facts.find(x => x.file === pin.file); samePin15(f, pin);
  assert(typeof f.dev === 'string' && /^\d+$/.test(f.dev) && typeof f.ino === 'string' && /^\d+$/.test(f.ino)); assert(Number.isSafeInteger(f.nlink) && f.nlink >= 1);
  const st = fs.lstatSync(pin.file, { bigint: true }); assert(st.isFile() && !st.isSymbolicLink()); assert.equal(fs.realpathSync(pin.file), pin.file);
  assert.equal(st.dev.toString(), f.dev); assert.equal(st.ino.toString(), f.ino); assert.equal(Number(st.nlink), f.nlink);
  const b = fs.readFileSync(pin.file); assert.equal(sha15(b), pin.rawBytesSha256); if (pin.bytes !== undefined) assert.equal(b.length, pin.bytes); return f;
}
export function leaf15(root, file, hash) { assert(typeof file === 'string' && !path.isAbsolute(file) && !file.includes('\\') && file.split('/').every(x => x && x !== '.' && x !== '..')); assert.equal(fs.realpathSync(root), root); return readPin15({ file: root + '/' + file, rawBytesSha256: hash }); }
export function tree15(root) { assert.equal(fs.realpathSync(root), root); const files = [], walk = dir => { const s = fs.lstatSync(dir); assert(s.isDirectory() && !s.isSymbolicLink()); for (const n of fs.readdirSync(dir).sort()) { const f = dir + '/' + n, st = fs.lstatSync(f); assert(!st.isSymbolicLink()); if (st.isDirectory()) walk(f); else { assert(st.isFile() && st.nlink === 1); files.push(f.slice(root.length + 1)); } } }; walk(root); return files.sort(); }
export function helpers15(root) { return fs.readdirSync(root + '/tools/rust-r4ghi/business').filter(n => /\.(mjs|json)$/.test(n)).sort().map(n => { const file = 'tools/rust-r4ghi/business/' + n, b = leaf15(root, file, sha15(fs.readFileSync(root + '/' + file))); return { file, sha256: sha15(b) }; }); }
export function cargoFiles15(root) { const files = [], walk = dir => { if (!fs.existsSync(dir)) return; const s = fs.lstatSync(dir); assert(s.isDirectory() && !s.isSymbolicLink()); for (const n of fs.readdirSync(dir).sort()) { if (['target', 'node_modules', '.git'].includes(n)) continue; const f = dir + '/' + n, st = fs.lstatSync(f); assert(!st.isSymbolicLink()); if (st.isDirectory()) walk(f); else if (/\.(rs|toml|json|cjs)$/.test(n) || n === 'Cargo.lock' || (dir.endsWith('/.cargo') && n === 'config')) { assert(st.isFile() && st.nlink === 1); files.push(f.slice(root.length + 1)); } } }; walk(root + '/apps/poms-api-rust'); walk(root + '/.cargo'); return files.sort(); }
const json = json15, readPin252 = readPin15, rows252 = rows15, sort = x => [...x].sort();
const same = (a, b) => a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
function inside(root, file) { assert(file.startsWith(root + '/')); assert.equal(fs.realpathSync(file), file); }

export function verifyArchive344For15(spec) {
  assert.equal(spec.archive344.rawBytesSha256, C15.archive344SHA);
  const a = json15(spec.archive344); assert.equal(a.kind, 'actual-source14-input-preservation344'); assert.equal(a.root, C15.root);
  assert.equal(a.sourceCount, 420); assert.equal(a.compileCount, 528); assert.equal(a.helperCount, 218); assert.equal(a.treeFileCount, 746);
  assert.equal(a.archiveRoot, C15.private + '/source14-retained-inputs344-01');
  for (const [k, p] of [['sources', spec.sourcePins14], ['compiles', spec.compilePins14], ['helpers', spec.helperPins14]]) samePin15(a.manifests[k], p);
  const source = json15(spec.sourcePins14), compile = json15(spec.compilePins14), helper = json15(spec.helperPins14);
  assert.equal(source.length, 420); assert.equal(compile.length, 528); assert.equal(helper.length, 218);
  assert.equal(sha15(JSON.stringify(source)), C15.source14SHA); assert.equal(spec.helperPins14.rawBytesSha256, C15.helper14SHA);
  const expected = new Map([...compile, ...helper].map(p => [p.file, p.sha256])); assert.equal(expected.size, 746);
  assert.equal(a.files.length, 746); assert.deepEqual(sort(a.files.map(p => p.relative)), sort(expected.keys()));
  const map = new Map();
  for (const f of a.files) {
    assert.equal(f.original.file, C15.root + '/' + f.relative); assert.equal(f.archive.file, a.archiveRoot + '/tree/' + f.relative);
    assert.equal(f.original.rawBytesSha256, expected.get(f.relative)); assert.equal(f.archive.rawBytesSha256, f.original.rawBytesSha256); assert.equal(f.archive.bytes, f.original.bytes);
    readPin15(f.archive); map.set(f.relative, f.archive);
  }
  assert.deepEqual(tree15(a.archiveRoot + '/tree'), sort(expected.keys()));
  for (const p of source) assert.equal(expected.get(p.file), p.sha256);
  // Cargo input enumeration uses the preserved tree, not a falsely relabelled current context.
  assert.deepEqual(cargoFiles15(a.archiveRoot + '/tree'), compile.map(x => x.file).filter(f => f.startsWith('apps/poms-api-rust/') || f.startsWith('.cargo/')).sort());
  assert.equal(a.preservedRuntime.length, 7);
  for (const f of a.preservedRuntime) { assert.equal(f.original.rawBytesSha256, f.archive.rawBytesSha256); assert.equal(f.original.bytes, f.archive.bytes); readPin15(f.original); readPin15(f.archive); }
  for (const k of ['registry4', 'candidateB0_14', 'candidateB1_14']) { const pair = a.preservedRuntime.find(x => same(x.original, spec[k])); assert(pair, 'Exact published14 artifact must be in actual344 runtime preservation: ' + k); }
  const review = json15(spec.archive344Review); assert.equal(spec.archive344Review.rawBytesSha256, '6a0341fd2176e5d8d1625d3a2dde6ac3f083732edfc49f77b7f3818385781ef3'); assert.equal(review.kind, 'non-author-source14-input-preservation344-readback');
  return { archive: a, source, compile, helper, map };
}

// The following three historical producer/resource functions are verbatim
// private functions from the frozen252 helper. Author evidence records exact
// source spans and raw hashes; their context stays the honest original Root.
function oldContext252(ctx,p,old){return{...ctx,epoch:C252.producerEpoch,run:C252.run,priv:ctx.private+'/business/'+C252.producerEpoch+'/'+C252.run,state:old,pins:old.sourcePins,helperPins:json(p.producer.helperPins)};}
function producer252(ctx,p){const index=json(p.producer.retentionIndex),old=json(p.producer.frozenState);assertFinalProducer252(index,old,p);assert.equal(index.retentionMode,'post-runtime-loss-partial25203');assert.deepEqual(index.runtimeLoss,p.runtimeLoss);samePin252(p.runtimeLoss.frozenState,p.producer.frozenState);samePin252(p.runtimeLoss.partialOutcome,index.H46Outcome);samePin252(p.runtimeLoss.sourcePins13,p.producer.sourcePins);samePin252(p.runtimeLoss.helperH1,p.producer.helperPins);samePin252(p.runtimeLoss.oldAPI136,p.producer.apiProcess);const lossFacts=verifyLossEvidence25203({claims:p.runtimeLoss,state:old,readJSON:json,readBytes:readPin252,readRows:rows252,assertDataEqual:assertDataEqual252});assertSupplementUnion25203(p.evidenceSupplements,lossFacts.externalSourceFiles);assert.notEqual(p.producer.frozenState.file,ctx.private+'/business/g2-business13/main01/state.json');inside(ctx.private+'/business/g2-business13/main01',p.producer.frozenState.file);assert.equal(json(p.producer.helperPins).length,198);
 for(const s of index.evidenceSupplements){for(const f of s.sourceFiles)readPin252(f);for(const k of['independentReview','actualReconciliation','actualContinuation'])readPin252(s[k]);}const origin=json(p.producer.registry3),legacy=oldContext252(ctx,p,old);verifySchemaBinding108(legacy,old.schemaComparison108,origin);validateRegistryLineage62(legacy,origin);const stable=index.stableObservations.map(json);for(const s of stable){assert.equal(s.epoch,C252.producerEpoch);assert.equal(s.run,C252.run);assert.equal(s.marker,old.marker);assertRecorded(legacy,s);}assertDataEqual252(stable[0],stable[1],rows252);const administrativeAfter=json(json(p.runtimeLoss.administrative28602).after);for(const s of stable)assertDataEqual252(administrativeAfter,s,rows252);
 const history=verifyRetainedToolAdmission119252(legacy,origin,{kind:'sealed-source13-code-parent252',frozenState:p.producer.frozenState,sourcePins:p.producer.sourcePins,helperPins:p.producer.helperPins,codeRoot:p.producer.archiveRoot,archiveManifest:p.producer.archiveManifest,apiBinary:p.producer.apiBinary,summaryBinary:p.producer.summaryBinary,binaryFiles:p.producer.binaryFiles,candidateB2:p.producer.candidateB2});return{index,old,origin,legacy,history};}
function fullResource252(ctx,p,frame){const output=[];for(const d of p.resources){assert(typeof d.registryPath==='string'&&d.registryPath.startsWith('/fixtures/'));const record=pointer252(frame.old,d.registryPath);assert(record);const allIds=sort([...projectAnchors252(record)]);let ids=allIds;if(d.kind==='registry3'){const admitted=frame.origin.fixtureAdmissions.find(x=>x.registryPath===d.registryPath);assert(admitted,'Published R3 resource required');ids=sort(admitted.projectIds);for(const id of ids)assert(allIds.includes(id),'Published R3 project must remain an actual frozen record anchor');}assert.deepEqual(sort(d.projectIds),ids,'Declared resource must equal published R3 scope or every new-resource anchor');assert(ids.length>0);let birth,prior=null,projectBirths=[];
  if(d.kind==='registry3'){prior=frame.origin.fixtureAdmissions.find(x=>x.registryPath===d.registryPath);assert(prior);assert.deepEqual(sort(prior.projectIds),ids);birth=prior.birthSource??frame.origin.producer;for(const item of prior.identity)assert.deepEqual(pointer252(record,item.path),item.value);if(['immutable-ui-producer','legacy-compatibility'].includes(prior.mode)){const projection=Object.fromEntries(Object.entries(record).filter(([k])=>!['UICommandObserved','UICommandObserverReceipt','UICommandResponseOriginal','UICommandOperationId'].includes(k)));assert.equal(sha252(JSON.stringify(projection)),prior.producerProjectionSHA256);}projectBirths=ids.map(id=>({projectId:id,kind:'original-registry-lineage',priorRegistry:p.producer.registry3,recordBirth:birth}));}
  else if(d.kind==='tool119'){assert.equal(d.registryPath,'/fixtures/sharedSourceFollowup58');const r=frame.history.registry.derived.resource;assert.equal(sha252(JSON.stringify(record)),r.recordSHA256);assert.deepEqual(r.projectIds,ids);birth=r.recordProducerSource;projectBirths=r.projectBirths;prior={mode:'retained-tool119',receipts:r.receipts.map(x=>x.pin)};}
  else{assert.equal(d.kind,'producer13');assert.equal(record.sourcePinsSHA256,C252.producerSourceSHA);birth={epoch:C252.producerEpoch,run:C252.run,sourcePinsSHA256:C252.producerSourceSHA,sourceCount:416,sourceState:p.producer.frozenState};
   for(const id of ids){const entry=frame.index.projectBirths.find(e=>e.registryPath===d.registryPath&&e.projectId===id);assert(entry,'Each new13 project requires exact original HTTP and complete ledger pins');const verified=verifyProducerProjectBirth252({state:frame.old,entry,database:ctx.database,readJSON:json,readRows:rows252});projectBirths.push({...verified,source:birth});}
  }
  if(record.sourcePinsSHA256!==undefined)assert.equal(record.sourcePinsSHA256,birth.sourcePinsSHA256);const mode=prior?.mode??'immutable-producer13',receipts=[...(prior?.receipts??[]),...(d.receipts??[]),...projectBirths.filter(x=>x.kind==='original-Source13-HTTP-birth').flatMap(x=>[x.http,x.ledger])];if(d.registryPath==='/fixtures/hPolicyCoverage26'){samePin252(d.producerOutcome,frame.index.H46Outcome);readPin252(d.producerOutcome);assert(receipts.some(q=>same(q,d.producerOutcome)),'Actual13 H46 success/partial outcome must be explicitly retained');if(record.result)assert(receipts.some(q=>same(q,record.result)),'Actual13 H46 completion must be explicitly retained');}for(const r of receipts)readPin252(r);output.push({registryPath:d.registryPath,mode,recordBirth:birth,originalProducerState:birth.sourceState,projectIds:ids,projectBirths,retainedRecordSHA256:sha252(JSON.stringify(record)),retainedProjectionSHA256:sha252(JSON.stringify(resourceProjection252(record,mode))),receipts});
 }for(const entry of frame.origin.fixtureAdmissions)assert(output.some(x=>x.registryPath===entry.registryPath),'Original R3 entry omitted');for(const b of frame.index.projectBirths)assert(output.some(x=>x.registryPath===b.registryPath&&x.projectBirths.some(p=>p.kind==='original-Source13-HTTP-birth'&&p.projectId===b.projectId)),'Orphan/unselected13 birth entry is not authority');assert(output.some(x=>x.registryPath==='/fixtures/sharedSourceFollowup58'));assert(output.some(x=>x.registryPath==='/fixtures/hPolicyCoverage26'&&x.recordBirth.epoch===C252.producerEpoch));return output;}


function historicalBuild14(p, archive) {
  const b = json15(p.consumer.buildBinding), root = json15(b.Root.receipt), mirror = json15(b.mirror.receipt);
  assert.equal(b.kind, 'actual-source14-owned-root-mirror-build252'); assert.equal(b.namespace, C15.namespace);
  assert.equal(root.kind, 'actual-Source14-source-inventory-and-copy'); assert.equal(root.operation, 'source-inventory-and-copy'); assert.equal(root.root, C15.root); assert.equal(root.sourceStable, true);
  assert.equal(mirror.kind, 'actual-Source14-owned-mirror-cargo-checks-and-build'); assert.equal(mirror.operation, 'fmt-clippy-test-build'); assert.equal(mirror.root, C15.mirror); assert.equal(mirror.sourceStable, true);
  assert.equal(mirror.targetDirectory, p.consumer.binaryRoot); assert.equal(b.targetDirectory, p.consumer.binaryRoot);
  const canonical = (items, base) => items.map(x => ({ file: path.posix.relative(base, x.file), sha256: x.sha256 ?? x.rawBytesSha256 })).sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0);
  for (const [list, base] of [[root.inputs, root.root], [root.copiedInputs, root.destinationRoot], [mirror.inputs, mirror.root]]) assert.deepEqual(canonical(list, base), archive.compile);
  assert.equal(root.destinationRoot, mirror.root); assert.equal(b.completeCompileInputCount, 528); assert.equal(b.completeCompileInputsSHA256, sha15(JSON.stringify(archive.compile)));
  assert.equal(b.sourcePinsSHA256, C15.source14SHA); assert.equal(b.sourceCount, 420); samePin15(b.sourcePins, p.consumer.sourcePins); samePin15(b.helperPins, p.consumer.helperPins);
  const composition = json15(p.compositionManifest), originalArchive = json15(p.producer.archiveManifest), oldCompile = json15(originalArchive.completeCompileInventory);
  const oldCanonical = canonical(oldCompile.inputs, oldCompile.root);
  assertAuthorities25203(composition, json15);
  const closure = assertClosureDelta25203(composition, json15(p.producer.sourcePins), archive.source, oldCanonical, archive.compile);
  assert.deepEqual(closure.sourceDelta.map(x => ({ file: x.file, beforeSHA256: x.beforeSHA256, afterSHA256: x.afterSHA256 })), p.sourceDeltas);
  for (const e of composition.entries) for (const step of e.steps) if (step.artifact) readPin15(step.artifact);
  for (const v of composition.validationArtifacts) { readPin15(v.after); /* Validation artifacts remain separately pinned; not counterfeit Cargo inputs. */ }
  const suffixes = { fmt: ['--', '--check'], clippy: ['--lib', '--no-deps', '--', '-D', 'warnings'], test: ['--all-targets'], build: ['--bin', 'poms-api-rust', '--example', 'r4ghi_summary_producer08'] };
  for (const name of Object.keys(suffixes)) {
    const s = mirror.steps[name]; assert.equal(s.kind, 'actual-owned-mirror-cargo-command'); assert.equal(s.command, name); assert.equal(s.exitCode, 0); assert.equal(s.cwd, C15.mirror); assert.equal(s.targetDirectory, p.consumer.binaryRoot);
    assert.deepEqual(s.argv, ['/home/wangzishi/.cargo/bin/cargo', '+1.99.1', name, '--manifest-path', C15.mirror + '/apps/poms-api-rust/Cargo.toml', ...suffixes[name]]); readPin15(s.stdout); readPin15(s.stderr);
  }
  assert.deepEqual(b.binaryFiles, p.consumer.binaryFiles);
  for (const k of ['binary', 'summaryBinary']) { samePin15(b[k], p.consumer[k]); samePin15(mirror[k], p.consumer[k]); binary15(p.consumer[k], p.consumer.binaryFiles); }
  const ready = json15(p.consumer.readiness), process = json15(p.consumer.apiProcess);
  assert.equal(ready.mode, 'start'); assert.equal(ready.port, 31441); assert.equal(ready.readiness, 200); assert.equal(ready.privateCredentialsPrinted, false); assert.equal(ready.pid, process.pid); assert.equal(ready.binarySha256, process.binarySha256);
  return process;
}
function historicalRegistry14(spec, state, archive) {
  const reg = json15(spec.registry4), p = json15(reg.approvedPlan);
  assert.equal(reg.schemaVersion, 4); assertPlanShape252(p); samePin15(state.codeEpochAdmission252.registry, spec.registry4); samePin15(state.consumerAdmission54.registry, spec.registry4);
  const ctx = { namespace: C15.namespace, base: 'aaa4b16ac66092f0cb1dc6646a02cf14e80823ee', win: C15.root, mirror: C15.mirror, private: C15.private, stateRoot: C15.private.slice(0, -8), epoch: 'g2-business14', run: 'main01', priv: C15.private + '/business/g2-business14/main01',
    host: '127.0.0.1', port: 25434, owner: 'poms_r0e_owner', apps: ['poms_r4ghi_native_app', 'poms_r4ghi_rust_app'], api: 'http://127.0.0.1:31441', origin: 'http://127.0.0.1:44551',
    state, pins: state.sourcePins, helperPins: archive.helper, database: 'poms_r4ghi_rust', databases: ['poms_r4ghi_native', 'poms_r4ghi_rust'], migrations: 98, tables: 139 };
  const frame = producer252(ctx, p), resources = fullResource252(ctx, p, frame), process = historicalBuild14(p, archive);
  assert.deepEqual(state.sourcePins, archive.source); assert.deepEqual(json15(p.consumer.sourcePins), archive.source); assert.deepEqual(json15(p.consumer.helperPins), archive.helper);
  sourceDeltas252(frame.old.sourcePins, archive.source, p.sourceDeltas); sourceDeltas252(json15(p.producer.helperPins), archive.helper, p.helperDeltas);
  assertApprovals252(p, json15(p.independentReview), json15(p.G2Approval));
  assert.equal(process.namespace, C15.namespace); assert.equal(process.root, C15.mirror); assert.equal(process.port, 31441);
  assert.equal(process.binary, p.consumer.binary.file); assert.equal(process.binarySha256, p.consumer.binary.rawBytesSha256); assert.deepEqual(state.apiProcess.record, process);
  samePin15(spec.apiProcess14, p.consumer.apiProcess); samePin15(spec.binary14, p.consumer.binary); samePin15(spec.summaryBinary14, p.consumer.summaryBinary); assert.deepEqual(spec.binaryFiles14, p.consumer.binaryFiles);
  samePin15(spec.candidateB0_14, p.consumer.bootstrap); samePin15(spec.candidateB1_14, state.codeEpochAdmission252.candidate ?? spec.candidateB1_14);
  const b0 = json15(spec.candidateB0_14), b1 = json15(spec.candidateB1_14);
  // Only these original data constructors are used; never its current guard.
  assert.deepEqual(b0, bootstrapBody252(p, process)); assert.deepEqual(b1, admittedBody252(p, spec.registry4, b0));
  assert.equal(b0.kind, 'actual-Source14-bootstrap-code-candidate252'); assert.equal(b0.epoch, 'g2-business14'); assert.equal(b0.originalReadinessInherited, false);
  assert.equal(b1.kind, 'actual-Source14-admitted-code-candidate252'); samePin15(b1.consumerAdmission.registry, spec.registry4); samePin15(b1.bootstrapCandidate, spec.candidateB0_14);
  for (const key of ['sourcePinsSHA256', 'sourceCount', 'plainSourcePins', 'helperPins', 'process', 'binary', 'summaryBinary', 'trustedSummaryBinary', 'buildBinding', 'readinessOriginal', 'readiness', 'originalReadinessInherited']) assert.deepEqual(b1[key], b0[key]);
  assert.equal(b0.sourcePinsSHA256, C15.source14SHA); assert.equal(b0.sourceCount, 420); samePin15(b0.plainSourcePins, p.consumer.sourcePins); samePin15(b0.helperPins, p.consumer.helperPins); samePin15(b0.buildBinding, p.consumer.buildBinding); samePin15(b0.readinessOriginal, p.consumer.readiness); assert.deepEqual(b0.process.record, process);
  const observations = p.consumer.freshSnapshots.map(json15); assert.equal(observations.length, 2);
  const conservation = observations.map(s => { assert.equal(s.epoch, 'g2-business14'); assert.equal(s.marker, state.marker); return assertDataEqual252(json15(p.producer.retainedSnapshot), s, rows15); });
  const observed = json15(p.consumer.observationReceipt);
  assert.equal(observed.kind, 'actual-source14-state-free-M98-observation252');
  for (const [a, b] of [[observed.retentionIndex, p.producer.retentionIndex], [observed.frozenState, p.producer.frozenState], [observed.sourcePins, p.consumer.sourcePins], [observed.helperPins, p.consumer.helperPins], [observed.apiProcess, p.consumer.apiProcess]]) samePin15(a, b);
  assert.deepEqual(observed.binaryFiles, p.consumer.binaryFiles); assert.deepEqual(observed.freshSnapshots, p.consumer.freshSnapshots);
  for (const k of ['stateMinted', 'noDomainHTTP', 'noMigration']) assert.equal(observed[k], k !== 'stateMinted');
  const impact = json15(p.consumer.impactReview); assert.equal(impact.kind, 'approved-same-M98-code-epoch-impact252'); assert.equal(impact.producerSourcePinsSHA256, C252.producerSourceSHA); assert.equal(impact.consumerSourcePinsSHA256, C15.source14SHA); assert.equal(impact.retainHistoricalLabels, true); assert.equal(impact.currentConsumerCertificationGranted, false);
  const tooling = json15(p.tooling.manifest); assert.equal(tooling.kind, 'same-M98-code-epoch-composition25203-proposal');
  for (const k of ['capture', 'publisher', 'core']) { readPin15(p.tooling[k]); assert(tooling.files.some(f => f.rawBytesSha256 === p.tooling[k].rawBytesSha256 && f.file.endsWith('/' + path.basename(p.tooling[k].file)))); }
  const expected = { schemaVersion: 4, kind: 'verified-retained-data-consumer-registry54', namespace: C252.namespace, marker: frame.old.marker, approvedPlan: reg.approvedPlan,
    producer: { epoch: C252.producerEpoch, run: C252.run, sourcePinsSHA256: C252.producerSourceSHA, sourceCount: 416, binarySHA256: C252.producerBinarySHA },
    consumer: { epoch: C252.consumerEpoch, run: C252.run, sourcePins: p.consumer.sourcePins, sourcePinsSHA256: p.consumer.sourcePinsSHA256, sourceCount: p.consumer.sourceCount, helperPins: p.consumer.helperPins, binarySHA256: p.consumer.binary.rawBytesSha256, apiProcess: p.consumer.apiProcess, trustedSummaryBinary: p.consumer.trustedSummaryBinary, candidateReceipt: p.consumer.bootstrap, impactReview: p.consumer.impactReview },
    originalBaseline: frame.old.baseline, schemaComparison108: frame.old.schemaComparison108, priorRegistry: p.producer.registry3, retentionIndex: p.producer.retentionIndex, producerState: p.producer.frozenState, retainedSnapshot: p.producer.retainedSnapshot,
    historical119: { status: 'actual-published-and-consumed-at-Source13', registry: p.producer.tool119, candidateB2: p.producer.candidateB2, helperPins: p.producer.helperPins }, codeEpoch252: { kind: 'same-M98-code-only-consumer252', protocolVersion: 3, compositionManifest: p.compositionManifest, runtimeLoss: p.runtimeLoss, freshSnapshots: p.consumer.freshSnapshots, archiveManifest: p.producer.archiveManifest, buildBinding: p.consumer.buildBinding, conservation, migrationExecuted: false, businessBaselineReset: false }, fixtureAdmissions: resources, inheritedProducerEvidenceIsNotCurrentConsumerAcceptance: true, G3Certified: false, G4Certified: false };
  assert.deepEqual(reg, expected);
  assert.deepEqual(reg, registryBody252(ctx, p, reg.approvedPlan, { frame, resources, conservation }));
  assertImmutableParents252(state, frame.old, resources); assert.deepEqual(state.producerExecutionHistory252, [...(frame.old.producerExecutionHistory252 ?? []), producerHistory252(frame.old, p)]);
  for (const k of p.stateTransfer.preserveTopLevel.filter(k => !['actors', 'owned', 'borrowed', 'fixtures', 'objects'].includes(k))) assert.deepEqual(state[k], frame.old[k]);
  const command = frame.index.commands.find(x => x.pointer === '/taxContinuation13/mainCompletion'); assert(command);
  const Main13Bridge = { record: verifyRetainedMain252({ state: frame.old, current: state, entry: command, receipt: command.original, database: ctx.database, readJSON: json15, readRows: rows15 }), producerEpoch: 'g2-business13', producerState: p.producer.frozenState, retainedThrough14: spec.frozenState14, original: command.original, replayForbidden: true, currentConsumerCertified: false };
  return { registry: reg, resources, Main13Bridge, ctx, process, plan: p };
}
function verifyActualHTTP14(index, state) {
  const pins = index.actualHTTP14.attempts, public14 = C15.root + '/tmp/rust-r4ghi/business/g2-business14/main01';
  assert(Array.isArray(pins) && pins.length === 10);
  assert.deepEqual(pins.map(p => p.file), fs.readdirSync(public14).filter(n => /^\d{6}-http-http\.json$/.test(n)).sort().map(n => public14 + '/' + n));
  let login = null;
  for (const pin of pins) {
    const http = json15(pin), cfg = json15(http.originals.requestConfig);
    assert.equal(http.kind, 'actual-business-HTTP-attempt'); assert.equal(http.status, 200); assert.equal(http.expectedStatus, 200); assert.equal(http.responseComplete, true); assert.equal(http.transportFailure, false);
    assert(typeof http.requestId === 'string' && /^[A-Za-z0-9_-]{1,100}$/.test(http.requestId) && http.requestId.startsWith(state.prefix + '-'));
    assert.equal(cfg.requestId, http.requestId); assert.equal(cfg.headers?.['X-Request-Id'], http.requestId); assert.equal(cfg.operationId, http.operationId); assert.equal(cfg.method, http.method); assert(cfg.url.startsWith('http://127.0.0.1:31441/api/'));
    for (const p of Object.values(http.originals)) { inside(C15.private + '/business/g2-business14/main01', p.file); readPin15(p); }
    assert.equal(json15(http.originals.responseHeaders).status, 200);
    if (http.method === 'POST') { assert.equal(login, null); assert.equal(http.operationId, 'AuthController_createPasswordAuthSession'); login = http; } else assert.equal(http.method, 'GET');
  }
  assert(login); assert.equal(index.actualHTTP14.loginRequestId, login.requestId);
  const owner = Object.values(state.owned).filter(x => x.table === 'auth_session' && x.proof?.requestId === login.requestId); assert.equal(owner.length, 1);
  for (const [k, v] of Object.entries({ transport: 'HTTP', status: 200, responseComplete: true, beforeAbsent: true, operationId: login.operationId })) assert.equal(owner[0].proof[k], v);
}
function verifyRetained14Body15(spec, requireRetired) {
  keys15(spec, ['archive344', 'archive344Review', 'finalRetention14', 'finalRetentionReview', 'frozenState14', 'ownership14', 'registry4', 'candidateB0_14', 'candidateB1_14', 'sourcePins14', 'compilePins14', 'helperPins14', 'apiProcess14', 'binary14', 'summaryBinary14', 'binaryFiles14', 'retirement14'], 'parent14');
  for (const k of Object.keys(spec).filter(k => k !== 'binaryFiles14' && (requireRetired || k !== 'retirement14'))) pin15(spec[k]);
  if (!requireRetired) assert.equal(spec.retirement14, null, 'Retire preparation cannot pre-invent its result');
  const archive = verifyArchive344For15(spec), index = json15(spec.finalRetention14), state = json15(spec.frozenState14);
  assert.equal(index.kind, 'actual-final-source14-M98-retention119'); assert.equal(index.finalRetainedPoint, true); assert.equal(index.diagnosticOnly, false);
  samePin15(index.frozenState, spec.frozenState14); samePin15(index.frozenOwnership, spec.ownership14); samePin15(index.registry4, spec.registry4); samePin15(index.archive344, spec.archive344);
  assert.equal(spec.frozenState14.rawBytesSha256, C15.state14SHA); assert(spec.frozenState14.file.startsWith(C15.private + '/business/g2-business14/main01/retained-capture119-'));
  assert.equal(spec.ownership14.rawBytesSha256, archive.archive.ownership.rawBytesSha256); readPin15(spec.ownership14);
  assert.equal(state.namespace, C15.namespace); assert.equal(state.epoch, C15.producerEpoch); assert.equal(state.run, C15.run); assert.equal(state.sequence, 24);
  assert.equal(state.baseline.rawBytesSha256, C15.originalBaselineSHA); assert(!state.taxContinuation14?.sweep?.finalSuccess);
  for (const k of ['stateMinted', 'Source15Admitted', 'G3Certified', 'G4Certified', 'successfulTaxPreparation14']) assert.equal(index[k], false);
  for (const k of ['noDomainHTTP', 'noStateRewrite', 'noMigration', 'noBusinessBaselineReset']) assert.equal(index[k], true);
  assert.equal(index.authPOSTStatus, 200); assert.equal(index.actualHTTP14.loginPOSTStatus, 200); assert.equal(index.actualHTTP14.domainPOSTs, 0);
  verifyActualHTTP14(index, state);
  const legacy = historicalRegistry14(spec, state, archive);
  assert.deepEqual(index.resources, legacy.resources); assert.deepEqual(index.Main13Bridge, legacy.Main13Bridge);
  const stable = index.stableObservations.map(json15); assert.equal(stable.length, 2); samePin15(index.retainedSnapshot, index.stableObservations[1]);
  assert.notEqual(index.stableObservations[0].file, index.stableObservations[1].file);
  for (const s of stable) { assert.equal(s.epoch, C15.producerEpoch); assert.equal(s.run, C15.run); assert.equal(s.marker, state.marker); assertRecorded(legacy.ctx, s); }
  const conservation = assertDataEqual252(stable[0], stable[1], rows15);
  const review = json15(spec.finalRetentionReview); assert.equal(spec.finalRetentionReview.rawBytesSha256, '66f3a8973de24e06779d16d00b7aa693e894e756ff4c3e244e61484672cecb58'); assert.equal(review.kind, 'non-author-final-source14-retention-readback119'); assert.equal(review.verdict, 'approved-final14-retention-only'); samePin15(review.finalRetention14, spec.finalRetention14); samePin15(review.frozenState14, spec.frozenState14); samePin15(review.frozenOwnership14, spec.ownership14);
  assert.equal(review.reviewerIsCaptureAuthor, false); assert.equal(review.full139x2CaptureReadback, true); assert.equal(review.actualSource15Admission, false); assert.equal(review.source15EffectReadmission, false); assert.equal(review.actualG2ForSource15, false);
  if (requireRetired) {
   const retired = json15(spec.retirement14); assert.equal(retired.kind, 'actual-source14-API-retirement-for15'); samePin15(retired.apiProcess14, spec.apiProcess14); assert.deepEqual(retired.processRecord, legacy.process); assert.equal(retired.signalOwnedIdentityVerified, true); assert.equal(retired.stopped, true);
   if (fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim() === legacy.process.bootId && fs.existsSync('/proc/' + legacy.process.pid + '/stat')) {
    const stat = fs.readFileSync('/proc/' + legacy.process.pid + '/stat', 'utf8'); assert.notEqual(stat.slice(stat.lastIndexOf(') ') + 2).split(' ')[19], legacy.process.startTime, 'Retired API14 must not still be the same live process');
   }
  }
  return { kind: 'verified-fixed14-retained-parent-for15', frozenState14: spec.frozenState14, registry4: spec.registry4, archive344: spec.archive344, finalRetention14: spec.finalRetention14,
    state, resources: legacy.resources, Main13Bridge: legacy.Main13Bridge, conservation, source14: archive.source, compile14: archive.compile, helper14: archive.helper, retirementVerified: requireRetired, retainedParentOnly: true, current15Granted: false };
}
export function verifyRetained14For15(spec) { return verifyRetained14Body15(spec, true); }
// Internal-only pre-retirement reader for the fixed external retire14 mode.
// It cannot feed Reg5: verifyPlan15 always calls verifyRetained14For15 above.
export function verifyRetained14BeforeRetirement15(spec) { return verifyRetained14Body15(spec, false); }
