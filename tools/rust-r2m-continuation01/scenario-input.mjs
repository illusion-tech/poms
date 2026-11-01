// Ordered, finite SOURCE recipes only. No HTTP/PG/process/environment imports.
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import * as originalL from '../rust-r2l/l-producer-recipes.mjs';
import { eHttpCases } from '../rust-r2ef/e-http-plan.mjs';
import { buildPreparedContractRows } from '../rust-r2l/prepared-contract-source.mjs';
import { inspectCommissionPreparedSource, buildCommissionPreparedRows } from '../rust-r2l/commission-prepared-source.mjs';
import { buildPreparedPlan as buildHandoverPreparedPlan } from '../rust-r2k/r4-prepared-source.mjs';
import { buildPreparedTodoFacts, originalTodoProjection } from '../rust-r2l/l-todo-facts-source.mjs';

export const marker = 'abd093b8-c584-45b3-9c62-6357ad6dfa5d';
export const settingKey = 'attachment.max-upload-size-mb';
export const settingLeaseScope = 'm2-ui2.attachment-max-upload-size';
export function executionCaseId(step,fallback) {
    const singletonPath='/api/platform/system-settings/'+settingKey;
    if(step.kind==='baseline-setting-lease'||step.kind==='baseline-setting-restore'||step.kind==='request'&&['GET','PATCH'].includes(step.method)&&step.path.split('?',1)[0]===singletonPath)return settingLeaseScope;
    return /^m4\./.test(fallback)?'m4.integration':/^m5\./.test(fallback)?'m5.integration':fallback;
}
export const recipeSources = Object.freeze([
    'tools/rust-r2l/l-producer-recipes.mjs', 'apps/poms-api-e2e/src/support/test-data.ts',
    'tools/rust-r2ef/e-http-plan.mjs', 'tools/rust-r2l/prepared-contract-source.mjs',
    'tools/rust-r2l/commission-prepared-source.mjs', 'tools/rust-r2k/r4-prepared-source.mjs',
    'tools/rust-r2l/l-todo-facts-source.mjs'
]);
export const nativeProducerRoutes = Object.freeze([
    ['POST', '/api/contracts/{id}:submitReview'], ['GET', '/api/contracts/{id}'],
    ['POST', '/api/contracts/{id}/receipt-records'], ['POST', '/api/receipt-records/{id}:confirm'],
    ['POST', '/api/operating-signal-evaluations/{id}:review'], ['POST', '/api/commission-gate-bindings/{id}:review'],
    ['POST', '/api/commission-rule-versions'], ['POST', '/api/commission-rule-versions/{id}:activate'],
    ['POST', '/api/projects/{id}/commission-role-assignments'], ['POST', '/api/commission-role-assignments/{id}:freeze'],
    ['POST', '/api/projects/{id}/commission-calculations'], ['POST', '/api/commission-calculations/{id}:approve'],
    ['POST', '/api/projects/{id}/commission-payouts'], ['POST', '/api/commission-payouts/{id}:submitApproval'],
    ['POST', '/api/projects/{id}/commission-adjustments'], ['POST', '/api/commission-adjustments/{id}:submitApproval'],
    ['POST', '/api/commission-payouts/{id}:registerPayout'], ['POST', '/api/projects/{id}/commission-departure-exception-decisions'],
    ['GET', '/api/project-handovers/{id}'], ['POST', '/api/project-handovers/{id}:confirm'],
    ['GET', '/api/projects:lookup'], ['GET', '/api/contracts:lookup']
].map(([method, path]) => Object.freeze({ method, path })));

export const ref = (value) => Object.freeze({ $binding: value });
const row = (table, slot, selector, view = {}) => ({ table, slot, selector, exactly: 1, view: { id: 'id', rowVersion: 'row_version', ...view }, authority: 'fixture-verified-create-or-exact-owned-mutation' });
const intent = (table, selector, expectedMax = 1) => ({ table, selector, expectedMax, beforeAbsenceRequired: true });
const request = (id, method, path, body, options = {}) => ({ kind: 'request', id, method, path, session: 'admin', purpose: 'business', ...(body === undefined ? {} : { body }), ...options });
const sourceRequest = (id, exportName, args, options = {}) => ({ kind: 'original-source-request', id, source: recipeSources[0], exportName, args, session: 'admin', purpose: 'producer', ...options });
const prepared = (id, sourceKind, input, options = {}) => ({ kind: 'prepared-source', id, sourceKind, input, nativeProducerClaimed: false, actualSqlExecuted: false, ...options });
const internal = (id, operation) => ({ kind: 'internal-probe', id, operation });
const ownedMutation = (id, operation, input) => ({ kind: 'owned-mutation', id, operation, input, arbitrarySqlAllowed: false });
const supplier = (id, operation, input = {}) => ({ kind: 'supplier', id, operation, input, arbitraryUrlAllowed: false });
const audit = ['audit_log', 'security_event', 'auth_session'];
const platform = ['org_unit', 'role', 'platform_user', 'local_credential', 'user_role_assignment', 'user_org_membership', 'role_permission_assignment'];
const common = ['approval_record', 'todo_item', 'approval_summary_snapshot', 'approval_summary_field_projection', 'confirmation_record', 'confirmation_participant'];
const attachment = ['attachment_storage_provider_config', 'attachment_upload_session', 'attachment', 'attachment_link', 'project_handover_attachment_selection', 'attachment_download_package', 'attachment_download_package_item'];
const external = ['identity_provider_config', 'external_identity', 'identity_provider_oauth_grant', 'external_login_ticket', 'external_org_source', 'external_department_mapping', 'org_sync_run', 'org_sync_diff_item'];
const commissionPreparedTables = ['project','contract','contract_term_snapshot','payment_record','approval_summary_snapshot','project_handover','confirmation_record','confirmation_participant','project_receipt_judgment_freeze','operating_baseline_package','project_operating_snapshot','data_maturity_evaluation_result','operating_signal_evaluation_result','operating_signal_gate_binding'];
const casePlan = (id, tables, steps, requirements = []) => Object.freeze({ id, tables: [...new Set([...tables, ...audit])].sort(), requirements, steps });

function contractSteps() {
    return [prepared('draft', 'draft-contract', ref('prepared.contractInput'), { bindPrepared: { customer: 'customer', project: 'project', contract: 'contract' } }),
        sourceRequest('submit', 'contractRequests', [ref('contract'), { comment: 'R2M 原Native提交' }], { select: 'submit', intents: [intent('approval_record', { target_object_id: ref('contract.id') }, 2), intent('todo_item', { target_object_id: ref('contract.id') }, 2)], bindRows: [row('approval_record', 'approval', { target_object_id: ref('contract.id'), current_status: 'pending' })] }),
        request('todos-before', 'GET', '/api/me/todos', undefined, { session: 'approver', expectedStatus: 200, expect: 'nonempty-target-todo' }),
        request('detail', 'GET', '/api/approval-records/{approval.id}', undefined, { session: 'approver', expectedStatus: 200 }),
        request('reject', 'POST', '/api/approval-records/{approval.id}:reject', { reason: 'R2M 原流程驳回', expectedVersion: ref('approval.rowVersion') }, { session: 'approver', expectedStatus: 200 }),
        sourceRequest('reload-contract', 'contractRequests', [ref('contract')], { select: 'currentContract', purpose: 'read-model', saveAs: 'contract', expectedStatus: 200 }),
        sourceRequest('resubmit', 'contractRequests', [ref('contract'), { comment: 'R2M 原Native再次提交' }], { select: 'submit', intents: [intent('approval_record', { target_object_id: ref('contract.id') }, 2), intent('todo_item', { target_object_id: ref('contract.id') }, 2)], bindRows: [row('approval_record', 'approvalAgain', { target_object_id: ref('contract.id'), current_status: 'pending' })] }),
        request('approve', 'POST', '/api/approval-records/{approvalAgain.id}:approve', { expectedVersion: ref('approvalAgain.rowVersion') }, { session: 'approver', expectedStatus: 200 }),
        request('todos-after', 'GET', '/api/me/todos', undefined, { session: 'approver', expectedStatus: 200, expect: 'closed-target-todo' })];
}

function commissionBase() {
    return [prepared('commission-facts', 'commission', ref('prepared.commissionInput'), { bindPrepared: { project: 'project', contract: 'contract', operating_signal_evaluation_result: 'signal', operating_signal_gate_binding: 'gate' } }),
        sourceRequest('funding-receipt', 'fundingReceiptRequests', [ref('contract'), { receiptAmount: '100000.00', receiptDate: '2026-10-01T00:00:00.000Z' }], { bindRows: [row('receipt_record', 'receipt', { contract_id: ref('contract.id') })], intents: [intent('receipt_record', { contract_id: ref('contract.id') })] }),
        sourceRequest('confirm-receipt', 'confirmReceiptRequest', [ref('receipt')]),
        sourceRequest('rule-create', 'commissionRuleRequest', [ref('names.rule')], { intents: [intent('commission_rule_version', { rule_code: ref('names.ruleCode') })], bindRows: [row('commission_rule_version', 'rule', { rule_code: ref('names.ruleCode') })] }),
        sourceRequest('rule-active', 'activateRuleRequest', [ref('rule')]),
        sourceRequest('assignment-create', 'roleAssignmentRequest', [ref('project'), ref('profile.admin')], { intents: [intent('commission_role_assignment', { project_id: ref('project.id') })], bindRows: [row('commission_role_assignment', 'assignment', { project_id: ref('project.id') }, { targetId: 'id' })] }),
        sourceRequest('assignment-freeze', 'freezeAssignmentRequest', [ref('assignment'), ref('prepared.commissionEvidence')], { saveAs: 'assignmentFreeze' }),
        sourceRequest('calculation-create', 'calculationRequest', [ref('project'), ref('rule')], { intents: [intent('commission_calculation', { project_id: ref('project.id') })], bindRows: [row('commission_calculation', 'calculation', { project_id: ref('project.id') })] }),
        sourceRequest('calculation-approve', 'approveCalculationRequest', [ref('calculation')], { saveAs: 'calculation' })];
}
const payout = (prefix, stageType) => [
    sourceRequest(prefix + '-create', 'payoutRequest', [ref('project'), ref('calculation'), stageType], { intents: [intent('commission_payout', { project_id: ref('project.id'), stage_type: stageType })], bindRows: [row('commission_payout', prefix, { project_id: ref('project.id'), stage_type: stageType }, { stageType: 'stage_type' })] }),
    sourceRequest(prefix + '-submit', 'submitPayoutRequest', [ref(prefix), stageType === 'retention' ? ref('retentionEvidence') : undefined], { intents: [intent('approval_record', { target_object_id: ref(prefix + '.id') }), intent('todo_item', { target_object_id: ref(prefix + '.id') }, 2)], bindRows: [row('approval_record', prefix + 'Approval', { target_object_id: ref(prefix + '.id'), current_status: 'pending' })] }),
    request(prefix + '-approve', 'POST', '/api/approval-records/{' + prefix + 'Approval.id}:approve', { expectedVersion: ref(prefix + 'Approval.rowVersion') }, { session: 'finance', expectedStatus: 200, bindRows: [row('commission_payout', prefix + 'Approved', { id: ref(prefix + '.id') }, { stageType: 'stage_type' })] })
];

function upload(prefix, targetType = 'project', provider = 'local') {
    return [request(prefix + '-create', 'POST', '/api/attachment-upload-sessions', { operationType: 'create-attachment', originalName: ref('upload.' + prefix + '.name'), displayName: ref('upload.' + prefix + '.name'), sizeBytes: ref('upload.' + prefix + '.size'), checksumSha256: ref('upload.' + prefix + '.sha256'), mimeType: 'text/plain', targetType, targetId: ref(targetType + '.id'), category: 'demand', securityLevel: 'normal' }, { expectedStatus: 201, intents: [intent('attachment_upload_session', { created_by: ref('actors.admin'), operation_type: 'create-attachment', original_name: ref('upload.' + prefix + '.name') })], bindRows: [row('attachment_upload_session', prefix + 'Session', { original_name: ref('upload.' + prefix + '.name'), created_by: ref('actors.admin') })] }),
        ...(provider === 'local' ? [request(prefix + '-put', 'PUT', '/api/attachment-upload-sessions/{' + prefix + 'Session.id}/object', ref('upload.' + prefix + '.bytes'), { contentType: 'application/octet-stream', expectedStatus: 200 })] : [request(prefix + '-target', 'POST', '/api/attachment-upload-sessions/{' + prefix + 'Session.id}/upload-targets', { expectedVersion: ref(prefix + 'Session.rowVersion') }, { expectedStatus: 200, saveAs: prefix + 'Target' }), supplier(prefix + '-presigned-put', 'obs-presigned-put-owned', { target: ref(prefix + 'Target'), bytes: ref('upload.' + prefix + '.bytes') })]),
        request(prefix + '-complete', 'POST', '/api/attachment-upload-sessions/{' + prefix + 'Session.id}:complete', {}, { expectedStatus: 200, intents: [intent('attachment', { uploaded_by: ref('actors.admin') }), intent('attachment_link', { target_type: targetType, target_id: ref(targetType + '.id') })], bindRows: [row('attachment', prefix + 'Attachment', { uploaded_by: ref('actors.admin'), original_name: ref('upload.' + prefix + '.name') }, { versionGroupId: 'version_group_id' })] })];
}

export function buildScenarioPlans(input) {
    assert(input?.task?.issue === 80 && input?.freshAcceptanceMatrix?.planned?.apiPgLogicalCasesPerBackend === 20, 'Frozen M input required');
    const plans = [
        casePlan('M1.1', platform, [request('anonymous', 'GET', '/api/auth/session', undefined, { session: 'anonymous', expectedStatus: 200 }), request('csrf', 'GET', '/api/auth/csrf-token', undefined, { session: 'login', expectedStatus: 200 }), request('login', 'POST', '/api/auth/sessions', ref('credentials.admin'), { session: 'login', expectedStatus: 200, sensitiveBody: true, intents: [intent('auth_session', { user_id: ref('actors.admin') })] }), ...['/api/auth/session','/api/auth/profile','/api/me/navigation','/api/me/todos'].map((path,i) => request('restore-'+i,'GET',path,undefined,{session:'login',expectedStatus:200})), request('logout','POST','/api/auth/session:logout',{}, {session:'login',expectedStatus:200})]),
        casePlan('M1.2', platform, [request('permissions-before','GET','/api/me/navigation',undefined,{expectedStatus:200}), request('replace-permissions','PUT','/api/platform/roles/{roles.viewer}/permissions',{permissionKeys:['nav:dashboard:view','platform:users:manage']},{intents:[intent('role_permission_assignment',{role_id:ref('roles.viewer')},2)],expectedStatus:200}), request('same-session-role-view','GET','/api/auth/session',undefined,{session:'viewer',expectedStatus:200}), request('same-session-users','GET','/api/platform/users',undefined,{session:'viewer',expectedStatus:200}), request('replace-default','PUT','/api/platform/roles/{roles.viewer}/permissions',{permissionKeys:['nav:dashboard:view']},{expectedStatus:200}), request('same-session-denied','GET','/api/platform/users',undefined,{session:'viewer',expectedStatus:403})]),
        casePlan('M1.3', platform, [request('memberships','PUT','/api/platform/users/{actors.viewer}/org-memberships',{primaryOrgUnitId:ref('orgs.viewer'),secondaryOrgUnitIds:[ref('orgs.admin')]},{expectedStatus:200}),request('owner','GET','/api/platform/owner-reference',undefined,{expectedStatus:200}),request('profile','GET','/api/auth/profile',undefined,{session:'viewer',expectedStatus:200}),request('disable','POST','/api/platform/users/{actors.viewer}:deactivate',{}, {expectedStatus:200}),request('disabled-session','GET','/api/auth/session',undefined,{session:'viewer',expectedStatus:401})]),
        casePlan('M1.4', platform, [request('missing','PATCH','/api/platform/users/{actors.viewer}',{displayName:'R2M forbidden'},{session:'anonymous',expectedStatus:401}),request('csrf','PATCH','/api/platform/users/{actors.viewer}',{displayName:'R2M forbidden'},{csrf:'wrong-fixed',expectedStatus:403}),request('viewer','GET','/api/platform/users',undefined,{session:'viewer',expectedStatus:403}),ownedMutation('expire','expire-owned-session',{session:'admin',idleOffsetMs:-1000}),request('expired','GET','/api/auth/session',undefined,{expectedStatus:401})]),
        casePlan('M2.1', platform, [request('org','POST','/api/platform/org-units',{name:ref('names.org'),code:ref('names.orgCode')},{expectedStatus:201,intents:[intent('org_unit',{code:ref('names.orgCode')})],bindRows:[row('org_unit','newOrg',{code:ref('names.orgCode')})]}),request('role','POST','/api/platform/roles',{name:ref('names.role'),roleKey:ref('names.roleKey')},{expectedStatus:201,intents:[intent('role',{role_key:ref('names.roleKey')})],bindRows:[row('role','newRole',{role_key:ref('names.roleKey')})]}),request('user','POST','/api/platform/users',{username:ref('names.username'),displayName:'R2M owned user',primaryOrgUnitId:ref('newOrg.id'),initialRoleIds:[ref('newRole.id')]},{expectedStatus:201,intents:[intent('platform_user',{username:ref('names.username')}),intent('user_org_membership',{org_unit_id:ref('newOrg.id')},2),intent('user_role_assignment',{role_id:ref('newRole.id')},2)],bindRows:[row('platform_user','newUser',{username:ref('names.username')})]}),request('memberships','PUT','/api/platform/users/{newUser.id}/org-memberships',{primaryOrgUnitId:ref('newOrg.id'),secondaryOrgUnitIds:[ref('orgs.admin')]},{expectedStatus:200}),request('tree','GET','/api/platform/org-unit-tree',undefined,{expectedStatus:200}),request('owners','GET','/api/platform/owner-reference',undefined,{expectedStatus:200}),request('stale','PATCH','/api/platform/users/{newUser.id}',{displayName:'not committed',expectedVersion:2147483647},{expectedStatus:409})]),
        casePlan('M2.2', ['dictionary_item','system_setting'], [{kind:'source-E-selection',id:'E-subset',source:'tools/rust-r2ef/e-http-plan.mjs',select:['dictionary-create','dictionary-update-clear','dictionary-update-noop','dictionary-update-conflict','settings-get','settings-update','settings-update-noop','settings-conflict','settings-value-before-version'],dictionaryId:ref('dictionary.id'),missingId:ref('missingId'),createCode:ref('names.dictionaryCode'),settingBeforeAbsentRequired:true}]),
        casePlan('M2.3', [], [request('sync','POST','/api/platform/navigation:sync',{}, {expectedStatus:200}),request('denied-event','POST','/api/security-events:recordRouteDenied',ref('inputs.routeDenied'),{expectedStatus:202}),request('audit','GET','/api/audit-logs',undefined,{expectedStatus:200}),request('security','GET','/api/security-events',undefined,{expectedStatus:200}),request('target-audit','GET','/api/audit-logs/targets/{auditTarget.type}/{auditTarget.id}',undefined,{expectedStatus:200})]),
        casePlan('M2.4', ['business_number_sequence'], [internal('numbers','numbers-nine-scopes')], ['only-before-absent-scope-period-sequences; explicit UTC boundary; standalone/borrowed contracts separately labelled']),
        casePlan('M3.1', [...common,'customer','project','contract'], contractSteps()),
        casePlan('M3.2', [...common,'customer','project','contract','contract_term_snapshot','receipt_record','payment_record','project_handover','project_receipt_judgment_freeze','operating_baseline_package','project_operating_snapshot','data_maturity_evaluation_result','operating_signal_evaluation_result','operating_signal_gate_binding','operating_signal_review_record','commission_gate_review_record','commission_rule_version','commission_role_assignment','commission_calculation','commission_payout','commission_departure_exception_decision','commission_final_settlement_snapshot','commission_rule_explanation_snapshot'], [...commissionBase(),sourceRequest('signal-review','operatingReviewRequests',[ref('prepared.commissionEvidence'),ref('inputs.operatingReview')],{select:'signal'}),sourceRequest('gate-review','operatingReviewRequests',[ref('prepared.commissionEvidence'),ref('inputs.operatingReview')],{select:'gate',saveAs:'gateReview'}),...payout('final','final'),sourceRequest('register-final','registerPayoutRequest',[ref('finalApproved'),{paidRecordAmount:'2040.00'}]),sourceRequest('retention-receipt','fundingReceiptRequests',[ref('contract'),{receiptAmount:'360.00',receiptDate:'2026-10-01T00:00:00.000Z'}],{intents:[intent('receipt_record',{contract_id:ref('contract.id')})],bindRows:[row('receipt_record','retentionReceipt',{contract_id:ref('contract.id'),receipt_amount:'360.00'})]}),sourceRequest('retention-confirm','confirmReceiptRequest',[ref('retentionReceipt')]),sourceRequest('departure','departureRequest',[ref('project'),ref('assignmentFreeze'),ref('prepared.commissionEvidence'),ref('inputs.departure')],{saveAs:'departure'}),{kind:'source-value',id:'retention-evidence',exportName:'retentionSubmitEvidence',args:[ref('prepared.commissionEvidence'),ref('gateReview'),ref('assignmentFreeze'),ref('retentionReceipt'),ref('departure')],saveAs:'retentionEvidence'},...payout('retention','retention')]),
        casePlan('M3.3', [...common,'customer','project','contract','receipt_record','commission_rule_version','commission_role_assignment','commission_calculation','commission_payout','commission_adjustment'], [...commissionBase(),...payout('first','first'),sourceRequest('adjustment-create','adjustmentRequest',[ref('project'),ref('calculation'),ref('firstApproved'),'R2M actual adjustment'],{intents:[intent('commission_adjustment',{project_id:ref('project.id')})],bindRows:[row('commission_adjustment','adjustment',{project_id:ref('project.id')})]}),sourceRequest('adjustment-submit','submitAdjustmentRequest',[ref('adjustment')],{intents:[intent('approval_record',{target_object_id:ref('adjustment.id')}),intent('todo_item',{target_object_id:ref('adjustment.id')},2)],bindRows:[row('approval_record','adjustmentApproval',{target_object_id:ref('adjustment.id'),current_status:'pending'})]}),request('wrong-actor','POST','/api/approval-records/{adjustmentApproval.id}:approve',{expectedVersion:ref('adjustmentApproval.rowVersion')},{session:'viewer',expectedStatus:403}),request('reject','POST','/api/approval-records/{adjustmentApproval.id}:reject',{reason:'R2M adjustment reject',expectedVersion:ref('adjustmentApproval.rowVersion')},{session:'finance',expectedStatus:200}),sourceRequest('adjustment-resubmit','submitAdjustmentRequest',[ref('adjustment')],{bindRows:[row('approval_record','adjustmentAgain',{target_object_id:ref('adjustment.id'),current_status:'pending'})]}),request('approve','POST','/api/approval-records/{adjustmentAgain.id}:approve',{expectedVersion:ref('adjustmentAgain.rowVersion')},{session:'finance',expectedStatus:200})]),
        casePlan('M3.4', [...common,'project','contract'], [internal('common','common-shared-uow')], ['success-commit','success-rollback','gate-rollback','gate-continue-commit']),
        casePlan('M3.5', [...common,'customer','lead','project','contract','sales_follow_up_record','commission_payout','commission_adjustment'], [prepared('todo-facts','todo-six-facts',ref('prepared.todoInput')),request('todo','GET','/api/me/todos',undefined,{session:'viewer',expectedStatus:200,expect:'six-source-fact-projections'})]),
        casePlan('M4.1', attachment, [request('local-provider','POST','/api/platform/attachment-storage-providers',ref('inputs.localProvider'),{expectedStatus:201,intents:[intent('attachment_storage_provider_config',{provider_type:'local',key_prefix:ref('inputs.localProvider.keyPrefix'),created_by:ref('actors.admin')})],bindRows:[row('attachment_storage_provider_config','localProvider',{key_prefix:ref('inputs.localProvider.keyPrefix')})]}),request('default','POST','/api/platform/attachment-storage-providers/{localProvider.id}:set-default',{expectedVersion:ref('localProvider.rowVersion')},{expectedStatus:200}),...upload('local'),request('final','POST','/api/attachments/{localAttachment.id}:mark-final',{}, {expectedStatus:200}),request('versions','GET','/api/attachments/{localAttachment.id}/versions',undefined,{expectedStatus:200}),request('download','GET','/api/attachments/{localAttachment.id}/download',undefined,{expectedStatus:200,binaryExpected:ref('upload.local.sha256')}),request('center','GET','/api/attachment-center-records',undefined,{expectedStatus:200})]),
        casePlan('M4.2', [...attachment,'customer','project','contract','project_handover',...common,'contract_term_snapshot','project_receipt_judgment_freeze'], [prepared('handover-facts','handover',ref('prepared.handoverInput')),request('native-handover','GET','/api/project-handovers/{handover.id}',undefined,{purpose:'read-model',saveAs:'handover',expectedStatus:200}),request('native-confirm','POST','/api/project-handovers/{handover.id}:confirm',ref('inputs.confirmHandover'),{purpose:'producer',expectedStatus:200}),...upload('package'),request('final','POST','/api/attachments/{packageAttachment.id}:mark-final',{}, {expectedStatus:200}),request('checklist','GET','/api/project-handovers/{handover.id}/attachment-checklist',undefined,{expectedStatus:200}),request('refresh','POST','/api/project-handovers/{handover.id}/attachment-checklist:refresh',{}, {expectedStatus:200,intents:[intent('project_handover_attachment_selection',{handover_id:ref('handover.id'),project_id:ref('project.id')},10),intent('attachment_link',{target_type:'project-handover',target_id:ref('handover.id')},10)]}),request('package','POST','/api/project-handovers/{handover.id}/attachment-download-packages',{}, {expectedStatus:200,intents:[intent('attachment_download_package',{handover_id:ref('handover.id'),created_by:ref('actors.admin')}),intent('attachment_download_package_item',{handover_id:ref('handover.id')},10)],bindRows:[row('attachment_download_package','package',{handover_id:ref('handover.id'),created_by:ref('actors.admin')})]}),request('package-read','GET','/api/attachment-download-packages/{package.id}',undefined,{expectedStatus:200}),request('package-download','GET','/api/attachment-download-packages/{package.id}/download',undefined,{expectedStatus:200,expect:'zip-manifest-crc-and-source-bytes'})]),
        casePlan('M4.3', attachment, [...upload('fault'),request('viewer-download','GET','/api/attachments/{faultAttachment.id}/download',undefined,{session:'viewer',expectedFromNative:true}),request('stale','PATCH','/api/attachments/{faultAttachment.id}',{displayName:'not committed',expectedVersion:2147483647},{expectedStatus:409}),supplier('fault-install','owned-object-read-failure',{attachment:ref('faultAttachment')}),request('failed-download','GET','/api/attachments/{faultAttachment.id}/download',undefined,{expectedFromNative:true}),supplier('fault-restore','restore-owned-object-fault')]),
        casePlan('M4.4', attachment, [request('obs-provider','POST','/api/platform/attachment-storage-providers',ref('inputs.obsProvider'),{expectedStatus:201,intents:[intent('attachment_storage_provider_config',{provider_type:'huawei-obs-s3',key_prefix:ref('inputs.obsProvider.keyPrefix'),created_by:ref('actors.admin')})],bindRows:[row('attachment_storage_provider_config','obsProvider',{key_prefix:ref('inputs.obsProvider.keyPrefix')})]}),request('obs-default','POST','/api/platform/attachment-storage-providers/{obsProvider.id}:set-default',{expectedVersion:ref('obsProvider.rowVersion')},{expectedStatus:200}),request('obs-test','POST','/api/platform/attachment-storage-providers/{obsProvider.id}:testConnection',{}, {expectedStatus:200}),...upload('obs','project','obs'),request('local-default','POST','/api/platform/attachment-storage-providers/{providers.local.id}:set-default',{expectedVersion:ref('providers.local.rowVersion')},{expectedStatus:200}),request('old-location','GET','/api/attachments/{obsAttachment.id}/download',undefined,{expectedStatus:200,binaryExpected:ref('upload.obs.sha256')}),supplier('obs-delete','delete-exact-owned-obs-object',{attachment:ref('obsAttachment')})]),
        casePlan('M5.1', external, [request('provider-create','POST','/api/platform/identity-providers',ref('inputs.identityProvider'),{expectedStatus:201,intents:[intent('identity_provider_config',{tenant_id:ref('inputs.identityProvider.tenantId'),client_id:ref('inputs.identityProvider.clientId')})],bindRows:[row('identity_provider_config','identityProvider',{tenant_id:ref('inputs.identityProvider.tenantId'),client_id:ref('inputs.identityProvider.clientId')})]}),request('provider-configure','PATCH','/api/platform/identity-providers/{identityProvider.id}',ref('inputs.identityProviderUpdate'),{expectedStatus:200}),request('provider-test','POST','/api/platform/identity-providers/{identityProvider.id}:testConnection',{}, {expectedStatus:200}),request('public-providers','GET','/api/auth/identity-providers',undefined,{session:'anonymous',expectedStatus:200}),request('authorize','GET','/api/auth/identity-providers/{identityProvider.id}:authorize',undefined,{session:'external',expectedFromNative:true,saveAs:'authorize'}),supplier('oauth-callback-input','owned-oauth-callback-input',{authorize:ref('authorize')}),request('callback','GET','/api/auth/identity-providers:callback?{oauth.callbackQuery}',undefined,{session:'external',expectedFromNative:true,saveAs:'callback'}),request('ticket','POST','/api/auth/external-login-sessions',{ticket:ref('oauth.ticket')},{session:'external',expectedStatus:200,sensitiveBody:true,intents:[intent('auth_session',{user_id:ref('actors.viewer')})]}),request('ticket-replay','POST','/api/auth/external-login-sessions',{ticket:ref('oauth.ticket')},{session:'external',expectedFromNative:true,sensitiveBody:true})]),
        casePlan('M5.2', [...external,...platform], [supplier('directory','directory-fixed-tree'),request('source','POST','/api/platform/external-org-sources',ref('inputs.orgSource'),{expectedStatus:201,intents:[intent('external_org_source',{provider_config_id:ref('inputs.orgSource.providerConfigId'),external_tenant_id:ref('inputs.orgSource.externalTenantId')})],bindRows:[row('external_org_source','orgSource',{external_tenant_id:ref('inputs.orgSource.externalTenantId')})]}),request('activate','POST','/api/platform/external-org-sources/{orgSource.id}:activate',{expectedVersion:ref('orgSource.rowVersion')},{expectedStatus:200}),request('preview','POST','/api/platform/external-org-sources/{orgSource.id}/org-sync-runs',{}, {expectedStatus:201,intents:[intent('org_sync_run',{source_id:ref('orgSource.id')}),intent('external_department_mapping',{source_id:ref('orgSource.id')},10)],bindRows:[row('org_sync_run','syncRun',{source_id:ref('orgSource.id')})]}),request('diff','GET','/api/platform/org-sync-runs/{syncRun.id}/diff-items',undefined,{expectedStatus:200}),request('apply','POST','/api/platform/org-sync-runs/{syncRun.id}:apply',{expectedVersion:ref('syncRun.rowVersion'),approvedDiffItemIds:[],skippedDiffItemIds:[]},{expectedStatus:200}),request('apply-again','POST','/api/platform/org-sync-runs/{syncRun.id}:apply',{}, {expectedStatus:400}),request('platform-tree','GET','/api/platform/org-unit-tree',undefined,{expectedStatus:200}),request('platform-user','GET','/api/platform/users',undefined,{expectedStatus:200})]),
        casePlan('M5.3', [...external,...platform], [supplier('supplier-timeout','feishu-bounded-timeout'),request('connection-timeout','POST','/api/platform/identity-providers/{providers.identity.id}:testConnection',{}, {expectedFromNative:true}),supplier('restore','feishu-restore-normal'),request('stale-source','PATCH','/api/platform/external-org-sources/{sources.org.id}',{displayName:'must not commit',expectedVersion:2147483647},{expectedStatus:409}),request('stale-mapping','POST','/api/platform/external-department-mappings/{sources.mapping.id}:map',{orgUnitId:ref('orgs.admin'),expectedVersion:2147483647},{expectedStatus:409})])
    ];
    const finalized=plans.map(plan=>{
        let steps=plan.steps,tables=plan.tables;
        if(plan.id==='M2.2')steps=[{kind:'baseline-setting-lease',id:'setting-lease',key:settingKey,requires:'environmentBaselineSettingAdmission',owned:false,deleteAllowed:false,restoreRequiredAtFinalDrain:true},...['dictionary-create','dictionary-update-clear','dictionary-update-noop','dictionary-update-conflict','settings-get','settings-update','settings-update-noop','settings-conflict','settings-value-before-version'].map(name=>({kind:'source-E-case',id:'E-'+name,name,source:'tools/rust-r2ef/e-http-plan.mjs'}))];
        if(['M3.2','M3.3'].includes(plan.id)){
            tables=[...new Set([...tables,...commissionPreparedTables])].sort();
            // The already reviewed exact18 cohort includes initial funding100000.
            // Keep that prepared receipt; only retention funding is a fresh
            // Native receipt producer. A's exact cohort guard is not widened.
            steps=[prepared('commission-customer','draft-contract',ref('prepared.commissionCustomerInput'),{selectPreparedTables:['customer'],bindPrepared:{customer:'customer'}}),...steps.filter(step=>!['funding-receipt','confirm-receipt'].includes(step.id))];
        }
        if(plan.id==='M3.5')steps=[
            prepared('todo-anchors','draft-contract',ref('prepared.contractInput'),{selectPreparedTables:['customer','project'],bindPrepared:{customer:'customer',project:'project'}}),
            prepared('todo-facts','todo-six-facts',ref('prepared.todoInput')),
            request('todo-open','GET','/api/me/todos',undefined,{session:'viewer',expectedStatus:200,expect:'three-prepared-nonapproval-facts'}),
            ownedMutation('rename-project','update-owned-fields',{table:'project',id:ref('project.id'),values:{project_name:ref('names.todoProject')}}),
            ownedMutation('rename-lead','update-owned-fields',{table:'lead',id:ref('prepared.todoInput.ids.lead'),values:{lead_name:ref('names.todoLead')}}),
            ownedMutation('rename-customer','update-owned-fields',{table:'customer',id:ref('customer.id'),values:{display_name:ref('names.todoCustomer')}}),
            request('todo-renamed','GET','/api/me/todos',undefined,{session:'viewer',expectedStatus:200,expect:'three-prepared-nonapproval-facts'}),
            ownedMutation('processing','update-owned-fields',{table:'todo_item',id:ref('prepared.todoInput.ids.todos.0'),values:{status:'processing'}}),
            ownedMutation('nullable-due','update-owned-fields',{table:'todo_item',id:ref('prepared.todoInput.ids.todos.1'),values:{due_at:null}}),
            request('todo-nullable','GET','/api/me/todos',undefined,{session:'viewer',expectedStatus:200,expect:'three-prepared-nonapproval-facts'})
        ];
        if(plan.id==='M2.3'){
            tables=[...new Set([...tables,'customer'])].sort();
            steps=[prepared('audit-customer-source','draft-contract',ref('prepared.contractInput'),{selectPreparedTables:['customer'],bindPrepared:{customer:'customer'}}),...steps.map(step=>step.id==='target-audit'?request('target-audit','GET','/api/audit-logs/targets/customer/{customer.id}',undefined,{expectedStatus:200}):step)];
        }
        if(plan.id==='M4.3')steps=steps.map(step=>step.id==='stale'?request('stale','POST','/api/attachment-upload-sessions/{faultSession.id}:complete',{expectedVersion:2147483647},{expectedFromNative:true}):step);
        if(plan.id==='M4.4')steps=steps.map(step=>step.id==='local-default'?request('local-default','POST','/api/platform/attachment-storage-providers/{localProvider.id}:set-default',{expectedVersion:ref('localProvider.rowVersion')},{expectedStatus:200}):step);
        if(plan.id==='M5.1'){
            const index=steps.findIndex(step=>step.id==='public-providers');
            steps=[...steps.slice(0,index),
                request('bind-external','POST','/api/platform/users/{actors.viewer}/external-identities',{identityProviderConfigId:ref('identityProvider.id'),tenantId:ref('inputs.identityProvider.tenantId'),subjectId:ref('inputs.externalSubject')},{expectedStatus:201,intents:[intent('external_identity',{identity_provider_config_id:ref('identityProvider.id'),poms_user_id:ref('actors.viewer'),subject_id:ref('inputs.externalSubject')})]}),
                request('grant-authorize','GET','/api/platform/identity-provider-oauth-grants/{identityProvider.id}:authorize',undefined,{expectedFromNative:true,saveResponseAs:'grantAuthorize'}),
                supplier('grant-callback-input','owned-oauth-grant-callback-input',{authorize:ref('grantAuthorize')}),
                request('grant-callback','GET','/api/platform/identity-provider-oauth-grants:callback?{oauthGrant.callbackQuery}',undefined,{expectedFromNative:true,intents:[intent('identity_provider_oauth_grant',{identity_provider_config_id:ref('identityProvider.id'),poms_user_id:ref('actors.admin')})]}),
                request('grant-read','GET','/api/platform/identity-provider-oauth-grants/{identityProvider.id}',undefined,{expectedStatus:200}),
                ...steps.slice(index).map(step=>step.id==='authorize'?{...step,saveAs:undefined,saveResponseAs:'authorize'}:step),
            ];
            const callback=steps.findIndex(step=>step.id==='callback');steps.splice(callback+1,0,supplier('ticket-extract','owned-external-ticket-from-response'));
        }
        if(plan.id==='M5.3')steps=steps.map(step=>step.kind==='request'?{...step,path:step.path.replace('{providers.identity.id}','{identityProvider.id}').replace('{sources.org.id}','{orgSource.id}').replace('{sources.mapping.id}','{mapping.id}')}:step);
        return Object.freeze({...plan,tables,steps});
    });
    assert.equal(finalized.length,20); assert.equal(new Set(finalized.map((plan)=>plan.id)).size,20);
    return Object.freeze(finalized);
}

export function binding(value, values) {
    const parts = value.split('.');
    assert(parts.every((part) => /^[A-Za-z0-9_-]+$/.test(part) && !['__proto__','prototype','constructor'].includes(part)), 'Unsafe binding path');
    let current = values;
    for (const part of parts) { assert(current && Object.hasOwn(current,part), 'Missing binding: ' + value); current=current[part]; }
    assert(current !== undefined, 'Undefined binding: ' + value); return current;
}
export function materialize(value, values) {
    if (Buffer.isBuffer(value)) return Buffer.from(value);
    if (value && typeof value==='object' && !Array.isArray(value) && Object.keys(value).length===1 && Object.hasOwn(value,'$binding')) return materialize(binding(value.$binding,values),values);
    if (Array.isArray(value)) return value.map((item)=>materialize(item,values));
    if (value && typeof value==='object') return Object.fromEntries(Object.entries(value).map(([key,item])=>[key,materialize(item,values)]));
    return value;
}
export function materializeRequest(step, values) {
    if(step.kind==='source-E-case'){
        const dictionaryId=values.dictionary?.id??binding('missingId',values);
        const found=eHttpCases({dictionaryId,missingId:binding('missingId',values),createCode:binding('names.dictionaryCode',values)}).find(item=>item.id==='e:'+step.name);
        assert(found,'Unknown original E request recipe');
        const extra=step.name==='dictionary-create'?{intents:[intent('dictionary_item',{domain:'lead-source',code:binding('names.dictionaryCode',values)})],bindRows:[row('dictionary_item','dictionary',{domain:'lead-source',code:binding('names.dictionaryCode',values)})]}:{};
        return request(step.id,found.method,found.route,found.json,{expectedStatus:found.expectedStatus,originalSource:step.source,sourceCase:found.id,...extra});
    }
    const resolved=materialize(step,values);
    if (resolved.kind==='original-source-request' || resolved.kind==='source-value') {
        assert(Object.hasOwn(originalL,resolved.exportName) && typeof originalL[resolved.exportName]==='function','Unknown original pure recipe');
        let built=originalL[resolved.exportName](...resolved.args); if(resolved.select) built=built[resolved.select];
        if(resolved.kind==='source-value') return {...resolved,value:built};
        assert(built&&typeof built.method==='string'&&built.path.startsWith('/'),'Original recipe did not produce a request');
        return {...resolved,kind:'request',method:built.method,path:built.path.startsWith('/api/')?built.path:'/api'+built.path,...(Object.hasOwn(built,'body')?{body:built.body}:{}),originalSource:built.source,originalWrites:built.writes};
    }
    if(resolved.kind==='request') resolved.path=resolved.path.replace(/\{([A-Za-z0-9_.-]+)\}/g,(_,name)=>{const value=binding(name,values);assert(['string','number'].includes(typeof value),'Scalar path binding required');return String(value)});
    return resolved;
}

export function selectedECases(step,values) {
    const resolved=materialize(step,values), all=eHttpCases({dictionaryId:resolved.dictionaryId,missingId:resolved.missingId,createCode:resolved.createCode});
    return resolved.select.map((name)=>{const found=all.find((item)=>item.id==='e:'+name);assert(found,'Unknown original E case');return request('E-'+name,found.method,found.route,found.json,{expectedStatus:found.expectedStatus,...(found.headers?{headers:found.headers}:{}),source:step.source,sourceCase:found.id})});
}

// Root generates and records all IDs before calling these pure source helpers.
// These old constructors have no env/DB/runtime import; keep their complete
// original source hashes/dependency closure in the current cap. Their own fixed
// source hashes are intentionally not weakened to accept a new product source.
export async function materializePrepared(step,values,{metadata,sourceReader}={}) {
    assert(step.kind==='prepared-source'&&sourceReader,'Pinned SourceReader required before source projection');
    for(const file of recipeSources)sourceReader.read(file);
    const resolved=materialize(step,values);let plan;
    if(resolved.sourceKind==='draft-contract')plan=buildPreparedContractRows({...resolved.input,metadata});
    else if(resolved.sourceKind==='commission'){
        plan=await buildCommissionPreparedRows(resolved.input);
    }else if(resolved.sourceKind==='handover')plan=await buildHandoverPreparedPlan(resolved.input);
    else if(resolved.sourceKind==='todo-six-facts')plan=await buildPreparedTodoFacts(resolved.input);
    else assert.fail('Unknown fixed prepared source');
    if(resolved.selectPreparedTables){assert(Array.isArray(plan.rows),'Explicit source rows required for selected projection');plan={...plan,excludedPreparedRows:[...(plan.excludedPreparedRows??[]),...plan.rows.filter(item=>!resolved.selectPreparedTables.includes(item.table))],rows:plan.rows.filter(item=>resolved.selectPreparedTables.includes(item.table))}}
    sourceReader.assertUnchanged();
    assert(plan.databaseOrOrmInvoked!==true&&plan.ownedRowsOrProducerSuccessCertified!==true,'Source planner cannot certify execution');
    return {...resolved,plan,actualSqlExecuted:false,nativeProducerClaimed:false,requiresActualBeforeAbsenceCommitVisibility:true};
}

export async function commissionUuidRequirements({sourceReader}) {
    sourceReader.read('tools/rust-r2l/commission-prepared-source.mjs');sourceReader.read('apps/poms-api/src/seeders/database.seeder.ts');
    const inspection=await inspectCommissionPreparedSource();sourceReader.assertUnchanged();
    return inspection;
}

export function expectedPreparedTodos({sourceReader,frame,assigneeId,ownedTodoIds}) {
    sourceReader.read('tools/rust-r2l/l-todo-facts-source.mjs');sourceReader.read('apps/poms-api/src/app/features/approval/approval.service.ts');
    const original=originalTodoProjection();
    const wanted=new Set(ownedTodoIds),out=[];
    for(const row of frame.rows.todo_item??[]){
        if(!wanted.has(row.id)||row.assignee_user_id!==assigneeId||!['open','processing'].includes(row.status))continue;
        const table={project:'project',lead:'lead',customer:'customer'}[row.target_object_type];assert(table,'Only the three explicitly source-prepared reminder targets here');
        const related=(frame.rows[table]??[]).filter(item=>item.id===row.target_object_id);assert.equal(related.length,1,'Actual fact source must be unique');
        const context=table==='project'?{project:{projectName:related[0].project_name}}:table==='lead'?{lead:{leadName:related[0].lead_name}}:{customer:{displayName:related[0].display_name}};
        out.push(original.project(original.hydrateTodo(row),context));
    }
    sourceReader.assertUnchanged();return {source:original.source,dtos:out,actualDatabaseOrOrmHydrationCertified:false,preparedSourceOnly:true};
}

export function caseNames(runId,caseId) {
    assert(/^[0-9a-f-]{36}$/.test(runId)&&/^M[1-5]\.[1-5]$/.test(caseId),'Explicit run/case required');
    const compact=runId.replaceAll('-',''),suffix=caseId.toLowerCase().replace('.','-')+'-'+compact;
    const rule='M-'+compact+'-'+caseId.replace('.','-');
    return {org:'R2M '+suffix,orgCode:'m-org-'+suffix,role:'R2M '+suffix,roleKey:'m-role-'+suffix,username:'m_user_'+compact+'_'+caseId.toLowerCase().replace('.','_'),dictionaryCode:'m-'+compact+'-'+caseId.toLowerCase().replace('.','-'),rule,ruleCode:'000-E2E-RULE-'+rule,todoProject:'R2M Todo project '+runId,todoLead:'R2M Todo lead '+runId,todoCustomer:'R2M Todo customer '+runId};
}

export function buildUriProbes({ userId }) {
    assert(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(userId),'Owned UUID required');
    const control='%'+userId.charCodeAt(0).toString(16).toUpperCase()+userId.slice(1),rows=[];
    for(const method of ['GET','PATCH','PUT'])for(const session of ['absent','owned-valid','retained-expired'])for(const [encoding,segment]of [['bare-percent','%'],['invalid-UTF8','%FF'],['valid-percent-owned-UUID',control]])rows.push({kind:'request',id:`uri.${method.toLowerCase()}.${session}.${encoding}`,method,path:'/api/platform/users/'+segment,session,purpose:'uri-order',...(method==='PATCH'?{body:{displayName:'R2M valid URI probe'}}:{}),expectedFromNative:true,knownPreviousOnly:method==='GET'&&session==='absent'&&encoding!=='valid-percent-owned-UUID'?{nativeStatus:400,oldRustStatus:401}:null});
    assert.equal(rows.length,27);return rows;
}

export function buildSurfaceProbes(input, values) {
    assert(input.sourceProtection.currentSurface.length===115,'Frozen115 surface required');
    return input.sourceProtection.currentSurface.map((item,index)=>({kind:'request',id:'surface.'+String(index).padStart(3,'0'),method:item.method,path:item.path.replace(/\{([^}]+)\}/g,(_,name)=>encodeURIComponent(String(binding('surface.'+name,values)))),session:'anonymous',purpose:'surface-negative',operationId:item.operationId,expectedFromNative:true,...(['POST','PUT','PATCH'].includes(item.method)?{body:{}}:{})}));
}

export function uploadInput(name, bytes) {
    assert(typeof name==='string'&&name.length>0&&Buffer.isBuffer(bytes));
    return {name,bytes:Buffer.from(bytes),size:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}
