// Independent filesystem-only review. No network, browser, SQL, or product writes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const hroot = 'E:/projects/worktrees/poms-r4h-signals/poms';
const out = path.dirname(fileURLToPath(import.meta.url));
const sha = b => createHash('sha256').update(b).digest('hex');
const local = f => f.startsWith('/mnt/e/') ? 'E:/' + f.slice(7) : f.startsWith('/home/') ? '//wsl.localhost/Debian' + f : f;
const inputs = [];
function read(file, expected) { const b = fs.readFileSync(local(file)), actual = sha(b); if (expected) assert.equal(actual, expected, file); inputs.push({ file, bytes: b.length, rawBytesSha256: actual }); return b; }
const json = (f, expected) => JSON.parse(read(f, expected));
const base = 'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const manifests = [
  ['ui-runtime32', 'manifest32.json', 'd110f7b6dcf625f70d61b7cae3ec87b9d0178bf6b936f0197c2378298dea4d05'],
  ['ui-runtime32-02', 'manifest32-02.json', '0c8acdf4f85c383061936bdf029d50c6b1d146bd6b4507e7987948057fa1b912']
];
const active = new Map();
for (const [dir, name, pin] of manifests) {
  for (const checkout of [hroot, root]) {
    const parent = `${checkout}/${base}${dir}`, m = json(`${parent}/${name}`, pin);
    for (const f of m.files) assert.equal(read(`${parent}/${f.file}`, f.rawBytesSha256).length, f.bytes);
    for (const p of m.products) read(`${parent}/${p.candidate}`, p.afterSHA256);
    if (checkout === root) for (const p of m.products) active.set(p.file, p.afterSHA256);
  }
}
for (const [file, pin] of active) read(`${root}/${file}`, pin);
const audit = json(`${root}/${base}ui-runtime32/selector-audit32.json`);
for (const p of audit.rootInputs) read(`${root}/${p.file}`, p.rawBytesSha256);
const { classifyFontBoundary32: classify, FONT_CSS32 } = await import(pathToFileURL(`${root}/tools/rust-r4ghi/business/ui-font-boundary32.mjs`));
assert(read(`${root}/apps/poms-admin/src/index.html`).toString().includes(FONT_CSS32));
const run = `${root}/tmp/rust-r4ghi/private/ui-runtime14/dom14-source12-06a/case-0`;
const result = json(`${run}/result.json`), font = json(`${run}/font-boundary32.json`), errors = json(`${run}/browser-errors.json`);
assert.equal(result.status, 'passed'); assert.equal(result.verifiedProjectResponses, 3); assert.equal(result.businessWritePerformed, false); assert.equal(result.original04Passed, false);
assert.deepEqual(errors.errors, []);
const actual = { failedRequests: font.failedRequests, consoleRecords: font.consoleRecords, consoleErrors: errors.consoleErrors, blocked: errors.blocked };
const classified = classify(actual); assert.equal(classified.classifiedPairs.length, 2); assert.deepEqual(classified, font.verification);
const mutationChecks = [];
for (const [name, mutate] of [
  ['API request failure', f => { f.failedRequests[0].url = 'http://127.0.0.1:44551/api/projects/id'; }],
  ['different CSS query', f => { f.failedRequests[0].url += '&other=1'; }],
  ['font file instead of stylesheet', f => { f.failedRequests[0].resourceType = 'font'; }],
  ['unmatched console location', f => { f.consoleRecords[0].location.url = ''; }],
  ['nonzero source position', f => { f.consoleRecords[0].location.lineNumber = 1; }],
  ['unrelated application console error', f => { f.consoleRecords[0].text = f.consoleErrors[0] = 'TypeError: application failed'; }],
  ['missing actual failure', f => { f.failedRequests.pop(); }],
  ['unknown external origin', f => { f.blocked[0] = 'https://unknown.invalid'; }],
  ['readonly API write block', f => { f.blocked[0] = { method: 'POST', path: '/api/projects/id' }; }],
  ['lost original console log', f => { f.consoleErrors.pop(); }]
]) { const changed = structuredClone(actual); mutate(changed); assert.throws(() => classify(changed), name); mutationChecks.push({ name, rejected: true }); }
const requests = json(`${run}/requests.json`); assert(requests.every(r => r.method === 'GET'));
const views = json(`${run}/owner-readback-responses.json`); assert.equal(views.length, 3); for (const v of views) assert.deepEqual(v, views[0]);
const http = '/home/wangzishi/.local/share/poms-r4ghi/private/ui/runtime14/dom14-source12-06a/http';
const wires = fs.readdirSync(local(http)).filter(n => /^http-\d+\.json$/.test(n)).sort().map(n => { const wire = json(`${http}/${n}`); assert(['GET', 'HEAD'].includes(wire.request.method)); assert.equal(wire.failure, null); assert.equal(wire.response.complete, true); return { method: wire.request.method, path: wire.request.path, status: wire.response.status }; });
const projectWires = wires.filter(w => w.path === `/api/projects/${views[0].projectId}`); assert.equal(projectWires.length, 3); assert(projectWires.every(w => w.status === 200));
const delta = json(`${root}/${base}ui-runtime32/ui06-input-delta32.json`);
for (const pin of delta.checked) read(pin.file, pin.rawBytesSha256);
const old = json(delta.source.file, delta.source.rawBytesSha256);
const next = json(`${root}/${base}ui-runtime32/ui06-prepare-input32.unbound.json`);
assert.deepEqual(next.plan.cases, old.plan.cases.filter(c => c.kind !== 'execution-owner'));
assert.equal(next.plan.writeActions.length, 1); assert.equal(next.plan.writeActions[0].kind, 'own-condition');
assert.notEqual(next.plan.writeActions[0].evidenceText, old.plan.writeActions.find(x => x.kind === 'own-condition').evidenceText);
assert.equal(delta.ownNewCommand.newChecksum, '0f99354f7bc6e27f59217bd3d85ec1a854ff15efaa5ba53a0cbfaac3755c03e7');
assert.notEqual(delta.ownNewCommand.newChecksum, delta.ownNewCommand.oldChecksum);
assert.equal(next.plan.uiRun, 'dom14-source12-06');
for (const [key, value] of Object.entries(next.plan.paths)) { assert.equal(value, old.plan.paths[key].replaceAll(old.plan.uiRun, next.plan.uiRun)); assert(!value.includes(old.plan.uiRun)); }
for (const [key, value] of Object.entries(next.plan.relay24.paths)) assert.equal(value, old.plan.relay24.paths[key].replaceAll(old.plan.uiRun, next.plan.uiRun));
assert.deepEqual(next.plan.sourceBases, []); assert.equal(next.plan.metadata16, undefined); assert.deepEqual(next.promotedToolClosure, { file: null, rawBytesSha256: null });
const effects = json(`${root}/${base}ui-runtime32/ui05-effects32.json`);
assert.equal(effects.successfulWrites.length, 5); assert.equal(effects.EO.replayAllowed, false); assert.equal(effects.Own.closurePOSTObserved, false); assert.equal(effects.Own.replayOldUploadAllowed, false);
const review = {
  kind: 'H32-and-32-02-independent-FS-review86', createdAt: new Date().toISOString(),
  conclusion: 'bounded-tooling-admission-no-new-P1-P2-found', nonAuthor: true,
  manifests: manifests.map(([directory, file, rawBytesSha256]) => ({ directory, file, rawBytesSha256 })),
  effectiveProducts: [...active].map(([file, rawBytesSha256]) => ({ file, rawBytesSha256 })),
  checks: { manifestFilesAndRootProductsExact: true, sourceTemplatePinsExact: true,
    strictURLMethodStylesheetFailureAndConsoleLocationPairing: true, originalConsoleAndBlockedRecordsRetained: true,
    pageErrorsStillRejectedAndCanonicalAPIStatusesStillAsserted: true, externalRoutesStillAborted: true,
    ownConditionArticleScopedLabels: true, roleFieldsetLegendScopedLabels: true,
    observerAvailableToFinallyAfterEarlyFailure32_02: true,
    oldUI05FailuresAndRealEOAndUploadEffectsNotRelabeled: true, EOCaseAndActionRemoved: true,
    ownUploadIsDistinctNewEvidenceCommand: true, independentRunPathsAndNewBindingsRequired: true },
  actual06aReadback: { producerEpoch: 'Source12/API135', creatorReadbackOnly: true, result: result.status,
    actualProjectGET200: projectWires.length, actualFontPairs: classified.classifiedPairs.length,
    businessWrites: 0, rawHTTPCount: wires.length, verifiedViews: views.length,
    ownRoleExpenseGHLifecycleOrOtherFormsCertified: false },
  pureClassifierMutations: mutationChecks,
  findings: [],
  limits: ['No browser, HTTP, SQL, process/Git/product mutation executed by reviewer.',
    '06b and any later form observations require their own frozen actual evidence; none imported here.',
    'The new unbound 06 input is not itself an executable or accepted runtime plan.',
    'Failed case summaries do not prove no business effects; UI05 successful EO/upload originals remain authoritative.'],
  G3Certified: false, G4Certified: false, inputs
};
fs.writeFileSync(path.join(out, 'review86.json'), JSON.stringify(review, null, 2) + '\n', { flag: 'wx' });
console.log(JSON.stringify({ conclusion: review.conclusion, inputs: inputs.length, products: active.size, pureNegativeChecks: mutationChecks.length, creatorGETs: projectWires.length, actualFontPairs: classified.classifiedPairs.length, G3Certified: false }));
