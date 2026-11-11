// Fixed Source15 append-runtime121 pure rules. No filesystem, context or effects.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { isProxy } from 'node:util/types';

export const C121 = Object.freeze({
  namespace: 'poms-r4ghi', epoch: 'g2-business15', run: 'main01',
  root: '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms',
  mirror: '/home/wangzishi/projects/poms-rust-r4ghi',
  private: '/home/wangzishi/.local/share/poms-r4ghi/private',
  migrations: 98, tables: 139, sourceCount: 420, compileCount: 528,
  oldHelperCount: 227, helperCount: 229,
  G1B: 'be96f468fe8c7aa58dcebe6f687ef90d0afb46f1d9ca2ac2bc2b3e90974206cc',
  archive: '7085c71ee2fa244b5c4c10c582b17b45cc2dcad56967376305e8f05526db92a2',
  supplement: '0b0bd1ccc4931674cf986b5ac56f186abc5f799b9fa331dc4d6d28a7e3c9786d',
  oldState: '4c354c9190cdae04135ddedd1da7e8652fe5aa6e0aa8f5c74805faef9bc903ea',
  failedNonce: '7f75088b-9f3d-4dbf-93f9-288ea96c8258',
  CtorAppend:'72dc2677f51b2a430b5970a81b40b9301aaf3d97dd9f00f2b8fe6356a90748cb',
  policyAppend:'77083554eb09b8cfb24ddee8bfe4fdc75d2261f01a5a6462a0a309815dcfe714',
  dependencyAppend:'4ce7369f93c9ecdc2ab9fb06dccb6eb3c4372535f140130e31ef6e04ae7d3f95',
  dependencyArchive:'3b724ea1c258f25a037a4675d243757ca91e9ae7371af8abe72c74356dd2a598',
});
export const GH121 = Object.freeze([
  'ProjectCostController_activateOperatingBaselinePackage',
  'ProjectCostController_createProjectOperatingSnapshot',
  'ProjectCostController_createPeriodClosingSnapshot',
  'ProjectCostController_createOperatingRestatement',
  'ProjectCostController_reviewOperatingSignalEvaluation',
  'ProjectCostController_reviewCommissionGateBinding',
]);
export const H3Changes121 = Object.freeze([
  'consumer-admission54.mjs', 'http.mjs', 'fault-sweep.mjs', 'gh-write-facts.mjs',
  'trusted.mjs', 'policy-security-runtime15.mjs', 'policy-security-bindings15.json',
  'policy-current-h46-15.mjs', 'labor-mask15.mjs',
  'runtime-admission121.mjs', 'runtime-admission-core121.mjs',
].map(n => 'tools/rust-r4ghi/business/' + n).sort());
export const ExternalChanges121 = Object.freeze([
  ...['run-tax15-once.mjs','invocation-proof.mjs','retained-tax-proof.mjs',
    'tax15-once-effects.mjs','tax15-once-wire.mjs','tax15-prepare.mjs']
    .map(n => 'tools/rust-r4ghi/tax15-invocation118/' + n),
  'tools/rust-r4ghi/tax15-readonly/runtime15.mjs',
  'tools/rust-r4ghi/tax15-readonly/facts15.mjs',
  'tools/rust-r4ghi/policy-role15/setup-role15.mjs',
  'tools/rust-r4ghi/policy-continuation15-287/run287.mjs',
  ...['runtime284.mjs','witness284.mjs','driver284.mjs']
    .map(n => 'tools/rust-r4ghi/legacy-authority15-284/' + n),
  'tools/rust-r4ghi/legacy-authority15-284/wire284.mjs',
  ...['runtime270.mjs','driver270.mjs'].map(n => 'tools/rust-r4ghi/period15-270/' + n),
  ...['runtime271.mjs','driver271.mjs'].map(n => 'tools/rust-r4ghi/mixed15-271/' + n),
  'tools/rust-r4ghi/mixed15-271/facts271.mjs',
  'tools/rust-r4ghi/mixed15-271/transport271.mjs',
].sort());
export const ExternalAdds121 = Object.freeze([
  ...['hold-runtime121.mjs','start-holder121.ps1','resume-original-pg121.mjs',
    'observe-conservation121.mjs','prepare121.mjs','dispatch121.mjs','facts121.mjs',
    'start-api121.mjs'].map(n => 'tools/rust-r4ghi/runtime-recovery121/root/' + n),
  ...['publish-runtime121.mjs','input121.template.json']
    .map(n => 'tools/rust-r4ghi/runtime-recovery121/native/' + n),
].sort());
export const sha121 = value => createHash('sha256').update(value).digest('hex');
export function plain121(value, label = 'JSON object') {
  assert(value && !isProxy(value) && Object.getPrototypeOf(value) === Object.prototype, label);
  assert.equal(Reflect.ownKeys(value).length, Object.keys(value).length, label + ' symbols');
  for (const descriptor of Object.values(Object.getOwnPropertyDescriptors(value)))
    assert(Object.hasOwn(descriptor, 'value'), label + ' accessor');
  return value;
}
export function keys121(value, keys, label = 'object') {
  plain121(value, label);
  assert.deepEqual(Object.keys(value).sort(), [...keys].sort(), 'Closed ' + label);
}
export function canonical121(value) {
  function walk(v) {
    if (v === null || typeof v === 'string' || typeof v === 'boolean') return v;
    if (typeof v === 'number') { assert(Number.isFinite(v)); return v; }
    if (Array.isArray(v)) { assert(!isProxy(v)); return v.map(walk); }
    plain121(v); return Object.fromEntries(Object.keys(v).sort().map(k => {
      assert(v[k] !== undefined); return [k, walk(v[k])];
    }));
  }
  return JSON.stringify(walk(value));
}
export const copy121 = value => {
  canonical121(value); // Validate plain JSON without changing its recorded order.
  return JSON.parse(JSON.stringify(value));
};
export function freeze121(value) {
  if (value && typeof value === 'object') {
    for (const child of Object.values(value)) freeze121(child);
    Object.freeze(value);
  }
  return value;
}
export function pin121(pin) {
  plain121(pin,'pin121');
  keys121(pin, pin?.bytes === undefined
    ? ['file','rawBytesSha256'] : ['file','rawBytesSha256','bytes'], 'pin121');
  assert(typeof pin.file === 'string' && pin.file.startsWith('/') &&
    !pin.file.includes('\\') && !pin.file.includes('//') &&
    !pin.file.split('/').some(x => x === '.' || x === '..') &&
    !/[\0\r\n]/.test(pin.file));
  assert(/^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  if (pin.bytes !== undefined) assert(Number.isSafeInteger(pin.bytes) && pin.bytes >= 0);
  return pin;
}
// Identity projection also serves typed API/stat containers. It is not an
// input-shape validator: plan/closure inputs are separately pin121-checked.
export const pinOnly121 = pin => pin121({
  file: pin?.file, rawBytesSha256: pin?.rawBytesSha256,
});
export function samePin121(a, b) { assert.deepEqual(pinOnly121(a), pinOnly121(b)); }
export function sameIdentity121(a, b) {
  return a?.file === b?.file && a?.rawBytesSha256 === b?.rawBytesSha256;
}
export function pointer121(value, pointer) {
  assert(typeof pointer === 'string' && pointer.startsWith('/') && !pointer.includes('~'));
  return pointer.slice(1).split('/').reduce((x, key) => x?.[key], value);
}
export function relative121(file) {
  assert(typeof file === 'string' && file && !file.startsWith('/') &&
    !file.includes('\\') && !file.includes('//') &&
    !file.split('/').some(x => !x || x === '.' || x === '..'));
  return file;
}
export function sources121(list, root = null) {
  assert(Array.isArray(list));
  const out = list.map(p => {
    pin121(p); if (root) assert(p.file.startsWith(root + '/'));
    return pinOnly121(p);
  }).sort((a,b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file)));
  assert.equal(new Set(out.map(p => p.file)).size, out.length, 'Duplicate source path');
  return out;
}
export function descriptors121(list, count) {
  assert(Array.isArray(list)); if (count !== undefined) assert.equal(list.length, count);
  const ordered = list.map(p => {
    keys121(p, ['file','sha256'], 'source descriptor'); relative121(p.file);
    assert(/^[a-f0-9]{64}$/.test(p.sha256)); return p;
  }).sort((a,b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file)));
  assert.equal(new Set(ordered.map(p => p.file)).size, list.length);
  assert.deepEqual(list, ordered, 'Complete source descriptors must be canonically ordered');
  return list;
}
export function finiteDelta121(before, after, frames, allowed) {
  assert(Array.isArray(frames));
  const map = new Map(before.map(x => [x.file, x.sha256]));
  const seen = new Set();
  for (const frame of frames) {
    keys121(frame, ['file','operation','beforeSHA256','afterSHA256','candidate',
      'componentManifest','productPointer','independentReview','technicalG1'], 'finite source frame');
    assert(allowed.includes(frame.file)); assert(!seen.has(frame.file)); seen.add(frame.file);
    assert.equal(frame.beforeSHA256, map.get(frame.file) ?? null);
    assert.equal(frame.operation, frame.beforeSHA256 === null ? 'ADD' : 'MOD');
    assert(/^[a-f0-9]{64}$/.test(frame.afterSHA256));
    assert.notEqual(frame.beforeSHA256, frame.afterSHA256);
    for (const key of ['candidate','componentManifest','independentReview','technicalG1']) pin121(frame[key]);
    assert.equal(frame.candidate.rawBytesSha256, frame.afterSHA256);
    assert(typeof frame.productPointer === 'string' && frame.productPointer.startsWith('/'));
    map.set(frame.file, frame.afterSHA256);
  }
  assert.deepEqual([...seen].sort(), [...allowed].sort(), 'All and only frozen finite steps');
  const expected = [...map].map(([file,sha256]) => ({file,sha256}))
    .sort((a,b) => Buffer.compare(Buffer.from(a.file), Buffer.from(b.file)));
  assert.deepEqual(after, expected, 'Full final closure, not only changed leaves');
  return frames;
}
export const baseKeys121 = Object.freeze([
  'codeAdmission15','codeCandidate15','approvedCodePlan15','sourcePins','compilePins',
  'helperPins227','buildBinding','retainedState15','ownership15','sourceArchive121',
  'sourceArchiveSupplement121','runtimeLossObservation','failedInvocation',
  'failedInvocationReview','prepared15','fullInventory','bodySHA256','preparedBaseline',
]);
export const currentKeys121 = Object.freeze([
  'sourcePins','compilePins','helperPins','helperCount','binary','summaryBinary',
  'binaryFiles','nodeExecutable','lifetimeOwner','PGStart','PGConservation','apiProcess','readiness',
]);
export function parentShape121(p) {
  keys121(p, baseKeys121, 'retained15 parent');
  for (const key of baseKeys121.filter(k => k !== 'bodySHA256')) pin121(p[key]);
  assert(/^[a-f0-9]{64}$/.test(p.bodySHA256));
  assert.equal(p.sourceArchive121.rawBytesSha256, C121.archive);
  assert.equal(p.sourceArchiveSupplement121.rawBytesSha256, C121.supplement);
  assert.equal(p.retainedState15.rawBytesSha256, C121.oldState);
  return p;
}
export function planShape121(p) {
  keys121(p, ['kind','protocolVersion','namespace','epoch','run','nonce','base','current',
    'composition','stateTransfer','tooling','outputs'], 'runtime121 plan');
  assert.equal(p.kind, 'source15-append-runtime-plan121'); assert.equal(p.protocolVersion, 1);
  for (const key of ['namespace','epoch','run']) assert.equal(p[key], C121[key]);
  assert(/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(p.nonce));
  parentShape121(p.base); keys121(p.current, currentKeys121, 'current121');
  for (const key of currentKeys121.filter(k => !['helperCount','binaryFiles'].includes(k)))
    pin121(p.current[key]);
  assert.equal(p.current.helperCount, C121.helperCount);
  assert(Array.isArray(p.current.binaryFiles) && p.current.binaryFiles.length === 2);
  samePin121(p.current.sourcePins, p.base.sourcePins);
  samePin121(p.current.compilePins, p.base.compilePins);
  keys121(p.composition, ['helperComposition','externalComposition','independentCodeReviews']);
  pin121(p.composition.helperComposition); pin121(p.composition.externalComposition);
  assert(Array.isArray(p.composition.independentCodeReviews) && p.composition.independentCodeReviews.length);
  p.composition.independentCodeReviews.forEach(pin121);
  keys121(p.stateTransfer, ['expectedState','expectedOwnership','actorCacheDelta']);
  samePin121(p.stateTransfer.expectedState, p.base.retainedState15);
  samePin121(p.stateTransfer.expectedOwnership, p.base.ownership15);
  keys121(p.stateTransfer.actorCacheDelta, ['actorKeys','clearCookies','clearPermissions']);
  assert(Array.isArray(p.stateTransfer.actorCacheDelta.actorKeys));
  assert.equal(p.stateTransfer.actorCacheDelta.clearCookies, true);
  assert.equal(p.stateTransfer.actorCacheDelta.clearPermissions, true);
  keys121(p.tooling, ['manifest','executionSources']); pin121(p.tooling.manifest);
  sources121(p.tooling.executionSources, C121.root);
  keys121(p.outputs, ['registryFile','candidateFile','receiptDirectory']);
  const dir = C121.private + '/business/' + C121.epoch + '/' + C121.run + '/runtime121-' + p.nonce;
  assert.equal(p.outputs.receiptDirectory, dir);
  assert.equal(p.outputs.registryFile, dir + '/registry.json');
  assert.equal(p.outputs.candidateFile, dir + '/candidate.json');
  return p;
}
export const scope121 = plan => sha121(canonical121(planShape121(plan)));
export function assertRuntimeApproval121(p, planPin, reviewPin, review, approval) {
  keys121(review, ['kind','approvedPlan','scope121','operator','reviewerIsAuthor',
    'verdict','sourceClosures'], 'independent runtime121 input review');
  assert.equal(review.kind, 'non-author-runtime121-input-review');
  assert.equal(review.verdict, 'approved-exact-FS-runtime-publication-only');
  assert.equal(review.reviewerIsAuthor, false);
  samePin121(review.approvedPlan, planPin); assert.equal(review.scope121, scope121(p));
  keys121(approval, ['kind','approvedPlan','scope121','independentInputReview','operator',
    'expectedState','expectedOwnership','actualG2Authorized','FSStatePublicationGranted',
    'APIStartGranted','PGWriteGranted','TaxHTTPGranted'], 'Root runtime121 approval');
  assert.equal(approval.kind, 'Root-approved-exact-runtime-admission121');
  samePin121(approval.approvedPlan, planPin); samePin121(approval.independentInputReview, reviewPin);
  assert.equal(approval.scope121, scope121(p));
  samePin121(review.operator, approval.operator);
  samePin121(approval.expectedState, p.stateTransfer.expectedState);
  samePin121(approval.expectedOwnership, p.stateTransfer.expectedOwnership);
  for (const key of ['actualG2Authorized','FSStatePublicationGranted']) assert.equal(approval[key], true);
  for (const key of ['APIStartGranted','PGWriteGranted','TaxHTTPGranted']) assert.equal(approval[key], false);
  assert.deepEqual(sources121(review.sourceClosures, C121.root),
    sources121(p.tooling.executionSources, C121.root));
}
export function registryBody121(p, planPin, facts, reviewPin, approvalPin) {
  planShape121(p);
  return copy121({
    kind:'verified-Source15-append-runtime-registry121',schemaVersion:1,protocolVersion:1,
    namespace:C121.namespace,epoch:C121.epoch,run:C121.run,nonce:p.nonce,
    baseCodeRegistry:pinOnly121(p.base.codeAdmission15),baseCodeCandidate:pinOnly121(p.base.codeCandidate15),
    approvedPlan:pinOnly121(planPin),scope121:scope121(p),
    independentInputReview:pinOnly121(reviewPin),RootExecutionApproval:pinOnly121(approvalPin),
    retained:p.base,current:facts.current,composition:p.composition,
    sourceArchive:{base:p.base.sourceArchive121,supplement:p.base.sourceArchiveSupplement121,
      dependencySupplement:facts.composition?.dependencySupplement},
    G3Certified:false,G4Certified:false,
  });
}
export function candidateBody121(p, actualRegistryPin, registry) {
  assert.equal(registry.kind,'verified-Source15-append-runtime-registry121');
  return copy121({
    kind:'actual-Source15-runtime-candidate121',protocolVersion:1,
    namespace:C121.namespace,epoch:C121.epoch,run:C121.run,nonce:p.nonce,
    runtimeAdmission121:pinOnly121(actualRegistryPin),
    baseCodeRegistry:pinOnly121(p.base.codeAdmission15),baseCodeCandidate:pinOnly121(p.base.codeCandidate15),
    scope121:scope121(p),current:registry.current,G3Certified:false,G4Certified:false,
  });
}
export function publishIdle121(state) {
  assert(!Object.hasOwn(state,'runtimeAdmission121'), 'First explicitly reviewed lease only');
  for (const key of ['activeFault','blockedObservation','cleaned','cleanupPlan','admissionPending54'])
    assert(!state[key], 'Publication requires idle: ' + key);
  for (const record of ['taxContinuation13','taxContinuation14','taxContinuation15','taxContinuation121'])
    for (const key of ['pendingMain','pendingTaxTrial','normalTaxPending'])
      assert(!state[record]?.[key], 'Unknown/pending cannot be cleared by publication');
}
export function stateBody121(old, p, written, now) {
  publishIdle121(old);
  assert.equal(written.verifiedFromDisk, true);
  assert.deepEqual(written.candidateBody, candidateBody121(p, written.registryPin, written.registryBody));
  assert.equal(written.registryPin.file, p.outputs.registryFile);
  assert.equal(written.candidatePin.file, p.outputs.candidateFile);
  const state=copy121(old);
  assert.deepEqual(p.stateTransfer.actorCacheDelta.actorKeys, Object.keys(old.actors).sort());
  for (const actor of Object.values(state.actors)) { actor.cookies={}; actor.permissions=[]; }
  state.apiProcess={...pinOnly121(p.current.apiProcess),record:copy121(written.registryBody.current.apiRecord)};
  state.runtimeAdmission121={
    kind:'current-source15-runtime-lease121',protocolVersion:1,
    registry:pinOnly121(written.registryPin),candidate:pinOnly121(written.candidatePin),
    baseCodeRegistry:pinOnly121(p.base.codeAdmission15),baseCodeCandidate:pinOnly121(p.base.codeCandidate15),
  };
  state.runtimeHistory121=[...(old.runtimeHistory121??[]),{
    kind:'retained-original-source15-runtime121',recordedAt:now,
    retainedState:p.base.retainedState15,ownership:p.base.ownership15,
    originalAPI:old.apiProcess,originalRegistry:p.base.codeAdmission15,originalCandidate:p.base.codeCandidate15,
    failedInvocation:p.base.failedInvocation,failedInvocationReview:p.base.failedInvocationReview,
    archive:p.base.sourceArchive121,supplement:p.base.sourceArchiveSupplement121,
    originalFailedLabelsPreserved:true,
  }];
  return copy121(state);
}
