import assert from 'node:assert/strict';

// Pure request plans and assertions only. Root supplies actual fresh receipts.
// No runner, network, filesystem, environment, subprocess, DB or browser access.
const field = (row, camel, snake = camel) => Object.hasOwn(row, camel) ? row[camel] : row[snake];
const json = value => typeof value === 'string' ? JSON.parse(value) : value;
function canonical(value) {
  if (value instanceof Date) return value.toISOString();
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]));
  }
  return value;
}
const jsonEqual = (actual, expected) => assert.deepEqual(canonical(json(actual)), canonical(json(expected)));

export function assertCoherentScore({ lead, snapshot }) {
  const component = json(field(snapshot, 'componentBreakdown', 'component_breakdown'));
  assert.equal(field(snapshot, 'systemScore', 'system_score'), lead.score);
  assert.equal(field(snapshot, 'systemRating', 'system_rating'), lead.rating);
  assert.equal(component.total, lead.score);
  if (Object.hasOwn(component, 'formulaVersion')) {
    assert.equal(component.formulaVersion, field(snapshot, 'formulaVersion', 'formula_version'));
  }
  return true;
}

export function assertSystemTupleReused({ storedSystem, decisionSnapshot }) {
  for (const [camel, snake] of [
    ['systemScore', 'system_score'], ['systemRating', 'system_rating'], ['formulaVersion', 'formula_version'],
  ]) assert.equal(field(decisionSnapshot, camel, snake), field(storedSystem, camel, snake));
  jsonEqual(field(decisionSnapshot, 'componentBreakdown', 'component_breakdown'), field(storedSystem, 'componentBreakdown', 'component_breakdown'));
  jsonEqual(field(decisionSnapshot, 'gateSummarySnapshot', 'gate_summary_snapshot'), field(storedSystem, 'gateSummarySnapshot', 'gate_summary_snapshot'));
  return true;
}

export function assertNormalDecisionDidNotRefreshLead({ beforeLead, afterLead, storedSystem, decisionSnapshot }) {
  for (const [camel, snake] of [
    ['score', 'score'], ['rating', 'rating'], ['scoreReason', 'score_reason'],
    ['rowVersion', 'row_version'], ['scoreUpdatedAt', 'score_updated_at'],
    ['updatedAt', 'updated_at'], ['updatedBy', 'updated_by'],
  ]) assert.deepEqual(field(afterLead, camel, snake), field(beforeLead, camel, snake));
  assertCoherentScore({ lead: afterLead, snapshot: decisionSnapshot });
  assertSystemTupleReused({ storedSystem, decisionSnapshot });
  return true;
}

export function assertLegacyFallback({ beforeLead, afterLead, systemSnapshot, decisionSnapshot, actorId, overrideId }) {
  assert.equal(field(afterLead, 'rowVersion', 'row_version'), field(beforeLead, 'rowVersion', 'row_version') + 1);
  assert.equal(field(afterLead, 'updatedBy', 'updated_by'), actorId);
  assert.ok(field(afterLead, 'scoreUpdatedAt', 'score_updated_at'));
  assert.ok(field(afterLead, 'updatedAt', 'updated_at'));
  assert.equal(field(systemSnapshot, 'snapshotKind', 'snapshot_kind'), 'system');
  assert.ok(['manual-override', 'override-revoked'].includes(field(decisionSnapshot, 'snapshotKind', 'snapshot_kind')));
  assert.equal(field(systemSnapshot, 'sourceRecordId', 'source_record_id'), overrideId);
  assert.equal(field(decisionSnapshot, 'sourceRecordId', 'source_record_id'), overrideId);
  assertCoherentScore({ lead: afterLead, snapshot: systemSnapshot });
  assertCoherentScore({ lead: afterLead, snapshot: decisionSnapshot });
  assertSystemTupleReused({ storedSystem: systemSnapshot, decisionSnapshot });
  return true;
}

export function assertCommandEffectiveMatchesGet({ command, get, pgLead, approvedOverride }) {
  // command/get are the unwrapped Lead DTOs; pgLead is the committed business row.
  for (const key of ['score', 'rating', 'effectiveScore', 'effectiveRating', 'effectiveScoreReason', 'effectiveScoreSource', 'activeScoreOverrideId']) {
    assert.deepEqual(command[key], get[key]);
  }
  assert.equal(command.score, pgLead.score);
  assert.equal(command.rating, pgLead.rating);
  if (approvedOverride) {
    assert.equal(command.effectiveScore, field(approvedOverride, 'requestedScore', 'requested_score'));
    assert.equal(command.effectiveRating, field(approvedOverride, 'requestedRating', 'requested_rating'));
    assert.equal(command.activeScoreOverrideId, approvedOverride.id);
    assert.equal(command.effectiveScoreSource, 'manual-override');
  } else {
    assert.equal(command.effectiveScore, command.score);
    assert.equal(command.effectiveRating, command.rating);
    assert.equal(command.activeScoreOverrideId, null);
    assert.equal(command.effectiveScoreSource, 'system');
  }
  return true;
}

export function assertFailedDecisionRolledBack({ beforeGraph, afterGraph, beforeSession, afterSession }) {
  // Root excludes HTTP trace/observed wall clock and includes only owned business
  // rows, versions, history, assignments, projects, links and registered audits.
  jsonEqual(afterGraph, beforeGraph);
  if (beforeSession !== undefined) jsonEqual(afterSession, beforeSession);
  return true;
}

export function buildLeadCorrectionCases(ids) {
  for (const key of ['lead', 'pendingOverride', 'approvedOverride']) {
    assert.equal(typeof ids[key], 'string', `Root supplies actual ${key}`);
    assert.ok(ids[key].length > 0);
  }
  assert.ok(Number.isInteger(ids.leadVersion));
  assert.ok(Number.isInteger(ids.pendingVersion));
  assert.ok(Number.isInteger(ids.approvedVersion));
  const lead = encodeURIComponent(ids.lead);
  const pending = encodeURIComponent(ids.pendingOverride);
  const approved = encodeURIComponent(ids.approvedOverride);
  const approve = {
    operationId: 'LeadScoreOverrideController_approve', method: 'POST',
    path: `/api/lead-score-overrides/${pending}:approve`,
    json: { expectedOverrideRowVersion: ids.pendingVersion, note: '同事务验证已存评分依据及历史补算。' },
  };
  const revoke = {
    operationId: 'LeadScoreOverrideController_revoke', method: 'POST',
    path: `/api/lead-score-overrides/${approved}:revoke`,
    json: { expectedOverrideRowVersion: ids.approvedVersion, reason: '同事务撤销并保留一致系统依据。' },
  };
  const update = {
    operationId: 'LeadController_update', method: 'PATCH', path: `/api/leads/${lead}`,
    json: { expectedVersion: ids.leadVersion, urgency: ids.changedUrgency ?? 'high' },
  };
  return [
    {
      id: 'A-G2-01', name: 'One system materialization despite independently committed facts', requests: [update],
      barrier: 'Root ACCESS EXCLUSIVE lead_score_override; observe the PATCH approved-override lookup waiter after score materialization. Commit a real score-changing I producer while it waits, then release.',
      note: 'The corrected PATCH now holds its successful Lead UPDATE row lock at this barrier; the I producer can still read the Lead, and ordinary non-key Lead UPDATE permits its FK KEY SHARE check. Verify the actual producer returns before releasing; do not replace it with prepared SQL or claim a sleep as an observed interleaving.',
      assertions: ['assertCoherentScore for committed Lead/system snapshot', 'formula/breakdown/gates come from one fixed materialization; later GET remains readonly'],
    },
    {
      id: 'A-G2-02', name: 'Normal manual/revoke keeps a matching system tuple after new facts', requests: [approve, revoke],
      fixture: 'Use separate real API-created Lead fixtures. After last stored system snapshot, add real I/F/upload facts; do not touch Lead. Replace decision IDs/versions from actual responses.',
      assertions: ['assertNormalDecisionDidNotRefreshLead', 'exactly one manual or revoked snapshot and one registered decision audit', 'matching v2 or coherent v1 formula retained; no generic ApprovalRecord/Todo'],
    },
    {
      id: 'A-G2-03', name: 'Historical missing/mismatched/invalid tuple fallback for approve and revoke', requests: [approve, revoke],
      fixtureVariants: ['no system snapshot', 'stored system score differs', 'wrong breakdown.total or group/facts arithmetic', 'component formula disagrees with snapshot formula', 'invalid JSON-object shape or incomplete v2 facts', 'same numeric total but different current Lead base components/gates'],
      provenance: 'Root-owned prepared historical facts, before/preparation/after and cleanup separately recorded; do not claim them as real producer requests. Actual pending/approved override comes from the existing API.',
      assertions: ['assertLegacyFallback', 'one Lead version increment, new system score/rating/reason/scoreUpdatedAt/updatedAt/actor', 'one new system snapshot then one decision snapshot, one registered decision audit, same TX/session', 'same-score recalculation still writes version/time and system evidence'],
    },
    {
      id: 'A-G2-04', name: 'Every necessary legacy fallback write failure rolls back', requests: [approve, revoke],
      failures: ['deny Lead UPDATE', 'deny first system snapshot INSERT', 'deny decision snapshot INSERT after fallback system evidence', 'deny registered decision audit INSERT'],
      leadUpdateBarrier: 'FOR UPDATE itself needs UPDATE privilege. To fail the actual fallback UPDATE after locking, Root can block the candidate system-snapshot SELECT with ACCESS EXCLUSIVE lead_score_snapshot, observe that waiter after Lead lock, revoke app Lead UPDATE, then release. A matching-tuple decision under that same staged revoke should not issue Lead UPDATE; startup-time denial alone proves only the early lock permission failure.',
      decisionSnapshotBarrier: 'For the later snapshot fault, Root may hold target override FOR UPDATE before the request. Request holds Lead lock, recalculates/writes system snapshot, then waits on target override CAS. Observe that exact waiter; revoke only app snapshot INSERT privilege using Root session, release target row, and restore permission after500. No new trigger/table/DDL is needed. Record blocker/request identity and statement phase, never infer an uncommitted graph from an ordinary independent SELECT.',
      assertions: ['assertFailedDecisionRolledBack, including old approved status and pending/revoked target versions', 'no system backfill survives later manual-snapshot or audit failure', 'restored permissions followed by successful retry'],
    },
    {
      id: 'A-G2-05', name: 'Normal decision failure preserves stored tuple', requests: [approve, revoke],
      failures: ['deny decision snapshot INSERT', 'deny registered decision audit INSERT'],
      assertions: ['assertFailedDecisionRolledBack', 'no Lead score/time/version refresh even on success or failure of a matching-tuple decision'],
    },
    {
      id: 'A-G2-06', name: 'Two legacy approvals or two legacy revocations do not double repair',
      races: [
        { requests: [approve, approve], statuses: [200, 409] },
        { requests: [revoke, revoke], statuses: [200, 409] },
      ],
      barrier: 'Root holds the Lead row, starts two distinct authenticated sessions, records two FOR UPDATE waiters, then releases.',
      assertions: ['one successful Lead repair/version increment and one system+decision snapshot pair', 'one registered decision audit and required session effects only for winner', 'loser rereads override after Lead lock and gets409; no SQL40P01/deadlock500'],
    },
    {
      id: 'A-G2-07', name: 'Legacy approve replacement competes with old-active revoke', requests: [approve, revoke],
      expectedSerialOutcomes: ['approve first: approve200, old-active revoke409', 'revoke first: revoke200 then pending approve200 is valid serialization'],
      assertions: ['one coherent system repair in total', 'each successful decision contributes exactly its own snapshot/audit', 'at most one approved override, complete superseded/revoked history, no deadlock/partial repair'],
    },
    {
      id: 'A-G2-08', name: 'Legacy fallback and explicit Lead expected-version writer', requests: [approve, update],
      assertions: ['only a serially valid graph; explicit stale Lead writer409 rather than overwriting repaired Lead', 'system snapshot always coherent with the committed writer', 'no cross-row lock cycle or FOR SHARE upgrade'],
    },
    {
      id: 'A-G2-09', name: 'Immediate command response agrees with GET under active override', requests: [update],
      fixture: 'Real approve first, then changed PATCH with valid current version. Also cover existing qualify/close callers on separate eligible fixtures, and exact PATCH noop; no new route or DTO.',
      assertions: ['assertCommandEffectiveMatchesGet for response/GET/PG', 'new system score can change while effective score remains active override', 'exact noop has no Lead version/time/snapshot/audit writes'],
    },
    {
      id: 'A-G2-10', name: 'All explicit system triggers and semantic dedup after shared-builder repair',
      operationIds: ['LeadController_create', 'LeadController_update', 'LeadController_claimOwner', 'LeadController_assignOwner', 'LeadController_qualify', 'LeadController_close', 'LeadController_convertToProject'],
      assertions: ['assertCoherentScore on each newly created system snapshot', 'name-only / exact noop does not invent system history', 'owner/gate/formula/facts change retains existing meaningful dedup behavior', 'required assignment/snapshot/audit faults still roll back complete owning command', 'real conversion attachment/Project references and number reservation semantics unchanged'],
    },
  ];
}
