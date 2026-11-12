// Fixed14 ->15 pure rules. No filesystem, process, context, SQL or HTTP.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
export const C15 = Object.freeze({ namespace: 'poms-r4ghi', producerEpoch: 'g2-business14', consumerEpoch: 'g2-business15', run: 'main01', tables: 139, migrations: 98,
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', mirror: '/home/wangzishi/projects/poms-rust-r4ghi', private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  archive344SHA: '0df8b21ec95ee497feb0c049ecdfea95c7824cdf98b7d6c8363562964717bc77', state14SHA: 'bd21c40006d831dea4e0b1d45ef3c0b6548ada6739268b8724ab3bb09c333b97',
  originalBaselineSHA: 'f4026a1464d843d45b986f999d4dbbedbce967e941736e386512cb1103fe734d', source14SHA: 'f99501c14e52968dbda47dde1243597e32b24e8433e90669d9aea8c5bdf3cf1d',
  helper14SHA: 'ad317f729c087788761b6a7eecc3a9db042f64d98231d5ab0e8fa1dd0dbea433',
});
export const sha15 = value => createHash('sha256').update(value).digest('hex');
export const sort15 = values => [...values].sort();
export function keys15(value, keys, name = 'object') { assert(value && typeof value === 'object' && !Array.isArray(value), name); assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Exact ' + name + ' keys required'); }
export function pin15(pin) { assert(pin && typeof pin.file === 'string' && pin.file.startsWith('/') && !pin.file.includes('\\') && !pin.file.split('/').some(x => ['.', '..'].includes(x))); assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256)); if (pin.bytes !== undefined) assert(Number.isSafeInteger(pin.bytes) && pin.bytes >= 0); return pin; }
export const pinOnly15 = p => ({ file: pin15(p).file, rawBytesSha256: p.rawBytesSha256 });
export function samePin15(a, b) { assert.deepEqual(pinOnly15(a), pinOnly15(b)); }
export function pointer15(object, pointer) { assert(typeof pointer === 'string' && pointer.startsWith('/') && !pointer.includes('~')); return pointer.slice(1).split('/').reduce((x, key) => x?.[key], object); }
export function canonical15(value) {
  const encode = x => { if (x === null || ['string', 'boolean'].includes(typeof x)) return x; if (typeof x === 'number') { assert(Number.isFinite(x)); return x; } if (Array.isArray(x)) return x.map(encode); assert(x && typeof x === 'object' && Object.getPrototypeOf(x) === Object.prototype, 'Plain JSON only'); return Object.fromEntries(Object.keys(x).sort().map(key => { assert(x[key] !== undefined); return [key, encode(x[key])]; })); };
  return JSON.stringify(encode(value));
}
export const consumerKeys15 = ['epoch', 'run', 'sourcePins', 'sourcePinsSHA256', 'sourceCount', 'compilePins', 'helperPins', 'helperCount', 'apiProcess', 'binary', 'summaryBinary', 'trustedSummaryBinary', 'binaryFiles', 'binaryRoot', 'buildBinding', 'readiness', 'observationReceipt', 'freshSnapshots', 'bootstrapCandidate'];
export const parentKeys15 = ['archive344', 'archive344Review', 'finalRetention14', 'finalRetentionReview', 'frozenState14', 'ownership14', 'registry4', 'candidateB0_14', 'candidateB1_14', 'sourcePins14', 'compilePins14', 'helperPins14', 'apiProcess14', 'binary14', 'summaryBinary14', 'binaryFiles14', 'retirement14'];
export function assertPlanShape15(p, stage) {
  assert(['pre-observe', 'bootstrap', 'inspect', 'publish', 'B1'].includes(stage));
  keys15(p, ['kind', 'protocolVersion', 'schemaVersion', 'namespace', 'producerEpoch', 'consumerEpoch', 'run', 'parent14', 'consumer', 'sourceDeltas', 'productComposition', 'helperComposition', 'stateTransfer', 'resources', 'tooling', 'independentReview', 'RootExecutionApproval'], 'plan15');
  assert.equal(p.kind, 'fixed-Source14-to15-admission119-plan'); assert.equal(p.protocolVersion, 1); assert.equal(p.schemaVersion, 5);
  for (const k of ['namespace', 'producerEpoch', 'consumerEpoch', 'run']) assert.equal(p[k], C15[k]);
  keys15(p.parent14, parentKeys15, 'parent14'); for (const k of parentKeys15.filter(k => k !== 'binaryFiles14')) pin15(p.parent14[k]);
  assert(Array.isArray(p.parent14.binaryFiles14) && p.parent14.binaryFiles14.length === 2);
  keys15(p.consumer, consumerKeys15, 'consumer15'); assert.equal(p.consumer.epoch, C15.consumerEpoch); assert.equal(p.consumer.run, C15.run);
  const c = p.consumer;
  for (const k of ['sourcePins', 'compilePins', 'helperPins', 'apiProcess', 'binary', 'summaryBinary', 'trustedSummaryBinary', 'buildBinding', 'readiness']) pin15(c[k]);
  assert(Number.isSafeInteger(c.sourceCount) && c.sourceCount > 0); assert(Number.isSafeInteger(c.helperCount) && c.helperCount >= 222);
  assert(/^[a-f0-9]{64}$/.test(c.sourcePinsSHA256)); assert(c.binaryRoot.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/'));
  assert(Array.isArray(c.binaryFiles) && c.binaryFiles.length === 2); samePin15(c.summaryBinary, c.trustedSummaryBinary);
  if (stage === 'pre-observe') { assert.equal(c.observationReceipt, null); assert.equal(c.freshSnapshots, null); }
  else { pin15(c.observationReceipt); assert(Array.isArray(c.freshSnapshots) && c.freshSnapshots.length === 2); c.freshSnapshots.forEach(pin15); assert.notEqual(c.freshSnapshots[0].file, c.freshSnapshots[1].file); }
  if (['pre-observe', 'bootstrap'].includes(stage)) { assert.equal(c.bootstrapCandidate, null); assert.equal(p.independentReview, null); assert.equal(p.RootExecutionApproval, null); }
  else if (stage === 'inspect') { for (const x of [c.bootstrapCandidate, p.independentReview, p.RootExecutionApproval]) if (x !== null) pin15(x); }
  else { pin15(c.bootstrapCandidate); pin15(p.independentReview); pin15(p.RootExecutionApproval); }
  assert(Array.isArray(p.sourceDeltas)); assert(Array.isArray(p.resources) && p.resources.length > 0);
  pin15(p.productComposition); pin15(p.helperComposition);
  keys15(p.tooling, ['manifest', 'executionSources', 'independentCodeReview'], 'tooling15'); pin15(p.tooling.manifest); pin15(p.tooling.independentCodeReview);
  assert(Array.isArray(p.tooling.executionSources) && p.tooling.executionSources.length === 14); p.tooling.executionSources.forEach(pin15);
  return p;
}
export function scope15(p) {
  // The only exclusions are the three fields named in the frozen publication protocol.
  const q = structuredClone(p); q.consumer.bootstrapCandidate = null; q.independentReview = null; q.RootExecutionApproval = null;
  assertPlanShape15(q, q.consumer.observationReceipt === null ? 'pre-observe' : 'bootstrap');
  return sha15(canonical15(q));
}
export function assertPreAPIShape15(p) {
  keys15(p, ['kind', 'protocolVersion', 'schemaVersion', 'namespace', 'producerEpoch', 'consumerEpoch', 'run', 'parent14', 'consumer', 'sourceDeltas', 'productComposition', 'helperComposition', 'stateTransfer', 'resources', 'tooling', 'independentReview', 'RootExecutionApproval'], 'preAPI-plan15');
  assert.equal(p.kind, 'fixed-Source14-to15-admission119-plan'); assert.equal(p.protocolVersion, 1); assert.equal(p.schemaVersion, 5);
  for (const k of ['namespace', 'producerEpoch', 'consumerEpoch', 'run']) assert.equal(p[k], C15[k]);
  keys15(p.parent14, parentKeys15, 'parent14'); for (const k of parentKeys15.filter(k => k !== 'binaryFiles14')) pin15(p.parent14[k]);
  keys15(p.consumer, consumerKeys15, 'preAPI-consumer15'); assert.equal(p.consumer.epoch, C15.consumerEpoch); assert.equal(p.consumer.run, C15.run);
  for (const k of ['apiProcess', 'readiness', 'observationReceipt', 'freshSnapshots', 'bootstrapCandidate']) assert.equal(p.consumer[k], null, 'Pre-API must not invent runtime facts: ' + k);
  for (const k of ['sourcePins', 'compilePins', 'helperPins', 'binary', 'summaryBinary', 'trustedSummaryBinary', 'buildBinding']) pin15(p.consumer[k]);
  assert.equal(p.independentReview, null); assert.equal(p.RootExecutionApproval, null);
  assert(p.consumer.binaryRoot.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/')); samePin15(p.consumer.summaryBinary, p.consumer.trustedSummaryBinary);
  assert(Array.isArray(p.consumer.binaryFiles) && p.consumer.binaryFiles.length === 2); assert(Array.isArray(p.resources) && p.resources.length > 0);
  return p;
}
export function assertApprovals15(p, review, approval) {
  assert.equal(review.kind, 'non-author-fixed14-to15-admission119-review'); assert.equal(review.verdict, 'approved-bounded-publication'); assert(typeof review.author === 'string' && typeof review.reviewer === 'string' && review.author !== review.reviewer);
  for (const k of ['G3Certified', 'G4Certified']) assert.equal(review[k], false);
  assert.equal(review.scope15, scope15(p)); samePin15(review.bootstrapCandidate, p.consumer.bootstrapCandidate); samePin15(review.toolingManifest, p.tooling.manifest);
  assert.equal(approval.kind, 'Root-exact-fixed14-to15-publication119'); assert.equal(approval.scope15, scope15(p)); samePin15(approval.bootstrapCandidate, p.consumer.bootstrapCandidate); samePin15(approval.independentReview, p.independentReview); samePin15(approval.toolingManifest, p.tooling.manifest);
  for (const a of [review, approval]) { samePin15(a.finalRetention14, p.parent14.finalRetention14); samePin15(a.apiProcess15, p.consumer.apiProcess); samePin15(a.sourcePins15, p.consumer.sourcePins); samePin15(a.helperPins15, p.consumer.helperPins); samePin15(a.buildBinding15, p.consumer.buildBinding); }
  assert.equal(approval.allowedMode, 'publish'); assert.equal(approval.requiresState15Absent, true); assert.equal(approval.domainEffects, false);
}
export function exactDeltas15(beforePins, afterPins, declared) {
  const map = list => { assert(Array.isArray(list)); const m = new Map(); for (const p of list) { assert(typeof p.file === 'string' && !p.file.startsWith('/') && !p.file.includes('\\') && p.file.split('/').every(x => x && x !== '.' && x !== '..')); assert(/^[a-f0-9]{64}$/.test(p.sha256)); assert(!m.has(p.file)); m.set(p.file, p.sha256); } return m; };
  const before = map(beforePins), after = map(afterPins), actual = sort15(new Set([...before.keys(), ...after.keys()])).filter(file => before.get(file) !== after.get(file)).map(file => ({ file, beforeSHA256: before.get(file) ?? null, afterSHA256: after.get(file) ?? null }));
  assert.deepEqual(actual, [...declared].sort((a, b) => a.file < b.file ? -1 : a.file > b.file ? 1 : 0), 'Complete finite inventory delta required'); return actual;
}
export function assertStateTransfer15(t, old) {
  keys15(t, ['preserveTopLevel', 'historyOnlyTopLevel', 'replaceTopLevel', 'actorCacheFields'], 'stateTransfer15');
  const groups = [t.preserveTopLevel, t.historyOnlyTopLevel, t.replaceTopLevel];
  for (const list of groups) { assert(Array.isArray(list)); assert.deepEqual(list, sort15(new Set(list))); }
  const all = groups.flat(); assert.equal(new Set(all).size, all.length); assert.deepEqual(sort15(all), Object.keys(old).sort(), 'Unknown or omitted state field must be classified');
  assert.deepEqual(t.actorCacheFields, ['cookies', 'permissions']);
  for (const k of ['schemaVersion', 'namespace', 'marker', 'baseline', 'schemaComparison108', 'actors', 'owned', 'borrowed', 'fixtures', 'objects', 'taxContinuation13', 'taxContinuation14', 'producerExecutionHistory252']) assert(t.preserveTopLevel.includes(k), 'Required retained field: ' + k);
  for (const k of ['epoch', 'run', 'createdAt', 'prefix', 'sequence', 'sourcePins', 'apiProcess']) assert(t.replaceTopLevel.includes(k), 'Current metadata replacement required: ' + k);
  for (const k of ['consumerAdmission54', 'codeEpochAdmission252', 'actualAuthConfigurations', 'requiredWriteSweeps', 'efRequiredWriteSweeps40', 'statusSourcePins', 'consumerChecks', 'trustedSummarySeam14', 'toolAdmission119']) if (Object.hasOwn(old, k)) assert(t.historyOnlyTopLevel.includes(k), 'History-only runtime field: ' + k);
  assert.equal(old.namespace, C15.namespace); assert.equal(old.epoch, C15.producerEpoch); assert.equal(old.run, C15.run); assert.equal(old.sequence, 24);
  assert.equal(old.baseline.rawBytesSha256, C15.originalBaselineSHA); assert.equal(old.taxContinuation13.mainCompletion.status, 201); assert.equal(old.taxContinuation13.mainCompletion.postconditions, 'verified');
  return structuredClone(t);
}
export function assertPublishIdle15(state) {
  for (const k of ['activeFault', 'blockedObservation', 'cleaned', 'cleanupPlan', 'admissionPending54']) assert(!state[k], 'Publish requires idle: ' + k);
  for (const key of ['taxContinuation13', 'taxContinuation14', 'taxContinuation15']) for (const k of ['pendingMain', 'pendingTaxTrial', 'normalTaxPending']) assert(!state[key]?.[k], 'Uncertain command prevents publication');
}
export function resourceEntries15(parent) {
  assert.equal(parent.kind, 'verified-fixed14-retained-parent-for15'); assert.equal(parent.retainedParentOnly, true); assert.equal(parent.current15Granted, false);
  assert(Array.isArray(parent.resources) && parent.resources.length > 0);
  return parent.resources.map(e => { assert(e.registryPath.startsWith('/fixtures/')); assert(Array.isArray(e.projectIds) && e.projectIds.length > 0); assert(['g2-business10', 'g2-business11', 'g2-business12', 'g2-business13'].includes(e.recordBirth.epoch)); pin15(e.originalProducerState); return structuredClone(e); });
}
export function tuple15(p, apiRecord) {
  return { epoch: C15.consumerEpoch, run: C15.run, sourcePins: p.consumer.sourcePins, sourcePinsSHA256: p.consumer.sourcePinsSHA256, sourceCount: p.consumer.sourceCount, compilePins: p.consumer.compilePins,
    helperPins: p.consumer.helperPins, helperCount: p.consumer.helperCount, process: { ...pinOnly15(p.consumer.apiProcess), record: apiRecord }, binary: p.consumer.binary,
    summaryBinary: p.consumer.summaryBinary, trustedSummaryBinary: p.consumer.trustedSummaryBinary, buildBinding: p.consumer.buildBinding, readinessOriginal: p.consumer.readiness,
    readiness: 200, originalReadinessInherited: false };
}
export function bootstrapBody15(p, inputPin, bootstrapApprovalPin, apiRecord) {
  return { kind: 'actual-Source15-bootstrap-code-candidate119', protocolVersion: 1, scope15: scope15(p), candidateInput: pinOnly15(inputPin), bootstrapOnlyG2: pinOnly15(bootstrapApprovalPin), ...tuple15(p, apiRecord), stateMinted: false, ordinaryContextGranted: false, G3Certified: false, G4Certified: false };
}
export function registryBody15(p, planPin, facts) {
  return { schemaVersion: 5, protocolVersion: 1, kind: 'verified-retained-data-consumer-registry54', namespace: C15.namespace, marker: facts.parent.state.marker,
    approvedPlan: pinOnly15(planPin), scope15: scope15(p), producer: { epoch: C15.producerEpoch, run: C15.run, sourcePinsSHA256: C15.source14SHA, sourceCount: 420 },
    consumer: { ...tuple15(p, facts.apiRecord), apiProcess: p.consumer.apiProcess, candidateReceipt: p.consumer.bootstrapCandidate },
    producerState: p.parent14.frozenState14, retentionIndex: p.parent14.finalRetention14, priorRegistry: p.parent14.registry4,
    originalBaseline: facts.parent.state.baseline, schemaComparison108: facts.parent.state.schemaComparison108, fixtureAdmissions: resourceEntries15(facts.parent),
    inheritedProducerEvidenceIsNotCurrentConsumerAcceptance: true, noMigration: true, noBusinessBaselineReset: true, G3Certified: false, G4Certified: false };
}
export function admittedBody15(p, reg5Pin, bootstrap) {
  assert.equal(bootstrap.kind, 'actual-Source15-bootstrap-code-candidate119');
  return { ...structuredClone(bootstrap), kind: 'actual-Source15-admitted-code-candidate119', bootstrapCandidate: p.consumer.bootstrapCandidate,
    consumerAdmission: { registry: pinOnly15(reg5Pin) }, parent14: { frozenState14: p.parent14.frozenState14, registry4: p.parent14.registry4, finalRetention14: p.parent14.finalRetention14 }, G3Certified: false, G4Certified: false };
}
export function producerHistory15(old, p) {
  assertStateTransfer15(p.stateTransfer, old);
  return { kind: 'retained-published-partial-Source14-parent119', producerState: p.parent14.frozenState14, registry4: p.parent14.registry4, retentionIndex: p.parent14.finalRetention14,
    prefix: old.prefix, sequence: old.sequence, stateTransfer: p.stateTransfer, caches: Object.fromEntries(p.stateTransfer.historyOnlyTopLevel.map(k => [k, structuredClone(old[k])])),
    actorRuntimeCache: Object.fromEntries(Object.entries(old.actors).map(([k, v]) => [k, { cookies: structuredClone(v.cookies ?? {}), permissions: structuredClone(v.permissions ?? []) }])),
    successfulTaxPreparation14: false, retainedParentOnly: true };
}
export function assertRetainedOwnership15(current, old) {
  for (const [key, original] of Object.entries(old.owned)) { const now = current.owned[key]; assert(now, 'Retained ownership disappeared'); for (const field of ['database', 'table', 'key', 'firstSha256', 'proof']) assert.deepEqual(now[field], original[field], 'Original ownership birth changed: ' + field); }
  for (const [key, original] of Object.entries(old.borrowed)) { const now = current.borrowed[key]; assert(now, 'Retained borrowed registration disappeared'); for (const field of Object.keys(original).filter(f => !['latestSha256', 'latestXmin', 'latestProof'].includes(f))) assert.deepEqual(now[field], original[field], 'Borrowed original evidence changed'); }
  for (const [key, actor] of Object.entries(old.actors)) assert.equal(current.actors[key]?.id, actor.id, 'Retained actor identity changed');
  for (const [key, value] of Object.entries(old.objects)) assert.deepEqual(current.objects[key], value, 'Original immutable object ownership changed');
}
export function buildState15(parent14, facts, actualReg5Pin, nowUTC) {
  const old = parent14.state, p = facts.plan; assertPlanShape15(p, 'publish'); assertStateTransfer15(p.stateTransfer, old); assertPublishIdle15(old);
  assert.equal(parent14.kind, 'verified-fixed14-retained-parent-for15');
  const written = facts.actualWrittenB1; assert(written && written.verifiedFromDisk === true, 'The native publisher must supply its physically written/readback B1');
  pin15(written.pin); assert.notEqual(written.pin.file, actualReg5Pin.file); samePin15(written.body.consumerAdmission.registry, actualReg5Pin);
  assert.deepEqual(written.body, admittedBody15(p, actualReg5Pin, facts.bootstrap));
  assert.equal(new Date(nowUTC).toISOString(), nowUTC);
  const next = structuredClone(old), history = producerHistory15(old, p);
  for (const k of p.stateTransfer.historyOnlyTopLevel) delete next[k];
  next.producerExecutionHistory15 = [...(old.producerExecutionHistory15 ?? []), history];
  for (const a of Object.values(next.actors)) { a.cookies = {}; a.permissions = []; }
  Object.assign(next, { epoch: C15.consumerEpoch, run: C15.run, createdAt: nowUTC, prefix: 'bg' + sha15(C15.consumerEpoch + ':' + C15.run).slice(0, 10), sequence: 0,
    sourcePins: structuredClone(facts.sourcePins), apiProcess: { ...pinOnly15(p.consumer.apiProcess), record: facts.apiRecord },
    consumerAdmission54: { registry: pinOnly15(actualReg5Pin), approvedPlanSHA256: facts.planPin.rawBytesSha256, producerEpoch: C15.producerEpoch, consumerEpoch: C15.consumerEpoch, currentConsumerCoverageMustUseNewPrivateAndPublicDirectories: true },
    codeEpochAdmission15: { kind: 'fixed14-to15-code-epoch-state119', protocolVersion: 1, registry: pinOnly15(actualReg5Pin), approvedPlan: pinOnly15(facts.planPin), producerState: p.parent14.frozenState14, candidate: pinOnly15(written.pin) } });
  assert.notEqual(next.prefix, old.prefix);
  for (const k of p.stateTransfer.preserveTopLevel.filter(k => k !== 'actors')) assert.deepEqual(next[k], old[k], 'Preserved state changed: ' + k);
  return next;
}
export const GH15 = Object.freeze(['ProjectCostController_activateOperatingBaselinePackage', 'ProjectCostController_createProjectOperatingSnapshot', 'ProjectCostController_createPeriodClosingSnapshot', 'ProjectCostController_createOperatingRestatement', 'ProjectCostController_reviewOperatingSignalEvaluation', 'ProjectCostController_reviewCommissionGateBinding']);
// Exactly the actual inventory149 and separately approved checks03 identities.
// This data check is not an admission/capability or a fallback selection API.
export const RAW_HISTORY_IDENTITIES15 = Object.freeze({
  'inventory-copy': Object.freeze({ codeSHA256: '149bed1b19ebb1b1abdfeb0ebbf4b3184ad47d97aba94d597543bc7b68195ec8', manifestSHA256: 'cd6134adda18d034ca604ca31bc513c0ae591680e7aaad2d877ec2efe4ef4cca', edition: 'raw-build-only-sealed02' }),
  'checks-build': Object.freeze({ codeSHA256: 'cf7bedb074a0a0897354a43d18e00b358af81f7e789025dbd8208c0ab88c159b', manifestSHA256: '5293ec4e5e0dc08bb1ce29ca2da67f30b67d78f97addffefde0692ef7bb95b00', edition: 'raw-build-only-sealed03' }),
});
export function assertRawHistoryIdentity15(mode, codeSHA256, manifestSHA256, edition) { assert(Object.hasOwn(RAW_HISTORY_IDENTITIES15, mode), 'No unapproved raw-history mode'); const expected = RAW_HISTORY_IDENTITIES15[mode]; assert.equal(codeSHA256, expected.codeSHA256); assert.equal(manifestSHA256, expected.manifestSHA256); assert.equal(edition, expected.edition); return expected; }
export function cargoEnvironment15(target) { assert(typeof target === 'string' && target.startsWith('/home/wangzishi/.cache/poms-r4ghi-target-ROOT15/')); return { PATH: '/home/wangzishi/.cargo/bin:/usr/bin:/bin', HOME: '/home/wangzishi', USER: 'wangzishi', LANG: 'C.UTF-8', CARGO_TARGET_DIR: target, CARGO_NET_OFFLINE: 'true', CARGO_HOME: '/home/wangzishi/.cache/poms-r4def-cargo-home', RUSTUP_HOME: '/home/wangzishi/.rustup', CARGO_BUILD_JOBS: '2' }; }
