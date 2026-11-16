// Candidate support only. Root independently reviews before promotion or HTTP use.
import assert from 'node:assert/strict';
import { data, keyOf, numberProof, uuid } from './pure.mjs';

const OP = 'ProjectCostController_createOperatingRestatement';
const TAG = 'one-owned-labor-replacement-v1';
export function assertRestatementLaborNumberBinding(ctx, operationId, body, binding) {
  if (binding.restatementLaborCounter === undefined) return false;
  assert.equal(binding.restatementLaborCounter, TAG, 'Unknown internal-number proof mode');
  assert.equal(operationId, OP);
  assert.equal(binding.number, undefined, 'An internal replacement is not a response-ID number binding');
  assert.equal(body?.laborCorrections?.length, 1, 'This inventory proves exactly one real E replacement');
  const old = body.laborCorrections[0].supersededCostRef;
  assert.equal(old?.kind, 'ProjectActualCostRecord'); uuid(old.id);
  const owned = ctx.state.owned[keyOf(ctx.database, 'project_actual_cost_record', [old.id])];
  assert(owned && !owned.deleted && owned.proof?.transport === 'HTTP', 'Actual owned HTTP predecessor required');
  return true;
}

export function resolveRestatementLaborNumber({ ctx, before, after, attempt, binding, anchors, readRows, specs }) {
  if (!assertRestatementLaborNumberBinding(ctx, attempt.operationId, attempt.requestValue, binding)) return null;
  // Failed attempts must have no business/counter drift. The existing ledger's
  // unchanged failure reconciliation checks that; it receives no positive proof.
  if (!(attempt.status >= 200 && attempt.status < 300)) return null;
  const rows = (snapshot, table) => readRows(snapshot.databases[ctx.database].tables[table]);
  const cells = row => JSON.parse(row.raw);
  const oldRef = attempt.requestValue.laborCorrections[0].supersededCostRef;
  const oldRows = rows(before, 'project_actual_cost_record').filter(row => row.key.length === 1 && row.key[0] === oldRef.id);
  assert.equal(oldRows.length, 1); const oldRow = oldRows[0], old = cells(oldRow);
  const owned = ctx.state.owned[keyOf(ctx.database, 'project_actual_cost_record', [oldRef.id])];
  assert.equal(owned.latestSha256, oldRow.sha256); assert.equal(owned.latestXmin, oldRow.xmin);
  assert.equal(old.cost_type, 'labor'); assert.equal(old.row_version, oldRef.expectedVersion);
  const response = data(attempt); uuid(response?.targetId); uuid(response?.snapshotId);
  const root = anchors.filter(anchor => anchor.table === 'operating_restatement_record' && anchor.id === response.targetId);
  const snapshotRoot = anchors.filter(anchor => anchor.table === 'project_operating_snapshot' && anchor.id === response.snapshotId);
  assert.equal(root.length, 1); assert.equal(snapshotRoot.length, 1);
  const xmin = root[0].xmin; assert(xmin); assert.equal(snapshotRoot[0].xmin, xmin);
  const beforeIds = new Set(rows(before, 'project_actual_cost_record').map(row => row.key[0]));
  const newCosts = rows(after, 'project_actual_cost_record').filter(row => !beforeIds.has(row.key[0]));
  // All E replacements in this command must be inventoried. An extra hidden
  // replacement cannot be hidden behind another response/audit transaction anchor.
  assert.equal(newCosts.length, 1, 'Unexpected additional internal E cost producer');
  const newRow = newCosts[0], replacement = cells(newRow); uuid(replacement.id);
  assert.equal(newRow.key.length, 1); assert.equal(newRow.key[0], replacement.id);
  assert.equal(newRow.xmin, xmin); assert.equal(replacement.supersedes_record_id, old.id);
  assert.equal(replacement.project_id, old.project_id); assert.equal(replacement.cost_type, 'labor');
  assert.equal(replacement.source_type, 'labor'); assert.equal(replacement.basis_origin, 'captured');
  assert.equal(replacement.registered_by, attempt.actorId); assert.equal(replacement.currency, old.currency);
  assert(replacement.calculation_basis && typeof replacement.calculation_basis === 'object');
  const oldAfterRows = rows(after, 'project_actual_cost_record').filter(row => row.key[0] === old.id);
  assert.equal(oldAfterRows.length, 1); const oldAfter = cells(oldAfterRows[0]);
  assert.equal(oldAfterRows[0].xmin, xmin); assert.equal(oldAfter.record_status, 'replaced');
  assert.equal(oldAfter.row_version, old.row_version + 1);
  const beforeAuditIds = new Set(rows(before, 'audit_log').map(row => row.key[0]));
  const audits = rows(after, 'audit_log').filter(row => !beforeAuditIds.has(row.key[0]));
  for (const target of [old.id, replacement.id]) {
    const matches = audits.filter(row => {
      const audit = cells(row);
      return audit.request_id === attempt.requestId && audit.event_type === OP && audit.target_type === 'ProjectActualCostRecord'
        && audit.target_id === target && audit.operator_id === attempt.actorId && audit.result === 'success';
    });
    assert.equal(matches.length, 1, 'Exact real E predecessor/successor audit is required'); assert.equal(matches[0].xmin, xmin);
  }
  const spec = specs['cost-labor']; assert.equal(spec?.prefix, 'AC-LBR'); assert.equal(spec.padding, 6);
  assert(typeof replacement.record_no === 'string');
  const numberMatch = /^AC-LBR-(\d{4})-\d{6,}$/.exec(replacement.record_no); assert(numberMatch);
  const counterMatches = rows(after, 'business_number_sequence').filter(row => {
    const value = cells(row); return value.scope === 'cost-labor' && value.period === numberMatch[1];
  });
  assert.equal(counterMatches.length, 1); assert.equal(counterMatches[0].xmin, xmin, 'Counter is enlisted in the actual outer transaction');
  const beforeCounter = rows(before, 'business_number_sequence').find(row => {
    const value = cells(row); return value.scope === 'cost-labor' && value.period === numberMatch[1];
  }) ?? null;
  const effectiveBinding = { scope: 'cost-labor', pointer: '/recordNo' }, actualBody = { recordNo: replacement.record_no };
  const counter = numberProof(counterMatches[0], beforeCounter, effectiveBinding, actualBody, specs);
  assert(counter, 'Actual stored new E number must prove exactly one official counter increment');
  return { binding: effectiveBinding, actualBody, storedNumberProof: {
    numberSource: 'actual-new-owned-E-replacement-under-G-outer-transaction', table: 'project_actual_cost_record', id: replacement.id,
    predecessorId: old.id, projectId: old.project_id, column: 'record_no', rowSha256: newRow.sha256, actualCommonXmin: xmin,
    responseRootId: response.targetId, responseSnapshotId: response.snapshotId, exactEAudits: true, locallyMintedBusinessNumber: false,
    independentTransactionAllowed: false,
  } };
}
