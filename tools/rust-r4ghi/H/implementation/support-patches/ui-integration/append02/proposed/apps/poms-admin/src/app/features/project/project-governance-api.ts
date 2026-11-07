import { inject, Injectable } from '@angular/core';
import { AttachmentStore, type UploadAttachmentInput } from '@poms/admin-data-access';
import {
    ActiveInactiveStatus, AttachmentRelationType, AttachmentTargetType, CommissionApi, CommissionRoleAssignmentsApi,
    ContractApi, ContractFinanceApi, DictionaryApi, DictionaryDomain, ProjectApi, ProjectCostApi, ProjectHandoverApi
} from '@poms/shared-api-client';
import {
    AcceptanceRecordListSchema, AcceptanceRecordSummarySchema, BusinessAccountingFeedbackViewSchema,
    CloseProjectCompletionConditionResultSchema, CommissionGateBindingHistoryViewSchema,
    CommissionRoleAssignmentDetailViewSchema, CommissionRoleAssignmentSummarySchema,
    ContractListSchema, CurrentCommissionRoleAssignmentResponseSchema, FreezeCommissionRoleAssignmentResultSchema,
    OperatingAccountingPreparationViewSchema, OperatingCommandResultSchema, OperatingSignalEvaluationViewSchema,
    ProjectArchiveRecordListSchema, ProjectArchiveRecordSummarySchema, ProjectCompletionRecordListSchema,
    ProjectCompletionRecordSummarySchema, ProjectDetailViewSchema, ProjectHandoverDetailViewSchema,
    ProjectOperatingSnapshotSummarySchema, ProjectStageTransitionResultSchema,
    ProjectUnifiedAccountingViewSchema, ReceiptRecordSummarySchema, ReviewCommissionGateBindingResultSchema,
    ReviewOperatingSignalEvaluationResultSchema, type ConfirmReceiptRecordRequest, type FullProjectDetailView,
    type ProjectCompletionRecordList, type ReviewCommissionGateBindingRequest,
    type ReviewOperatingSignalEvaluationRequest, type ReassignProjectOwnerRequest,
    type CreatorFirstAssignmentAnchorView, type OperatingPreparation
} from '@poms/shared-contracts';
import { firstValueFrom } from 'rxjs';
import type { RoleAssignmentAuthoringApi } from '../commission/project-role-assignment-authoring';
import type { ProjectLifecycleAuthoringApi, LifecycleEvidenceSelection } from './project-lifecycle-authoring';
import type { OperatingAuthorCommand, OperatingPreparationQuery } from './project-operating-authoring';

export type GovernancePreparationQuery = OperatingPreparationQuery | { view: 'preparation'; intent: 'receipt-basis'; receiptId: string };

/** Uses only existing generated methods. New method names follow the frozen operationIds. */
@Injectable()
export class ProjectGovernanceApi {
    private readonly projects = inject(ProjectApi);
    private readonly costs = inject(ProjectCostApi);
    private readonly commissions = inject(CommissionApi);
    private readonly assignments = inject(CommissionRoleAssignmentsApi);
    private readonly handovers = inject(ProjectHandoverApi);
    private readonly contracts = inject(ContractApi);
    private readonly finance = inject(ContractFinanceApi);
    private readonly attachments = inject(AttachmentStore);
    private readonly dictionary = inject(DictionaryApi);
    private fullProject: FullProjectDetailView | null = null;
    private firstAssignmentAnchor: CreatorFirstAssignmentAnchorView | null = null;
    private ownEvidence = new Map<string, LifecycleEvidenceSelection>();
    private receiptEvidenceIds = new Set<string>();
    private anchorEpoch = 0;

    async loadAnchor(projectId: string) {
        const epoch = ++this.anchorEpoch;
        this.fullProject = null;
        this.firstAssignmentAnchor = null;
        this.receiptEvidenceIds.clear();
        const detail = ProjectDetailViewSchema.parse(await firstValueFrom(this.projects.projectControllerGetById({ id: projectId })));
        if (epoch === this.anchorEpoch && detail.scopeKind === 'full-project') this.fullProject = detail;
        if (epoch === this.anchorEpoch && detail.scopeKind === 'creator-first-assignment-only') this.firstAssignmentAnchor = detail;
        return detail;
    }
    private requireFull(projectId: string): FullProjectDetailView {
        if (!this.fullProject || this.fullProject.id !== projectId) throw new Error('请先取得此项目的完整责任范围。');
        return this.fullProject;
    }
    async reassignFirstOwner(projectId: string, request: ReassignProjectOwnerRequest) {
        const anchor = this.firstAssignmentAnchor;
        if (!anchor || anchor.projectId !== projectId || !anchor.allowedActions.includes('reassign-owner') || request.expectedVersion !== anchor.projectRowVersion) throw new Error('本次首次指派已失效，请重新读取项目锚点。');
        return firstValueFrom(this.projects.projectControllerReassignOwner({ id: projectId, reassignProjectOwnerRequest: request }));
    }
    async prepare(projectId: string, query: GovernancePreparationQuery) {
        this.requireFull(projectId);
        const payload = query.intent === 'receipt-basis'
            ? { projectId, view: query.view, intent: query.intent, receiptId: query.receiptId }
            : {
                projectId, view: query.view, intent: query.intent, snapshotMode: query.snapshotMode,
                ...(query.periodKey ? { periodKey: query.periodKey } : {}),
                ...(query.restatesSnapshotId ? { restatesSnapshotId: query.restatesSnapshotId } : {}),
                ...(query.periodEndSnapshotId ? { periodEndSnapshotId: query.periodEndSnapshotId } : {}),
                ...(query.correctionSourceRefs ? { correctionSourceRefs: query.correctionSourceRefs } : {})
            };
        return OperatingAccountingPreparationViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetProjectUnifiedAccounting(payload)));
    }
    async accounting(projectId: string) {
        this.requireFull(projectId);
        return ProjectUnifiedAccountingViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetProjectUnifiedAccounting({ projectId })));
    }
    async feedback(projectId: string) {
        this.requireFull(projectId);
        return BusinessAccountingFeedbackViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetBusinessAccountingFeedback({ projectId })));
    }
    async evaluation(id: string) {
        if (!this.fullProject) throw new Error('请先取得完整项目范围。');
        const value = OperatingSignalEvaluationViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetOperatingSignalEvaluation({ id })));
        this.requireFull(value.projectId);
        return value;
    }
    async binding(id: string) {
        if (!this.fullProject) throw new Error('请先取得完整项目范围。');
        const value = CommissionGateBindingHistoryViewSchema.parse(await firstValueFrom(this.costs.projectCostControllerGetCommissionGateBinding({ id })));
        this.requireFull(value.projectId);
        return value;
    }
    async snapshot(id: string) {
        if (!this.fullProject) throw new Error('请先取得完整项目范围。');
        const value = ProjectOperatingSnapshotSummarySchema.parse(await firstValueFrom(this.costs.projectCostControllerGetProjectOperatingSnapshot({ id })));
        this.requireFull(value.projectId);
        return value;
    }
    async command(command: OperatingAuthorCommand) {
        this.requireFull(command.request.projectId);
        switch (command.kind) {
            case 'activate-baseline': return OperatingCommandResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerActivateOperatingBaselinePackage({ activateOperatingBaselinePackageRequest: command.request })));
            case 'create-snapshot': return OperatingCommandResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerCreateProjectOperatingSnapshot({ createProjectOperatingSnapshotRequest: command.request })));
            case 'close-period': return OperatingCommandResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerCreatePeriodClosingSnapshot({ createPeriodClosingSnapshotRequest: command.request })));
            case 'restate': return OperatingCommandResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerCreateOperatingRestatement({ createOperatingRestatementRequest: command.request })));
        }
    }
    async reviewSignal(projectId: string, id: string, request: ReviewOperatingSignalEvaluationRequest) {
        this.requireFull(projectId);
        return ReviewOperatingSignalEvaluationResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerReviewOperatingSignalEvaluation({ id, reviewOperatingSignalEvaluationRequest: request })));
    }
    async reviewBinding(projectId: string, id: string, request: ReviewCommissionGateBindingRequest) {
        this.requireFull(projectId);
        return ReviewCommissionGateBindingResultSchema.parse(await firstValueFrom(this.costs.projectCostControllerReviewCommissionGateBinding({ id, reviewCommissionGateBindingRequest: request })));
    }
    async receiptChoices(projectId: string) {
        this.requireFull(projectId);
        const contracts = ContractListSchema.parse(await firstValueFrom(this.contracts.contractControllerList({ projectId })));
        return Promise.all(contracts.map(async (contract) => ({
            contract,
            receipts: (await firstValueFrom(this.finance.contractFinanceControllerListReceipts({ contractId: contract.id }))).map((receipt) => ReceiptRecordSummarySchema.parse(receipt))
        })));
    }
    async confirmReceipt(projectId: string, receiptId: string, request: ConfirmReceiptRecordRequest) {
        this.requireFull(projectId);
        return ReceiptRecordSummarySchema.parse(await firstValueFrom(this.finance.contractFinanceControllerConfirmReceipt({ id: receiptId, confirmReceiptRecordRequest: request })));
    }
    async receiptEvidenceFiles(projectId: string, contractId: string, preparation: OperatingPreparation) {
        this.requireFull(projectId);
        this.receiptEvidenceIds.clear();
        if (preparation.projectId !== projectId || preparation.intent !== 'receipt-basis' || !preparation.sourceRows.some((row) => row.sourceRef.kind === 'Contract' && row.sourceRef.id === contractId)) throw new Error('回款来源范围已变化。');
        const allowed = new Set(preparation.sourceRows.filter((row) => row.sourceRef.kind === 'Attachment' && row.state === 'ready').map((row) => row.sourceRef.id));
        if (!allowed.size) return [];
        const groups = await Promise.all([
            this.attachments.loadAttachments({ targetType: AttachmentTargetType.Project, targetId: projectId }),
            this.attachments.loadAttachments({ targetType: AttachmentTargetType.Contract, targetId: contractId })
        ]);
        const files = [...new Map(groups.flat().filter((file) => allowed.has(file.id) && file.status === 'active').map((file) => [file.id, file])).values()];
        this.receiptEvidenceIds = new Set(files.map((file) => file.id));
        return files.map((file) => ({ id: file.id, fileName: file.displayName }));
    }
    async downloadReceiptEvidence(projectId: string, attachmentId: string) {
        this.requireFull(projectId);
        if (!this.receiptEvidenceIds.has(attachmentId)) throw new Error('附件不在当前回款依据的可读范围。');
        return this.downloadFile(attachmentId);
    }
    async uploadProjectEvidence(projectId: string, file: File): Promise<LifecycleEvidenceSelection> {
        this.requireFull(projectId);
        return this.uploadLinkedEvidence(projectId, file, 'delivery');
    }
    async uploadReceiptEvidence(projectId: string, file: File): Promise<LifecycleEvidenceSelection> {
        this.requireFull(projectId);
        return this.uploadLinkedEvidence(projectId, file, 'finance');
    }
    private async uploadLinkedEvidence(projectId: string, file: File, category: 'delivery' | 'acceptance' | 'finance', purpose?: NonNullable<UploadAttachmentInput['completionConditionContext']>): Promise<LifecycleEvidenceSelection> {
        const categories = await firstValueFrom(this.dictionary.dictionaryControllerList({ domain: DictionaryDomain.AttachmentCategory, status: ActiveInactiveStatus.Active }));
        if (!categories.some((item) => item.domain === 'attachment-category' && item.code === category && item.status === 'active')) throw new Error('当前附件业务分类未启用，请核对附件分类配置后重试。');
        const attachment = await this.attachments.uploadAttachment({
            targetType: AttachmentTargetType.Project, targetId: projectId,
            file, category, relationType: AttachmentRelationType.Evidence,
            ...(purpose ? { completionConditionContext: purpose } : {})
        });
        const link = attachment.links.find((candidate) => candidate.targetType === 'project' && candidate.targetId === projectId && candidate.status === 'active');
        if (!link) throw new Error('上传已完成，但未返回当前项目的有效附件关联。请重新核对附件。');
        // R2 upload response does not expose rowVersion. The server freezes it on command.
        return { attachmentLinkId: link.id, attachmentId: attachment.id, fileName: attachment.displayName, checksumSha256: attachment.checksumSha256 };
    }
    private rememberOwnEvidence(records: ProjectCompletionRecordList, actorId: string | null) {
        this.ownEvidence.clear();
        if (records.scopeKind === 'full-project') {
            for (const parent of records.items) for (const task of parent.conditions) {
                if (task.responsibleUserId === actorId) for (const ref of [...task.evidenceRefs, ...task.closureEvidenceRefs]) this.ownEvidence.set(ref.attachmentLinkId, ref);
            }
            return;
        }
        for (const parent of records.items) for (const task of parent.ownTasks) {
            for (const ref of [...task.evidenceRefs, ...(task.closure?.evidenceRefs ?? [])]) this.ownEvidence.set(ref.attachmentLinkId, ref);
        }
    }
    private async openEvidence(evidence: LifecycleEvidenceSelection, ownOnly: boolean) {
        if (ownOnly) {
            const allowed = this.ownEvidence.get(evidence.attachmentLinkId);
            if (!allowed || allowed.attachmentId !== evidence.attachmentId || allowed.checksumSha256 !== evidence.checksumSha256) throw new Error('附件不在本次本人条件任务的证据范围内。');
        }
        await this.downloadFile(evidence.attachmentId);
    }
    private async downloadFile(attachmentId: string) {
        const download = await this.attachments.downloadAttachment(attachmentId);
        const url = URL.createObjectURL(download.blob);
        const link = document.createElement('a');
        link.href = url; link.download = download.fileName; link.click();
        setTimeout(() => URL.revokeObjectURL(url), 0);
    }
    lifecycleApi(projectId: string, ownOnly: boolean, actorId: string | null): ProjectLifecycleAuthoringApi {
        const full = () => { if (ownOnly) throw new Error('本人条件任务仅提供本人的任务和证据。'); this.requireFull(projectId); };
        const closeTargets = new Map<string, { completionRecordId: string; completionVersion: number; conditionVersion: number }>();
        return {
            loadCompletionRecords: async (id) => {
                if (id !== projectId) throw new Error('项目已变化，请重新打开任务。');
                const records = ProjectCompletionRecordListSchema.parse(await firstValueFrom(this.projects.projectControllerListProjectCompletionRecords({ projectId: id })));
                if (records.projectId !== projectId) throw new Error('任务项目不匹配。');
                closeTargets.clear();
                if (records.scopeKind === 'own-condition-only') {
                    for (const parent of records.items) for (const task of parent.ownTasks) if (task.status === 'pending' && task.responsibleUserId === actorId) {
                        closeTargets.set(task.conditionId, { completionRecordId: parent.completionRecordId, completionVersion: parent.completionRowVersion, conditionVersion: task.conditionRowVersion });
                    }
                } else {
                    for (const parent of records.items) for (const task of parent.conditions) if (task.allowedActions.includes('close-completion-condition') && task.responsibleUserId === actorId) {
                        closeTargets.set(task.id, { completionRecordId: parent.id, completionVersion: parent.rowVersion, conditionVersion: task.rowVersion });
                    }
                }
                this.rememberOwnEvidence(records, actorId);
                return records;
            },
            loadAcceptanceRecords: async (id) => { full(); return AcceptanceRecordListSchema.parse(await firstValueFrom(this.projects.projectControllerListAcceptanceRecords({ projectId: id }))); },
            loadArchiveRecords: async (id) => { full(); return ProjectArchiveRecordListSchema.parse(await firstValueFrom(this.projects.projectControllerListProjectArchiveRecords({ projectId: id }))); },
            startExecution: async (id, body) => { full(); return ProjectStageTransitionResultSchema.parse(await firstValueFrom(this.projects.projectControllerStartExecution({ projectId: id, startProjectExecutionRequest: body }))); },
            startAcceptance: async (id, body) => { full(); return ProjectStageTransitionResultSchema.parse(await firstValueFrom(this.projects.projectControllerStartAcceptance({ projectId: id, startProjectAcceptanceRequest: body }))); },
            createAcceptance: async (id, body) => { full(); return AcceptanceRecordSummarySchema.parse(await firstValueFrom(this.projects.projectControllerCreateAcceptanceRecord({ projectId: id, createAcceptanceRecordRequest: body }))); },
            createCompletion: async (id, body) => { full(); return ProjectCompletionRecordSummarySchema.parse(await firstValueFrom(this.projects.projectControllerCreateProjectCompletionRecord({ projectId: id, createProjectCompletionRecordRequest: body }))); },
            createArchive: async (id, body) => { full(); return ProjectArchiveRecordSummarySchema.parse(await firstValueFrom(this.projects.projectControllerCreateProjectArchiveRecord({ projectId: id, createProjectArchiveRecordRequest: body }))); },
            replaceArchive: async (id, body) => { full(); return ProjectArchiveRecordSummarySchema.parse(await firstValueFrom(this.projects.projectArchiveRecordControllerReplaceProjectArchiveRecord({ id, replaceProjectArchiveRecordRequest: body }))); },
            voidArchive: async (id, body) => { full(); return ProjectArchiveRecordSummarySchema.parse(await firstValueFrom(this.projects.projectArchiveRecordControllerVoidProjectArchiveRecord({ id, voidProjectArchiveRecordRequest: body }))); },
            closeCondition: async (completionRecordId, conditionId, body) => {
                const target = closeTargets.get(conditionId);
                if (!target || target.completionRecordId !== completionRecordId || target.completionVersion !== body.expectedCompletionVersion || target.conditionVersion !== body.expectedConditionVersion) throw new Error('本人条件或父记录版本已变化，请重新读取任务。');
                const result = CloseProjectCompletionConditionResultSchema.parse(await firstValueFrom(this.projects.projectCompletionRecordControllerCloseCompletionCondition({ id: conditionId, completionRecordId, closeProjectCompletionConditionRequest: body })));
                closeTargets.delete(conditionId);
                return result;
            },
            uploadEvidence: async (id, file) => { full(); return this.uploadProjectEvidence(id, file); },
            uploadConditionEvidence: async (id, completionRecordId, conditionId, file) => {
                const target = closeTargets.get(conditionId);
                if (id !== projectId || !target || target.completionRecordId !== completionRecordId) throw new Error('请从本次返回的本人待办条件选择上传目标。');
                const evidence = await this.uploadLinkedEvidence(id, file, 'acceptance', { completionRecordId, conditionId });
                this.ownEvidence.set(evidence.attachmentLinkId, evidence);
                return evidence;
            },
            openEvidence: (evidence) => this.openEvidence(evidence, ownOnly)
        };
    }
    roleApi(projectId: string): RoleAssignmentAuthoringApi {
        const full = () => this.requireFull(projectId);
        return {
            loadCurrent: async (id) => { full(); return CurrentCommissionRoleAssignmentResponseSchema.parse(await firstValueFrom(this.commissions.commissionControllerGetCurrentRoleAssignment({ projectId: id }))); },
            loadDetail: async (id) => { full(); return CommissionRoleAssignmentDetailViewSchema.parse(await firstValueFrom(this.assignments.commissionRoleAssignmentControllerGetRoleAssignmentDetail({ id }))); },
            loadHandover: async (id) => { full(); return this.handover(id); },
            create: async (id, request) => { full(); return CommissionRoleAssignmentSummarySchema.parse(await firstValueFrom(this.commissions.commissionControllerCreateRoleAssignment({ projectId: id, createCommissionRoleAssignmentRequest: request }))); },
            freeze: async (id, request) => { full(); return FreezeCommissionRoleAssignmentResultSchema.parse(await firstValueFrom(this.assignments.commissionRoleAssignmentControllerFreezeRoleAssignment({ id, freezeCommissionRoleAssignmentRequest: request }))); }
        };
    }
    async handover(projectId: string) {
        this.requireFull(projectId);
        return ProjectHandoverDetailViewSchema.parse(await firstValueFrom(this.handovers.projectHandoverControllerGetProjectHandoverDetailByProject({ projectId })));
    }
}
