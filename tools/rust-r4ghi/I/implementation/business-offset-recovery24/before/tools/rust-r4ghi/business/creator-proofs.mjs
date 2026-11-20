import assert from 'node:assert/strict';

const instant = value => {
  const matched = typeof value === 'string' && /^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})(?:\.(\d{1,9}))?(?:Z|\+00:00)$/.exec(value);
  assert(matched, 'Actual UTC producer timestamp required');
  return `${matched[1]}.${(matched[2] ?? '').padEnd(9, '0')}Z`;
};
export function assertCreatorAnchor(view, expected, schema) {
  assert.deepEqual(Object.keys(view).sort(), Object.keys(schema.properties).sort());
  assert.equal(view.scopeKind, 'creator-first-assignment-only'); assert.equal(view.projectId, expected.projectId);
  assert.equal(view.ownerUserId, null); assert.equal(view.ownerOrgId, expected.orgId); assert.equal(view.creatorUserId, expected.actorId);
  assert.equal(view.projectRowVersion, 1); assert.equal(view.ownershipOriginRowVersion, 1); assert.deepEqual(view.allowedActions, ['reassign-owner']);
}
export function assertCreationRows(project, origin, audits, { actorId, orgId, organization }) {
  assert.equal(project.created_by, actorId); assert.equal(project.updated_by, actorId); assert.equal(project.owner_org_id, orgId);
  assert.equal(project.owner_user_id, organization ? null : actorId); assert.equal(project.current_stage, 'assessment'); assert.equal(project.status, 'active');
  assert.equal(project.row_version, 1); assert.equal(project.source_lead_id, null);
  assert.equal(origin.project_id, project.id); assert.equal(origin.producer_version, 1); assert.equal(origin.creator_user_id, actorId);
  assert.equal(origin.source_type, 'direct-create'); assert.equal(origin.source_record_id, project.id); assert.equal(origin.initial_kind, organization ? 'org-owned' : 'personal');
  assert.equal(origin.initial_owner_user_id, organization ? null : actorId); assert.equal(origin.initial_owner_org_id, orgId);
  assert.equal(origin.bootstrap_state, organization ? 'available' : 'consumed'); assert.equal(origin.row_version, 1);
  assert.equal(origin.first_personal_owner_user_id, organization ? null : actorId); assert.equal(origin.bootstrap_assignment_record_id, null);
  if (organization) { assert.equal(origin.first_personal_assigned_at, null); assert.equal(origin.bootstrap_consumed_at, null); }
  else { assert.equal(instant(origin.first_personal_assigned_at), instant(project.created_at)); assert.equal(instant(origin.bootstrap_consumed_at), instant(project.created_at)); }
  assert(/^[a-f0-9]{64}$/.test(origin.source_payload_hash));
  const p = origin.source_payload; assert.equal(p.schemaVersion, 1); assert.equal(p.creatorUserId, actorId); assert.equal(p.projectId, project.id); assert.equal(p.sourceRecordId, project.id);
  assert.equal(p.sourceType, 'direct-create'); assert.equal(p.initialKind, origin.initial_kind); assert.equal(p.initialOwnerUserId, origin.initial_owner_user_id); assert.equal(p.initialOwnerOrgId, orgId);
  assert.equal(instant(p.createdAt), instant(project.created_at));
  assert.equal(audits.length, 1); const audit = audits[0];
  assert.equal(audit.event_type, 'project.ownership-origin-created'); assert.equal(audit.target_type, 'project'); assert.equal(audit.target_id, project.id);
  assert.equal(audit.operator_id, actorId); assert.equal(audit.result, 'success'); assert.deepEqual(audit.after_snapshot, p);
  assert.equal(audit.metadata.projectId, project.id); assert.equal(audit.metadata.sourcePayloadHash, origin.source_payload_hash); assert.equal(audit.metadata.sourceType, 'direct-create');
  assert.equal(instant(audit.occurred_at), instant(project.created_at));
}
export function assertConsumedOnce(origin, history, winner, actorId, orgId) {
  assert.equal(history.length, 1); const record = history[0];
  assert.equal(origin.bootstrap_state, 'consumed'); assert.equal(origin.row_version, 2); assert.equal(origin.initial_kind, 'org-owned');
  assert.equal(origin.initial_owner_user_id, null); assert.equal(origin.initial_owner_org_id, orgId);
  assert.equal(origin.first_personal_owner_user_id, winner); assert.equal(origin.bootstrap_assignment_record_id, record.id);
  assert.equal(record.previous_owner_user_id, null); assert.equal(record.previous_owner_org_id, orgId);
  assert.equal(record.new_owner_user_id, winner); assert.equal(record.new_owner_org_id, orgId); assert.equal(record.reassigned_by, actorId);
  assert.equal(instant(origin.first_personal_assigned_at), instant(record.reassigned_at)); assert.equal(instant(origin.bootstrap_consumed_at), instant(record.reassigned_at));
}
export function blockedByControl(pid, rows, controlPid) {
  const map = new Map(rows.map(row => [Number(row.pid), row.blocked_by.map(Number)])), seen = new Set(), pending = [Number(pid)];
  while (pending.length) {
    const current = pending.pop(); if (current === Number(controlPid)) return true;
    if (seen.has(current)) continue; seen.add(current); for (const blocker of map.get(current) ?? []) pending.push(blocker);
  }
  return false;
}
export function assertOwnershipRowsIsolated(before, after, projectId) {
  for (const table of ['project', 'project_ownership_origin', 'project_owner_reassignment_record']) {
    const target = row => { const value = JSON.parse(row.raw); return (table === 'project' ? value.id : value.project_id) === projectId; };
    const facts = rows => rows.filter(row => !target(row)).map(row => ({ key: row.key, sha256: row.sha256, xmin: row.xmin }));
    assert.deepEqual(facts(before[table]), facts(after[table]), 'Ownership command changed another project/origin/history row');
    if (table === 'project_owner_reassignment_record') {
      const previous = before[table].filter(target);
      for (const old of previous) {
        const current = after[table].find(row => JSON.stringify(row.key) === JSON.stringify(old.key));
        assert(current && current.sha256 === old.sha256 && current.xmin === old.xmin, 'An existing reassignment fact changed');
      }
    }
  }
}
