// Import-safe, no I/O. These are provenance rules, never permission to execute DML.
const timestamp = row => row.created_at ?? row.linked_at ?? row.assigned_at ?? row.uploaded_at ?? row.generated_at ?? row.submitted_at ?? row.occurred_at ?? row.initialized_at;
const instant = value => value == null ? NaN : Date.parse(value);
const inside = (value, r) => Number.isFinite(instant(value)) && instant(value) >= instant(r.startedAt) && instant(value) <= instant(r.completedAt);
const sameInstant = (a, b) => a != null && b != null && instant(a) === instant(b);
const accepted = r => r.status >= 200 && r.status < 300;
const creationOps = new Set(['ProjectHandoverController_prepareProjectHandover', 'ProjectHandoverController_rebaselineContractHandover']);
const sameActor = (row, receipt) => row.created_by == null || row.created_by === receipt.actorId;
const hash = value => typeof value === 'string' && /^[0-9a-f]{64}$/.test(value);
const size = value => (typeof value === 'number' && Number.isSafeInteger(value) && value >= 0) || (typeof value === 'string' && /^(?:0|[1-9]\d*)$/.test(value));
const sameSize = (a, b) => size(a) && size(b) && BigInt(a) === BigInt(b);
export function requestId125(receipt) {
    const header = headers => {
        if (!headers || typeof headers !== 'object') return null;
        const pair = Object.entries(headers).find(([key]) => key.toLowerCase() === 'x-request-id');
        return typeof pair?.[1] === 'string' && pair[1].length ? pair[1] : null;
    };
    return (typeof receipt.requestId === 'string' && receipt.requestId.length ? receipt.requestId : null)
        ?? header(receipt.requestHeaders ?? receipt.request?.headers)
        ?? header(receipt.responseHeaders ?? receipt.response?.headers);
}
export const timelessParents125 = Object.freeze({
    commercial_baseline_diff_item: ['diff_result_id', 'commercial_baseline_diff_result'],
    contract_readiness_package_item: ['package_id', 'contract_readiness_package'],
    project_handover_contract_basis: ['basis_snapshot_id', 'project_handover_basis_snapshot'],
    project_technical_cost_item: ['package_id', 'project_technical_cost_package'],
    project_technical_risk_item: ['package_id', 'project_technical_cost_package'],
    project_technical_scope_item: ['package_id', 'project_technical_cost_package'],
    receivable_plan_node: ['plan_version_id', 'receivable_plan_version']
});
const timelessOps125 = Object.freeze({
    commercial_baseline_diff_item: ['ContractReadinessController_createContractReadinessPackage'],
    contract_readiness_package_item: ['ContractReadinessController_createContractReadinessPackage'],
    project_handover_contract_basis: [...creationOps],
    project_technical_cost_item: ['ProjectController_createProjectTechnicalCostPackage'],
    project_technical_risk_item: ['ProjectController_createProjectTechnicalCostPackage'],
    project_technical_scope_item: ['ProjectController_createProjectTechnicalCostPackage'],
    receivable_plan_node: ['ContractReadinessController_initializeReceivablePlan']
});
export const nullRequestAuditOps125 = Object.freeze({
    'platform.user.created': ['PlatformController_createUser'],
    'platform.role.created': ['PlatformController_createRole'],
    'platform.user.roles.replaced': ['PlatformController_assignUserRoles'],
    'platform.role.permissions.replaced': ['PlatformController_assignRolePermissions'],
    'attachment-storage-provider.config.created': ['AttachmentStorageProviderController_createAttachmentStorageProviderConfig'],
    'attachment.handover_checklist_viewed': ['AttachmentHandoverController_getChecklist']
});
const auditShapes125 = Object.freeze({
    'platform.user.created': ['PlatformUser', 'POST', () => '/api/platform/users'],
    'platform.role.created': ['PlatformRole', 'POST', () => '/api/platform/roles'],
    'platform.user.roles.replaced': ['PlatformUser', 'PUT', id => '/api/platform/users/' + id + '/roles'],
    'platform.role.permissions.replaced': ['PlatformRole', 'PUT', id => '/api/platform/roles/' + id + '/permissions'],
    'attachment-storage-provider.config.created': ['AttachmentStorageProviderConfig', 'POST', () => '/api/platform/attachment-storage-providers'],
    // The existing K audit stores target_type=attachment and the handover UUID.
    'attachment.handover_checklist_viewed': ['attachment', 'GET', id => '/api/project-handovers/' + id + '/attachment-checklist']
});
export function nullRequestAudit125(v, r) {
    const shape = auditShapes125[v.event_type];
    return shape != null && v.request_id == null && v.result === 'success' && accepted(r)
        && v.target_type === shape[0] && r.method === shape[1] && r.path === shape[2](v.target_id)
        && (nullRequestAuditOps125[v.event_type] ?? []).includes(r.operationId)
        && v.operator_id != null && v.operator_id === r.actorId && inside(v.occurred_at, r)
        && (r.relatedUUIDs ?? []).includes(v.target_id);
}
export function anonymousFoundation125(v, { foundation, fixture, allRows }) {
    if (!foundation?.verified || !inside(v.occurred_at, foundation) || v.user_agent !== 'poms-r1d-foundation' || v.actor_id != null || v.principal != null) return false;
    const match = /^r1d-api:([0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}):(\d+)$/.exec(v.request_id ?? '');
    if (!match) return false;
    // Exact request positions in the pinned 13-test foundation source, rather
    // than an arbitrary anonymous event with a matching user-agent or run prefix.
    const permitted = v.severity === 'warning' && v.permission_key == null && v.method === 'POST'
        && ((match[2] === '6' && v.event_type === 'auth.csrf.failed' && v.path === '/api/auth/sessions' && v.result === 'blocked')
            || (match[2] === '21' && v.event_type === 'auth.session.invalid' && v.path === '/api/auth/session:logout' && v.result === 'failed'));
    // The exact foundation run UUID must also be observed with its real full user.
    return permitted && allRows.some(x => x.table === 'security_event' && x.row.actor_id === fixture.fullUserId
        && x.row.user_agent === 'poms-r1d-foundation' && inside(x.row.occurred_at, foundation)
        && x.row.request_id?.startsWith('r1d-api:' + match[1] + ':'));
}
const evidenceTargets = Object.freeze({
    SharedCostAllocationBasis: 'shared_cost_allocation_basis',
    SharedCostAllocationResult: 'shared_cost_allocation_result',
    CostStageAttributionSnapshot: 'cost_stage_attribution_snapshot',
    AccountingTaxTreatmentSnapshot: 'accounting_tax_treatment_snapshot'
});
const evidenceOps125 = Object.freeze({
    SharedCostAllocationBasis: ['ProjectCostController_confirmSharedCostAllocationBasis', 'ProjectCostController_replaceSharedCostAllocationResult'],
    SharedCostAllocationResult: ['ProjectCostController_confirmSharedCostAllocationBasis', 'ProjectCostController_replaceSharedCostAllocationResult'],
    CostStageAttributionSnapshot: ['ProjectCostController_confirmCostStageAttribution', 'ProjectCostController_reclassifyCostStageAttribution'],
    AccountingTaxTreatmentSnapshot: ['ProjectCostController_confirmAccountingTaxTreatment', 'ProjectCostController_replaceAccountingTaxTreatment']
});
export function protectedFromGeneric125(record, allRows) {
    const v = record.row;
    return record.table === 'attachment' || record.table === 'cost_governance_evidence'
        || (timelessParents125[record.table] != null && timestamp(v) == null)
        || record.table === 'confirmation_participant'
        || (record.table === 'confirmation_record' && (v.target_type === 'project-handover' || v.business_domain === 'project-handover'))
        || (record.table === 'todo_item' && v.business_domain === 'project-handover')
        || (record.table === 'attachment_link' && allRows.some(x => x.table === 'attachment_upload_session'
            && x.row.completed_attachment_id === v.attachment_id && sameInstant(x.row.uploaded_at, v.linked_at)));
}
// allRows contains actual raw rows; claimMap contains only already-proven new PKs.
// A proposed claim is returned only after every indicated pointer/window matches.
export function derive125({ allRows, claimMap, receipts, domain, foundation, fixture }) {
    const proposals = [], byId = new Map(allRows.filter(x => x.row.id).map(x => [x.table + ':' + x.row.id, x]));
    const find = (table, id) => id && byId.get(table + ':' + id);
    const owned = (table, id) => { const r = find(table, id); return r && claimMap.has(r.key) ? r : null; };
    const sourceReceipts = (parent, predicate = () => true) => {
        const proof = parent && claimMap.get(parent.key);
        return proof ? receipts.filter(r => accepted(r) && proof.receiptIds.includes(r.receiptId) && predicate(r)) : [];
    };
    function propose(record, reason, parents, matches, extraReceiptIds = []) {
        if (!record || claimMap.has(record.key) || !matches.length || parents.some(p => !p || !claimMap.has(p.key))) return;
        proposals.push({ record, producerKind: 'internal-producer', receiptIds: [...new Set([...parents.flatMap(p => claimMap.get(p.key).receiptIds), ...matches.map(r => r.receiptId), ...extraReceiptIds])], reason, parents: parents.map(p => p.key) });
    }
    for (const record of allRows) {
        if (claimMap.has(record.key)) continue;
        const v = record.row, typed = timelessParents125[record.table];
        if (typed && timestamp(v) == null) {
            const parent = owned(typed[1], v[typed[0]]);
            // No timestamp means the child's actual typed owner must have been
            // created by this SAME accepted command, not an arbitrary later read.
            const matches = sourceReceipts(parent, r => r.successfulMutation && timelessOps125[record.table].includes(r.operationId)
                && domain(r.operationId, record.table) && sameActor(parent.row, r) && inside(timestamp(parent.row), r));
            propose(record, '125-typed-timeless-child-same-parent-creation-receipt', [parent], matches);
        }
        if (record.table === 'confirmation_record' && v.target_type === 'project-handover' && v.confirmation_type === 'project-handover' && v.business_domain === 'project-handover') {
            const h = owned('project_handover', v.target_id);
            if (h?.row.confirmation_record_id === v.id && h.row.project_id === v.project_id) {
                propose(record, '125-D-confirmation-owned-handover-bidirectional-pointer-and-same-create-command', [h], sourceReceipts(h, r => r.successfulMutation && creationOps.has(r.operationId) && sameActor(h.row, r) && sameActor(v, r) && inside(timestamp(h.row), r) && inside(timestamp(v), r)));
            }
        }
        if (record.table === 'confirmation_participant') {
            const c = owned('confirmation_record', v.confirmation_record_id), h = c && owned('project_handover', c.row.target_id);
            const role = h && allRows.find(x => x.table === 'project_handover_participant_role' && x.row.handover_id === h.row.id && x.row.confirmation_record_id === c.row.id && x.row.confirmation_participant_id === v.id && x.row.participant_user_id === v.participant_id);
            if (c?.row.target_type === 'project-handover' && h?.row.confirmation_record_id === c.row.id && h.row.project_id === c.row.project_id && role && claimMap.has(role.key)) {
                propose(record, '125-D-participant-owned-confirmation-and-owned-exact-role-assignment', [c, h, role], sourceReceipts(c, r => r.successfulMutation && creationOps.has(r.operationId) && sameActor(v, r) && inside(timestamp(v), r) && inside(timestamp(c.row), r)));
            }
        }
        if (record.table === 'todo_item' && v.source_type === 'confirmation-record' && v.todo_type === 'confirmation' && v.business_domain === 'project-handover' && v.target_object_type === 'project-handover') {
            const c = owned('confirmation_record', v.source_id), h = owned('project_handover', v.target_object_id);
            const participant = c && allRows.find(x => x.table === 'confirmation_participant' && x.row.confirmation_record_id === c.row.id && x.row.participant_id === v.assignee_user_id && claimMap.has(x.key));
            if (c?.row.target_type === 'project-handover' && c.row.target_id === h?.row.id && h?.row.confirmation_record_id === c.row.id && c.row.project_id === v.project_id && h.row.project_id === v.project_id && participant) {
                propose(record, '125-D-todo-exact-confirmation-source-handover-project-roster-and-same-command', [c, h, participant], sourceReceipts(c, r => r.successfulMutation && creationOps.has(r.operationId) && inside(timestamp(v), r) && inside(timestamp(c.row), r)));
            }
        }
        if (record.table === 'cost_governance_evidence') {
            const table = evidenceTargets[v.target_type], target = table && owned(table, v.target_id);
            const cost = v.target_type === 'CostStageAttributionSnapshot' && target && owned('project_actual_cost_record', target.row.cost_record_id);
            const project = v.target_type === 'CostStageAttributionSnapshot' ? cost?.row.project_id : target?.row.project_id ?? null;
            if (target?.row.governance_evidence_id === v.id && project === (v.project_id ?? null) && v.request_id != null && v.actor_id != null) {
                propose(record, '125-F-evidence-exact-typed-owned-target-reverse-pointer-request-actor-window', cost ? [target, cost] : [target], sourceReceipts(target, r => evidenceOps125[v.target_type].includes(r.operationId) && r.successfulMutation && r.requestId === v.request_id && r.actorId === v.actor_id && sameActor(target.row, r) && inside(timestamp(v), r) && inside(timestamp(target.row), r)));
            }
        }
        if (record.table === 'attachment') {
            const session = allRows.find(x => x.table === 'attachment_upload_session' && x.row.status === 'completed' && x.row.completed_attachment_id === v.id && claimMap.has(x.key));
            if (!session) continue;
            const s = session.row;
            if (s.created_by == null || !hash(s.checksum_sha256) || v.uploaded_by !== s.created_by || !sameInstant(v.uploaded_at, s.uploaded_at) || !sameInstant(v.created_at, s.uploaded_at) || v.checksum_sha256 !== s.checksum_sha256 || !sameSize(v.size_bytes, s.size_bytes) || (v.previous_attachment_id ?? null) !== (s.base_attachment_id ?? null)) continue;
            const puts = receipts.filter(r => accepted(r) && r.method === 'PUT' && r.operationId === 'AttachmentUploadSessionController_proxyUploadObject' && r.path === '/api/attachment-upload-sessions/' + s.id + '/object' && r.actorId === s.created_by && inside(s.uploaded_at, r) && r.binaryRequestWitness?.sha256 === s.checksum_sha256 && sameSize(r.binaryRequestWitness?.bytes, s.size_bytes) && r.binaryRequestWitness.original?.rawBytesSha256 === s.checksum_sha256 && sameSize(r.binaryRequestWitness.original?.bytes, s.size_bytes));
            const complete = receipts.filter(r => accepted(r) && r.method === 'POST' && r.operationId === 'AttachmentUploadSessionController_complete' && r.path === '/api/attachment-upload-sessions/' + s.id + ':complete' && r.actorId === s.created_by && inside(s.completed_at, r) && r.res?.id === v.id && r.res?.checksumSha256 === s.checksum_sha256 && sameSize(r.res?.sizeBytes, s.size_bytes) && (!r.req?.checksumSha256 || r.req.checksumSha256 === s.checksum_sha256));
            if (puts.length) propose(record, '125-attachment-completed-owned-session-real-PUT-byte-hash-upload-time-and-complete-ACK', [session], complete, puts.map(r => r.receiptId));
        }
        if (record.table === 'attachment_link') {
            const attachment = owned('attachment', v.attachment_id);
            const session = attachment && allRows.find(x => x.table === 'attachment_upload_session' && x.row.status === 'completed' && x.row.completed_attachment_id === attachment.row.id && claimMap.has(x.key));
            if (!session || !sameInstant(v.linked_at, session.row.uploaded_at) || v.linked_by !== session.row.created_by) continue;
            const matches = receipts.filter(r => accepted(r) && r.method === 'POST' && r.operationId === 'AttachmentUploadSessionController_complete' && r.path === '/api/attachment-upload-sessions/' + session.row.id + ':complete' && r.actorId === session.row.created_by && inside(session.row.completed_at, r) && r.res?.id === attachment.row.id && r.res?.links?.some(l => l.id === v.id && l.attachmentId === v.attachment_id && l.targetType === v.target_type && l.targetId === v.target_id && l.relationType === v.relation_type && l.linkedBy === v.linked_by && sameInstant(l.linkedAt, v.linked_at)));
            propose(record, '125-inherited-link-exact-complete-ACK-link-tuple-and-proven-upload-session', [attachment, session], matches);
        }
        if (record.table === 'audit_log') {
            const matches = receipts.filter(r => nullRequestAudit125(v, r));
            if (matches.length) proposals.push({ record, producerKind: 'managed-auth-audit-security', receiptIds: matches.map(r => r.receiptId), reason: '125-closed-legacy-audit-event-operation-exact-target-actor-window', parents: [] });
            // Approval's HTTP object is a review ID; its business audit target is
            // the amendment. Follow the real typed binding, never infer targets
            // from the actor or a broad approval time window.
            if (v.request_id == null && v.result === 'success' && v.event_type === 'ApprovalController_approveRecord' && v.target_type === 'contract-amendment') {
                const amendment = owned('contract_amendment', v.target_id), approval = amendment && owned('approval_record', amendment.row.source_review_id);
                const binding = approval && allRows.find(x => x.table === 'contract_review_binding' && x.row.approval_record_id === approval.row.id && x.row.contract_amendment_id === amendment.row.id && x.row.contract_id === amendment.row.contract_id && claimMap.has(x.key));
                if (binding && approval.row.target_object_type === 'contract' && approval.row.target_object_id === amendment.row.contract_id && approval.row.project_id === amendment.row.project_id) {
                    const bound = receipts.filter(r => accepted(r) && r.successfulMutation && r.method === 'POST' && r.operationId === 'ApprovalController_approveRecord' && r.path === '/api/approval-records/' + approval.row.id + ':approve' && v.operator_id != null && r.actorId === v.operator_id && inside(v.occurred_at, r));
                    propose(record, '125-legacy-amendment-approval-audit-exact-owned-review-binding-target-actor-window', [amendment, approval, binding], bound);
                }
            }
        }
        if (record.table === 'security_event' && anonymousFoundation125(v, { foundation, fixture, allRows })) {
            proposals.push({ record, producerKind: 'managed-auth-audit-security', receiptIds: foundation.receiptIds, reason: '125-foundation-exact-anonymous-CSRF-or-logout-event-fixed-agent-window-and-corroborated-run-UUID', parents: [] });
        }
    }
    return proposals;
}
