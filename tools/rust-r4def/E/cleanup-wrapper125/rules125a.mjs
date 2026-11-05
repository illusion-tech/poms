// Pure incremental correction of the exact two remainder classes observed by Root140.
const ms = value => value == null ? NaN : Date.parse(value);
const inside = (value, receipt) => Number.isFinite(ms(value)) && ms(value) >= ms(receipt.startedAt) && ms(value) <= ms(receipt.completedAt);
const accepted = r => r.status >= 200 && r.status < 300 && r.successfulMutation && r.method === 'POST';
const related = (r, id) => id != null && (r.relatedUUIDs ?? []).includes(id);
const returned = (r, id) => id != null && (r.returnedUUIDs ?? []).includes(id);
export function derive125a({ allRows, claimMap, receipts }) {
    const proposals = [], rows = new Map(allRows.filter(r => r.row.id).map(r => [r.table + ':' + r.row.id, r]));
    const owned = (table, id) => { const r = id && rows.get(table + ':' + id); return r && claimMap.has(r.key) ? r : null; };
    const source = (parent, r) => parent && (claimMap.get(parent.key)?.receiptIds ?? []).includes(r.receiptId);
    const project = r => r && owned('project', r.row.project_id);
    const sameProject = (a, b) => a && b && a.row.project_id != null && a.row.project_id === b.row.project_id;
    const contractOf = r => { const c = r && owned('contract', r.row.contract_id); return sameProject(r, c) ? c : null; };
    function emit(record, parents, matches, reason) {
        if (claimMap.has(record.key) || !matches.length || !parents.length || parents.some(p => !p || !claimMap.has(p.key))) return;
        proposals.push({ record, producerKind: record.table === 'audit_log' ? 'managed-auth-audit-security' : 'internal-producer',
            receiptIds: [...new Set([...parents.flatMap(p => claimMap.get(p.key).receiptIds), ...matches.map(r => r.receiptId)])], parents: parents.map(p => p.key), reason });
    }
    function activationReceipts(plan, contract) {
        if (!plan || !contract) return [];
        return receipts.filter(r => accepted(r) && r.operationId === 'ContractController_activate'
            && r.path === '/api/contracts/' + contract.row.id + ':activate' && source(plan, r)
            && returned(r, plan.row.id) && related(r, contract.row.id)
            && inside(plan.row.created_at, r) && inside(plan.row.initialized_at, r)
            && (plan.row.initialized_by == null || plan.row.initialized_by === r.actorId)
            && (plan.row.created_by == null || plan.row.created_by === r.actorId));
    }
    for (const record of allRows) {
        if (claimMap.has(record.key)) continue;
        const v = record.row;
        if (record.table === 'receivable_plan_node' && v.created_at == null && v.initialized_at == null) {
            const p = owned('receivable_plan_version', v.plan_version_id), c = contractOf(p), pr = project(p);
            emit(record, [p, c, pr], activationReceipts(p, c), '125a-timeless-plan-node-exact-owned-activation-parent-returned-plan-ID-and-same-create-receipt');
        }
        if (record.table !== 'audit_log' || v.request_id != null || v.result !== 'success' || v.operator_id == null
            || v.metadata?.schemaVersion !== 1 || v.metadata.operationId !== v.event_type || v.metadata.projectId == null) continue;
        const pr = owned('project', v.metadata.projectId);
        if (!pr) continue;
        let parents = [], match = () => false;
        const target = (table, type) => {
            const t = v.target_type === type && owned(table, v.target_id);
            return t && t.row.project_id === pr.row.id ? t : null;
        };
        const metadataContract = c => c && v.metadata.contractId === c.row.id && c.row.project_id === pr.row.id;
        switch (v.event_type) {
            case 'ContractReadinessController_reviewDiff': {
                const b = target('commercial_release_baseline', 'CommercialReleaseBaseline'), c = owned('contract', v.metadata.contractId);
                if (!b || !metadataContract(c)) break;
                parents = [b, c, pr];
                match = r => r.path === '/api/commercial-release-baselines/' + b.row.id + ':reviewDiff' && related(r, b.row.id) && related(r, c.row.id);
                break;
            }
            case 'ContractReadinessController_initializeContractSnapshot': {
                const p = target('contract_term_preparation', 'ContractTermPreparation'), c = contractOf(p), ready = p && owned('contract_readiness_package', p.row.source_readiness_id);
                if (!p || !metadataContract(c) || !sameProject(p, ready) || ready.row.contract_id !== c.row.id) break;
                parents = [p, c, ready, pr];
                match = r => r.path === '/api/contract-readiness-packages/' + ready.row.id + ':initializeContractSnapshot'
                    && source(p, r) && inside(p.row.created_at, r) && returned(r, p.row.id);
                break;
            }
            case 'ContractReadinessController_createContractReadinessPackage': {
                const t = v.target_type === 'ContractReadinessPackage' ? target('contract_readiness_package', 'ContractReadinessPackage') : target('contract_amendment', 'contract-amendment');
                const ready = v.target_type === 'ContractReadinessPackage' ? t : t && owned('contract_readiness_package', t.row.source_readiness_id), c = contractOf(t);
                if (!t || !ready || !metadataContract(c) || !sameProject(t, ready) || ready.row.contract_id !== c.row.id
                    || (t.table === 'contract_amendment' && ready.row.contract_amendment_id !== t.row.id)) break;
                parents = [...new Set([t, ready, c, pr])];
                match = r => r.path === '/api/contract-readiness-packages' && source(t, r) && source(ready, r)
                    && inside(t.row.created_at, r) && inside(ready.row.created_at, r) && returned(r, t.row.id) && returned(r, ready.row.id);
                break;
            }
            case 'ContractController_submitReview': {
                const c = target('contract', 'Contract'), approval = owned('approval_record', v.metadata.sourceIds?.approvalRecordId);
                const p = owned('contract_term_preparation', v.metadata.sourceIds?.preparationId);
                const binding = approval && allRows.find(x => x.table === 'contract_review_binding' && claimMap.has(x.key)
                    && x.row.approval_record_id === approval.row.id && x.row.contract_id === c?.row.id && x.row.preparation_id === p?.row.id);
                if (!c || !metadataContract(c) || !approval || !sameProject(c, p) || p.row.contract_id !== c.row.id || !binding
                    || approval.row.target_object_type !== 'contract' || approval.row.target_object_id !== c.row.id || !sameProject(c, approval)) break;
                parents = [c, approval, p, binding, pr];
                match = r => r.path === '/api/contracts/' + c.row.id + ':submitReview' && returned(r, c.row.id)
                    && returned(r, approval.row.id) && source(binding, r) && inside(binding.row.created_at, r);
                break;
            }
            case 'ContractController_activate': {
                if (v.target_type === 'ReceivablePlanVersion') {
                    const p = target('receivable_plan_version', 'ReceivablePlanVersion'), c = contractOf(p);
                    if (!p || !metadataContract(c)) break;
                    parents = [p, c, pr];
                    const ids = new Set(activationReceipts(p, c).map(r => r.receiptId));
                    match = r => ids.has(r.receiptId) && r.res?.planVersionId === p.row.id && r.res?.snapshotId === p.row.snapshot_id;
                } else {
                    const a = target('contract_amendment', 'contract-amendment'), c = contractOf(a), snapshot = a && owned('contract_term_snapshot', a.row.after_snapshot_id);
                    if (!a || !metadataContract(c) || !snapshot || snapshot.row.contract_id !== c.row.id || snapshot.row.source_amendment_id !== a.row.id) break;
                    parents = [a, c, snapshot, pr];
                    match = r => r.path === '/api/contracts/' + c.row.id + ':activate' && r.res?.targetId === c.row.id
                        && r.res?.contractAmendmentId === a.row.id && r.res?.snapshotId === snapshot.row.id;
                }
                break;
            }
            case 'ProjectHandoverController_prepareProjectHandover':
            case 'ProjectHandoverController_confirmProjectHandoverParticipant':
            case 'ProjectHandoverController_confirmProjectHandover': {
                const h = target('project_handover', 'project-handover'), c = h && owned('confirmation_record', h.row.confirmation_record_id);
                if (!h || !c || !sameProject(h, c) || c.row.target_type !== 'project-handover' || c.row.target_id !== h.row.id
                    || v.metadata.contractId != null || v.metadata.confirmationRecordId !== c.row.id) break;
                parents = [h, c, pr];
                if (v.event_type === 'ProjectHandoverController_prepareProjectHandover') {
                    match = r => r.path === '/api/projects/' + pr.row.id + '/project-handovers' && source(h, r)
                        && inside(h.row.created_at, r) && returned(r, h.row.id);
                } else if (v.event_type === 'ProjectHandoverController_confirmProjectHandoverParticipant') {
                    const participant = allRows.find(x => x.table === 'confirmation_participant' && claimMap.has(x.key)
                        && x.row.confirmation_record_id === c.row.id && x.row.participant_id === v.operator_id);
                    if (!participant || v.after_snapshot?.participantId !== v.operator_id) { parents = []; break; }
                    parents.push(participant);
                    match = r => r.path === '/api/project-handovers/' + h.row.id + '/participant-confirmations' && related(r, h.row.id);
                } else match = r => r.path === '/api/project-handovers/' + h.row.id + ':confirm' && related(r, h.row.id) && related(r, c.row.id);
                break;
            }
            case 'ProjectHandoverController_rebaselineContractHandover': {
                // Legacy model::record calls this target project-handover while
                // storing the rebaseline record UUID. Preserve that real typing.
                const rb = target('contract_handover_rebaseline_record', 'project-handover');
                const before = rb && owned('project_handover', rb.row.source_handover_id), after = rb && owned('project_handover', rb.row.replacement_handover_id);
                const a = rb && owned('contract_amendment', rb.row.contract_amendment_id);
                if (!rb || !sameProject(rb, before) || !sameProject(rb, after) || !sameProject(rb, a)
                    || after.row.supersedes_id !== before.row.id || after.row.handover_rebaseline_record_id !== rb.row.id
                    || rb.row.basis_before_id !== before.row.basis_snapshot_id || rb.row.basis_after_id !== after.row.basis_snapshot_id
                    || v.metadata.contractAmendmentId !== a.row.id || v.metadata.contractId != null) break;
                parents = [rb, before, after, a, pr];
                match = r => r.path === '/api/contract-handover-rebaselines' && source(rb, r) && inside(rb.row.created_at, r)
                    && r.res?.rebaselineRecordId === rb.row.id && r.res?.sourceHandoverId === before.row.id && r.res?.replacementHandoverId === after.row.id;
                break;
            }
        }
        const matches = receipts.filter(r => accepted(r) && r.operationId === v.event_type && r.actorId === v.operator_id
            && inside(v.occurred_at, r) && match(r));
        emit(record, parents, matches, '125a-closed-command-audit-typed-owned-target-project-source-chain-actor-and-exact-HTTP-window');
    }
    return proposals;
}
