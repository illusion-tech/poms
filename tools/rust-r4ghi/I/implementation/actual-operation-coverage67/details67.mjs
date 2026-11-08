// FS-only focused readback/fixture/promotion audit. Outputs identifiers/hashes
// and conclusions, never request headers, credentials or financial raw bodies.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const out = path.dirname(fileURLToPath(import.meta.url)), root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', priv = '/home/wangzishi/.local/share/poms-r4ghi/private', run = `${priv}/business/g2-business12/main01`;
const local = file => /^[A-Za-z]:\//.test(file) ? `/mnt/${file[0].toLowerCase()}${file.slice(2)}` : file;
const sha = b => createHash('sha256').update(b).digest('hex'), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(local(file))) }), read = file => JSON.parse(fs.readFileSync(local(file)));
function original(p) { const bytes = fs.readFileSync(local(p.file)); assert.equal(sha(bytes), p.rawBytesSha256); return JSON.parse(bytes); }
function rows(meta) { const bytes = fs.readFileSync(meta.file); assert.equal(sha(bytes), meta.rawBytesSha256); return bytes.toString('utf8').split('\n').filter(Boolean).map(line => { const r = JSON.parse(line); assert.equal(sha(r.raw), r.sha256); return r; }); }
const stateBytes = fs.readFileSync(`${run}/state.json`), state = JSON.parse(stateBytes), statePin = { file: `${run}/state.json`, rawBytesSha256: sha(stateBytes), sequence: state.sequence };
const names = fs.readdirSync(run).filter(name => /^snapshot-\d+.*-after\.json$/.test(name) && Number(name.match(/^snapshot-(\d+)/)[1]) <= state.sequence).sort((a, b) => Number(a.match(/^snapshot-(\d+)/)[1]) - Number(b.match(/^snapshot-(\d+)/)[1]));
const snapshotPin = pin(`${run}/${names.at(-1)}`), snapshot = original(snapshotPin), tables = snapshot.databases.poms_r4ghi_rust.tables;
const owned = (table, row) => Object.values(state.owned).find(value => value.database === 'poms_r4ghi_rust' && value.table === table && JSON.stringify(value.key) === JSON.stringify(row.key) && !value.deleted && value.latestSha256 === row.sha256 && value.latestXmin === row.xmin);
const projectRows = rows(tables.project), contracts = rows(tables.contract), terms = rows(tables.contract_term_snapshot), f = state.fixtures;
const excluded = new Set([f.project?.id, f.maxProject?.id, f.maskProject?.id, f.legacyCompatibilityFixture?.projectId, f.creatorOwnership23?.uiSpareProjectId,
  ...Object.values(f.uiFixtureViews23 ?? {}).map(v => v.pause?.result?.projectId ?? v.fixtures?.project?.id), ...Object.values(f.uiFormFixtureViews18 ?? {}).map(v => v.pause?.result?.projectId ?? v.fixtures?.project?.id), ...Object.values(f.a05Boundaries26?.views ?? {}).map(v => v.fixtures.project?.id)].filter(Boolean));
function mentions(value, id) { if (!value || typeof value !== 'object') return false; return Object.entries(value).some(([key, child]) => (['projectId', 'project_id'].includes(key) && child === id) || (key === 'project' && child?.id === id) || mentions(child, id)); }
const rowPin = (table, row) => ({ table, key: row.key, rowSHA256: row.sha256, xmin: row.xmin, snapshot: snapshotPin });
const available = [];
for (const row of contracts) {
  const c = JSON.parse(row.raw); if (c.status !== 'active' || excluded.has(c.project_id) || !owned('contract', row)) continue;
  const project = projectRows.find(value => value.key[0] === c.project_id), term = terms.find(value => value.key[0] === c.current_snapshot_id); if (!project || !term || !owned('project', project) || !owned('contract_term_snapshot', term)) continue;
  const t = JSON.parse(term.raw); if (t.contract_id !== c.id || !['active', 'superseded'].includes(t.snapshot_status) || !t.source_preparation_id || !t.payload_hash || !t.currency_code || t.tax_rate == null) continue;
  const proof = owned('contract_term_snapshot', term).proof;
  available.push({ projectId: c.project_id, contractId: c.id, termSnapshotId: t.id, project: rowPin('project', project), contract: rowPin('contract', row), term: rowPin('contract_term_snapshot', term),
    termBirth: { operationId: proof.operationId, transport: proof.transport, beforeSnapshot: proof.beforeSnapshot, afterSnapshot: proof.afterSnapshot }, referencedByExistingAcceptanceFixture: Object.entries(f).filter(([, value]) => mentions(value, c.project_id)).map(([key]) => key), unusedFixtureClaim: false });
}

const readbackPin = pin(`${run}/005237-restatement-readback78-complete.json`), rb = original(readbackPin), readbacks = [];
original(rb.producer134); original(rb.originalPartial77); original(rb.priorInput);
for (const item of rb.observations) {
  const httpPin = typeof item.receipt === 'string' ? pin(item.receipt) : item.http, receipt = original(httpPin), ledger = original(item.ledger);
  assert.equal(receipt.status, 200); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false); assert.equal(ledger.ownershipComplete, true); assert.equal(receipt.requestId, ledger.requestId);
  const body = original(receipt.originals.responseBody), value = body?.data ?? body;
  if (item.operationId.endsWith('listOperatingRestatements')) { assert(Array.isArray(value)); assert(value.length >= item.matchedHistoricalRecords); }
  else { assert.equal(value.id, item.id); assert.equal(value.sourceContextId, item.sourceContextId); assert.equal(value.sourceHash, item.sourceHash); }
  readbacks.push({ operationId: item.operationId, receipt: httpPin, ledger: item.ledger, prior77HTTPReusedAsReadEvidence: Boolean(item.prior77), recordId: item.id ?? null, projectId: item.projectId ?? null, sourceContextId: item.sourceContextId ?? null });
}

const lifecycle = state.consumerChecks.lifecycle57, a07 = {};
for (const [key, value] of Object.entries(lifecycle)) {
  if (key === 'cross-parent-own-B') { a07.cross = { projectId: value.projectId, negatives: Object.fromEntries(Object.entries(value.results).map(([name, p]) => { const v = original(p); const receipt = read(v.receipt); assert.equal(receipt.status, v.expectedStatus); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false); return [name, { proof: p, receipt: pin(v.receipt), expectedStatus: v.expectedStatus, rollback: v.rollback }]; })) }; }
  if (key === 'sensitive-get-mask') { const v = original(value.proof), failed = read(v.failed), success = read(v.successfulRead); assert.equal(failed.status, 500); assert.equal(failed.responseComplete, true); assert.equal(failed.transportFailure, false); assert.equal(success.status, 200); const body = original(failed.originals.responseBody); for (const k of ['financialProjection', 'preparation', 'officialCurrent', 'sourceRows', 'reasonItems', 'evaluationRefs']) assert(!Object.hasOwn(body, k));
    a07.sensitive = { proof: value.proof, actualPrimaryHits: v.actualPrimaryHits, failure: pin(v.failed), normalMaskedRead: pin(v.successfulRead), failureNoSuccessPayload: true, rollback: v.rollback, isPreparationGET: true }; }
  if (key === 'different-tasks-cent-max') { const proof = original(value.result.race), observation = original(proof.observation), ledger = original(proof.ledger); assert.deepEqual(observation.attempts.map(v => v.status).sort(), [200, 409]); assert.equal(proof.actualLockWaiters, 2); assert.equal(ledger.ownershipComplete, true); const final = value.result.finalActual[0]; assert.equal(final.closed_count, 2); assert.equal(final.closure_count, 2); assert.equal(final.completion_result, 'conditional-completed');
    a07.different = { proof: value.result.race, observation: proof.observation, ledger: proof.ledger, finalAggregate: final, freshLoserHTTP: pin(value.result.explicitFreshParentRetry), originalA05PublishedProof: value.prepared.originalPublishedSnapshotProof }; }
}
a07.sameTask = lifecycle['same-task-own-B']?.result ? 'actual-result-present' : 'not-yet-observed-in-this-state';

const hbase = `${root}/tools/rust-r4ghi/H/implementation/support-patches/ui-integration`, manifests = [`${hbase}/windows-preflight22/manifest22.json`, `${hbase}/windows-preflight22-02/manifest22-02.json`], promoted = [];
for (const file of manifests) { const m = read(file), dir = path.dirname(file); for (const item of m.products) { assert.equal(sha(fs.readFileSync(`${dir}/${item.candidate}`)), item.afterSHA256); assert.equal(sha(fs.readFileSync(`${root}/${item.file}`)), item.afterSHA256); promoted.push({ manifest: pin(file), file: item.file, actualSHA256: item.afterSHA256 }); } for (const item of m.files) assert.equal(sha(fs.readFileSync(`${dir}/${item.file}`)), item.rawBytesSha256); }
const preflightPin = pin(`${root}/tmp/rust-r4ghi/root/ui-preflight81/receipt.json`), preflight = original(preflightPin);
const acl = original(preflight.aclProof); assert.equal(preflight.status, 'passed'); assert.equal(acl.PSEdition, 'Core'); assert.equal(acl.PowerShellVersion, '7.6.9'); assert.equal(acl.Protected, true); assert.equal(acl.inheritedPSModulePathUsed, false); assert.equal(preflight.parentEnvironmentUnchanged, true); assert.equal(preflight.browserStarted, false); assert.equal(preflight.HTTPExecuted, false);
assert.equal(pin(preflight.powershell.executablePath).rawBytesSha256, preflight.powershell.rawBytesSha256);
const output = { kind: 'I-FS-focused-actual78-A07-C66-resource-H22-review67', currentState: statePin, snapshot: snapshotPin,
  C66ResourceInventory: { exclusionIncludesAllMainUIA05: true, eligibleExistingOwnedModernContracts: available, noNewFixtureNeededIfRootChoosesListed: available.length > 0, noUnconsumedClaim: true },
  actual78: { proof: readbackPin, producerAPI: 134, consumerReadAPI: 135, actualListGETs: readbacks.filter(v => v.operationId.endsWith('listOperatingRestatements')).length, actualDetailGETs: readbacks.filter(v => v.operationId.endsWith('getOperatingRestatement')).length, observations: readbacks, original77PartialPreserved: rb.originalPartial77, oldPOSTReplayed: rb.oldPOSTReplayed },
  A07: a07, H22: { exactPromotionFiles: promoted, actualPreflight: preflightPin, aclProof: preflight.aclProof, edition: acl.PSEdition, version: acl.PowerShellVersion, pinnedExecutable: preflight.powershell, PSModulePathInherited: false, parentEnvironmentUnchanged: true, taskPrivateOnly: true, browserOrHTTPAcceptance: false },
  authorExecution: { FSOnly: true, SQL: false, HTTP: false, RootWritten: false, browserStarted: false }, G3Certified: false, G4Certified: false };
fs.writeFileSync(`${out}/focused-evidence67.json`, JSON.stringify(output, null, 2) + '\n'); console.log(JSON.stringify({ C66Candidates: available.map(v => ({ projectId: v.projectId, contractId: v.contractId, termSnapshotId: v.termSnapshotId, alreadyUsedBy: v.referencedByExistingAcceptanceFixture })), actual78GETs: readbacks.length, A07Cases: Object.keys(a07), H22Promoted: promoted.length, preflightCore: acl.PSEdition, version: acl.PowerShellVersion }));
