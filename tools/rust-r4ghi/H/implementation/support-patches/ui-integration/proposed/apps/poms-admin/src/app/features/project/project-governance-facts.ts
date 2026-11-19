import type {
    ConfirmReceiptRecordRequest, ExpectedRef, FullProjectDetailView, OperatingPreparation,
    ProjectHandoverDetailView, CommissionRoleAssignmentSummary, ReceiptRecordSummary, SourceRef
} from '@poms/shared-contracts';
import type { LifecycleAuthoringContext } from './project-lifecycle-authoring';

export function sourceIdentity(ref: SourceRef): string {
    return `${ref.kind}:${ref.id}:${ref.rowVersion}:${ref.payloadHash}`;
}
export function expectedSource(ref: SourceRef): ExpectedRef {
    return { kind: ref.kind, id: ref.id, expectedVersion: ref.rowVersion, payloadHash: ref.payloadHash };
}
/** Choice values stay opaque in the browser; versions and hashes come from server rows. */
export function receiptBasisChoices(preparation: OperatingPreparation, contractId: string) {
    const contract = preparation.sourceRows.find((row) => row.sourceRef.kind === 'Contract' && row.sourceRef.id === contractId);
    const members = contract?.sourceMembers ?? [];
    const terms = members.filter((ref) => ref.kind === 'ContractTermSnapshot' && preparation.sourceRows.some((row) => row.sourceRef.kind === ref.kind && sourceIdentity(row.sourceRef) === sourceIdentity(ref) && row.state === 'ready'));
    const currencies = members.filter((ref) => ref.kind === 'ContractTermSnapshot' || ref.kind === 'CommercialReleaseBaseline');
    const evidence = preparation.sourceRows.filter((row) => row.sourceRef.kind === 'Attachment' && row.state === 'ready').map((row) => row.sourceRef);
    return { contract: contract?.sourceRef ?? null, terms, currencies, evidence };
}
export function receiptCurrencyChoices(preparation: OperatingPreparation, termKey: string): SourceRef[] {
    const term = preparation.sourceRows.find((row) => row.sourceRef.kind === 'ContractTermSnapshot' && sourceIdentity(row.sourceRef) === termKey && row.state === 'ready');
    if (!term) return [];
    const commercial = term.sourceMembers.filter((ref) => ref.kind === 'CommercialReleaseBaseline');
    // A ready term with no commercial member must carry its own proven currency.
    // Prefer actual commercial provenance when supplied, including historical terms.
    return commercial.length ? commercial : [term.sourceRef];
}
export function receiptConfirmation(
    preparation: OperatingPreparation, receipt: ReceiptRecordSummary,
    selection: { termKey: string; currencyKey: string; evidenceKeys: string[]; selectionPolicy: string; reason: string }
): ConfirmReceiptRecordRequest {
    if (preparation.projectId !== receipt.projectId || preparation.intent !== 'receipt-basis') throw new Error('请重新读取当前回款的正式依据。');
    const choices = receiptBasisChoices(preparation, receipt.contractId);
    const term = choices.terms.find((ref) => sourceIdentity(ref) === selection.termKey);
    const currency = receiptCurrencyChoices(preparation, selection.termKey).find((ref) => sourceIdentity(ref) === selection.currencyKey);
    const receiptRow = preparation.sourceRows.find((row) => row.sourceRef.kind === 'ReceiptRecord' && row.sourceRef.id === receipt.id);
    const receiptRef = receiptRow?.sourceRef;
    if (receiptRow?.state === 'ready') throw new Error('该回款已有不可变依据，不能覆盖。');
    if (!term || !currency || !choices.contract || !receiptRef || receiptRef.rowVersion !== receipt.rowVersion) throw new Error('回款或依据版本发生变化，请重新读取。');
    if (currency.kind === 'ContractTermSnapshot' && sourceIdentity(currency) !== sourceIdentity(term)) throw new Error('条款币种依据必须来自所选条款。');
    const termRow = preparation.sourceRows.find((row) => sourceIdentity(row.sourceRef) === sourceIdentity(term));
    if (currency.kind === 'CommercialReleaseBaseline' && !termRow?.sourceMembers.some((ref) => sourceIdentity(ref) === sourceIdentity(currency))) throw new Error('商业币种依据不是所选条款的真实来源。');
    if (new Set(selection.evidenceKeys).size !== selection.evidenceKeys.length) throw new Error('佐证材料不能重复选择。');
    const evidence = selection.evidenceKeys.map((key) => {
        const ref = choices.evidence.find((candidate) => sourceIdentity(candidate) === key);
        if (!ref) throw new Error('佐证已不在当前来源白名单内，请重新读取。');
        return expectedSource(ref);
    });
    if (!selection.reason.trim()) throw new Error('请说明选择依据。');
    if (selection.selectionPolicy !== 'receipt-date-effective-terms' && selection.selectionPolicy !== 'explicit-activated-terms-evidence') throw new Error('请选择实际条款选择方式。');
    if (receipt.status !== 'pending-confirmation' && receipt.status !== 'confirmed') throw new Error('当前回款状态不支持确认依据。');
    if ((receipt.status === 'confirmed' || selection.selectionPolicy === 'explicit-activated-terms-evidence') && evidence.length === 0) throw new Error('历史补正或显式条款选择须提供真实附件证据。');
    if (preparation.sourceRows.some((row) => row.sourceRef.kind === 'ReceiptAccountingBasis' && row.sourceMembers.some((ref) => ref.kind === 'ReceiptRecord' && ref.id === receipt.id))) throw new Error('该回款已有不可变依据，不能覆盖。');
    return {
        inputVersion: 'server-derived-v1', mode: receipt.status === 'confirmed' ? 'certify-existing-basis' : 'confirm',
        expectedVersion: receiptRef.rowVersion, expectedContractVersion: choices.contract.rowVersion,
        basis: { termSnapshotRef: expectedSource(term), currencyBasisRef: expectedSource(currency), evidenceRefs: evidence, selectionPolicy: selection.selectionPolicy, reason: selection.reason.trim() }
    };
}

export function lifecycleContext(
    project: FullProjectDetailView, canWrite: boolean,
    handover: ProjectHandoverDetailView | null, role: CommissionRoleAssignmentSummary | null
): LifecycleAuthoringContext {
    let executionAdmission: LifecycleAuthoringContext['executionAdmission'] = null;
    if (canWrite && handover && role && handover.projectId === project.id && handover.handoverStatus === 'confirmed' && !handover.sourceChanged
        && handover.executionAdmission.allowed && handover.handoverId && handover.summarySnapshotId && handover.sourcePayloadHash
        && project.currentStage === 'handover' && project.currentStageRecordId
        && role.projectId === project.id && role.isCurrent && role.status === 'frozen' && role.sourceQualification === 'verified-producer'
        && role.sourceHandoverId === handover.handoverId && role.handoverSummarySnapshotId === handover.summarySnapshotId && role.freezeSummarySnapshotId) {
        executionAdmission = {
            commissionRoleAssignmentId: role.id, expectedRoleAssignmentVersion: role.rowVersion,
            sourceHandoverId: handover.handoverId, handoverSummarySnapshotId: handover.summarySnapshotId,
            handoverStageRecordId: project.currentStageRecordId,
            // Handover payload hash and role-freeze payload hash are different authorities.
            sourcePayloadHash: handover.sourcePayloadHash
        };
    }
    return {
        projectRowVersion: project.projectRowVersion, currentStage: project.currentStage,
        currentStageRecordId: project.currentStageRecordId,
        canWriteLifecycle: canWrite && project.status !== 'closed', canArchive: canWrite && project.status !== 'closed',
        executionAdmission
    };
}
