// FS-only follow-up to the fixed 5501 cut. No Root imports or runtime actions.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
const dir = path.dirname(fileURLToPath(import.meta.url));
const priv = '/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = value => createHash('sha256').update(value).digest('hex');
const read = file => JSON.parse(fs.readFileSync(file));
const pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
function original(value) { assert(value?.file && value.rawBytesSha256); const bytes = fs.readFileSync(value.file); assert.equal(sha(bytes), value.rawBytesSha256); return JSON.parse(bytes); }
const matrix = read(`${dir}/operation-matrix67.json`), focused = read(`${dir}/focused-evidence67.json`);
assert.equal(matrix.currentState.sequence, 5501); assert.deepEqual(matrix.currentState, focused.currentState);
const index = fs.readFileSync(`${dir}/http-evidence-index67.jsonl`, 'utf8').trim().split('\n').map(JSON.parse);
const protocolPin = pin(`${priv}/business/g2-business11/main01/003638-modern-protocol56-complete.json`), protocol = original(protocolPin);
assert.equal(protocol.sourcePinsSHA256, matrix.versions['g2-business11'].sourcePinsSHA256); assert.equal(protocol.rows.length, 34); assert.equal(protocol.NativeHTTPExecuted, false);
const protocolRows = protocol.rows.map(row => {
  const receiptPin = pin(row.receipt), receipt = original(receiptPin), ledger = original(row.ledger);
  assert.equal(receipt.operationId, row.operationId); assert.equal(receipt.requestId, ledger.requestId); assert.equal(ledger.ownershipComplete, true);
  assert.equal(receipt.status, row.actualStatus); assert.equal(receipt.responseComplete, true); assert.equal(receipt.transportFailure, false); assert.equal(row.businessRowsAndXminUnchanged, true);
  const request = original(receipt.originals.requestBody), response = original(receipt.originals.responseBody);
  if (row.case === 'missing-protocol-tag') { assert.equal(row.actualStatus, 422); assert.notEqual(request.inputVersion, 'server-derived-v1'); }
  else { assert.equal(row.actualStatus, 400); assert.equal(request.inputVersion, 'server-derived-v1'); }
  return { operationId: row.operationId, case: row.case, actualStatus: row.actualStatus, API: 134, epoch: 'g2-business11', receipt: receiptPin, ledger: row.ledger,
    requestInputVersion: request.inputVersion ?? null, errorCode: response.code ?? response.error?.code ?? null, actualHTTPOnly: true };
});
const protocolOps = [...new Set(protocolRows.map(row => row.operationId))]; assert.equal(protocolOps.length, 17);
for (const operationId of protocolOps) { const rows = protocolRows.filter(row => row.operationId === operationId); assert.equal(rows.length, 2); assert.deepEqual(rows.map(row => row.actualStatus).sort(), [400, 422]); }
for (const row of matrix.rows.filter(row => row.method !== 'GET')) assert(protocolOps.includes(row.operationId));

const cPin = pin(`${priv}/business/g2-business12/main01/005501-c-terms66-proof.json`), c = original(cPin), observation = original(c.observation), ledger = original(c.ledger);
const cHTTP = pin(c.confirmation), confirmation = original(cHTTP); original(confirmation.originals.responseBody); original(c.approvedPlan);
assert.equal(c.actualEpoch, 'g2-business12'); assert.equal(c.actualFailedControlSQLSTATE, '55P03'); assert.equal(observation.mutation.code, '55P03'); assert.equal(observation.SQLValueChangeOrCommit, false);
assert(observation.applicationWait.some(row => row.pid === observation.appPid && row.wait_event_type === 'Lock' && row.blocked_by.includes(observation.barrierPid)));
assert(observation.mutationWait.some(row => row.pid === observation.mutatorPid && row.wait_event_type === 'Lock' && row.blocked_by.includes(observation.appPid)));
assert.equal(observation.barrierReleased, true); assert.equal(c.originalTermXminUnchanged, true); assert.equal(c.termBeforeRawSHA256, c.termAfterRawSHA256);
assert.equal(c.termsOrTaxFactsSubmittedBySQL, false); assert.equal(c.allUnrelatedRowsXminCatalogSequencesObjectsUnchanged, true);
assert.equal(confirmation.status, 200); assert.equal(confirmation.responseComplete, true); assert.equal(confirmation.transportFailure, false); assert.equal(ledger.ownershipComplete, true); assert.equal(confirmation.requestId, ledger.requestId);
const basis = c.basis[0]; assert.equal(c.basis.length, 1); assert.equal(basis.term_snapshot_id, c.exactOriginalTermRef.id); assert.equal(basis.frozen_payload.termSnapshotRef.payloadHash, c.exactOriginalTermRef.payloadHash);
assert.equal(basis.currency, basis.frozen_payload.currency); assert.equal(basis.currency_source_id, basis.term_snapshot_id); assert.equal(basis.tax_rate, basis.frozen_payload.taxRate);
const cents = value => { assert.equal(typeof value, 'string'); assert(/^-?\d+\.\d{2}$/.test(value)); const sign = value.startsWith('-') ? -1n : 1n; return sign * BigInt(value.replace('-', '').replace('.', '')); };
assert.equal(cents(basis.cash_gross), cents(basis.amount_excluding_tax) + cents(basis.tax_amount));

const snapshot = original(focused.snapshot), tables = snapshot.databases.poms_r4ghi_rust.tables;
function rows(table) { const meta = tables[table], bytes = fs.readFileSync(meta.file); assert.equal(sha(bytes), meta.rawBytesSha256); return bytes.toString('utf8').split('\n').filter(Boolean).map(line => { const row = JSON.parse(line); assert.equal(sha(row.raw), row.sha256); return { row, value: JSON.parse(row.raw) }; }); }
const contexts = rows('operating_source_context').filter(({ value }) => value.producer_version === 1).map(({ row, value }) => {
  const payload = value.frozen_payload, metrics = payload.metrics; assert.equal(payload.contextId, value.id); assert.equal(payload.projectId, value.project_id); assert.equal(payload.sourceHash, value.source_hash);
  const receipt = metrics.confirmedReceiptAmounts.gross, contract = metrics.effectiveContractAmounts.gross;
  let relation = 'unknown-or-no-positive-denominator';
  if (receipt.knowledge === 'known' && contract.knowledge === 'known' && cents(contract.value) > 0n) { const delta = cents(receipt.value) * 5n - cents(contract.value); relation = delta === 0n ? 'exactly-20-percent' : delta < 0n ? 'below-20-percent' : 'above-20-percent'; }
  return { contextId: value.id, projectId: value.project_id, snapshotId: value.snapshot_id, rowSHA256: row.sha256, xmin: row.xmin,
    exactReceiptRatioClass: relation, taxPendingKnowledge: metrics.taxPendingAmount.knowledge, taxPendingIsNull: metrics.taxPendingAmount.value === null,
    formalEligibility: payload.formalEligibility.status, rawMetricsNotExported: true };
});
const reasons = rows('operating_evaluation_reason'), ruleIds = [...new Set(reasons.map(({ value }) => value.rule_id))].sort();
const missingRuleIds = Array.from({ length: 11 }, (_, i) => `H${String(i + 1).padStart(2, '0')}`).filter(id => !ruleIds.includes(id));
const output = { kind: 'FS-only-current-cut67-protocol-C-race-and-stored-H-boundary-inventory', cut: matrix.currentState,
  modernProtocol: { original: protocolPin, actualAPI: 134, actualHTTPRows: 34, coveredModernWritesOf32: 16, additionalSupportingCWrites: 1, rows: protocolRows, NativeActualHTTP: false, reclassifiedAsAPI135: false },
  C85: { proof: cPin, observation: c.observation, confirmation: cHTTP, ledger: c.ledger, plan: c.approvedPlan,
    actualAPI: 135, projectId: basis.project_id, contractId: basis.contract_id, termSnapshotId: basis.term_snapshot_id, basisId: basis.id, receiptId: basis.receipt_id,
    actualLockEdges: [[observation.appPid, observation.barrierPid], [observation.mutatorPid, observation.appPid]], mutatorSQLSTATE: '55P03', SQLValueChangeOrCommit: false,
    originalTermSHAAndXminUnchanged: true, exactOriginalTermsCurrencyTaxRefsAndCents: true, sharedBusinessXmin: c.actualSharedBusinessXmin, noNewFixtureOrScopeRelaxation: true,
    reviewBoundary: 'C66 author only reports Root actual pinned evidence; not independent product certification' },
  storedHBoundary: { snapshot: focused.snapshot, contextRows: contexts, observedRuleIds: ruleIds, ruleIdsNotObservedInPersistedReasons: missingRuleIds,
    exactly20PercentContexts: contexts.filter(row => row.exactReceiptRatioClass === 'exactly-20-percent').length,
    boundary: 'Persisted facts inventory only. Rule presence is not proof of all threshold scenarios; no preparation-only result counted as published context.' },
  actualTargetHTTPAtCut: index.length, SQL: false, HTTP: false, RootWritten: false, G3Certified: false, G4Certified: false };
fs.writeFileSync(`${dir}/supplemental-evidence67.json`, JSON.stringify(output, null, 2) + '\n');
console.log(JSON.stringify({ protocolRows: protocolRows.length, protocolOps: protocolOps.length, C85: { actualAPI: 135, SQLSTATE: '55P03', currentTermsUnchanged: true },
  HContextCount: contexts.length, observedRuleIds: ruleIds, missingRuleIds, exactly20PercentContexts: output.storedHBoundary.exactly20PercentContexts }));
