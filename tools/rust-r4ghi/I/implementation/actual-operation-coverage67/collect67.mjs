// Read-only inventory. Only this proposal directory is written. No Root helper
// import, createContext, database driver, network or credential output.
import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const out = path.dirname(fileURLToPath(import.meta.url)), root = '/mnt/e/projects/worktrees/poms-r3hijk-next28/poms', privateRoot = '/home/wangzishi/.local/share/poms-r4ghi/private';
const sha = bytes => createHash('sha256').update(bytes).digest('hex'), json = file => JSON.parse(fs.readFileSync(file)), pin = file => ({ file, rawBytesSha256: sha(fs.readFileSync(file)) });
const mapFile = `${root}/docs/design/rust-r4ghi/operation-map01.json`, planFile = `${root}/docs/design/rust-r4ghi/acceptance-plan01.json`, specFile = `${root}/libs/shared/api-spec/openapi.json`;
const definitions = json(mapFile).operations, spec = json(specFile), ids = new Set(definitions.map(value => value.operationId)); assert.equal(ids.size, 32);
const stateFile = `${privateRoot}/business/g2-business12/main01/state.json`, stateBytes = fs.readFileSync(stateFile), state = JSON.parse(stateBytes);
const retainedFiles = { 'g2-business10': `${privateRoot}/retention/epoch10-before-correction53/state-at-retention53.json`, 'g2-business11': `${privateRoot}/retention/epoch11-before-noop70/state-at-retention70.json` };
const states = { ...Object.fromEntries(Object.entries(retainedFiles).map(([epoch, file]) => [epoch, json(file)])), 'g2-business12': state };
const versions = Object.fromEntries(Object.entries(states).map(([epoch, value]) => [epoch, { epoch, sourcePinsSHA256: sha(JSON.stringify(value.sourcePins)), sourceCount: value.sourcePins.length, binarySHA256: value.apiProcess.record.binarySha256,
  API: epoch === 'g2-business10' ? 'API133' : epoch === 'g2-business11' ? 'API134' : 'API135', sourceState: epoch === 'g2-business12' ? { file: stateFile, rawBytesSha256: sha(stateBytes) } : pin(retainedFiles[epoch]) }]));
const success = new Map(); for (const methods of Object.values(spec.paths)) for (const op of Object.values(methods)) if (ids.has(op.operationId)) { const values = Object.keys(op.responses).filter(value => /^2\d\d$/.test(value)); assert.equal(values.length, 1); success.set(op.operationId, Number(values[0])); }
const births = {
  ProjectCostController_activateOperatingBaselinePackage: 'operating_baseline_package', ProjectCostController_createProjectOperatingSnapshot: 'project_operating_snapshot', ProjectCostController_createPeriodClosingSnapshot: 'period_closing_snapshot', ProjectCostController_createOperatingRestatement: 'operating_restatement_record',
  ProjectCostController_reviewOperatingSignalEvaluation: 'operating_signal_review_record', ProjectCostController_reviewCommissionGateBinding: 'commission_gate_review_record', CommissionController_createRoleAssignment: 'commission_role_assignment', CommissionRoleAssignmentController_freezeRoleAssignment: 'commission_role_assignment_freeze_payload',
  ProjectController_createAcceptanceRecord: 'acceptance_record', ProjectController_createProjectCompletionRecord: 'project_completion_record', ProjectController_createProjectArchiveRecord: 'project_archive_record', ProjectArchiveRecordController_replaceProjectArchiveRecord: 'project_archive_record',
  ProjectController_startExecution: 'project_stage_record', ProjectController_startAcceptance: 'project_stage_record', ProjectCompletionRecordController_closeCompletionCondition: 'project_completion_condition_closure',
};
function pinnedJSON(value) { assert(value?.file && value.rawBytesSha256); const bytes = fs.readFileSync(value.file); assert.equal(sha(bytes), value.rawBytesSha256); return JSON.parse(bytes); }
function rawRows(meta) { const bytes = fs.readFileSync(meta.file); assert.equal(sha(bytes), meta.rawBytesSha256); return bytes.toString('utf8').split('\n').filter(Boolean).map(text => { const row = JSON.parse(text); assert.equal(sha(row.raw), row.sha256); return row; }); }
function equalSnapshots(a, b) { assert.deepEqual(Object.keys(a.databases), Object.keys(b.databases)); assert.deepEqual(a.objects, b.objects); for (const database of Object.keys(a.databases)) { assert.deepEqual(a.databases[database].meta, b.databases[database].meta); for (const table of Object.keys(a.databases[database].tables)) assert.deepEqual(rawRows(a.databases[database].tables[table]).map(row => [row.key, row.sha256, row.xmin]), rawRows(b.databases[database].tables[table]).map(row => [row.key, row.sha256, row.xmin])); } }
function sourceHashes(value, prefix = '', output = []) { if (!value || typeof value !== 'object') return output; for (const [key, child] of Object.entries(value)) { const next = `${prefix}/${key}`; if (key === 'sourceHash' && typeof child === 'string' && /^[a-f0-9]{64}$/.test(child)) output.push(next); else if (typeof child === 'object') sourceHashes(child, next, output); } return output; }
function bodyShape(value) { const body = value?.data ?? value; return { topKeys: body && typeof body === 'object' && !Array.isArray(body) ? Object.keys(body) : Array.isArray(body) ? ['[array]'] : [String(body)],
  scopeKind: body?.scopeKind ?? null, preparationOnly: body?.preparation?.kind === 'preparation-only' || body?.kind === 'preparation-only', financialProjectionMode: body?.financialProjection?.mode ?? null, certification: body?.certification ?? null, sourceHashPaths: sourceHashes(body).slice(0, 12),
  responseRootIds: Object.fromEntries(['id', 'targetId', 'snapshotId', 'periodClosingSnapshotId', 'restatementId', 'closureRecordId'].filter(key => typeof body?.[key] === 'string').map(key => [key, body[key]])) }; }
const all = [], inconsistencies = [];
for (const epoch of Object.keys(versions)) {
  const privateDir = `${privateRoot}/business/${epoch}/main01`, publicDir = `${root}/tmp/rust-r4ghi/business/${epoch}/main01`, ledgers = new Map();
  for (const name of fs.readdirSync(privateDir).filter(name => /^\d+-ledger\.json$/.test(name))) { const file = `${privateDir}/${name}`, value = json(file); if (value.requestId && value.ownershipComplete === true) ledgers.set(value.requestId, { value, pin: pin(file) }); }
  const recoveryPin = states[epoch].gateSuccessRecovery41;
  let recovery = null;
  if (recoveryPin?.file.startsWith(privateDir + '/')) {
    recovery = pinnedJSON(recoveryPin); assert.equal(recovery.kind, 'metadata-only-reconciliation-of-already-committed-gate-review'); assert.equal(recovery.businessSQLWrites, 0); assert.equal(recovery.HTTPRequestsSent, 0); assert.equal(recovery.originalFailureRewritten, false); assert.equal(recovery.allRowsAndXminCatalogSequencesObjectsMatchOriginalAfter, true);
    const original = pinnedJSON(recovery.originalFailedOwnershipLedger); for (const [name, digest] of Object.entries(recovery.originals)) assert.equal(sha(fs.readFileSync(`${privateDir}/${name}`)), digest);
    assert.equal(recovery.canonicalResponsePointer, '/gateReviewRecordId');
    const actualAfter = pinnedJSON(original.after); equalSnapshots(actualAfter, pinnedJSON(recovery.freshObservation));
    for (const write of recovery.originalTransaction.writes) { const row = rawRows(actualAfter.databases.poms_r4ghi_rust.tables[write.table]).find(value => JSON.stringify(value.key) === JSON.stringify(write.key)); assert(row); assert.equal(row.sha256, write.rowSHA256); assert.equal(row.xmin, recovery.originalTransaction.actualSharedBusinessAuditAuthXmin); }
    ledgers.set(original.requestId, { value: original, pin: recovery.originalFailedOwnershipLedger, recovery: recoveryPin });
  }
  for (const name of fs.readdirSync(publicDir).filter(name => /-http\.json$/.test(name) && Number(name.match(/^\d+/)?.[0] ?? Infinity) <= states[epoch].sequence).sort()) {
    const file = `${publicDir}/${name}`, value = json(file); if (!ids.has(value.operationId)) continue;
    const ledger = ledgers.get(value.requestId); let actual = value, response = null, requestBody = null, privateOrigin = null;
    try {
      if (value.originals?.responseBody) { const bytes = fs.readFileSync(value.originals.responseBody.file); assert.equal(sha(bytes), value.originals.responseBody.rawBytesSha256); try { response = JSON.parse(bytes); } catch {} }
      else if (value.originals?.file) { const stored = pinnedJSON(value.originals); actual = { ...value, ...stored.attempt }; response = stored.attempt?.body ?? null; privateOrigin = value.originals; }
      const requestPin = value.originals?.requestConfig ?? value.originals?.request;
      if (requestPin) { const stored = pinnedJSON(requestPin); if (stored.url) assert.equal(new URL(stored.url).port, '31441'); privateOrigin ??= requestPin; }
      const requestBodyPin = value.originals?.requestBody; if (requestBodyPin) { const bytes = fs.readFileSync(requestBodyPin.file); assert.equal(sha(bytes), requestBodyPin.rawBytesSha256); try { requestBody = JSON.parse(bytes); } catch {} }
    } catch (error) { inconsistencies.push({ receipt: file, message: error.message }); continue; }
    const canonical = success.get(value.operationId), complete = actual.responseComplete === true && actual.transportFailure === false, expectationMatched = (actual.expectedStatus ?? value.expectedStatus ?? canonical) === canonical, exact = actual.status === canonical && complete && expectationMatched && Boolean(ledger);
    const domainBirths = ledger?.value.recorded.filter(row => row.kind === 'birth' && row.table === births[value.operationId]) ?? [];
    const domainUpdate = value.operationId === 'ProjectArchiveRecordController_voidProjectArchiveRecord' && (ledger?.value.recorded.some(row => row.kind === 'owned-update' && row.table === 'project_archive_record') ?? false);
    const shape = bodyShape(response), row = { epoch, API: versions[epoch].API, operationId: value.operationId, requestId: value.requestId, status: actual.status, expectedStatus: actual.expectedStatus ?? value.expectedStatus ?? null,
      complete, expectationMatched, ledgerComplete: Boolean(ledger && !ledger.recovery), explicitMetadataReconciliation: ledger?.recovery ?? null, canonicalExactHTTP: exact, realDomainBirths: domainBirths.length, realDomainUpdate: domainUpdate, inputVersion: requestBody?.inputVersion ?? actual.requestValue?.inputVersion ?? null, ...shape,
      receipt: pin(file), ledger: ledger?.pin ?? null, privateOriginal: privateOrigin, domainBirthKeys: domainBirths.slice(0, 8).map(row => ({ table: row.table, key: row.key })) };
    all.push(row);
  }
}
const rows = definitions.map(def => ({ operationId: def.operationId, group: def.group, method: def.method, canonicalTemplate: def.runtimePath, frozenMapSuccess: def.successStatus, currentCanonicalSuccess: success.get(def.operationId),
  versions: Object.fromEntries(Object.keys(versions).map(epoch => { const matches = all.filter(row => row.epoch === epoch && row.operationId === def.operationId), exact = matches.filter(row => row.canonicalExactHTTP), produced = exact.filter(row => row.realDomainBirths || row.realDomainUpdate); return [epoch, { API: versions[epoch].API, attempts: matches.length, statuses: Object.fromEntries([...new Set(matches.map(row => row.status))].map(status => [status, matches.filter(row => row.status === status).length])), exactSuccessAndLedger: exact.length, domainProducerHTTP: produced.length,
      preparationOnlySuccess: exact.filter(row => row.preparationOnly).length, sourceBoundContextSuccess: exact.filter(row => row.sourceHashPaths.length && !row.preparationOnly).length,
      exemplars: (produced.length ? produced : exact).slice(-2).map(row => ({ receipt: row.receipt, ledger: row.ledger, requestId: row.requestId, realDomainBirths: row.realDomainBirths, realDomainUpdate: row.realDomainUpdate, preparationOnly: row.preparationOnly, sourceHashPaths: row.sourceHashPaths })) }]; })) }));
const result = { kind: 'I-FS-only-32-operation-actual-HTTP-and-source-version-inventory67', capturedAt: new Date().toISOString(), inputs: [pin(mapFile), pin(planFile), pin(specFile)], currentState: { file: stateFile, rawBytesSha256: sha(stateBytes), sequence: state.sequence }, versions, rows, inconsistencies,
  evidenceBoundaries: ['Counts are observed actual HTTP + complete ledger only; not full scenario/Gate certification', 'Preparation GET is separately labelled and never producer', 'API133/134 remain historical; API135 reads can consume retained resources without becoming new producers', 'No pure/fixture/Native/mock/ignoredSQL evidence is counted as Rust HTTP producer'],
  authorExecution: { FSOnly: true, SQL: false, HTTP: false, RootWritten: false }, G3Certified: false, G4Certified: false };
fs.writeFileSync(`${out}/operation-matrix67.json`, JSON.stringify(result, null, 2) + '\n'); fs.writeFileSync(`${out}/http-evidence-index67.jsonl`, all.map(row => JSON.stringify(row)).join('\n') + '\n');
console.log(JSON.stringify({ totalHTTP: all.length, inconsistencies: inconsistencies.length, source: versions, summary: Object.fromEntries(Object.keys(versions).map(epoch => [epoch, { positiveOperations: rows.filter(row => row.versions[epoch].exactSuccessAndLedger).length, producerOperations: rows.filter(row => row.versions[epoch].domainProducerHTTP).length, missing: rows.filter(row => !row.versions[epoch].exactSuccessAndLedger).map(row => row.operationId) }])) }));
