// H-owned, immutable-file-only cross-check. Never imports business/runtime modules.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const h = 'E:/projects/worktrees/poms-r4h-signals/poms';
const root = 'E:/projects/worktrees/poms-r3hijk-next28/poms';
const privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = bytes => createHash('sha256').update(bytes).digest('hex');
const loc = file => file.startsWith(privateRoot + '/') ? '//wsl.localhost/Debian' + file : file.startsWith('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms/') ? root + file.slice('/mnt/e/projects/worktrees/poms-r3hijk-next28/poms'.length) : file;
const verified = [];
function bytes(pin) {
  assert(pin && typeof pin.file === 'string' && /^[a-f0-9]{64}$/.test(pin.rawBytesSha256));
  assert(!pin.file.endsWith('/state.json'), 'Do not consume the active business state');
  const file = loc(pin.file), stat = fs.lstatSync(file); assert(stat.isFile() && !stat.isSymbolicLink());
  const value = fs.readFileSync(file); assert.equal(sha(value), pin.rawBytesSha256);
  verified.push({ file: pin.file, bytes: value.length, rawBytesSha256: pin.rawBytesSha256 }); return value;
}
const json = pin => JSON.parse(bytes(pin));
const bare = pin => ({ file: pin.file, rawBytesSha256: pin.rawBytesSha256 });
const same = (a, b) => assert.deepEqual(bare(a), bare(b));
function write(name, value) { fs.writeFileSync(path.join(dir, name), JSON.stringify(value, null, 2) + '\n', { flag: 'wx' }); }
const processPin = { file: privateRoot + '/rust-api1351-process.json', rawBytesSha256: 'fd81b926dbaad79debc0343ac63b6cff7c967ac4a52cd64db0a7d0e7d4dbc2a1' };
const candidatePin = { file: privateRoot + '/business/g2-business12/main01/007133-p1351-candidate.json', rawBytesSha256: '1dde0fda6f0c23682568f8256ea98da4137ebd7793da7915238e0ac066a9740c' };
const registryPin = { file: privateRoot + '/business/g2-business12/main01/007134-p1351-registry.json', rawBytesSha256: '05985940f4a4085fab81d0711d2285931818a2b78fb29a9612bfcc1365b1667b' };
const processRecord = json(processPin), candidate = json(candidatePin), registry = json(registryPin);
assert.equal(registry.kind, 'verified-same-source-process-restart1351');
assert.equal(candidate.kind, 'actual-same-source-process-candidate1351');
same(registry.newApiProcess, processPin); same(registry.candidateReceipt, candidatePin); same(candidate.process, processPin);
assert.deepEqual(candidate.process.record, processRecord); assert.equal(processRecord.pid, 11616);
assert.equal(registry.sourceCount, 406); assert.equal(registry.migrations, 97); assert.equal(registry.admittedSequence, 7134);
assert.equal(registry.sourcePinsSHA256, '5263ad894591ac682fe7ebf9ca5cfa2aaac3334d4481ae5de4dd63d83b4681fa');
assert.equal(candidate.sourcePins.length, 406); assert.equal(sha(JSON.stringify(candidate.sourcePins)), registry.sourcePinsSHA256);
const original = json(registry.originalState); // Actual frozen pre-restart state, never copied or printed.
assert.equal(original.sequence, 7127);
const integration = h + '/tools/rust-r4ghi/H/implementation/support-patches/ui-integration/';
const h38 = json({ file: integration + 'frozen-role38/manifest38.json', rawBytesSha256: '374fc51bc4b66add25071b026c4cd34e3d68a07c0a00779c0371b7a0bd19533e' });
const promotion = h38.products.map(product => {
  bytes({ file: integration + 'frozen-role38/' + product.candidate, rawBytesSha256: product.afterSHA256 });
  const current = root + '/' + product.file;
  bytes({ file: current, rawBytesSha256: product.afterSHA256 });
  return { file: product.file, beforeSHA256: product.beforeSHA256, afterSHA256: product.afterSHA256, currentlyPromoted: true };
});
const roleFragment = json({ file: integration + 'frozen-role38/frozen-role38.fragment.json', rawBytesSha256: 'a9b894a586d842e5f0c55377551667223962e396de862d4a860a59d8a033866c' });
const role = original.fixtures.uiFormFixtureViews18['role-create'];
assert.equal(role.pause.result.projectId, h38.scopeProjectId); assert.equal(role.UICommandObserved, true);
assert.equal(role.UICommandOperationId, 'CommissionRoleAssignmentController_freezeRoleAssignment');
const frozen = roleFragment.cases[0].frozenRoleReadback;
same(role.UICommandResponseOriginal, frozen.freezeResponse); same(role.UICommandObserverReceipt, frozen.freezeLedger);
const freeze = json(frozen.freezeResponse), ledger = json(frozen.freezeLedger), race = json(frozen.publicRaceProof);
assert.equal(freeze.attempt.pathParams.id, h38.scopeAssignmentId); assert.equal(freeze.attempt.status, 200);
assert.equal(freeze.attempt.body.businessStatusAfter, 'frozen'); assert.equal(ledger.ownershipComplete, true); assert.deepEqual(ledger.blockers, []);
same(race.UIOriginals, frozen.freezeResponse); same(race.winnerLedger, frozen.freezeLedger); assert.equal(race.kind, 'actual-UI-freeze200-vs-ordinary-peer-revised-create409'); assert.equal(race.originalUIFreezePreserved, true); assert.equal(race.participantDML, false); assert.equal(race.peerBusinessBirths, 0);
const after = json(ledger.after), tables = after.databases.poms_r4ghi_rust.tables;
const rows = name => bytes(tables[name]).toString('utf8').trim().split('\n').filter(Boolean).map(value => JSON.parse(value));
const parentRow = rows('commission_role_assignment').find(row => row.key[0] === h38.scopeAssignmentId);
const parent = JSON.parse(parentRow.raw); assert.equal(parent.project_id, h38.scopeProjectId); assert.equal(parent.status, 'frozen'); assert.equal(parent.row_version, 2); assert.equal(parent.version, 1); assert.equal(parent.is_current, true);
const people = rows('commission_role_assignment_participant').filter(row => JSON.parse(row.raw).assignment_id === h38.scopeAssignmentId);
assert.equal(people.length, 4);
const members = people.map(row => JSON.parse(row.raw)); assert.equal(members.reduce((sum, row) => sum + BigInt(row.weight_units), 0n), 1000000n);
const zero = members.find(row => row.weight_units === 0 || row.weight_units === '0'); assert(zero && zero.zero_weight_reason && zero.role_type === 'business-admin');
const payloadRow = rows('commission_role_assignment_freeze_payload').find(row => JSON.parse(row.raw).assignment_id === h38.scopeAssignmentId), payload = JSON.parse(payloadRow.raw);
assert.equal(payload.freeze_summary_snapshot_id, '899a04d5-d27c-4fa6-aac4-3f277ce05571'); assert.equal(payload.source_payload_hash, freeze.attempt.body.sourcePayloadHash);
const ghFragment = json({ file: integration + 'form-plans33/gh33.fragment.json', rawBytesSha256: '730ea13dc35e8e6a0756824e3cd6299963cd28bb26de029fc20883730df19cf5' });
const lifecycleFragment = json({ file: integration + 'form-plans33/lifecycle33.fragment.json', rawBytesSha256: '9836db675aa0541180b667988a194e7cd17ef9eeda58c746caaa69a9b3b6ec98' });
const source33 = json({ file: integration + 'form-plans33/source-evidence33.json', rawBytesSha256: '74d94e2713ca45bfccacd3172140bad9a42a4f116923c6be5d3de009d8442286' });
json(source33.GH.stoppedBeforeBaseline); json(source33.GH.pendingTaxProducer);
const gh = original.fixtures.uiFormFixtureViews18['gh-capture']; assert.equal(gh.pause.result.projectId, source33.GH.projectId); assert(!gh.UICommandObserved); assert.equal(gh.pause.result.boundary.operationId, 'ProjectCostController_activateOperatingBaselinePackage'); assert.equal(gh.pause.result.boundary.requestedHTTPNotSent, true);
assert.equal(original.uiGhPendingTax18[source33.GH.projectId].phase, 'actual-success');
const eo = original.fixtures.uiFixtureViews23.eo; assert.equal(eo.pause.result.projectId, source33.EO.projectId); assert.equal(eo.UICommandObserved, true); assert.equal(eo.UICommandOperationId, 'ProjectController_startExecution'); same(eo.UICommandResponseOriginal, source33.EO.actualResponseOriginal); same(eo.UICommandObserverReceipt, source33.EO.ledger);
assert(!original.uiLifecycle18Receipts?.[source33.EO.projectId]); assert.deepEqual([...original.actors.execution.permissions].sort(), ['project:read', 'project:write']);
const expenseReceiptPin = { file: root + '/tmp/rust-r4ghi/root/ui-runtime14/expense18-source12-02/receipt18-04.json', rawBytesSha256: 'e5af97c68eb02c554dce90f18ae75306f7a5c3ecedfc19522324467e1342b882' };
const expenseReceipt = json(expenseReceiptPin);
const knownFields = { sourceManifest: candidatePin, candidateReceipt: candidatePin, apiProcess: processPin };
write('known-process42.json', { kind: 'FS-verified-current-1351-fields-not-a-new-authority', namespace: 'poms-r4ghi', epoch: 'g2-business12', run: 'main01', sourceCount: 406, sourcePinsSHA256: registry.sourcePinsSHA256, registry: registryPin, admittedSequence: registry.admittedSequence, prepareInputFields: knownFields, cookiesOrActorProofsSupplied: false });
for (const [name, fragment, workerKind, uiRun, projectId, usedActorKeys] of [
  ['frozen-role', roleFragment, 'role18', 'role18-source12-1351-cold01', h38.scopeProjectId, ['manager']],
  ['gh', ghFragment, 'gh18', 'gh18-source12-1351-01', source33.GH.projectId, ['manager']],
  ['lifecycle', lifecycleFragment, 'lifecycle18', 'lifecycle18-source12-1351-01', source33.EO.projectId, ['execution']]
]) write(name + '42.fragment.json', { kind: 'Root-reviewable-prepare-input-field-guide42-not-executable', proposedUiRun: uiRun, workerKind, projectId, expectedUsedActorKeys: usedActorKeys, replacePrepareInputFields: knownFields, replacePlanFields: { cases: fragment.cases, writeActions: fragment.writeActions }, requiredRootGeneratedFields: ['plan.uiRun', 'plan.paths', 'plan.relay24.paths', 'plan.relay24 actual eth0 IPv4 and executable pins', 'plan.windows current executable/dependency inventory', 'plan.linuxNodeExecutable actual path', 'plan.cookieScopeProof from fresh API1351 password-login receipts', 'promotedToolClosure after any H38 promotion'], generatedOnly: ['plan.sourceBases', 'plan.metadata16', 'plan/build raw SHA', 'actorManifest', 'actualActorIndex', 'binding/processRestart1351'], mustNotReuse: ['old135 process/candidate/cookies/actor index/binding', 'Role03 writeActions or publicRevisedDraftRace', 'Expense33 already completed UI writes'], actualRuntimeClaimed: false });
write('checks42.json', { kind: 'FS-only-1351-input-and-prior-business-identity-cross-check42', status: 'pass', immutablePinsVerified: verified, h38ExactPromotedProducts: promotion, role: { projectId: parent.project_id, assignmentId: parent.id, status: parent.status, rowVersion: parent.row_version, version: parent.version, participants: 4, exactWeightUnits: '1000000', actualZeroWeightReasonPresent: true, summaryId: payload.freeze_summary_snapshot_id, parentRawSHA256: parentRow.sha256, parentXmin: parentRow.xmin, postRoleGETInRole03Claimed: false }, gh: { projectId: source33.GH.projectId, beforeBaselineHTTPNotSent: true, pendingTaxActualSuccess: true, newH08Claimed: false }, lifecycle: { projectId: source33.EO.projectId, priorExecutionUIObserved: true, existingLifecycleConsumption: false, expense02Receipt: expenseReceiptPin, expenseReceiptKind: expenseReceipt.kind }, activeStateRead: false, rootWritten: false, runtimeImports: false, HTTP: false, SQL: false, browser: false, G3Certified: false });
console.log(JSON.stringify({ checkedPins: verified.length, H38ProductsCurrentlyExactApplied: promotion.length, newProcessPIDFromImmutableRecord: processRecord.pid, sourceCount: candidate.sourcePins.length, runtimeExecuted: false }));
