// Author-only filesystem/pure extraction. Writes this proposal directory only.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { usedActorKeys } from 'file:///E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs';
import { weightUnits18 } from 'file:///E:/projects/worktrees/poms-r3hijk-next28/poms/tools/rust-r4ghi/business/ui-role18-policy.mjs';
const R = 'E:/projects/worktrees/poms-r3hijk-next28/poms', L = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms';
const H = '/home/wangzishi', U = '//wsl.localhost/Debian/home/wangzishi';
const P = `${H}/.local/share/poms-r4ghi/private/business/g2-business12/main01`;
const O = path.dirname(fileURLToPath(import.meta.url)), checked = [];
const sha = b => createHash('sha256').update(b).digest('hex');
const local = f => f.startsWith(`${L}/`) ? `${R}/${f.slice(L.length + 1)}` : f.startsWith(`${H}/`) ? `${U}/${f.slice(H.length + 1)}` : f;
function bytes(file, expected) { const b = fs.readFileSync(local(file)), rawBytesSha256 = sha(b); if (expected) assert.equal(rawBytesSha256, expected); checked.push({ file, rawBytesSha256, bytes: b.length }); return b; }
const json = (file, expected) => JSON.parse(bytes(file, expected));
const pin = file => { bytes(file); return checked.at(-1); };
const save = (file, value) => fs.writeFileSync(`${O}/${file}`, `${JSON.stringify(value, null, 2)}\n`, { flag: 'wx' });

const statePin = { file: `${H}/.local/share/poms-r4ghi/private/native-reference92/source12-native01/rust-state-before-native.json`, rawBytesSha256: 'c06c8a0277d99addd8820b762d6b787f48a8091cc3c7c787f713182fad966b6a' };
const frozen = json(statePin.file, statePin.rawBytesSha256), record = frozen.fixtures.uiFormFixtureViews18['role-create'];
const projectId = '389793fb-0f5b-48ea-a5f1-8515ee572d7f';
assert.equal(record.producerEpoch, 'g2-business12'); assert.equal(record.producerRun, 'main01'); assert.equal(record.sourcePinsSHA256, '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
assert.equal(record.fixtures.project.id, projectId); assert.equal(record.UICommandObserved, false);
assert(!record.fixtures.roleAssignment && !record.fixtures.roleFreezeResult && !record.fixtures.executionComplete);
const paused = json(record.pause.receipt.file, record.pause.receipt.rawBytesSha256);
assert.equal(paused.projectId, projectId); assert.equal(paused.boundary.operationId, 'CommissionController_createRoleAssignment'); assert.equal(paused.boundary.requestedHTTPNotSent, true);
const publicD = pin(`${L}/tmp/rust-r4ghi/business/g2-business12/main01/004816-http-http.json`), receipt = json(publicD.file, publicD.rawBytesSha256);
assert.equal(receipt.operationId, 'ProjectHandoverController_getProjectHandoverDetailByProject'); assert.equal(receipt.status, 200); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false);
for (const p of Object.values(receipt.originals)) bytes(p.file, p.rawBytesSha256);
const rawD = json(receipt.originals.responseBody.file, receipt.originals.responseBody.rawBytesSha256), d = rawD?.data ?? rawD;
const frozenDReceipt = json(`${L}/tmp/rust-r4ghi/business/g2-business12/main01/004814-http-http.json`);
assert.equal(frozenDReceipt.operationId, 'ProjectHandoverController_getProjectHandoverDetailByHandover'); assert.equal(frozenDReceipt.status, 200); assert.equal(frozenDReceipt.responseComplete, true);
const rawFrozenD = json(frozenDReceipt.originals.responseBody.file, frozenDReceipt.originals.responseBody.rawBytesSha256), frozenD = rawFrozenD?.data ?? rawFrozenD;
assert.deepEqual(frozenD, record.fixtures.handover);
const withoutGeneratedAt = value => Object.fromEntries(Object.entries(value).filter(([key]) => key !== 'generatedAt'));
assert.deepEqual(withoutGeneratedAt(d), withoutGeneratedAt(frozenD)); assert(Number.isFinite(Date.parse(d.generatedAt)) && Number.isFinite(Date.parse(frozenD.generatedAt)));
assert.equal(d.projectId, projectId); assert.equal(d.handoverStatus, 'confirmed'); assert.equal(d.sourceChanged, false);
const currentRoleBody = pin(`${P}/004825-http-response-body.bin`); assert.equal(json(currentRoleBody.file, currentRoleBody.rawBytesSha256), null);
const currentRoleReceipt = pin(`${L}/tmp/rust-r4ghi/business/g2-business12/main01/004825-http-http.json`), currentReceipt = json(currentRoleReceipt.file, currentRoleReceipt.rawBytesSha256);
assert.equal(currentReceipt.operationId, 'CommissionController_getCurrentRoleAssignment'); assert.equal(currentReceipt.status, 200); assert.equal(currentReceipt.responseComplete, true); assert.equal(currentReceipt.transportFailure, false);
assert.equal(currentReceipt.originals.responseBody.rawBytesSha256, currentRoleBody.rawBytesSha256);

const ids = { manager: '44e8c02b-6b46-44a5-b90e-bd7422b420bf', execution: 'e7dbe7a0-11ce-488d-8f09-4f1401e17f98', finance: '4a439812-5440-48df-9a40-d2404f6778c9' };
const chosen = [ ['manager', 'sales-owner', '0.5'], ['execution', 'execution-owner', '0.499999'], ['finance', 'finance', '0.000001'], ['manager', 'business-admin', '0'] ];
const participants = chosen.map(([actorKey, roleType, weight]) => {
  const people = d.participantConfirmationSummary.participants.filter(v => v.participantId === ids[actorKey]); assert.equal(people.length, 1); assert.equal(people[0].participantStatus, 'confirmed');
  const duties = people[0].responsibilities.filter(v => v.roleKey === roleType); assert.equal(duties.length, 1); assert(duties[0].responsibilitySummary.trim());
  return { actorKey, roleType, weight, zeroWeightReason: weight === '0' ? '本次兼任已确认的商务资料治理职责，不另计提成权重。' : null, responsibilitySummary: duties[0].responsibilitySummary };
});
assert.equal(participants.reduce((n, v) => n + weightUnits18(v.weight), 0n), 1000000n);
const fragment = {
  cases: [{ kind: 'role-forms', actorKey: 'manager', projectIdPointer: '/fixtures/uiFormFixtureViews18/role-create/pause/result/projectId', forbiddenTextPointers: [] }],
  writeActions: [{ kind: 'role-forms', actorKey: 'manager', freezeComment: '本人核对本项目真实已确认职责、移交材料及精确权重，冻结本次分配。', participants,
    frozenReparentProbe: true, publicRevisedDraftRace: { actorKey: 'manager-role-peer', expectedVerdict: 'freeze200-peer-revised409' } }]
};
const keys = usedActorKeys(fragment); assert.deepEqual(keys, ['manager', 'execution', 'finance', 'manager-role-peer']);
assert(!Object.hasOwn(fragment, 'actorProofKeys'));
const required = [
  'tools/rust-r4ghi/business/ui-role18-run-dom.mjs', 'tools/rust-r4ghi/business/ui-role18-windows.mjs',
  'tools/rust-r4ghi/business/ui-role18-linux.mjs', 'tools/rust-r4ghi/business/ui-role18-fixtures.mjs',
  'tools/rust-r4ghi/business/ui-role18-browser.mjs', 'tools/rust-r4ghi/business/ui-role18-policy.mjs',
  'tools/rust-r4ghi/business/ui-role-public-race23.mjs', 'tools/rust-r4ghi/business/frozen-reparent58.mjs',
  'tools/rust-r4ghi/business/frozen-reparent-sources58.json', 'tools/rust-r4ghi/business/ui-cookie-scope27.mjs',
  'tools/rust-r4ghi/H/implementation/support-patches/ui-integration/handoff16/binding-input16.mjs'
].map(file => ({ ...pin(`${L}/${file}`), file }));
assert.equal(required.find(v => v.file.endsWith('/ui-role-public-race23.mjs')).rawBytesSha256, '26886bebb584132d16275f19c55e94e3b74d2c52e76ff20fc49c402137f768f1');
assert.equal(required.find(v => v.file.endsWith('/frozen-reparent58.mjs')).rawBytesSha256, '4571e105084e131ec1f3dd95199cd7bb640c1598f7e4c8d9badc4fb0d0e56c76');
const spec = json(`${L}/libs/shared/api-spec/openapi.json`), statuses = {};
for (const item of Object.values(spec.paths)) for (const op of Object.values(item)) if (['CommissionController_createRoleAssignment', 'CommissionRoleAssignmentController_freezeRoleAssignment'].includes(op.operationId)) {
  const positive = Object.keys(op.responses).filter(v => /^2\d\d$/.test(v)); assert.deepEqual(positive, ['200']); statuses[op.operationId] = 200;
}
assert.equal(Object.keys(statuses).length, 2);
save('role31.fragment.json', fragment);
save('role31-source-evidence.json', {
  kind: 'FS-only-existing-role-spare-and-real-confirmed-duties', projectId, producerEpoch: record.producerEpoch, producerRun: record.producerRun, sourcePinsSHA256: record.sourcePinsSHA256,
  historicalFrozenState: statePin, paused: record.pause.receipt, actualDGET: { publicReceipt: publicD, responseBody: receipt.originals.responseBody }, frozenDActualBody: frozenDReceipt.originals.responseBody,
  exactReadComparisonExcludesOnlyGeneratedAt: { frozenActualGET: frozenD.generatedAt, byProjectActualGET: d.generatedAt }, currentRoleNullGET: { publicReceipt: currentRoleReceipt, responseBody: currentRoleBody },
  handoverId: d.handoverId, rowVersion: d.rowVersion, sourcePayloadHash: d.sourcePayloadHash, summarySnapshotId: d.summarySnapshotId,
  confirmedSelectedDuties: participants.map(p => ({ actorKey: p.actorKey, userId: ids[p.actorKey], roleType: p.roleType, actualResponsibilitySummary: p.responsibilitySummary })),
  expectedActorIds: { ...ids, 'manager-role-peer': ids.manager }, requiredActualActorProofKeys: keys,
  peerSessionStillUnbound: true, actorBindingsFinal: false, observedUIOrBusinessWritesByAuthor: 0,
  currentRuntimeMustRevalidateSpareAndServerValues: true, canonicalSuccessStatuses: statuses
});
save('role31-precision-cases.json', {
  kind: 'exact-Root-approved-role-input-cases-not-runtime-evidence', actualDOMExecuted: false,
  supportedWorkerPositiveCases: participants.map(p => ({ roleType: p.roleType, inputLexeme: p.weight, expectedWeightUnits: weightUnits18(p.weight).toString(), zeroReasonRequired: p.weight === '0' })),
  expectedSumUnits: '1000000', realServerFreezePayloadMustPreserveMillionthAndZeroReason: true,
  negativePrecisionCasesNotImplementedByCurrentBrowserWorker: ['1e-7', '0.0000001'],
  pausedSetupNegativesWereNotSent: true, noNegativeUICoverageClaimed: true
});
save('role31-required-tool-pins.json', { kind: 'minimum-hook-pins-with-full-runtime-closure-still-required', files: required, notACompleteSourceBases: true, RootMustFreshCaptureFullPlanHelpersBuildAndActorProofs: true });
save('checks31.json', { actualRuntimeExecuted: false, noLiveStateRead: true, frozenDResponseExactlyEqualsFrozenFixture: true, byProjectDAllBusinessFieldsEqualExceptGeneratedAt: true, actualPauseBeforeAnyCreate: true, selectedDutiesAllConfirmed: true, exactUnitsSum: '1000000', usedActorKeys: keys, independentSessionProofRequired: true, newProjectCreated: false, SQL: false, HTTP: false, RootWritten: false, checked });
console.log(JSON.stringify({ kind: 'role31-fragment-FS-pure-verified', projectId, usedActorKeys: keys, sumUnits: '1000000', actualDOMExecuted: false }));
