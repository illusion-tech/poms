import assert from 'node:assert/strict';
import { data, uuid } from './pure.mjs';
import { restrictExecutionRole, executionAdmissionFromEO } from './execution-admission.mjs';

const rv = row => { assert(Number.isSafeInteger(row?.rowVersion) && row.rowVersion > 0 && row.rowVersion <= 2147483647); return row.rowVersion; };
export async function rolesAndExecution(ctx, api, { auditFaults = false } = {}) {
  const f = ctx.state.fixtures; assert(f.handoverComplete && !f.executionComplete);
  await restrictExecutionRole(ctx, api);
  const call = async (op, params, body = null, binding = {}, actor = 'manager') => data(await api.request(op, params, body, actor, binding));
  const write = async (op, params, body, binding, actor = 'manager') => {
    if (!auditFaults) return call(op, params, body, binding, actor);
    const { faultAndRetry } = await import('./faults.mjs');
    const pair = await faultAndRetry(ctx, api, { operationId: op, params, body, binding, actor,
      fault: { table: 'audit_log', event: 'INSERT', field: 'request_id', eventType: op } });
    f.requiredAuditFaults ??= {}; f.requiredAuditFaults[op] = pair.receipt; ctx.persist(); return data(pair.successful);
  };
  const participants = [
    { userId: ctx.state.actors.manager.id, roleType: 'sales-owner', weight: 0.5, zeroWeightReason: null, responsibilitySummary: '真实项目M承担销售主责。' },
    { userId: ctx.state.actors.execution.id, roleType: 'execution-owner', weight: 0.499999, zeroWeightReason: null, responsibilitySummary: '真实EO承担交付执行职责。' },
    { userId: ctx.state.actors.finance.id, roleType: 'finance', weight: 0.000001, zeroWeightReason: null, responsibilitySummary: '真实财务参与者承担回款核验职责，精确百万分之一。' },
    { userId: ctx.state.actors.manager.id, roleType: 'business-admin', weight: 0, zeroWeightReason: '本次真实兼任商务资料治理职责，不另计提成权重。', responsibilitySummary: '真实M兼任已确认的商务资料治理职责。' },
  ];
  if (!f.roleAssignment) {
    const current = await call('CommissionController_getCurrentRoleAssignment', { projectId: f.project.id }); assert.equal(current, null, 'Fresh project must have actual 200/null current assignment');
    if (!f.roleWeightNegativesComplete) {
      const base = { inputVersion: 'server-derived-v1', expectedCurrentAssignmentId: null, expectedCurrentRowVersion: null, participants };
      for (const token of ['1e-7', '0.10000000000000001']) {
        const rawJson = JSON.stringify(base).replace('"weight":0.5', `"weight":${token}`); assert.notEqual(rawJson, JSON.stringify(base));
        await call('CommissionController_createRoleAssignment', { projectId: f.project.id }, null, { rawJson, expectedStatus: 400 });
        assert.equal(await call('CommissionController_getCurrentRoleAssignment', { projectId: f.project.id }), null, 'Rejected precision may not create any assignment');
      }
      f.roleWeightNegativesComplete = true; ctx.persist();
    }
    f.roleAssignment = await write('CommissionController_createRoleAssignment', { projectId: f.project.id }, { inputVersion: 'server-derived-v1', expectedCurrentAssignmentId: null, expectedCurrentRowVersion: null, participants },
      { responseBirths: [{ table: 'commission_role_assignment', pointer: '/id' }] }); ctx.persist();
  }
  let detail = await call('CommissionRoleAssignmentController_getRoleAssignmentDetail', { id: f.roleAssignment.id });
  if (detail.freezeVersionSummary.status !== 'frozen') {
    const handover = await call('ProjectHandoverController_getProjectHandoverDetailByProject', { projectId: f.project.id });
    f.roleFreezeResult = await write('CommissionRoleAssignmentController_freezeRoleAssignment', { id: f.roleAssignment.id }, { inputVersion: 'server-derived-v1', sourceHandoverId: uuid(handover.handoverId),
      handoverSummarySnapshotId: uuid(handover.summarySnapshotId), handoverBasisSnapshotId: uuid(handover.handoverBasisSnapshotId), expectedSourceHash: handover.sourcePayloadHash,
      expectedHandoverVersion: rv(handover), expectedVersion: rv(detail.freezeVersionSummary), comment: '按真实本人职责、固定材料和精确百万分权重冻结本项目角色。' },
      { mutableTables: ['commission_role_assignment', 'project_handover', 'approval_summary_snapshot'], updatedAnchors: [{ table: 'commission_role_assignment', id: f.roleAssignment.id, requestBinding: 'path:id' }] }); ctx.persist();
  }
  detail = await call('CommissionRoleAssignmentController_getRoleAssignmentDetail', { id: f.roleAssignment.id });
  assert.equal(detail.freezeVersionSummary.status, 'frozen'); assert.equal(detail.sourceQualification, 'verified-producer');
  assert(detail.freezeVersionSummary.participantsJson.some(p => p.weightExact === '0.000001') && detail.freezeVersionSummary.participantsJson.some(p => p.weightExact === '0.000000' && p.zeroWeightReason));
  f.frozenRoleDetail = detail;
  const { body: executionBody } = await executionAdmissionFromEO(ctx, api);
  f.execution = await write('ProjectController_startExecution', { id: f.project.id }, executionBody,
    { responseBirths: [{ table: 'project_stage_record', pointer: '/projectStageRecordId' }], mutableTables: ['project'], updatedAnchors: [{ table: 'project', id: f.project.id, requestBinding: 'path:id' }] }, 'execution');
  assert.equal(f.execution.businessStatusAfter, 'execution'); assert.equal(f.execution.enteredBy, ctx.state.actors.execution.id);
  f.executionComplete = true; ctx.persist();
  return { kind: 'actual-minimal-R5-and-EO-controlled-execution', completed: true, roleOperations: 4, precisionNegatives: 2, acceptedExactMillionth: true, frozenZeroReasonMember: true,
    EOProfile: 'actual-project-read-write-only', RoleGETForEO: 'actual403', executionAdmission: 'actual-EO-ProjectDetail-six-refs',
    fullR5Claim: false, requiredAuditFI: auditFaults ? 'only-actually-recorded-families-in-this-stage' : 'not-run', directDatabaseRoleMutationTests: 'not-run', nextStage: 'actual-costs-and-operating', G3Certified: false, G4Certified: false };
}
