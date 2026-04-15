import { Injectable, NotFoundException } from '@nestjs/common';
import type { ContractHandoverSummaryView, ContractReadinessDetail, ProjectHandoverDetailView } from '@poms/shared-contracts';
import { ConfirmationService, type ConfirmationProgress } from '../approval/confirmation.service';
import { ApprovalSummarySnapshotRepository } from '../approval-summary/approval-summary.repository';
import { ContractReadinessService } from '../contract-readiness/contract-readiness.service';
import { Contract } from '../contract/contract.entity';
import { ContractService } from '../contract/contract.service';
import { Project } from '../project/project.entity';
import { ProjectService } from '../project/project.service';
import type { ContractHandoverRebaselineRecord, HandoverBaselineImpactItem, ProjectHandover } from './project-handover.entity';
import {
    ContractHandoverRebaselineRecordRepository,
    HandoverBaselineImpactItemRepository,
    ProjectHandoverRepository,
    ProjectReceiptJudgmentFreezeRepository
} from './project-handover.repository';

const CONTRACT_HANDOVER_SUMMARY_SCENARIO_KEY = 'handover-confirmation';
const CONTRACT_HANDOVER_SUMMARY_PROJECTION_LEVEL = 'handover-confirmation';
const PROJECT_HANDOVER_TARGET_TYPE = 'ProjectHandover';
const PROJECT_HANDOVER_CONFIRMATION_TYPE = 'project-handover';

@Injectable()
export class ProjectHandoverQueryService {
    constructor(
        private readonly projectService: ProjectService,
        private readonly contractService: ContractService,
        private readonly contractReadinessService: ContractReadinessService,
        private readonly confirmationService: ConfirmationService,
        private readonly approvalSummarySnapshotRepository: ApprovalSummarySnapshotRepository,
        private readonly projectHandoverRepository: ProjectHandoverRepository,
        private readonly contractHandoverRebaselineRecordRepository: ContractHandoverRebaselineRecordRepository,
        private readonly handoverBaselineImpactItemRepository: HandoverBaselineImpactItemRepository,
        private readonly projectReceiptJudgmentFreezeRepository: ProjectReceiptJudgmentFreezeRepository
    ) {}

    async getContractHandoverSummary(projectId: string): Promise<ContractHandoverSummaryView> {
        const project = await this.findProjectOrThrow(projectId);
        const latestHandover = await this.findLatestProjectHandoverByProjectId(projectId);

        return this.buildContractHandoverSummary(project, latestHandover);
    }

    async getProjectHandoverDetailByProjectId(projectId: string): Promise<ProjectHandoverDetailView> {
        const project = await this.findProjectOrThrow(projectId);
        const latestHandover = await this.findLatestProjectHandoverByProjectId(projectId);

        return this.buildProjectHandoverDetail(project, latestHandover);
    }

    async getProjectHandoverDetailByHandoverId(handoverId: string): Promise<ProjectHandoverDetailView> {
        const handover = await this.projectHandoverRepository.findById(handoverId);
        if (!handover) {
            throw new NotFoundException(`ProjectHandover ${handoverId} not found`);
        }

        const project = await this.findProjectOrThrow(handover.projectId);

        return this.buildProjectHandoverDetail(project, handover);
    }

    private async buildContractHandoverSummary(project: Project, latestHandover: ProjectHandover | null): Promise<ContractHandoverSummaryView> {
        const projectId = project.id;
        const [activeContracts, readiness, contractSummarySnapshot, handovers] = await Promise.all([
            this.contractService.findMany({ projectId, status: 'active' }),
            this.findCurrentContractReadiness(projectId),
            this.approvalSummarySnapshotRepository.findActiveByTarget(
                'Project',
                projectId,
                CONTRACT_HANDOVER_SUMMARY_SCENARIO_KEY,
                CONTRACT_HANDOVER_SUMMARY_PROJECTION_LEVEL
            ),
            latestHandover ? Promise.resolve([latestHandover]) : this.projectHandoverRepository.findByProjectId(projectId)
        ]);

        const selectedHandover = latestHandover ?? handovers[0] ?? null;
        const latestRebaseline = await this.findLatestProjectRebaseline(projectId, selectedHandover);
        const impactItems = latestRebaseline
            ? await this.handoverBaselineImpactItemRepository.findByRebaselineRecordId(latestRebaseline.id)
            : [];

        const blockingReasons = this.buildBlockingReasons(activeContracts, readiness, contractSummarySnapshot, latestRebaseline);
        const effectiveContractSetSummary = this.buildEffectiveContractSetSummary(activeContracts);
        const contractBaselineValidationSummary = this.buildBaselineValidationSummary(readiness);
        const latestHandoverRebaselineSummary = this.buildLatestRebaselineSummary(latestRebaseline, impactItems);
        const currentHandoverBaselineSummary = this.buildCurrentHandoverBaselineSummary(readiness, selectedHandover, latestRebaseline);
        const receivablePlanInitSummary = this.buildReceivablePlanInitSummary(readiness);

        return {
            projectId: project.id,
            projectCode: project.projectCode,
            projectName: project.projectName,
            effectiveContractSetSummary,
            contractBaselineValidationSummary,
            currentHandoverBaselineSummary,
            latestHandoverRebaselineSummary,
            receivablePlanInitSummary,
            contractSummarySnapshotId: contractSummarySnapshot?.id ?? null,
            projectionLevel: contractSummarySnapshot?.projectionLevel ?? null,
            exportPolicy: contractSummarySnapshot?.exportPolicy ?? null,
            allowedActions: this.buildAllowedActions(blockingReasons, readiness, contractSummarySnapshot),
            blockingReasons,
            generatedAt: new Date().toISOString()
        };
    }

    private async buildProjectHandoverDetail(project: Project, handover: ProjectHandover | null): Promise<ProjectHandoverDetailView> {
        const [contractHandoverSummary, handoverSummarySnapshot, confirmationProgress] = await Promise.all([
            this.buildContractHandoverSummary(project, handover),
            handover?.summarySnapshotId ? this.approvalSummarySnapshotRepository.findById(handover.summarySnapshotId) : Promise.resolve(null),
            handover
                ? this.confirmationService.findLatestConfirmationProgressByTarget(
                      PROJECT_HANDOVER_TARGET_TYPE,
                      handover.id,
                      PROJECT_HANDOVER_CONFIRMATION_TYPE
                  )
                : Promise.resolve(null)
        ]);

        const participantConfirmationSummary = this.buildParticipantConfirmationSummary(confirmationProgress);
        const receiptJudgmentModeSummary = await this.buildReceiptJudgmentModeSummary(project.id);
        const blockingReasons = this.buildProjectHandoverBlockingReasons(
            handover,
            contractHandoverSummary.blockingReasons,
            handoverSummarySnapshot,
            participantConfirmationSummary
        );

        return {
            handoverId: handover?.id ?? null,
            projectId: project.id,
            projectCode: project.projectCode,
            projectName: project.projectName,
            handoverStatus: handover?.status ?? 'not_started',
            confirmedAt: handover?.confirmedAt?.toISOString() ?? null,
            confirmedBy: handover?.confirmedBy ?? null,
            comment: handover?.comment ?? null,
            rowVersion: handover?.rowVersion ?? null,
            effectiveContractSetSummary: contractHandoverSummary.effectiveContractSetSummary,
            contractSummarySnapshotId: handover?.contractSummarySnapshotId ?? contractHandoverSummary.contractSummarySnapshotId,
            currentHandoverBaselineSummary: contractHandoverSummary.currentHandoverBaselineSummary,
            participantConfirmationSummary,
            receiptJudgmentModeSummary,
            summaryPackageKey: handoverSummarySnapshot?.summaryPackageKey ?? null,
            summarySnapshotId: handoverSummarySnapshot?.id ?? handover?.summarySnapshotId ?? null,
            projectionLevel: handoverSummarySnapshot?.projectionLevel ?? null,
            exportPolicy: handoverSummarySnapshot?.exportPolicy ?? null,
            allowedActions: this.buildProjectHandoverAllowedActions(handover, blockingReasons, contractHandoverSummary.allowedActions, handoverSummarySnapshot),
            blockingReasons,
            generatedAt: new Date().toISOString()
        };
    }

    private async findProjectOrThrow(projectId: string): Promise<Project> {
        const project = await this.projectService.findById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        return project;
    }

    private async findLatestProjectHandoverByProjectId(projectId: string): Promise<ProjectHandover | null> {
        const handovers = await this.projectHandoverRepository.findByProjectId(projectId);
        return handovers[0] ?? null;
    }

    private buildParticipantConfirmationSummary(
        confirmationProgress: ConfirmationProgress | null
    ): ProjectHandoverDetailView['participantConfirmationSummary'] {
        if (!confirmationProgress) {
            return {
                status: 'not_started',
                confirmationRecordId: null,
                requiredCount: 0,
                confirmedCount: 0,
                pendingCount: 0,
                closedCount: 0,
                submittedAt: null,
                confirmedAt: null,
                closedAt: null,
                rowVersion: null,
                participants: []
            };
        }

        const pendingCount = confirmationProgress.participants.filter((participant) => participant.participantStatus === 'pending').length;
        const closedCount = confirmationProgress.participants.filter((participant) => participant.participantStatus === 'closed').length;

        return {
            status: this.mapParticipantConfirmationStatus(confirmationProgress.status),
            confirmationRecordId: confirmationProgress.id,
            requiredCount: confirmationProgress.requiredCount,
            confirmedCount: confirmationProgress.confirmedCount,
            pendingCount,
            closedCount,
            submittedAt: confirmationProgress.submittedAt,
            confirmedAt: confirmationProgress.confirmedAt,
            closedAt: confirmationProgress.closedAt,
            rowVersion: confirmationProgress.rowVersion,
            participants: confirmationProgress.participants
        };
    }

    private mapParticipantConfirmationStatus(status: string): ProjectHandoverDetailView['participantConfirmationSummary']['status'] {
        if (status === 'confirmed' || status === 'closed') {
            return status;
        }

        return 'pending';
    }

    private async buildReceiptJudgmentModeSummary(projectId: string): Promise<ProjectHandoverDetailView['receiptJudgmentModeSummary']> {
        const currentFreeze = await this.projectReceiptJudgmentFreezeRepository.findCurrentByProjectId(projectId);
        if (currentFreeze) {
            return {
                status: 'frozen',
                receiptJudgmentMode: currentFreeze.receiptJudgmentMode,
                sourceType: currentFreeze.sourceType,
                sourceId: currentFreeze.sourceId,
                summary: `Receipt judgment mode is frozen from ${currentFreeze.sourceType} ${currentFreeze.sourceId}`
            };
        }

        return {
            status: 'not_frozen',
            receiptJudgmentMode: null,
            sourceType: 'none',
            sourceId: null,
            summary: 'Receipt judgment mode is frozen by confirmProjectHandover or the downstream receipt judgment freeze chain'
        };
    }

    private buildProjectHandoverBlockingReasons(
        handover: ProjectHandover | null,
        contractBlockingReasons: string[],
        handoverSummarySnapshot: { id: string } | null,
        participantConfirmationSummary: ProjectHandoverDetailView['participantConfirmationSummary']
    ): string[] {
        const reasons = [...contractBlockingReasons];

        if (!handover) {
            reasons.push('Project handover record is not prepared');
        } else {
            if (!handoverSummarySnapshot) {
                reasons.push('Project handover summary snapshot is not generated');
            }

            if (participantConfirmationSummary.status === 'not_started') {
                reasons.push('Project handover participant confirmation is not started');
            } else if (participantConfirmationSummary.status === 'pending') {
                reasons.push('Project handover participant confirmation is not complete');
            } else if (participantConfirmationSummary.status === 'closed') {
                reasons.push('Project handover participant confirmation is closed');
            }
        }

        return [...new Set(reasons)];
    }

    private buildProjectHandoverAllowedActions(
        handover: ProjectHandover | null,
        blockingReasons: string[],
        contractAllowedActions: string[],
        handoverSummarySnapshot: { id: string } | null
    ): string[] {
        const actions = new Set(contractAllowedActions.filter((action) => action !== 'confirm-project-handover'));

        if (handover && !handoverSummarySnapshot) {
            actions.add('generate-project-handover-summary-snapshot');
        }

        if (handover && blockingReasons.length === 0 && handover.status === 'draft') {
            actions.add('confirm-project-handover');
        }

        if (!handover && contractAllowedActions.includes('confirm-project-handover')) {
            actions.add('prepare-project-handover');
        }

        return [...actions];
    }

    private async findCurrentContractReadiness(projectId: string): Promise<ContractReadinessDetail | null> {
        try {
            return await this.contractReadinessService.findCurrentContractReadinessByProjectId(projectId);
        } catch (error) {
            if (error instanceof NotFoundException) {
                return null;
            }
            throw error;
        }
    }

    private async findLatestProjectRebaseline(
        projectId: string,
        handover: ProjectHandover | null
    ): Promise<ContractHandoverRebaselineRecord | null> {
        const latestProjectRebaseline = await this.contractHandoverRebaselineRecordRepository.findLatestByProjectId(projectId);
        if (latestProjectRebaseline) {
            return latestProjectRebaseline;
        }

        return handover?.handoverRebaselineRecordId
            ? this.contractHandoverRebaselineRecordRepository.findById(handover.handoverRebaselineRecordId)
            : null;
    }

    private buildEffectiveContractSetSummary(activeContracts: Contract[]): ContractHandoverSummaryView['effectiveContractSetSummary'] {
        const signedDates = activeContracts
            .map((contract) => contract.signedAt)
            .filter((signedAt): signedAt is Date => Boolean(signedAt))
            .sort((a, b) => a.getTime() - b.getTime());

        return {
            activeContractCount: activeContracts.length,
            activeContractIds: activeContracts.map((contract) => contract.id),
            contractNos: activeContracts.map((contract) => contract.contractNo),
            totalSignedAmount: sumMoneyStrings(activeContracts.map((contract) => contract.signedAmount)),
            currencyCodes: [...new Set(activeContracts.map((contract) => contract.currencyCode))].sort(),
            earliestSignedAt: signedDates[0]?.toISOString() ?? null,
            latestSignedAt: signedDates.length > 0 ? signedDates[signedDates.length - 1].toISOString() : null,
            contracts: activeContracts.map((contract) => ({
                id: contract.id,
                contractNo: contract.contractNo,
                status: contract.status,
                signedAmount: contract.signedAmount,
                currencyCode: contract.currencyCode,
                currentSnapshotId: contract.currentSnapshotId ?? null,
                signedAt: contract.signedAt?.toISOString() ?? null
            }))
        };
    }

    private buildBaselineValidationSummary(readiness: ContractReadinessDetail | null): ContractHandoverSummaryView['contractBaselineValidationSummary'] {
        if (!readiness) {
            return {
                status: 'missing',
                readinessPackageId: null,
                sourceBaselineId: null,
                latestDiffResultId: null,
                diffLevel: null,
                reviewStatus: null,
                packageStatus: null,
                guardDecision: null,
                initializedContractSnapshotId: null,
                contractSnapshotInitializedAt: null,
                blockingReasonSummary: 'No current ContractReadinessPackage found for project',
                missingPrerequisiteCount: 1
            };
        }

        const ready = this.isReadinessReady(readiness);

        return {
            status: ready ? 'ready' : 'blocked',
            readinessPackageId: readiness.id,
            sourceBaselineId: readiness.sourceBaselineId,
            latestDiffResultId: readiness.latestDiffResultId,
            diffLevel: readiness.diffLevel,
            reviewStatus: readiness.reviewStatus,
            packageStatus: readiness.packageStatus,
            guardDecision: readiness.guardDecision,
            initializedContractSnapshotId: readiness.initializedContractSnapshotId,
            contractSnapshotInitializedAt: readiness.contractSnapshotInitializedAt,
            blockingReasonSummary: ready ? null : readiness.blockingReasonSummary ?? this.mapDiffBlockingReason(readiness),
            missingPrerequisiteCount: readiness.missingPrerequisiteCount
        };
    }

    private buildCurrentHandoverBaselineSummary(
        readiness: ContractReadinessDetail | null,
        latestHandover: ProjectHandover | null,
        latestRebaseline: ContractHandoverRebaselineRecord | null
    ): ContractHandoverSummaryView['currentHandoverBaselineSummary'] {
        if (latestRebaseline?.status === 'effective') {
            return {
                status: 'available',
                baselineSnapshotId: latestRebaseline.effectiveBaselineAfterId,
                sourceType: 'handover-rebaseline',
                sourceId: latestRebaseline.id,
                summary: 'Current handover baseline comes from the latest effective handover rebaseline record'
            };
        }

        if (latestHandover?.effectiveHandoverBaselineSnapshotId) {
            return {
                status: 'available',
                baselineSnapshotId: latestHandover.effectiveHandoverBaselineSnapshotId,
                sourceType: 'project-handover',
                sourceId: latestHandover.id,
                summary: 'Current handover baseline comes from the latest project handover record'
            };
        }

        if (readiness?.initializedContractSnapshotId) {
            return {
                status: 'available',
                baselineSnapshotId: readiness.initializedContractSnapshotId,
                sourceType: 'contract-readiness',
                sourceId: readiness.id,
                summary: 'Current handover baseline comes from the current contract readiness package'
            };
        }

        return {
            status: 'missing',
            baselineSnapshotId: null,
            sourceType: 'none',
            sourceId: null,
            summary: 'No initialized contract snapshot or effective handover baseline is available'
        };
    }

    private buildLatestRebaselineSummary(
        latestRebaseline: ContractHandoverRebaselineRecord | null,
        impactItems: HandoverBaselineImpactItem[]
    ): ContractHandoverSummaryView['latestHandoverRebaselineSummary'] {
        if (!latestRebaseline) {
            return {
                status: 'none',
                rebaselineRecordId: null,
                effectiveBaselineAfterId: null,
                handledAt: null,
                blockingStatus: 'none',
                impactItemCount: 0,
                impactSummary: null
            };
        }

        return {
            status: latestRebaseline.status,
            rebaselineRecordId: latestRebaseline.id,
            effectiveBaselineAfterId: latestRebaseline.effectiveBaselineAfterId,
            handledAt: latestRebaseline.handledAt.toISOString(),
            blockingStatus: ['processing', 'pending_effective'].includes(latestRebaseline.status)
                ? 'blocking'
                : latestRebaseline.status === 'effective'
                  ? 'effective'
                  : 'none',
            impactItemCount: impactItems.length,
            impactSummary: impactItems.length === 0 ? null : impactItems.map((item) => `${item.impactType}: ${item.impactSummary}`).join('\n')
        };
    }

    private buildReceivablePlanInitSummary(readiness: ContractReadinessDetail | null): ContractHandoverSummaryView['receivablePlanInitSummary'] {
        if (!readiness) {
            return {
                status: 'blocked',
                initializedReceivablePlanVersionId: null,
                receivablePlanInitializedAt: null,
                summary: 'No current ContractReadinessPackage found for receivable plan initialization'
            };
        }

        if (readiness.initializedReceivablePlanVersionId) {
            return {
                status: 'initialized',
                initializedReceivablePlanVersionId: readiness.initializedReceivablePlanVersionId,
                receivablePlanInitializedAt: readiness.receivablePlanInitializedAt,
                summary: 'Receivable plan has been initialized from the current contract readiness package'
            };
        }

        return {
            status: this.isReadinessReady(readiness) ? 'missing' : 'blocked',
            initializedReceivablePlanVersionId: null,
            receivablePlanInitializedAt: null,
            summary: this.isReadinessReady(readiness)
                ? 'Receivable plan is not initialized from the current contract readiness package'
                : 'Contract readiness is not ready, receivable plan initialization is blocked'
        };
    }

    private buildBlockingReasons(
        activeContracts: Contract[],
        readiness: ContractReadinessDetail | null,
        contractSummarySnapshot: { id: string } | null,
        latestRebaseline: ContractHandoverRebaselineRecord | null
    ): string[] {
        const reasons: string[] = [];

        if (activeContracts.length === 0) {
            reasons.push('No active contract is available for project handover');
        }

        if (!readiness) {
            reasons.push('No current ContractReadinessPackage found for project');
        } else {
            if (!this.isReadinessReady(readiness)) {
                reasons.push(readiness.blockingReasonSummary ?? this.mapDiffBlockingReason(readiness));
            }
            if (!readiness.initializedContractSnapshotId) {
                reasons.push('Current contract snapshot is not initialized from readiness package');
            }
            if (!readiness.initializedReceivablePlanVersionId) {
                reasons.push('Receivable plan is not initialized from readiness package');
            }
        }

        if (!contractSummarySnapshot) {
            reasons.push('Contract handover summary snapshot is not generated');
        }

        if (latestRebaseline && ['processing', 'pending_effective'].includes(latestRebaseline.status)) {
            reasons.push(`Handover rebaseline record ${latestRebaseline.id} is still ${latestRebaseline.status}`);
        }

        return [...new Set(reasons)];
    }

    private buildAllowedActions(
        blockingReasons: string[],
        readiness: ContractReadinessDetail | null,
        contractSummarySnapshot: { id: string } | null
    ): string[] {
        const actions: string[] = [];
        const readinessReady = readiness ? this.isReadinessReady(readiness) : false;

        if (readinessReady && !contractSummarySnapshot) {
            actions.push('generate-contract-handover-summary-snapshot');
        }

        if (blockingReasons.length === 0) {
            actions.push('confirm-project-handover');
        }

        return actions;
    }

    private isReadinessReady(readiness: ContractReadinessDetail): boolean {
        return readiness.guardDecision === 'allowed' && readiness.packageStatus !== 'blocked' && this.isDiffReadyForContract(readiness);
    }

    private isDiffReadyForContract(readiness: ContractReadinessDetail): boolean {
        if (readiness.diffLevel === 'prompt') {
            return true;
        }

        if (readiness.diffLevel === 'review-required') {
            return readiness.reviewStatus === 'approved';
        }

        return false;
    }

    private mapDiffBlockingReason(readiness: ContractReadinessDetail): string {
        if (readiness.diffLevel === 'review-required' && readiness.reviewStatus !== 'approved') {
            return 'Commercial release baseline diff still requires review approval before project handover';
        }

        if (readiness.diffLevel === 'reapproval-required') {
            return 'Commercial release baseline diff requires a new baseline before project handover';
        }

        if (readiness.guardDecision !== 'allowed') {
            return `Contract readiness guard decision is ${readiness.guardDecision}`;
        }

        return 'Contract readiness is not ready for project handover';
    }
}

function sumMoneyStrings(values: string[]): string {
    const totalCents = values.reduce((sum, value) => sum + toCents(value), 0n);
    const sign = totalCents < 0n ? '-' : '';
    const abs = totalCents < 0n ? -totalCents : totalCents;
    return `${sign}${abs / 100n}.${String(abs % 100n).padStart(2, '0')}`;
}

function toCents(value: string): bigint {
    const normalized = value.trim();
    const sign = normalized.startsWith('-') ? -1n : 1n;
    const [integerPart, decimalPart = ''] = normalized.replace(/^-/, '').split('.');
    const cents = BigInt(integerPart || '0') * 100n + BigInt(decimalPart.padEnd(2, '0').slice(0, 2) || '0');
    return sign * cents;
}
