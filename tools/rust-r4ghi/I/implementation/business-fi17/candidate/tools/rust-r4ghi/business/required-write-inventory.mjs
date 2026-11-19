// Only source-reviewed Role/I paths below. This is not a list of guessed tables.
import assert from 'node:assert/strict';
import { sha, uuid, keyOf } from './pure.mjs';
import { readRows } from './snapshot.mjs';

const roleSource = 'apps/poms-api-rust/src/commission_assignment/service.rs';
const lifecycleSource = 'apps/poms-api-rust/src/project_lifecycle/service.rs';
const factsSource = 'apps/poms-api-rust/src/project_lifecycle/facts.rs';
const evidenceSource = 'apps/poms-api-rust/src/lifecycle_evidence/mod.rs';
const authSource = 'apps/poms-api-rust/src/auth/store.rs';
const auditSource = 'apps/poms-api-rust/src/contract_support/mod.rs';

function entry(key, table, event, match, source, rationale) {
  return { key, table, event, match, source, rationale };
}
export function requiredWriteInventory(operationId, { projectId, actorId, params, body }) {
  uuid(projectId); uuid(actorId); assert(body && typeof body === 'object');
  const project = (key = 'project-cas') => entry(key, 'project', 'UPDATE', { kind: 'equals', values: { id: projectId } }, lifecycleSource, 'Actual source calls bump_project or write_stage CAS.');
  const projectInsert = (key, table, values = {}, source = lifecycleSource) => entry(key, table, 'INSERT', { kind: 'equals', values: { project_id: projectId, ...values } }, source, 'Actual INSERT includes this run owned project FK.');
  const summaries = (scenario, packageKey, targetType, targetId = null) => {
    const summary = { kind: 'summary', actorId, scenario, packageKey, targetType, targetId };
    return [entry('summary-snapshot', 'approval_summary_snapshot', 'INSERT', summary, factsSource, 'facts::summary writes an actor-bound exact scenario/package/type; stage target UUID is allocated later, not fabricated.'),
      entry('summary-last-field', 'approval_summary_field_projection', 'INSERT', { kind: 'summary-field', summary, fieldOrder: 5 }, factsSource, 'All six fixed fields are mandatory; fail the last field after prior fields were inserted.')];
  };
  const stage = (toStage, packageKey) => [...summaries('project-stage-transition', packageKey, 'project-stage-record'),
    projectInsert('stage-ledger', 'project_stage_record', { to_stage: toStage }, factsSource), project()];
  const evidence = (owner, refs, extra = {}) => {
    assert(Array.isArray(refs) && refs.length, 'This FI case must use actual nonempty evidence, not an unexercised conditional branch');
    return entry(`evidence-${owner}`, 'project_lifecycle_evidence_ref', 'INSERT', { kind: 'evidence', projectId, owner,
      linkId: uuid(refs.at(-1).attachmentLinkId), ...extra }, evidenceSource, 'Exact last request attachment link and real owner FK branch in lifecycle_evidence::persist.');
  };
  let entries;
  switch (operationId) {
    case 'CommissionController_createRoleAssignment':
      assert.equal(body.expectedCurrentAssignmentId, null); assert.equal(body.expectedCurrentRowVersion, null);
      assert(body.participants?.length > 1);
      entries = [projectInsert('role-draft', 'commission_role_assignment', {}, roleSource),
        entry('role-last-participant', 'commission_role_assignment_participant', 'INSERT', { kind: 'participant', projectId, order: body.participants.length - 1 }, roleSource, 'Last actual input participant, joined through the newly inserted real assignment project FK.')];
      break;
    case 'CommissionRoleAssignmentController_freezeRoleAssignment':
      entries = [...summaries('commission-role-freeze', 'commission-role-freeze-confirmation', 'commission-role-assignment', uuid(params.id)),
        projectInsert('role-freeze-payload', 'commission_role_assignment_freeze_payload', { assignment_id: uuid(params.id) }, roleSource),
        entry('role-freeze-cas', 'commission_role_assignment', 'UPDATE', { kind: 'equals', values: { id: uuid(params.id), project_id: projectId } }, roleSource, 'Real current draft CAS; D receipt/handover verification is read-only here.')];
      break;
    case 'ProjectController_startExecution': entries = stage('execution', 'project-execution-admission'); break;
    case 'ProjectController_startAcceptance': entries = [...stage('acceptance', 'project-acceptance-admission'), evidence('stage', body.evidenceRefs)]; break;
    case 'ProjectController_createAcceptanceRecord':
      entries = [projectInsert('final-acceptance', 'acceptance_record'), evidence('acceptance', body.evidenceRefs), project()]; break;
    case 'ProjectController_createProjectCompletionRecord': {
      assert.equal(body.completionResult, 'conditional-completed'); assert(body.completionConditions?.length > 0);
      const last = body.completionConditions.length - 1;
      entries = [projectInsert('completion-record', 'project_completion_record'), evidence('completion', body.evidenceRefs),
        projectInsert('last-completion-condition', 'project_completion_condition', { sort_order: last }),
        evidence('condition', body.completionConditions[last].evidenceRefs, { conditionOrder: last }),
        ...stage('conditional-completed', 'project-completion-stage')]; break;
    }
    case 'ProjectCompletionRecordController_closeCompletionCondition':
      entries = [projectInsert('personal-condition-closure', 'project_completion_condition_closure', { condition_id: uuid(params.id), completion_record_id: uuid(params.completionRecordId), closed_by: actorId }),
        evidence('closure', body.evidenceRefs, { conditionId: uuid(params.id), completionId: uuid(params.completionRecordId) }),
        entry('condition-dual-cas', 'project_completion_condition', 'UPDATE', { kind: 'equals', values: { id: uuid(params.id), completion_record_id: uuid(params.completionRecordId), project_id: projectId } }, lifecycleSource, 'Exact parent/child/project CAS and actual responsible actor.'),
        entry('completion-aggregate-cas', 'project_completion_record', 'UPDATE', { kind: 'equals', values: { id: uuid(params.completionRecordId), project_id: projectId } }, lifecycleSource, 'Actual server pending/closed aggregate CAS, without changing original completion conclusion.')]; break;
    case 'ProjectController_createProjectArchiveRecord': entries = [projectInsert('archive-record', 'project_archive_record'), project()]; break;
    case 'ProjectArchiveRecordController_replaceProjectArchiveRecord':
      entries = [entry('archive-predecessor-cas', 'project_archive_record', 'UPDATE', { kind: 'equals', values: { id: uuid(params.id), project_id: projectId } }, lifecycleSource, 'Real recorded predecessor becomes superseded in the same transaction.'),
        projectInsert('replacement-archive', 'project_archive_record', { supersedes_archive_record_id: uuid(params.id) })]; break;
    case 'ProjectArchiveRecordController_voidProjectArchiveRecord':
      entries = [entry('archive-void-cas', 'project_archive_record', 'UPDATE', { kind: 'equals', values: { id: uuid(params.id), project_id: projectId } }, lifecycleSource, 'Actual recorded version CAS; terminal project stage is not rewritten.')]; break;
    default: throw new Error('No reviewed required-write inventory for this operation; never sweep guessed tables');
  }
  entries.push(entry('required-success-audit', 'audit_log', 'INSERT', { kind: 'audit', operationId, actorId, projectId }, auditSource, 'Exact operation/request/actor/project success audit in the business outer transaction.'));
  entries.push(entry('pending-auth-coflush', 'auth_session', 'UPDATE', { kind: 'auth-coflush', operationId, actorId, projectId }, authSource, 'Only after this request audit exists; raw pre-transaction last_seen touch is deliberately excluded. Real throttle expiry is required.'));
  assert.equal(new Set(entries.map(e => e.key)).size, entries.length);
  return entries;
}

const literal = value => {
  assert(value === null || typeof value === 'string' && /^[A-Za-z0-9_.:-]{1,150}$/.test(value) || Number.isSafeInteger(value));
  return value === null ? 'NULL' : `'${value}'`;
};
const equalSql = (expression, values) => Object.entries(values).map(([key, value]) => {
  assert(/^[a-z_][a-z0-9_]*$/.test(key)); return value === null ? `${expression}->>'${key}' IS NULL` : `${expression}->>'${key}'=${literal(value)}`;
}).join(' AND ');
function summarySql(expression, m) {
  return equalSql(expression, { created_by: uuid(m.actorId), approval_scenario_key: m.scenario, summary_package_key: m.packageKey, target_type: m.targetType,
    ...(m.targetId ? { target_id: uuid(m.targetId) } : {}) });
}
export function selectorSql(descriptor, context) {
  const m = descriptor.match;
  switch (m.kind) {
    case 'equals': return equalSql('j', m.values);
    case 'participant': return `(j->>'sort_order')::int=${m.order} AND EXISTS(SELECT 1 FROM poms.commission_role_assignment a WHERE a.id=(j->>'assignment_id')::uuid AND a.project_id=${literal(uuid(m.projectId))}::uuid)`;
    case 'summary': return summarySql('j', m);
    case 'summary-field': return `(j->>'field_order')::int=${m.fieldOrder} AND EXISTS(SELECT 1 FROM poms.approval_summary_snapshot s WHERE s.id=(j->>'summary_snapshot_id')::uuid AND ${summarySql('to_jsonb(s)', m.summary)})`;
    case 'evidence': {
      const columns = { stage: 'stage_record_id', acceptance: 'acceptance_record_id', completion: 'completion_record_id', condition: 'completion_condition_id', closure: 'condition_closure_id' };
      assert(columns[m.owner]); let condition = equalSql('j', { project_id: uuid(m.projectId), attachment_link_id: uuid(m.linkId) }) + ` AND j->>'${columns[m.owner]}' IS NOT NULL`;
      if (m.owner === 'condition') condition += ` AND EXISTS(SELECT 1 FROM poms.project_completion_condition c WHERE c.id=(j->>'completion_condition_id')::uuid AND c.project_id=${literal(uuid(m.projectId))}::uuid AND c.sort_order=${m.conditionOrder})`;
      if (m.owner === 'closure') condition += ` AND EXISTS(SELECT 1 FROM poms.project_completion_condition_closure c WHERE c.id=(j->>'condition_closure_id')::uuid AND c.condition_id=${literal(uuid(m.conditionId))}::uuid AND c.completion_record_id=${literal(uuid(m.completionId))}::uuid AND c.project_id=${literal(uuid(m.projectId))}::uuid)`;
      return condition;
    }
    case 'audit': return equalSql('j', { request_id: context.requestId, event_type: m.operationId, operator_id: uuid(m.actorId), result: 'success' }) + ` AND j->'metadata'->>'projectId'=${literal(uuid(m.projectId))}`;
    case 'auth-coflush': return equalSql('j', { id: uuid(context.sessionId), user_id: uuid(m.actorId) }) + ` AND EXISTS(SELECT 1 FROM poms.audit_log a WHERE a.request_id=${literal(context.requestId)} AND a.event_type=${literal(m.operationId)} AND a.operator_id=${literal(uuid(m.actorId))}::uuid AND a.result='success' AND a.metadata->>'projectId'=${literal(uuid(m.projectId))})`;
    default: throw new Error('Unrecognized reviewed FI selector');
  }
}

function summaryMatches(value, m) {
  return value.created_by === m.actorId && value.approval_scenario_key === m.scenario && value.summary_package_key === m.packageKey && value.target_type === m.targetType && (!m.targetId || value.target_id === m.targetId);
}
export function writeMatches(descriptor, row, allRows, context) {
  const v = JSON.parse(row.raw), m = descriptor.match;
  const lookup = (table, id) => allRows(table).map(r => JSON.parse(r.raw)).find(r => r.id === id);
  switch (m.kind) {
    case 'equals': return Object.entries(m.values).every(([k, value]) => v[k] === value);
    case 'participant': return v.sort_order === m.order && lookup('commission_role_assignment', v.assignment_id)?.project_id === m.projectId;
    case 'summary': return summaryMatches(v, m);
    case 'summary-field': return v.field_order === m.fieldOrder && summaryMatches(lookup('approval_summary_snapshot', v.summary_snapshot_id) ?? {}, m.summary);
    case 'evidence': {
      const columns = { stage: 'stage_record_id', acceptance: 'acceptance_record_id', completion: 'completion_record_id', condition: 'completion_condition_id', closure: 'condition_closure_id' };
      if (v.project_id !== m.projectId || v.attachment_link_id !== m.linkId || !v[columns[m.owner]]) return false;
      if (m.owner === 'condition') { const c = lookup('project_completion_condition', v.completion_condition_id); return c?.project_id === m.projectId && c.sort_order === m.conditionOrder; }
      if (m.owner === 'closure') { const c = lookup('project_completion_condition_closure', v.condition_closure_id); return c?.project_id === m.projectId && c.condition_id === m.conditionId && c.completion_record_id === m.completionId; }
      return true;
    }
    case 'audit': return v.request_id === context.requestId && v.event_type === m.operationId && v.operator_id === m.actorId && v.result === 'success' && v.metadata?.projectId === m.projectId;
    case 'auth-coflush': return v.id === context.sessionId && v.user_id === m.actorId;
    default: throw new Error('Unrecognized required-write descriptor');
  }
}

export function requireOwnedScope(ctx, before, { projectId, actorId, actorKey }) {
  const actor = ctx.state.actors[actorKey]; assert.equal(actor?.id, actorId);
  for (const [table, id] of [['project', projectId], ['platform_user', actorId]]) assert(ctx.state.owned[keyOf(ctx.database, table, [uuid(id)])], 'FI may target only this run owned project and actor');
  assert(actor.cookies?.poms_session);
  const hash = sha(decodeURIComponent(actor.cookies.poms_session));
  const sessions = readRows(before.databases[ctx.database].tables.auth_session).filter(r => {
    const value = JSON.parse(r.raw); return value.token_hash === hash && value.user_id === actorId && value.status === 'active';
  });
  assert.equal(sessions.length, 1, 'Real current actor cookie must bind exactly one actual active owned session');
  assert(ctx.state.owned[keyOf(ctx.database, 'auth_session', sessions[0].key)]);
  return uuid(sessions[0].key[0]);
}
