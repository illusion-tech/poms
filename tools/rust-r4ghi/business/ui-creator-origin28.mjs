import assert from 'node:assert/strict'; import { createHash } from 'node:crypto';
export const originColumns28 = Object.freeze(['bootstrap_assignment_record_id', 'bootstrap_consumed_at', 'bootstrap_state', 'first_personal_assigned_at', 'first_personal_owner_user_id', 'row_version']);
const canonical = value => Array.isArray(value) ? value.map(canonical) : value && typeof value === 'object' ? Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])])) : value;
const sha = value => createHash('sha256').update(value).digest('hex');
export function assertOriginBefore28(origin, { projectId, creatorId, orgId, expectedOriginVersion }) {
  assert.equal(origin.project_id, projectId); assert.equal(origin.producer_version, 1); assert.equal(origin.creator_user_id, creatorId); assert.equal(origin.initial_kind, 'org-owned'); assert.equal(origin.initial_owner_user_id, null); assert.equal(origin.initial_owner_org_id, orgId);
  assert.equal(origin.source_type, 'direct-create'); assert.equal(origin.source_record_id, projectId); assert.equal(origin.bootstrap_state, 'available'); assert.equal(origin.row_version, expectedOriginVersion);
  for (const key of ['first_personal_owner_user_id', 'first_personal_assigned_at', 'bootstrap_consumed_at', 'bootstrap_assignment_record_id']) assert.equal(origin[key], null);
  const payload = origin.source_payload; assert.equal(sha(JSON.stringify(canonical(payload))), origin.source_payload_hash); assert.equal(payload.schemaVersion, 1);
  assert.equal(payload.projectId, projectId); assert.equal(payload.creatorUserId, creatorId); assert.equal(payload.initialKind, 'org-owned'); assert.equal(payload.initialOwnerUserId, null); assert.equal(payload.initialOwnerOrgId, orgId); assert.equal(payload.sourceType, 'direct-create'); assert.equal(payload.sourceRecordId, projectId);
}
export function assertOriginTransition28(old, next, { projectId, targetOwnerId }) {
  assert.equal(old.project_id, projectId); assert.equal(next.project_id, projectId); assert.equal(old.bootstrap_state, 'available'); assert.equal(next.bootstrap_state, 'consumed'); assert.equal(next.row_version, old.row_version + 1); assert.equal(next.first_personal_owner_user_id, targetOwnerId);
  const changed = [...new Set([...Object.keys(old), ...Object.keys(next)])].filter(key => JSON.stringify(old[key]) !== JSON.stringify(next[key])).sort(); assert.deepEqual(changed, originColumns28);
  assert(typeof next.bootstrap_assignment_record_id === 'string' && /^[a-f0-9-]{36}$/i.test(next.bootstrap_assignment_record_id)); assert.equal(next.first_personal_assigned_at, next.bootstrap_consumed_at); assert(Number.isFinite(Date.parse(next.first_personal_assigned_at)));
}
export function assertOriginCommit28({ beforeOrigin, origin, project, record, audit, requestId, actorId, projectId, targetOwnerId, targetOrgId, expectedProjectVersion }) {
  const a = JSON.parse(beforeOrigin.raw), o = JSON.parse(origin.raw), p = JSON.parse(project.raw), r = JSON.parse(record.raw), log = JSON.parse(audit.raw);
  assertOriginTransition28(a, o, { projectId, targetOwnerId }); assert.equal(p.id, projectId); assert.equal(p.owner_user_id, targetOwnerId); assert.equal(p.owner_org_id, targetOrgId); assert.equal(p.row_version, expectedProjectVersion + 1);
  assert.equal(r.id, o.bootstrap_assignment_record_id); assert.equal(r.project_id, projectId); assert.equal(r.previous_owner_user_id, null); assert.equal(r.previous_owner_org_id, a.initial_owner_org_id); assert.equal(r.new_owner_user_id, targetOwnerId); assert.equal(r.new_owner_org_id, targetOrgId); assert.equal(r.reassigned_by, actorId);
  assert.equal(Date.parse(r.reassigned_at), Date.parse(o.bootstrap_consumed_at)); assert.equal(log.request_id, requestId); assert.equal(log.event_type, 'ProjectController_reassignOwner'); assert.equal(log.target_id, projectId); assert.equal(log.operator_id, actorId); assert.equal(log.metadata.bootstrapConsumed, true);
  for (const row of [origin, record, audit]) assert.equal(row.xmin, project.xmin); return { originProjectId: projectId, reassignmentRecordId: r.id, commonXmin: project.xmin, columns: [...originColumns28] };
}
