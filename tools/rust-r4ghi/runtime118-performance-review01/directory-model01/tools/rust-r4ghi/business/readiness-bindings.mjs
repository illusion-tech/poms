// Exact observed R3 diff-review child transition. This is ownership evidence,
// never an additional product authorization policy or a table-wide write permit.
import assert from 'node:assert/strict';

const same = (a, b) => typeof a === 'string' && typeof b === 'string' && a.toLowerCase() === b.toLowerCase();
const cell = row => JSON.parse(row.raw);
const key = row => JSON.stringify(row.key);

function stringEnd(raw, start) {
  assert.equal(raw[start], '"');
  for (let n = start + 1; n < raw.length; n++) {
    if (raw[n] === '\\') { n++; continue; }
    if (raw[n] === '"') return n + 1;
  }
  throw new Error('Invalid captured JSON string');
}
function valueEnd(raw, start) {
  if (raw[start] === '"') return stringEnd(raw, start);
  if (raw[start] === '{' || raw[start] === '[') {
    let depth = 1;
    for (let n = start + 1; n < raw.length; n++) {
      if (raw[n] === '"') { n = stringEnd(raw, n) - 1; continue; }
      if (raw[n] === '{' || raw[n] === '[') depth++;
      if (raw[n] === '}' || raw[n] === ']') depth--;
      if (depth === 0) return n + 1;
    }
    throw new Error('Invalid captured JSON container');
  }
  let n = start;
  while (n < raw.length && ![',', '}'].includes(raw[n])) n++;
  return n;
}
// Compare raw JSON without rounding monetary/numeric cells through JS Number.
export function onlyStatusTransition(before, after, from = 'blocked', to = 'ready') {
  let n = 0, found = null;
  const whitespace = () => { while (/\s/.test(before[n] ?? '') && n < before.length) n++; };
  whitespace(); if (before[n++] !== '{') return false;
  while (n < before.length) {
    whitespace(); if (before[n] === '}') break;
    const end = stringEnd(before, n), name = JSON.parse(before.slice(n, end)); n = end;
    whitespace(); if (before[n++] !== ':') return false;
    whitespace(); const start = n; n = valueEnd(before, start);
    if (name === 'status') { if (found) return false; found = { start, end: n }; }
    whitespace(); if (before[n] === ',') { n++; continue; }
    if (before[n] === '}') break;
    return false;
  }
  if (!found || JSON.parse(before.slice(found.start, found.end)) !== from) return false;
  return before.slice(0, found.start) + JSON.stringify(to) + before.slice(found.end) === after;
}

export function readinessDiffReviewMutationProof({ database, table, beforeRow, afterRow, attempt, before, after, readRows }) {
  if (table !== 'contract_readiness_package_item' || attempt.operationId !== 'ContractReadinessController_reviewDiff'
    || attempt.status !== 200 || attempt.expectedStatus !== 200 || !attempt.responseComplete || attempt.transportFailure) return null;
  const body = attempt.requestValue, response = attempt.body?.data ?? attempt.body;
  const baselineId = attempt.pathParams?.id, contractId = body?.contractId, diffId = body?.diffResultId;
  if (body?.diffDecision !== 'approved' || !Array.isArray(body.reviewedFieldKeys) || !Array.isArray(body.attachmentIds) || body.attachmentIds.length
    || response?.resultStatus !== 'reviewed' || response.baselineReviewDecision !== 'approved'
    || !same(response.targetId, baselineId) || !same(response.diffResultId, diffId)) return null;
  if (key(beforeRow) !== key(afterRow) || beforeRow.key.length !== 1 || !onlyStatusTransition(beforeRow.raw, afterRow.raw)) return null;
  const old = cell(beforeRow), next = cell(afterRow);
  if (old.item_key !== 'exact-contract-diff' || next.item_key !== 'exact-contract-diff' || !same(old.package_id, next.package_id)) return null;
  const rows = (snapshot, name) => readRows(snapshot.databases[database].tables[name]);
  const get = (snapshot, name, id) => rows(snapshot, name).find(row => row.key.length === 1 && same(row.key[0], id));
  const parentBefore = get(before, 'contract_readiness_package', old.package_id), parentAfter = get(after, 'contract_readiness_package', old.package_id);
  const diffBefore = get(before, 'commercial_baseline_diff_result', diffId), diffAfter = get(after, 'commercial_baseline_diff_result', diffId);
  const baselineBefore = get(before, 'commercial_release_baseline', baselineId), baselineAfter = get(after, 'commercial_release_baseline', baselineId);
  if (![parentBefore, parentAfter, diffBefore, diffAfter, baselineBefore, baselineAfter].every(Boolean)) return null;
  const p = cell(parentBefore), q = cell(parentAfter), d = cell(diffBefore), e = cell(diffAfter), b = cell(baselineBefore);
  if (!same(p.source_baseline_id, baselineId) || !same(p.latest_diff_result_id, diffId) || !same(p.contract_id, contractId)
    || !same(q.id, p.id) || !same(q.contract_id, contractId) || !same(q.source_baseline_id, baselineId) || !same(q.latest_diff_result_id, diffId)
    || q.guard_decision !== 'allowed' || q.package_status !== 'ready'
    || !same(d.baseline_id, baselineId) || !same(d.contract_id, contractId) || e.review_status !== 'approved'
    || !same(d.project_id, p.project_id) || !same(b.project_id, p.project_id) || b.row_version !== body.expectedVersion) return null;
  const fresh = name => {
    const previous = new Set(rows(before, name).map(key));
    return rows(after, name).filter(row => !previous.has(key(row)));
  };
  const audits = fresh('audit_log').filter(row => {
    const a = cell(row);
    return a.request_id === attempt.requestId && a.event_type === attempt.operationId && a.target_type === 'CommercialReleaseBaseline'
      && same(a.target_id, baselineId) && same(a.operator_id, attempt.actorId) && a.result === 'success';
  });
  const reviewed = [...body.reviewedFieldKeys].sort();
  const reviews = fresh('commercial_baseline_review_record').filter(row => {
    const a = cell(row);
    return same(a.baseline_id, baselineId) && same(a.diff_result_id, diffId) && same(a.project_id, p.project_id)
      && same(a.reviewer_user_id, attempt.actorId) && a.decision === body.diffDecision
      && Array.isArray(a.reviewed_field_keys) && JSON.stringify([...a.reviewed_field_keys].sort()) === JSON.stringify(reviewed);
  });
  if (audits.length !== 1 || reviews.length !== 1) return null;
  const xmin = afterRow.xmin;
  if (typeof xmin !== 'string' || !/^\d+$/.test(xmin) || ![audits[0], reviews[0], parentAfter, diffAfter, baselineAfter].every(row => row.xmin === xmin)) return null;
  return { kind: 'HTTP-exact-review-audit-and-real-transaction-child-status', requestId: attempt.requestId, operationId: attempt.operationId,
    actorId: attempt.actorId, table, key: afterRow.key, changedColumns: ['status'], beforeSHA256: beforeRow.sha256, afterSHA256: afterRow.sha256,
    beforeXmin: beforeRow.xmin, actualCommitXmin: xmin, baselineId, contractId, diffResultId: diffId, projectId: p.project_id,
    packageId: p.id, itemKey: 'exact-contract-diff', auditId: audits[0].key[0], reviewRecordId: reviews[0].key[0],
    auditAuthority: 'exact request/op/actor/target; audit ID is observed, not claimed as returned HTTP ID', sourceMutation: 'contract_readiness/service.rs review() exact-contract-diff status only' };
}
