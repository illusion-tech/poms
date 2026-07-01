import { EntityManager, QueryOrder } from '@mikro-orm/core';
import { randomUUID } from 'node:crypto';
import type {
    ArbitrateCommissionFreezeDisputeRequest,
    ArbitrateCommissionFreezeDisputeResult,
    ApproveCommissionPayoutRequest,
    BaselineSelectionSource,
    CommissionFreezeDisputeDetailView,
    CommissionAdjustmentSummary,
    CommissionAdjustmentType,
    CommissionCalculationSummary,
    CommissionDepartureExceptionDecisionSummary,
    CommissionFinalSettlementStatus,
    CommissionFinalSettlementView,
    CommissionFreezeChangeRequestDetailView,
    CommissionRoleAssignmentDetailView,
    CommissionPayoutStage,
    CommissionPayoutSummary,
    CommissionPayoutTier,
    CommissionRoleAssignmentSummary,
    CommissionRuleExplanationView,
    CommissionRuleVersionSummary,
    ConfirmCommissionCalculationRequest,
    CreateCommissionDepartureExceptionDecisionRequest,
    CreateCommissionAdjustmentRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionPayoutRequest,
    CreateCommissionRoleAssignmentRequest,
    CreateCommissionRuleVersionRequest,
    ExecuteCommissionAdjustmentRequest,
    FreezeCommissionRoleAssignmentRequest,
    FreezeCommissionRoleAssignmentResult,
    RecalculateCommissionRequest,
    RegisterCommissionPayoutRequest,
    OperatingSnapshotActionLevel,
    SensitiveFieldPackageKey,
    SensitiveStringFieldProjection,
    SubmitCommissionFreezeDisputeRequest,
    SubmitCommissionFreezeDisputeResult,
    SubmitCommissionPayoutApprovalRequest,
    UserPayload
} from '@poms/shared-contracts';
import { Inject, BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommissionAdjustment } from './commission-adjustment.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionDepartureExceptionDecision } from './commission-departure-exception-decision.entity';
import { CommissionFreezeChangeRequest } from './commission-freeze-change-request.entity';
import { CommissionFreezeDisputeRecord } from './commission-freeze-dispute-record.entity';
import { CommissionFinalSettlementSnapshot } from './commission-final-settlement-snapshot.entity';
import { CommissionPayout } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleExplanationSnapshot } from './commission-rule-explanation-snapshot.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';
import { ReceiptRecord } from '../contract-finance/receipt-record.entity';
import { CommissionGateReviewRecord } from '../project-cost/commission-gate-review-record.entity';
import { OperatingSignalToCommissionGateBinding } from '../project-cost/operating-signal-gate-binding.entity';
import { SensitiveFieldProjectionService, type SensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import { CommissionRepository } from './commission.repository';
import {
    buildPendingFinalRuleExplanation,
    buildRetentionSettlementDraft,
    DEFAULT_RETENTION_REQUIREMENT_SUMMARY,
    evaluateRetentionDueDate,
    FINAL_SETTLEMENT_STATUS_PENDING,
    FINAL_SETTLEMENT_STATUS_PENDING_RETENTION,
    FINAL_SETTLEMENT_STATUS_SETTLED_ALL,
    NON_RETENTION_SETTLEMENT_STATUS_PENDING,
    NON_RETENTION_SETTLEMENT_STATUS_SETTLED,
    RETENTION_SETTLEMENT_STATUS_READY,
    RETENTION_SETTLEMENT_STATUS_SETTLED,
    RETENTION_SETTLEMENT_STATUS_WAITING,
    type RetentionDueEvaluation,
    type RetentionSettlementDraft,
    type RuleExplanationDraft
} from './commission-settlement-write-chain';

const COMMISSION_ROLE_ASSIGNMENT_PROJECT_CURRENT_UNIQUE = 'uq_commission_role_assignment_project_current';
const COMMISSION_CALCULATION_PROJECT_CURRENT_UNIQUE = 'uq_commission_calculation_project_current';
const COMMISSION_DEPARTURE_EXCEPTION_DECISION_PROJECT_CURRENT_UNIQUE = 'uq_cded_project_current';
const COMMISSION_DEPARTURE_EXCEPTION_DECISION_PROJECT_VERSION_UNIQUE = 'cded_project_version_unique';

type DraftableCommissionPayoutStage = Exclude<CommissionPayoutStage, 'retention'>;

const PAYOUT_CAP_RATES: Record<DraftableCommissionPayoutStage, Record<CommissionPayoutTier, number>> = {
    first: { basic: 0.2, mid: 0.25, premium: 0.3 },
    second: { basic: 0.7, mid: 0.75, premium: 0.8 },
    final: { basic: 1, mid: 1, premium: 1 }
};

const FREEZE_COMMISSION_ROLE_ASSIGNMENT_ACTION = 'freeze-commission-role-assignment';
const SUBMIT_COMMISSION_FREEZE_DISPUTE_ACTION = 'submit-commission-freeze-dispute';
const ARBITRATE_COMMISSION_FREEZE_DISPUTE_ACTION = 'arbitrate-commission-freeze-dispute';

type CommissionSharedEvidencePackage = Pick<
    CommissionFinalSettlementView,
    | 'freezeVersionSummary'
    | 'baselineSelectionSource'
    | 'taxImpactSummaryProjection'
    | 'taxImpactPendingAmountProjection'
    | 'dataMaturityLevel'
    | 'costActionRecommendation'
    | 'currentActionLevel'
    | 'referencedBaselineVersion'
    | 'referencedSnapshotVersion'
    | 'summaryPackageKey'
    | 'summarySnapshotId'
    | 'projectionLevel'
    | 'exportPolicy'
>;

type SensitiveProjectionUser = Pick<UserPayload, 'sub' | 'username' | 'permissions'> | null;

@Injectable()
export class CommissionService {
    constructor(
        @Inject(CommissionRepository) private readonly repo: CommissionRepository,
        @Inject(SensitiveFieldProjectionService) private readonly sensitiveFieldProjectionService: SensitiveFieldProjectionService
    ) {}

    // ── Rule Versions ────────────────────────────────────────────────────────

    async listRuleVersions(): Promise<CommissionRuleVersionSummary[]> {
        const versions = await this.repo.findAllRuleVersions();
        return versions.map(this.#toRuleVersionSummary);
    }

    async createRuleVersion(dto: CreateCommissionRuleVersionRequest): Promise<CommissionRuleVersionSummary> {
        const existing = await this.repo.findRuleVersionByCodeAndVersion(dto.ruleCode, dto.version);
        if (existing) {
            throw new ConflictException(`规则版本 ${dto.ruleCode} v${dto.version} 已存在`);
        }

        const entity = this.repo.createRuleVersion({
            ruleCode: dto.ruleCode,
            version: dto.version,
            status: 'draft',
            tierDefinitionJson: dto.tierDefinitionJson,
            firstStageCapRuleJson: dto.firstStageCapRuleJson ?? null,
            secondStageCapRuleJson: dto.secondStageCapRuleJson ?? null,
            retentionRuleJson: dto.retentionRuleJson ?? null,
            lowDownPaymentRuleJson: dto.lowDownPaymentRuleJson ?? null,
            exceptionRuleJson: dto.exceptionRuleJson ?? null,
            effectiveFrom: dto.effectiveFrom ? new Date(dto.effectiveFrom) : null
        });
        await this.repo.persistAndFlushRuleVersion(entity);
        return this.#toRuleVersionSummary(entity);
    }

    async activateRuleVersion(id: string): Promise<CommissionRuleVersionSummary> {
        const entity = await this.repo.findRuleVersionById(id);
        if (!entity) {
            throw new NotFoundException(`规则版本 ${id} 不存在`);
        }
        if (entity.status !== 'draft') {
            throw new UnprocessableEntityException(`只有草稿状态的规则版本可以激活，当前状态: ${entity.status}`);
        }

        // Stop any currently active version for the same rule_code
        const activeVersion = await this.repo.findActiveRuleVersion(entity.ruleCode);
        if (activeVersion && activeVersion.id !== id) {
            activeVersion.status = 'stopped';
        }

        entity.status = 'active';
        entity.effectiveFrom = entity.effectiveFrom ?? new Date();
        await this.repo.flushRuleVersion();
        return this.#toRuleVersionSummary(entity);
    }

    async stopRuleVersion(id: string): Promise<CommissionRuleVersionSummary> {
        const entity = await this.repo.findRuleVersionById(id);
        if (!entity) {
            throw new NotFoundException(`规则版本 ${id} 不存在`);
        }
        if (entity.status !== 'active') {
            throw new UnprocessableEntityException(`只有已激活的规则版本可以停用，当前状态: ${entity.status}`);
        }
        entity.status = 'stopped';
        await this.repo.flushRuleVersion();
        return this.#toRuleVersionSummary(entity);
    }

    // ── Role Assignments ─────────────────────────────────────────────────────

    async getCurrentRoleAssignment(projectId: string): Promise<CommissionRoleAssignmentSummary | null> {
        const entity = await this.repo.findCurrentRoleAssignment(projectId);
        return entity ? this.#toRoleAssignmentSummary(entity) : null;
    }

    async getCommissionFinalSettlement(projectId: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-final-settlement:${projectId}` }): Promise<CommissionFinalSettlementView> {
        const { snapshot, freezeVersion } = await this.#getCurrentFinalSettlementContext(projectId);
        const liveRetentionQueryState = await this.#loadLiveRetentionQueryState(snapshot, freezeVersion);
        const liveDraft = liveRetentionQueryState.draft;

        return {
            projectId,
            finalSettlementStatus: liveDraft ? liveDraft.finalSettlementStatus : snapshot.finalSettlementStatus,
            nonRetentionSettlementStatus: liveDraft ? liveDraft.nonRetentionSettlementStatus : snapshot.nonRetentionSettlementStatus,
            retentionSettlementStatus: liveDraft ? liveDraft.retentionSettlementStatus : snapshot.retentionSettlementStatus,
            retentionDueDate: liveRetentionQueryState.retentionDue.retentionDueDate,
            retentionDueStatus: liveRetentionQueryState.retentionDue.retentionDueStatus,
            retentionRequirementSummary: liveDraft ? liveDraft.retentionRequirementSummary : (snapshot.retentionRequirementSummary ?? null),
            retentionReceiptSummary: liveDraft ? liveDraft.retentionReceiptSummary : (snapshot.retentionReceiptSummary ?? null),
            departureExceptionSummary: liveDraft ? liveDraft.departureExceptionSummary : (snapshot.departureExceptionSummary ?? null),
            ...(await this.#buildCommissionSharedEvidencePackage(snapshot, freezeVersion, user, requestContext)),
            allowedActions: []
        };
    }

    async getCommissionRuleExplanation(projectId: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-rule-explanation:${projectId}` }): Promise<CommissionRuleExplanationView> {
        const snapshot = await this.#getCurrentRuleExplanationSnapshot(projectId);
        const { snapshot: finalSettlementSnapshot, freezeVersion } = await this.#getCurrentFinalSettlementContextById(projectId, snapshot.finalSettlementSnapshotId);
        const liveRetentionQueryState = await this.#loadLiveRetentionQueryState(finalSettlementSnapshot, freezeVersion);
        const liveRuleExplanation = liveRetentionQueryState.draft?.ruleExplanation;

        return {
            projectId,
            currentStageStatus: liveRuleExplanation ? liveRuleExplanation.currentStageStatus : snapshot.currentStageStatus,
            gateDecisionCode: liveRuleExplanation ? liveRuleExplanation.gateDecisionCode : snapshot.gateDecisionCode,
            blockingReasonCategory: liveRuleExplanation ? liveRuleExplanation.blockingReasonCategory : (snapshot.blockingReasonCategory ?? null),
            blockingReasonCode: liveRuleExplanation ? liveRuleExplanation.blockingReasonCode : (snapshot.blockingReasonCode ?? null),
            blockingReasonSummary: liveRuleExplanation ? liveRuleExplanation.blockingReasonSummary : (snapshot.blockingReasonSummary ?? null),
            gateDecisionSummary: liveRuleExplanation ? liveRuleExplanation.gateDecisionSummary : snapshot.gateDecisionSummary,
            nextActionSummaryProjection: await this.#projectCommissionSensitiveField(projectId, liveRuleExplanation ? liveRuleExplanation.nextActionSummary : (snapshot.nextActionSummary ?? null), user, requestContext, 'commission-compensation'),
            ...(await this.#buildCommissionSharedEvidencePackage(finalSettlementSnapshot, freezeVersion, user, requestContext)),
            allowedActions: []
        };
    }

    async getRoleAssignmentDetail(id: string): Promise<CommissionRoleAssignmentDetailView> {
        const entity = await this.repo.findRoleAssignmentById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionRoleAssignment ${id} not found`);
        }

        const [handoverSummarySnapshot, receiptJudgmentFreeze, openDispute] = await Promise.all([
            entity.handoverSummarySnapshotId ? this.repo.findApprovalSummarySnapshotById(entity.handoverSummarySnapshotId) : Promise.resolve(null),
            this.repo.findCurrentReceiptJudgmentFreeze(entity.projectId),
            entity.status === 'frozen' && entity.isCurrent ? this.repo.findOpenFreezeDisputeByFreezeVersionId(entity.id) : Promise.resolve(null)
        ]);

        return {
            roleAssignmentId: entity.id,
            projectId: entity.projectId,
            freezeVersionSummary: this.#toRoleAssignmentSummary(entity),
            sourceHandoverId: entity.sourceHandoverId ?? null,
            contractSummarySnapshotId: entity.contractSummarySnapshotId ?? null,
            handoverSummarySnapshotId: entity.handoverSummarySnapshotId ?? null,
            effectiveHandoverBaselineSummary: this.#buildEffectiveHandoverBaselineSummary(entity),
            receiptJudgmentModeSummary: this.#buildReceiptJudgmentModeSummary(receiptJudgmentFreeze),
            summaryPackageKey: handoverSummarySnapshot?.summaryPackageKey ?? null,
            summarySnapshotId: handoverSummarySnapshot?.id ?? entity.handoverSummarySnapshotId ?? null,
            projectionLevel: handoverSummarySnapshot?.projectionLevel ?? null,
            exportPolicy: handoverSummarySnapshot?.exportPolicy ?? null,
            allowedActions: this.#buildRoleAssignmentAllowedActions(entity, Boolean(openDispute)),
            generatedAt: new Date().toISOString()
        };
    }

    async createRoleAssignment(projectId: string, dto: CreateCommissionRoleAssignmentRequest): Promise<CommissionRoleAssignmentSummary> {
        const existing = await this.repo.findCurrentRoleAssignment(projectId);
        const nextVersion = existing ? existing.version + 1 : 1;
        try {
            return await this.repo.transactional(async (em) => {
                let supersedesId: string | null = null;

                if (existing) {
                    const current = await em.findOne(CommissionRoleAssignment, { id: existing.id });
                    if (!current) {
                        throw new ConflictException(`CommissionRoleAssignment ${existing.id} no longer exists`);
                    }
                    current.isCurrent = false;
                    if (current.status === 'frozen') {
                        supersedesId = current.id;
                        current.status = 'superseded';
                    }
                    em.persist(current);
                    await em.flush();
                }

                const entity = em.create(CommissionRoleAssignment, {
                    projectId,
                    version: nextVersion,
                    isCurrent: true,
                    status: 'draft',
                    participantsJson: dto.participants,
                    sourceHandoverId: null,
                    sourceHandoverRebaselineRecordId: null,
                    contractSummarySnapshotId: null,
                    handoverSummarySnapshotId: null,
                    effectiveHandoverBaselineSnapshotId: null,
                    supersedesId
                });

                em.persist(entity);
                await em.flush();
                return this.#toRoleAssignmentSummary(entity);
            });
        } catch (error) {
            throw this.#mapSingleCurrentConflict(error);
        }
    }

    async freezeCommissionRoleAssignment(id: string, actorUserId: string, dto: FreezeCommissionRoleAssignmentRequest): Promise<FreezeCommissionRoleAssignmentResult> {
        const entity = await this.repo.findRoleAssignmentById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionRoleAssignment ${id} not found`);
        }

        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'CommissionRoleAssignment');
        this.#assertRoleAssignmentDraft(entity);

        const handover = await this.repo.findProjectHandoverById(dto.sourceHandoverId);
        if (!handover) {
            throw new NotFoundException(`ProjectHandover ${dto.sourceHandoverId} not found`);
        }
        if (handover.projectId !== entity.projectId) {
            throw new BadRequestException('Source project handover does not belong to the same project');
        }
        if (handover.status !== 'confirmed') {
            throw new BadRequestException(`ProjectHandover ${handover.id} is not confirmed`);
        }
        if (handover.summarySnapshotId !== dto.handoverSummarySnapshotId) {
            throw new BadRequestException('Handover summary snapshot does not match the project handover record');
        }

        const handoverSummarySnapshot = await this.repo.findApprovalSummarySnapshotById(handover.summarySnapshotId);
        if (!handoverSummarySnapshot || handoverSummarySnapshot.status !== 'active') {
            throw new BadRequestException('Project handover summary snapshot is not available');
        }

        const receiptJudgmentFreeze = await this.repo.findCurrentReceiptJudgmentFreeze(entity.projectId);
        if (!receiptJudgmentFreeze) {
            throw new BadRequestException('Current receipt judgment freeze is not available for commission freeze');
        }

        this.#assertReceiptJudgmentFreezeMatchesHandover(receiptJudgmentFreeze, handover);

        entity.sourceHandoverId = handover.id;
        entity.sourceHandoverRebaselineRecordId = handover.handoverRebaselineRecordId ?? null;
        entity.contractSummarySnapshotId = handover.contractSummarySnapshotId;
        entity.handoverSummarySnapshotId = handover.summarySnapshotId;
        entity.effectiveHandoverBaselineSnapshotId = handover.effectiveHandoverBaselineSnapshotId;
        entity.status = 'frozen';
        entity.frozenAt = new Date();
        entity.frozenBy = actorUserId;
        entity.updatedBy = actorUserId;

        await this.repo.flushRoleAssignment();

        return {
            targetId: entity.id,
            businessStatusAfter: 'frozen',
            newVersionId: entity.id,
            sourceHandoverId: handover.id,
            contractSummarySnapshotId: handover.contractSummarySnapshotId,
            handoverSummarySnapshotId: handover.summarySnapshotId,
            effectiveHandoverBaselineSnapshotId: handover.effectiveHandoverBaselineSnapshotId,
            summarySnapshotId: handoverSummarySnapshot.id,
            projectionLevel: handoverSummarySnapshot.projectionLevel,
            exportPolicy: handoverSummarySnapshot.exportPolicy
        };
    }

    async submitCommissionFreezeDispute(actorUserId: string, dto: SubmitCommissionFreezeDisputeRequest): Promise<SubmitCommissionFreezeDisputeResult> {
        const freezeVersion = await this.repo.findRoleAssignmentById(dto.freezeVersionId);
        if (!freezeVersion) {
            throw new NotFoundException(`CommissionRoleAssignment ${dto.freezeVersionId} not found`);
        }

        this.#assertExpectedVersion(freezeVersion.rowVersion, dto.expectedVersion, 'CommissionRoleAssignment');
        this.#assertRoleAssignmentEligibleForDispute(freezeVersion);

        const openDispute = await this.repo.findOpenFreezeDisputeByFreezeVersionId(freezeVersion.id);
        if (openDispute) {
            throw new ConflictException(`冻结版本 ${freezeVersion.id} 已存在未收口争议记录 ${openDispute.id}`);
        }

        const summarySnapshot = await this.#findFreezeSummarySnapshot(freezeVersion);
        const affectedAssignmentSummary = this.#buildAffectedAssignmentSummary(freezeVersion, dto.affectedAssignmentIds);
        const impactSummaries = await this.#buildFreezeImpactSummaries(freezeVersion.projectId, dto.recalculationImpactMode);

        const disputeRecord = this.repo.createFreezeDisputeRecord({
            projectId: freezeVersion.projectId,
            freezeVersionId: freezeVersion.id,
            summaryPackageKey: summarySnapshot.summaryPackageKey,
            summarySnapshotId: summarySnapshot.id,
            projectionLevel: summarySnapshot.projectionLevel,
            exportPolicy: summarySnapshot.exportPolicy,
            disputeReason: dto.disputeReason.trim(),
            affectedAssignmentSummary,
            arbitrationStatus: 'pending',
            recalculationImpactMode: dto.recalculationImpactMode.trim(),
            impactAssessmentSummary: impactSummaries.impactAssessmentSummary,
            status: 'submitted',
            handledAt: new Date(),
            createdBy: actorUserId,
            updatedBy: actorUserId
        });

        await this.repo.persistAndFlushFreezeDisputeRecord(disputeRecord);

        return {
            targetId: disputeRecord.id,
            disputeRecordId: disputeRecord.id,
            freezeVersionId: freezeVersion.id,
            summarySnapshotId: summarySnapshot.id,
            projectionLevel: summarySnapshot.projectionLevel,
            exportPolicy: summarySnapshot.exportPolicy,
            businessStatusAfter: 'dispute-submitted'
        };
    }

    async getCommissionFreezeDispute(id: string): Promise<CommissionFreezeDisputeDetailView> {
        const disputeRecord = await this.repo.findFreezeDisputeById(id);
        if (!disputeRecord) {
            throw new NotFoundException(`CommissionFreezeDisputeRecord ${id} not found`);
        }

        return {
            disputeRecordId: disputeRecord.id,
            projectId: disputeRecord.projectId,
            freezeVersionId: disputeRecord.freezeVersionId,
            rowVersion: disputeRecord.rowVersion,
            disputeReason: disputeRecord.disputeReason,
            affectedAssignmentSummary: disputeRecord.affectedAssignmentSummary,
            arbitrationStatus: disputeRecord.arbitrationStatus,
            recalculationImpactMode: disputeRecord.recalculationImpactMode,
            impactAssessmentSummary: disputeRecord.impactAssessmentSummary ?? null,
            summaryPackageKey: disputeRecord.summaryPackageKey,
            summarySnapshotId: disputeRecord.summarySnapshotId,
            projectionLevel: disputeRecord.projectionLevel,
            exportPolicy: disputeRecord.exportPolicy,
            status: disputeRecord.status,
            handledAt: disputeRecord.handledAt.toISOString(),
            allowedActions: disputeRecord.status === 'submitted' && disputeRecord.arbitrationStatus === 'pending' ? [ARBITRATE_COMMISSION_FREEZE_DISPUTE_ACTION] : [],
            generatedAt: new Date().toISOString()
        };
    }

    async arbitrateCommissionFreezeDispute(id: string, actorUserId: string, dto: ArbitrateCommissionFreezeDisputeRequest): Promise<ArbitrateCommissionFreezeDisputeResult> {
        try {
            return await this.repo.transactional(async (em) => {
                const disputeRecord = await em.findOne(CommissionFreezeDisputeRecord, { id });
                if (!disputeRecord) {
                    throw new NotFoundException(`CommissionFreezeDisputeRecord ${id} not found`);
                }

                this.#assertExpectedVersion(disputeRecord.rowVersion, dto.expectedVersion, 'CommissionFreezeDisputeRecord');
                this.#assertDisputeRecordPending(disputeRecord);

                const freezeVersion = await em.findOne(CommissionRoleAssignment, { id: disputeRecord.freezeVersionId });
                if (!freezeVersion) {
                    throw new NotFoundException(`CommissionRoleAssignment ${disputeRecord.freezeVersionId} not found`);
                }

                const currentCalculation = await em.findOne(CommissionCalculation, {
                    projectId: disputeRecord.projectId,
                    isCurrent: true
                });
                const payouts = await em.find(CommissionPayout, { projectId: disputeRecord.projectId });
                const impactSummaries = this.#buildFreezeImpactSummariesFromState(currentCalculation, payouts, dto.recalculationImpactMode);

                let replacementFreezeVersion: CommissionRoleAssignment | null = null;
                if (dto.replacementAssignmentPayload) {
                    const currentFreezeVersion = await em.findOne(CommissionRoleAssignment, {
                        projectId: disputeRecord.projectId,
                        isCurrent: true
                    });
                    if (!currentFreezeVersion || currentFreezeVersion.id !== freezeVersion.id) {
                        throw new UnprocessableEntityException('只有当前有效冻结版本才能生成替代冻结版本');
                    }

                    const nextVersion = currentFreezeVersion.version + 1;
                    freezeVersion.isCurrent = false;
                    freezeVersion.status = 'superseded';
                    freezeVersion.updatedBy = actorUserId;
                    em.persist(freezeVersion);
                    await em.flush();

                    replacementFreezeVersion = em.create(CommissionRoleAssignment, {
                        id: randomUUID(),
                        projectId: freezeVersion.projectId,
                        version: nextVersion,
                        isCurrent: true,
                        status: 'frozen',
                        participantsJson: dto.replacementAssignmentPayload.participants,
                        sourceHandoverId: freezeVersion.sourceHandoverId,
                        sourceHandoverRebaselineRecordId: freezeVersion.sourceHandoverRebaselineRecordId,
                        contractSummarySnapshotId: freezeVersion.contractSummarySnapshotId,
                        handoverSummarySnapshotId: freezeVersion.handoverSummarySnapshotId,
                        effectiveHandoverBaselineSnapshotId: freezeVersion.effectiveHandoverBaselineSnapshotId,
                        frozenAt: new Date(),
                        frozenBy: actorUserId,
                        supersedesId: freezeVersion.id,
                        createdBy: actorUserId,
                        updatedBy: actorUserId
                    });
                }

                disputeRecord.arbitrationStatus = 'arbitrated';
                disputeRecord.recalculationImpactMode = dto.recalculationImpactMode.trim();
                disputeRecord.impactAssessmentSummary = impactSummaries.impactAssessmentSummary;
                disputeRecord.status = 'closed';
                disputeRecord.handledAt = new Date();
                disputeRecord.updatedBy = actorUserId;

                const changeRequest = em.create(CommissionFreezeChangeRequest, {
                    id: randomUUID(),
                    disputeRecordId: disputeRecord.id,
                    supersededFreezeVersionId: freezeVersion.id,
                    replacementFreezeVersionId: replacementFreezeVersion?.id ?? null,
                    summaryPackageKey: disputeRecord.summaryPackageKey,
                    summarySnapshotId: disputeRecord.summarySnapshotId,
                    projectionLevel: disputeRecord.projectionLevel,
                    exportPolicy: disputeRecord.exportPolicy,
                    arbitrationDecision: dto.arbitrationDecision.trim(),
                    recalculationImpactMode: dto.recalculationImpactMode.trim(),
                    affectedCalculationSummary: impactSummaries.affectedCalculationSummary,
                    affectedPayoutSummary: impactSummaries.affectedPayoutSummary,
                    riskFlagSummary: impactSummaries.riskFlagSummary,
                    status: replacementFreezeVersion ? 'effective' : 'closed',
                    handledAt: new Date(),
                    createdBy: actorUserId,
                    updatedBy: actorUserId
                });

                em.persist([disputeRecord, changeRequest, ...(replacementFreezeVersion ? [replacementFreezeVersion] : [])]);
                await em.flush();

                return {
                    targetId: disputeRecord.id,
                    disputeRecordId: disputeRecord.id,
                    changeRequestId: changeRequest.id,
                    supersededFreezeVersionId: freezeVersion.id,
                    replacementFreezeVersionId: replacementFreezeVersion?.id ?? null,
                    affectedCalculationSummary: impactSummaries.affectedCalculationSummary,
                    affectedPayoutSummary: impactSummaries.affectedPayoutSummary,
                    riskFlagSummary: impactSummaries.riskFlagSummary,
                    resultStatus: replacementFreezeVersion ? 'replacement-created' : 'resolved-without-replacement'
                };
            });
        } catch (error) {
            throw this.#mapSingleCurrentConflict(error);
        }
    }

    async getCommissionFreezeChangeRequest(id: string): Promise<CommissionFreezeChangeRequestDetailView> {
        const changeRequest = await this.repo.findFreezeChangeRequestById(id);
        if (!changeRequest) {
            throw new NotFoundException(`CommissionFreezeChangeRequest ${id} not found`);
        }

        return {
            changeRequestId: changeRequest.id,
            disputeRecordId: changeRequest.disputeRecordId,
            supersededFreezeVersionId: changeRequest.supersededFreezeVersionId,
            replacementFreezeVersionId: changeRequest.replacementFreezeVersionId ?? null,
            arbitrationDecision: changeRequest.arbitrationDecision,
            recalculationImpactMode: changeRequest.recalculationImpactMode,
            affectedCalculationSummary: changeRequest.affectedCalculationSummary ?? null,
            affectedPayoutSummary: changeRequest.affectedPayoutSummary ?? null,
            riskFlagSummary: changeRequest.riskFlagSummary ?? null,
            summaryPackageKey: changeRequest.summaryPackageKey,
            summarySnapshotId: changeRequest.summarySnapshotId,
            projectionLevel: changeRequest.projectionLevel,
            exportPolicy: changeRequest.exportPolicy,
            status: changeRequest.status,
            handledAt: changeRequest.handledAt.toISOString(),
            generatedAt: new Date().toISOString()
        };
    }

    async createDepartureExceptionDecision(projectId: string, actorUserId: string, dto: CreateCommissionDepartureExceptionDecisionRequest): Promise<CommissionDepartureExceptionDecisionSummary> {
        await this.#assertProjectExists(projectId);

        try {
            return await this.repo.transactional(async (em) => {
                const freezeVersion = await em.findOne(CommissionRoleAssignment, { id: dto.freezeVersionId });
                if (!freezeVersion) {
                    throw new NotFoundException(`CommissionRoleAssignment ${dto.freezeVersionId} not found`);
                }
                if (freezeVersion.projectId !== projectId) {
                    throw new BadRequestException('Departure exception freeze version does not belong to the same project');
                }

                this.#assertRoleAssignmentEligibleForDepartureExceptionDecision(freezeVersion);

                const summarySnapshot = await this.#findMatchedFreezeSummarySnapshot(freezeVersion, dto.summarySnapshotId, '离职 / 特例结论链');

                const currentDecision = await em.findOne(CommissionDepartureExceptionDecision, {
                    projectId,
                    isCurrent: true
                });

                let supersedesId: string | null = null;
                let nextVersion = 1;
                if (currentDecision) {
                    nextVersion = currentDecision.version + 1;
                    supersedesId = currentDecision.id;
                    currentDecision.isCurrent = false;
                    currentDecision.status = 'superseded';
                    currentDecision.updatedBy = actorUserId;
                    em.persist(currentDecision);
                    await em.flush();
                }

                const entity = em.create(CommissionDepartureExceptionDecision, {
                    projectId,
                    freezeVersionId: freezeVersion.id,
                    version: nextVersion,
                    isCurrent: true,
                    departureScenarioCode: dto.departureScenarioCode.trim(),
                    decisionCode: dto.decisionCode.trim(),
                    decisionSummary: dto.decisionSummary.trim(),
                    confirmationRequirementSummary: dto.confirmationRequirementSummary?.trim() ?? null,
                    summaryPackageKey: summarySnapshot.summaryPackageKey,
                    summarySnapshotId: summarySnapshot.id,
                    projectionLevel: summarySnapshot.projectionLevel,
                    exportPolicy: summarySnapshot.exportPolicy,
                    handledAt: new Date(),
                    handledBy: actorUserId,
                    status: 'active',
                    supersedesId,
                    createdBy: actorUserId,
                    updatedBy: actorUserId
                });

                em.persist(entity);
                const currentFinalSettlementSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
                    projectId,
                    isCurrent: true
                });
                if (
                    currentFinalSettlementSnapshot &&
                    currentFinalSettlementSnapshot.status === 'active' &&
                    currentFinalSettlementSnapshot.freezeVersionId === freezeVersion.id &&
                    currentFinalSettlementSnapshot.finalSettlementStatus !== FINAL_SETTLEMENT_STATUS_SETTLED_ALL
                ) {
                    const latestRetentionReceipt = await this.#findLatestConfirmedRetentionReceipt(em, projectId);
                    const gateReview = await this.#findGateReviewById(em, currentFinalSettlementSnapshot.gateReviewRecordId);
                    const gateBindingAction = await this.#findGateBindingActionByReview(em, gateReview);
                    const openDispute = await em.findOne(CommissionFreezeDisputeRecord, {
                        freezeVersionId: freezeVersion.id,
                        status: 'submitted'
                    });
                    const retentionDue = await this.#loadRetentionDueEvaluationFromFreezeVersion(freezeVersion);

                    const nextSnapshot =
                        currentFinalSettlementSnapshot.finalSettlementStatus === FINAL_SETTLEMENT_STATUS_PENDING_RETENTION
                            ? await this.#writeCurrentFinalSettlementSnapshot(
                                  em,
                                  this.#buildFinalSettlementEvidenceFromSnapshot(currentFinalSettlementSnapshot),
                                  currentFinalSettlementSnapshot,
                                  {
                                      ...this.#toFinalSettlementStatusPatch(this.#buildRetentionSettlementDraft(gateBindingAction, gateReview, entity, latestRetentionReceipt, retentionDue, Boolean(openDispute))),
                                      retentionReceiptRecordId: latestRetentionReceipt?.id ?? null,
                                      departureExceptionDecisionId: entity.id
                                  },
                                  actorUserId
                              )
                            : await this.#writeCurrentFinalSettlementSnapshot(
                                  em,
                                  this.#buildFinalSettlementEvidenceFromSnapshot(currentFinalSettlementSnapshot),
                                  currentFinalSettlementSnapshot,
                                  {
                                      finalSettlementStatus: currentFinalSettlementSnapshot.finalSettlementStatus,
                                      nonRetentionSettlementStatus: currentFinalSettlementSnapshot.nonRetentionSettlementStatus,
                                      retentionSettlementStatus: currentFinalSettlementSnapshot.retentionSettlementStatus,
                                      retentionRequirementSummary: currentFinalSettlementSnapshot.retentionRequirementSummary ?? DEFAULT_RETENTION_REQUIREMENT_SUMMARY,
                                      retentionReceiptSummary: currentFinalSettlementSnapshot.retentionReceiptSummary ?? null,
                                      departureExceptionSummary: entity.decisionSummary,
                                      retentionReceiptRecordId: currentFinalSettlementSnapshot.retentionReceiptRecordId ?? null,
                                      departureExceptionDecisionId: entity.id
                                  },
                                  actorUserId
                              );

                    await this.#writeCurrentRuleExplanationSnapshot(
                        em,
                        projectId,
                        nextSnapshot.id,
                        currentFinalSettlementSnapshot.finalSettlementStatus === FINAL_SETTLEMENT_STATUS_PENDING_RETENTION
                            ? this.#buildRetentionSettlementDraft(gateBindingAction, gateReview, entity, latestRetentionReceipt, retentionDue, Boolean(openDispute)).ruleExplanation
                            : buildPendingFinalRuleExplanation(),
                        actorUserId
                    );
                }
                await em.flush();
                return this.#toDepartureExceptionDecisionSummary(entity);
            });
        } catch (error) {
            throw this.#mapSingleCurrentConflict(error);
        }
    }

    // ── Calculations ────────────────────────────────────────────────────────

    async listCalculations(projectId: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-calculations:${projectId}` }): Promise<CommissionCalculationSummary[]> {
        const entities = await this.repo.findCalculationsForProject(projectId);
        return Promise.all(entities.map((entity) => this.#toCalculationSummary(entity, user, requestContext)));
    }

    async createCalculation(
        projectId: string,
        dto: CreateCommissionCalculationRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-calculations:${projectId}` }
    ): Promise<CommissionCalculationSummary> {
        await this.#assertProjectExists(projectId);
        const revenue = this.#parseDecimal(dto.recognizedRevenueTaxExclusive, 'recognizedRevenueTaxExclusive');
        const cost = this.#parseDecimal(dto.recognizedCostTaxExclusive, 'recognizedCostTaxExclusive');
        await this.#assertEffectiveContractFacts(projectId, revenue, cost);

        const ruleVersion = await this.repo.findRuleVersionById(dto.ruleVersionId);
        if (!ruleVersion) {
            throw new NotFoundException(`CommissionRuleVersion ${dto.ruleVersionId} not found`);
        }
        if (ruleVersion.status !== 'active') {
            throw new UnprocessableEntityException(`只有已激活的提成规则版本可以用于提成计算，当前状态: ${ruleVersion.status}`);
        }

        const assignment = await this.repo.findCurrentRoleAssignment(projectId);
        if (!assignment || assignment.status !== 'frozen') {
            throw new UnprocessableEntityException('当前项目不存在已冻结的提成角色分配，无法触发提成计算');
        }

        const contributionMargin = revenue - cost;
        const contributionMarginRate = revenue <= 0 ? 0 : contributionMargin / revenue;
        const commissionRate = this.#resolveCommissionRate(ruleVersion, contributionMarginRate);
        const commissionPool = contributionMargin > 0 && commissionRate > 0 ? contributionMargin * commissionRate : 0;

        const current = await this.repo.findCurrentCalculation(projectId);
        const nextVersion = current ? current.version + 1 : 1;

        try {
            return await this.repo.transactional(async (em) => {
                if (current) {
                    const currentCalculation = await em.findOne(CommissionCalculation, { id: current.id });
                    if (!currentCalculation) {
                        throw new ConflictException(`CommissionCalculation ${current.id} no longer exists`);
                    }
                    currentCalculation.isCurrent = false;
                    currentCalculation.status = 'superseded';
                    em.persist(currentCalculation);
                    await em.flush();
                }

                const entity = em.create(CommissionCalculation, {
                    projectId,
                    ruleVersionId: ruleVersion.id,
                    version: nextVersion,
                    isCurrent: true,
                    status: 'calculated',
                    recognizedRevenueTaxExclusive: this.#formatAmount(revenue),
                    recognizedCostTaxExclusive: this.#formatAmount(cost),
                    contributionMargin: this.#formatAmount(contributionMargin),
                    contributionMarginRate: this.#formatRate(contributionMarginRate),
                    commissionPool: this.#formatAmount(commissionPool),
                    recalculatedFromId: current?.id ?? null
                });

                em.persist(entity);
                await em.flush();
                return this.#toCalculationSummary(entity, user, requestContext);
            });
        } catch (error) {
            throw this.#mapSingleCurrentConflict(error);
        }
    }

    async approveCalculation(
        id: string,
        dto: ConfirmCommissionCalculationRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-calculations:${id}:approve` }
    ): Promise<CommissionCalculationSummary> {
        const entity = await this.repo.findCalculationById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionCalculation ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'CommissionCalculation');

        if (entity.status !== 'calculated') {
            throw new UnprocessableEntityException(`只有已计算状态的提成结果可以生效，当前状态: ${entity.status}`);
        }

        entity.status = 'effective';
        entity.approvedAt = new Date();
        await this.repo.flushCalculation();
        return this.#toCalculationSummary(entity, user, requestContext);
    }

    // ── Payouts ─────────────────────────────────────────────────────────────

    async listPayouts(projectId: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-payouts:${projectId}` }): Promise<CommissionPayoutSummary[]> {
        const entities = await this.repo.findPayoutsForProject(projectId);
        return Promise.all(entities.map((entity) => this.#toPayoutSummary(entity, user, requestContext)));
    }

    async createPayout(
        projectId: string,
        dto: CreateCommissionPayoutRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-payouts:${projectId}` }
    ): Promise<CommissionPayoutSummary> {
        await this.#assertProjectExists(projectId);

        const calculation = await this.repo.findCalculationById(dto.calculationId);
        if (!calculation || calculation.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 的提成计算 ${dto.calculationId} 不存在`);
        }
        if (calculation.status !== 'effective') {
            throw new UnprocessableEntityException(`只有已生效的提成计算结果可以发起发放，当前状态: ${calculation.status}`);
        }

        const existing = await this.repo.findPayoutByProjectCalculationStage(projectId, dto.calculationId, dto.stageType);
        if (existing) {
            throw new ConflictException(`项目 ${projectId} 在当前计算版本与发放阶段下已存在发放记录`);
        }

        let theoreticalCapAmount: string;
        if (dto.stageType === 'retention') {
            const currentFinalSettlementSnapshot = await this.repo.findCurrentFinalSettlementSnapshot(projectId);
            if (!currentFinalSettlementSnapshot || !currentFinalSettlementSnapshot.isCurrent || currentFinalSettlementSnapshot.status !== 'active') {
                throw new UnprocessableEntityException('当前项目缺少有效的最终结算快照，无法创建质保金发放草稿');
            }
            if (
                currentFinalSettlementSnapshot.finalSettlementStatus !== FINAL_SETTLEMENT_STATUS_PENDING_RETENTION ||
                currentFinalSettlementSnapshot.nonRetentionSettlementStatus !== NON_RETENTION_SETTLEMENT_STATUS_SETTLED ||
                currentFinalSettlementSnapshot.retentionSettlementStatus === RETENTION_SETTLEMENT_STATUS_SETTLED
            ) {
                throw new UnprocessableEntityException('当前项目尚未进入质保金结算草稿可创建阶段');
            }

            const payouts = await this.repo.findPayoutsForProject(projectId);
            const remainingRetentionAmount = this.#calculateRemainingRetentionCap(calculation.id, calculation.commissionPool, payouts);
            if (remainingRetentionAmount <= 0) {
                throw new UnprocessableEntityException('当前项目不存在剩余可登记的质保金金额');
            }
            theoreticalCapAmount = this.#formatAmount(remainingRetentionAmount);
        } else {
            const capRate = PAYOUT_CAP_RATES[dto.stageType][dto.selectedTier];
            theoreticalCapAmount = this.#formatAmount(this.#toNumber(calculation.commissionPool) * capRate);
        }

        const entity = this.repo.createPayout({
            projectId,
            calculationId: dto.calculationId,
            stageType: dto.stageType,
            payoutKind: 'primary',
            sourcePayoutId: null,
            selectedTier: dto.selectedTier,
            theoreticalCapAmount,
            approvedAmount: null,
            paidRecordAmount: null,
            status: 'draft',
            approvedAt: null,
            approvedBy: null,
            handledAt: null,
            handledBy: null,
            reversedFromId: null
        });

        await this.repo.persistAndFlushPayout(entity);
        return this.#toPayoutSummary(entity, user, requestContext);
    }

    async getPayoutById(id: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-payouts:${id}` }): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }

        return this.#toPayoutSummary(entity, user, requestContext);
    }

    async submitPayoutApproval(
        id: string,
        dto: SubmitCommissionPayoutApprovalRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-payouts:${id}:submitApproval` }
    ): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'commission-payout');
        this.#assertRequestStageMatchesPayout(entity.stageType, dto.payoutStage);
        this.#assertPayoutSupportsLifecycleActions(entity);

        if (entity.status !== 'draft') {
            throw new UnprocessableEntityException(`只有草稿状态的提成发放可以提交审批，当前状态: ${entity.status}`);
        }

        if (entity.stageType === 'retention') {
            const currentSnapshot = await this.repo.findCurrentFinalSettlementSnapshot(entity.projectId);
            this.#assertRetentionSnapshotEligibleForSubmit(entity, currentSnapshot);
            const retentionDue = await this.#loadRetentionDueEvaluationFromFreezeVersionId(currentSnapshot.freezeVersionId);
            this.#assertRetentionDueReady(retentionDue, entity.id, 'submit retention payout approval');

            if (dto.summarySnapshotId && dto.summarySnapshotId !== currentSnapshot.summarySnapshotId) {
                throw new BadRequestException('summarySnapshotId must match the current final-settlement snapshot');
            }
            if (dto.gateReviewRecordId && dto.gateReviewRecordId !== currentSnapshot.gateReviewRecordId) {
                throw new BadRequestException('gateReviewRecordId must match the current final-settlement snapshot');
            }
            if (dto.freezeVersionId && dto.freezeVersionId !== currentSnapshot.freezeVersionId) {
                throw new BadRequestException('freezeVersionId must match the current final-settlement snapshot');
            }
            if (dto.departureExceptionDecisionId) {
                const decision = await this.repo.findDepartureExceptionDecisionById(dto.departureExceptionDecisionId);
                if (!decision || decision.projectId !== entity.projectId || decision.freezeVersionId !== currentSnapshot.freezeVersionId || !decision.isCurrent || decision.status !== 'active') {
                    throw new BadRequestException('departureExceptionDecisionId must reference the current active departure decision');
                }
            }
            if (dto.retentionReceiptRecordId) {
                const confirmedReceipts = await this.repo.findConfirmedReceiptsForProject(entity.projectId);
                if (!confirmedReceipts.some((receipt) => receipt.id === dto.retentionReceiptRecordId)) {
                    throw new BadRequestException('retentionReceiptRecordId must reference a confirmed receipt in the same project');
                }
            }
        }

        entity.status = 'pending-approval';
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity, user, requestContext);
    }

    async approvePayout(id: string, dto: ApproveCommissionPayoutRequest, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-payouts:${id}:approve` }): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'commission-payout');
        this.#assertPayoutSupportsLifecycleActions(entity);

        if (entity.status !== 'pending-approval') {
            throw new UnprocessableEntityException(`只有待审批状态的提成发放可以批准，当前状态: ${entity.status}`);
        }

        const approvedAmount = dto.approvedAmount ? this.#parseDecimal(dto.approvedAmount, 'approvedAmount') : this.#toNumber(entity.theoreticalCapAmount);
        const capAmount = this.#toNumber(entity.theoreticalCapAmount);
        if (approvedAmount < 0 || approvedAmount > capAmount) {
            throw new UnprocessableEntityException(`批准金额必须位于 0 到理论上限 ${entity.theoreticalCapAmount} 之间`);
        }

        if (entity.stageType === 'final' || entity.stageType === 'retention') {
            return this.repo.transactional(async (em) => {
                const payout = await em.findOne(CommissionPayout, { id });
                if (!payout) {
                    throw new NotFoundException(`CommissionPayout ${id} not found`);
                }
                this.#assertExpectedVersion(payout.rowVersion, dto.expectedVersion, 'commission-payout');
                this.#assertPayoutSupportsLifecycleActions(payout);

                if (payout.status !== 'pending-approval') {
                    throw new UnprocessableEntityException(`只有待审批状态的提成发放可以批准，当前状态: ${payout.status}`);
                }

                const transactionalCapAmount = this.#toNumber(payout.theoreticalCapAmount);
                if (approvedAmount < 0 || approvedAmount > transactionalCapAmount) {
                    throw new UnprocessableEntityException(`批准金额必须位于 0 到理论上限 ${payout.theoreticalCapAmount} 之间`);
                }

                payout.status = 'approved';
                payout.approvedAmount = this.#formatAmount(approvedAmount);
                payout.approvedAt = new Date();

                if (payout.stageType === 'final') {
                    const { freezeVersion, binding, gateReview } = await this.#loadCurrentFinalGateContext(em, payout.projectId);
                    if (this.#isBlockingGateDecision(binding.bindingAction, gateReview.gateReviewDecision)) {
                        throw new BadRequestException(`CommissionPayout ${payout.id} is blocked by the current final commission gate review`);
                    }

                    const currentSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
                        projectId: payout.projectId,
                        isCurrent: true
                    });
                    const nextSnapshot = await this.#writeCurrentFinalSettlementSnapshot(
                        em,
                        this.#buildFinalSettlementEvidenceFromGateContext(payout.projectId, freezeVersion, binding, gateReview),
                        currentSnapshot,
                        {
                            finalSettlementStatus: FINAL_SETTLEMENT_STATUS_PENDING,
                            nonRetentionSettlementStatus: NON_RETENTION_SETTLEMENT_STATUS_PENDING,
                            retentionSettlementStatus: RETENTION_SETTLEMENT_STATUS_WAITING,
                            retentionRequirementSummary: DEFAULT_RETENTION_REQUIREMENT_SUMMARY,
                            retentionReceiptSummary: null,
                            departureExceptionSummary: null,
                            retentionReceiptRecordId: null,
                            departureExceptionDecisionId: null
                        },
                        null
                    );
                    await this.#writeCurrentRuleExplanationSnapshot(em, payout.projectId, nextSnapshot.id, buildPendingFinalRuleExplanation(), null);
                } else {
                    const currentSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
                        projectId: payout.projectId,
                        isCurrent: true
                    });
                    this.#assertRetentionSnapshotReadyForApproval(payout, currentSnapshot);
                    const retentionReceiptRecordId = currentSnapshot.retentionReceiptRecordId;
                    const departureExceptionDecisionId = currentSnapshot.departureExceptionDecisionId;
                    if (!retentionReceiptRecordId || !departureExceptionDecisionId) {
                        throw new UnprocessableEntityException('当前项目缺少完整的质保金到账或离职 / 特例结论引用');
                    }

                    const gateReview = await this.#findGateReviewById(em, currentSnapshot.gateReviewRecordId);
                    const retentionReceipt = await this.#findConfirmedReceiptById(em, retentionReceiptRecordId, payout.projectId);
                    const departureDecision = await this.#findActiveDepartureDecisionById(em, departureExceptionDecisionId, payout.projectId, currentSnapshot.freezeVersionId);
                    const openDispute = await em.findOne(CommissionFreezeDisputeRecord, {
                        freezeVersionId: currentSnapshot.freezeVersionId,
                        status: 'submitted'
                    });
                    if (openDispute) {
                        throw new UnprocessableEntityException('当前冻结版本仍存在未收口争议，不能批准质保金发放');
                    }
                    if (departureDecision.confirmationRequirementSummary?.trim()) {
                        throw new UnprocessableEntityException('当前离职 / 特例结论仍要求责任承接确认，不能批准质保金发放');
                    }
                    const retentionDue = await this.#loadRetentionDueEvaluationFromFreezeVersionId(currentSnapshot.freezeVersionId);
                    this.#assertRetentionDueReady(retentionDue, payout.id, '批准质保金发放');
                    const gateBindingAction = await this.#findGateBindingActionByReview(em, gateReview);

                    const retentionDraft = this.#buildRetentionSettlementDraft(gateBindingAction, gateReview, departureDecision, retentionReceipt, retentionDue, false);
                    if (retentionDraft.retentionSettlementStatus !== RETENTION_SETTLEMENT_STATUS_READY) {
                        throw new UnprocessableEntityException('当前项目尚未处于可批准的质保金结算状态');
                    }

                    const nextSnapshot = await this.#writeCurrentFinalSettlementSnapshot(
                        em,
                        this.#buildFinalSettlementEvidenceFromSnapshot(currentSnapshot),
                        currentSnapshot,
                        {
                            ...this.#toFinalSettlementStatusPatch(retentionDraft),
                            retentionReceiptRecordId: retentionReceipt.id,
                            departureExceptionDecisionId: departureDecision.id
                        },
                        null
                    );
                    await this.#writeCurrentRuleExplanationSnapshot(em, payout.projectId, nextSnapshot.id, retentionDraft.ruleExplanation, null);
                }

                em.persist(payout);
                await em.flush();
                return this.#toPayoutSummary(payout, user, requestContext);
            });
        }

        entity.status = 'approved';
        entity.approvedAmount = this.#formatAmount(approvedAmount);
        entity.approvedAt = new Date();
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity, user, requestContext);
    }

    async registerPayout(
        id: string,
        dto: RegisterCommissionPayoutRequest,
        actorUserId?: string,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-payouts:${id}:registerPayout` }
    ): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'commission-payout');
        this.#assertRequestStageMatchesPayout(entity.stageType, dto.payoutStage);
        this.#assertPayoutSupportsLifecycleActions(entity);

        if (entity.status !== 'approved') {
            throw new UnprocessableEntityException(`只有已批准状态的提成发放可以登记发放，当前状态: ${entity.status}`);
        }

        const paidAmount = this.#parseDecimal(dto.paidRecordAmount, 'paidRecordAmount');
        const approvedAmount = entity.approvedAmount ? this.#toNumber(entity.approvedAmount) : 0;
        if (paidAmount < 0 || paidAmount > approvedAmount) {
            throw new UnprocessableEntityException(`登记发放金额必须位于 0 到批准金额 ${entity.approvedAmount ?? '0.00'} 之间`);
        }

        if (entity.stageType === 'final' || entity.stageType === 'retention') {
            return this.repo.transactional(async (em) => {
                const payout = await em.findOne(CommissionPayout, { id });
                if (!payout) {
                    throw new NotFoundException(`CommissionPayout ${id} not found`);
                }

                this.#assertExpectedVersion(payout.rowVersion, dto.expectedVersion, 'commission-payout');
                this.#assertPayoutSupportsLifecycleActions(payout);

                if (payout.status !== 'approved') {
                    throw new UnprocessableEntityException(`只有已批准状态的提成发放可以登记发放，当前状态: ${payout.status}`);
                }

                const transactionalApprovedAmount = payout.approvedAmount ? this.#toNumber(payout.approvedAmount) : 0;
                if (paidAmount < 0 || paidAmount > transactionalApprovedAmount) {
                    throw new UnprocessableEntityException(`登记发放金额必须位于 0 到批准金额 ${payout.approvedAmount ?? '0.00'} 之间`);
                }

                const currentSnapshot = await em.findOne(CommissionFinalSettlementSnapshot, {
                    projectId: payout.projectId,
                    isCurrent: true
                });
                if (!currentSnapshot || currentSnapshot.status !== 'active') {
                    throw new UnprocessableEntityException(`当前项目缺少有效的最终结算快照，无法登记 ${payout.stageType === 'final' ? 'final' : 'retention'} 阶段发放`);
                }

                const freezeVersion = await em.findOne(CommissionRoleAssignment, { id: currentSnapshot.freezeVersionId });
                if (!freezeVersion || freezeVersion.projectId !== payout.projectId || !freezeVersion.isCurrent || freezeVersion.status !== 'frozen') {
                    throw new UnprocessableEntityException('当前项目缺少有效的冻结提成角色版本，无法登记 final 阶段发放');
                }

                const handledAt = dto.paidAt ? new Date(dto.paidAt) : new Date();
                payout.status = 'paid';
                payout.paidRecordAmount = this.#formatAmount(paidAmount);
                payout.handledAt = handledAt;
                payout.handledBy = actorUserId ?? null;

                if (payout.stageType === 'final') {
                    if (currentSnapshot.finalSettlementStatus !== FINAL_SETTLEMENT_STATUS_PENDING) {
                        throw new UnprocessableEntityException('当前项目未处于 final 非质保发放可登记状态');
                    }
                    const gateReview = await this.#findGateReviewById(em, currentSnapshot.gateReviewRecordId);
                    const latestRetentionReceipt = await this.#findLatestConfirmedRetentionReceipt(em, payout.projectId);
                    const currentDepartureDecision = await this.#findCurrentActiveDepartureDecision(em, payout.projectId, currentSnapshot.freezeVersionId);
                    const openDispute = await em.findOne(CommissionFreezeDisputeRecord, {
                        freezeVersionId: currentSnapshot.freezeVersionId,
                        status: 'submitted'
                    });
                    const retentionDue = await this.#loadRetentionDueEvaluationFromFreezeVersionId(currentSnapshot.freezeVersionId);
                    const gateBindingAction = await this.#findGateBindingActionByReview(em, gateReview);
                    const retentionDraft = this.#buildRetentionSettlementDraft(gateBindingAction, gateReview, currentDepartureDecision, latestRetentionReceipt, retentionDue, Boolean(openDispute));
                    const nextSnapshot = await this.#writeCurrentFinalSettlementSnapshot(
                        em,
                        this.#buildFinalSettlementEvidenceFromSnapshot(currentSnapshot),
                        currentSnapshot,
                        {
                            ...this.#toFinalSettlementStatusPatch(retentionDraft),
                            retentionReceiptRecordId: latestRetentionReceipt?.id ?? null,
                            departureExceptionDecisionId: currentDepartureDecision?.id ?? null
                        },
                        actorUserId ?? null
                    );
                    await this.#writeCurrentRuleExplanationSnapshot(em, payout.projectId, nextSnapshot.id, retentionDraft.ruleExplanation, actorUserId ?? null);
                } else {
                    this.#assertRetentionSnapshotReadyForRegistration(payout, currentSnapshot, dto.summarySnapshotId ?? null);
                    const retentionReceiptRecordId = currentSnapshot.retentionReceiptRecordId;
                    const departureExceptionDecisionId = currentSnapshot.departureExceptionDecisionId;
                    if (!retentionReceiptRecordId || !departureExceptionDecisionId) {
                        throw new UnprocessableEntityException('当前项目缺少完整的质保金到账或离职 / 特例结论引用');
                    }
                    const gateReview = await this.#findGateReviewById(em, currentSnapshot.gateReviewRecordId);
                    const retentionReceipt = await this.#findConfirmedReceiptById(em, retentionReceiptRecordId, payout.projectId);
                    const departureDecision = await this.#findActiveDepartureDecisionById(em, departureExceptionDecisionId, payout.projectId, currentSnapshot.freezeVersionId);
                    const openDispute = await em.findOne(CommissionFreezeDisputeRecord, {
                        freezeVersionId: currentSnapshot.freezeVersionId,
                        status: 'submitted'
                    });
                    if (openDispute) {
                        throw new UnprocessableEntityException('当前冻结版本仍存在未收口争议，不能登记质保金发放');
                    }
                    const retentionDue = await this.#loadRetentionDueEvaluationFromFreezeVersionId(currentSnapshot.freezeVersionId);
                    this.#assertRetentionDueReady(retentionDue, payout.id, '登记质保金发放');
                    const gateBindingAction = await this.#findGateBindingActionByReview(em, gateReview);

                    const retentionDraft = this.#buildRetentionSettlementDraft(gateBindingAction, gateReview, departureDecision, retentionReceipt, retentionDue, false, true);
                    const nextSnapshot = await this.#writeCurrentFinalSettlementSnapshot(
                        em,
                        this.#buildFinalSettlementEvidenceFromSnapshot(currentSnapshot),
                        currentSnapshot,
                        {
                            ...this.#toFinalSettlementStatusPatch(retentionDraft),
                            retentionReceiptRecordId: retentionReceipt.id,
                            departureExceptionDecisionId: departureDecision.id
                        },
                        actorUserId ?? null
                    );
                    await this.#writeCurrentRuleExplanationSnapshot(em, payout.projectId, nextSnapshot.id, retentionDraft.ruleExplanation, actorUserId ?? null);
                }

                em.persist(payout);
                await em.flush();
                return this.#toPayoutSummary(payout, user, requestContext);
            });
        }

        entity.status = 'paid';
        entity.paidRecordAmount = this.#formatAmount(paidAmount);
        entity.handledAt = new Date();
        entity.handledBy = actorUserId ?? null;
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity, user, requestContext);
    }

    // ── Adjustments ────────────────────────────────────────────────────────

    async listAdjustments(projectId: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-adjustments:${projectId}` }): Promise<CommissionAdjustmentSummary[]> {
        const entities = await this.repo.findAdjustmentsForProject(projectId);
        return Promise.all(entities.map((entity) => this.#toAdjustmentSummary(entity, user, requestContext)));
    }

    async createAdjustment(
        projectId: string,
        dto: CreateCommissionAdjustmentRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-adjustments:${projectId}` }
    ): Promise<CommissionAdjustmentSummary> {
        await this.#assertProjectExists(projectId);

        const payout = dto.relatedPayoutId ? await this.repo.findPayoutById(dto.relatedPayoutId) : null;
        const calculation = dto.relatedCalculationId ? await this.repo.findCalculationById(dto.relatedCalculationId) : null;
        this.#assertAdjustmentLinks(projectId, dto.adjustmentType, payout, calculation);
        if ((dto.adjustmentType === 'clawback' || dto.adjustmentType === 'supplement') && !dto.amount) {
            throw new UnprocessableEntityException(`${dto.adjustmentType === 'clawback' ? '扣回' : '补发'}调整必须填写金额`);
        }
        const parsedAmount = dto.amount ? this.#parseDecimal(dto.amount, 'amount') : null;
        if (parsedAmount !== null && parsedAmount <= 0) {
            throw new UnprocessableEntityException('调整金额必须大于 0');
        }

        const entity = this.repo.createAdjustment({
            projectId,
            adjustmentType: dto.adjustmentType,
            relatedPayoutId: payout?.id ?? null,
            relatedCalculationId: calculation?.id ?? payout?.calculationId ?? null,
            amount: parsedAmount !== null ? this.#formatAmount(parsedAmount) : null,
            reason: dto.reason.trim(),
            status: 'draft',
            executedAt: null,
            executedBy: null
        });

        await this.repo.persistAndFlushAdjustment(entity);
        return this.#toAdjustmentSummary(entity, user, requestContext);
    }

    async getAdjustmentById(id: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-adjustments:${id}` }): Promise<CommissionAdjustmentSummary> {
        const entity = await this.repo.findAdjustmentById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionAdjustment ${id} not found`);
        }

        return this.#toAdjustmentSummary(entity, user, requestContext);
    }

    async executeAdjustment(
        id: string,
        dto: ExecuteCommissionAdjustmentRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-adjustments:${id}:execute` }
    ): Promise<CommissionAdjustmentSummary> {
        return this.repo.transactional(async (em) => {
            const adjustment = await em.findOne(CommissionAdjustment, { id });
            if (!adjustment) {
                throw new NotFoundException(`CommissionAdjustment ${id} not found`);
            }
            this.#assertExpectedVersion(adjustment.rowVersion, dto.expectedVersion, 'commission-adjustment');

            if (adjustment.status !== 'approved') {
                throw new UnprocessableEntityException(`只有已批准状态的提成调整可以执行，当前状态: ${adjustment.status}`);
            }

            const payout = adjustment.relatedPayoutId ? await em.findOne(CommissionPayout, { id: adjustment.relatedPayoutId }) : null;
            if (adjustment.adjustmentType !== 'recalculate' && !payout) {
                throw new UnprocessableEntityException('当前调整未关联提成发放记录，无法执行');
            }
            const handledAt = new Date();

            if (adjustment.adjustmentType === 'suspend-payout') {
                this.#assertPayoutStatus(payout, ['approved', 'paid'], '暂停');
                this.#assertPrimaryPayout(payout, '暂停');
                payout.status = 'suspended';
                payout.handledAt = handledAt;
            }

            if (adjustment.adjustmentType === 'reverse-payout') {
                this.#assertPayoutStatus(payout, ['paid', 'suspended'], '冲销');
                this.#assertPrimaryPayout(payout, '冲销');
                payout.status = 'reversed';
                payout.handledAt = handledAt;
            }

            if (adjustment.adjustmentType === 'clawback') {
                this.#assertPayoutStatus(payout, ['paid', 'suspended'], '扣回');
                this.#assertPrimaryPayout(payout, '扣回');

                const clawbackAmount = this.#requireAdjustmentAmount(adjustment, '扣回');
                const paidAmount = this.#requirePaidPayoutAmount(payout, '扣回');
                if (clawbackAmount > paidAmount) {
                    throw new UnprocessableEntityException(`扣回金额不能超过原发放登记金额 ${this.#formatAmount(paidAmount)}`);
                }

                payout.status = clawbackAmount === paidAmount ? 'reversed' : 'suspended';
                payout.handledAt = handledAt;
            }

            const persistTargets: object[] = [adjustment];
            if (payout) {
                persistTargets.push(payout);
            }

            if (adjustment.adjustmentType === 'supplement') {
                this.#assertPayoutStatus(payout, ['paid', 'suspended'], '补发');
                this.#assertPrimaryPayout(payout, '补发');

                const supplementAmount = this.#requireAdjustmentAmount(adjustment, '补发');
                const supplementPayout = em.create(CommissionPayout, {
                    projectId: payout.projectId,
                    calculationId: payout.calculationId,
                    stageType: payout.stageType,
                    payoutKind: 'supplement',
                    sourcePayoutId: payout.id,
                    selectedTier: payout.selectedTier,
                    theoreticalCapAmount: this.#formatAmount(supplementAmount),
                    approvedAmount: this.#formatAmount(supplementAmount),
                    paidRecordAmount: this.#formatAmount(supplementAmount),
                    status: 'paid',
                    approvedAt: handledAt,
                    approvedBy: null,
                    handledAt,
                    handledBy: null,
                    reversedFromId: null
                });
                persistTargets.push(supplementPayout);
            }

            adjustment.status = 'executed';
            adjustment.executedAt = handledAt;

            em.persist(persistTargets);
            await em.flush();

            return this.#toAdjustmentSummary(adjustment, user, requestContext);
        });
    }

    async recalculateCalculation(
        id: string,
        dto: RecalculateCommissionRequest,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `commission-calculations:${id}:recalculate` }
    ): Promise<CommissionCalculationSummary> {
        try {
            return await this.repo.transactional(async (em) => {
                const current = await em.findOne(CommissionCalculation, { id });
                if (!current) {
                    throw new NotFoundException(`CommissionCalculation ${id} not found`);
                }
                this.#assertExpectedVersion(current.rowVersion, dto.expectedVersion, 'CommissionCalculation');

                if (!current.isCurrent || current.status !== 'effective') {
                    throw new UnprocessableEntityException(`只有当前已生效的提成计算结果可以触发重算，当前状态: ${current.status}`);
                }

                const ruleVersion = await em.findOne(CommissionRuleVersion, { id: current.ruleVersionId });
                if (!ruleVersion) {
                    throw new UnprocessableEntityException(`提成规则版本 ${current.ruleVersionId} 不存在，无法触发重算`);
                }

                const revenue = dto.recognizedRevenueTaxExclusive ? this.#parseDecimal(dto.recognizedRevenueTaxExclusive, 'recognizedRevenueTaxExclusive') : this.#toNumber(current.recognizedRevenueTaxExclusive);
                const cost = dto.recognizedCostTaxExclusive ? this.#parseDecimal(dto.recognizedCostTaxExclusive, 'recognizedCostTaxExclusive') : this.#toNumber(current.recognizedCostTaxExclusive);
                await this.#assertEffectiveContractFacts(current.projectId, revenue, cost);
                const contributionMargin = revenue - cost;
                const contributionMarginRate = revenue <= 0 ? 0 : contributionMargin / revenue;
                const commissionRate = this.#resolveCommissionRate(ruleVersion, contributionMarginRate);
                const commissionPool = contributionMargin > 0 && commissionRate > 0 ? contributionMargin * commissionRate : 0;

                current.isCurrent = false;
                current.status = 'superseded';
                await em.flush();

                const nextCalculation = em.create(CommissionCalculation, {
                    projectId: current.projectId,
                    ruleVersionId: current.ruleVersionId,
                    version: current.version + 1,
                    isCurrent: true,
                    status: 'calculated',
                    recognizedRevenueTaxExclusive: this.#formatAmount(revenue),
                    recognizedCostTaxExclusive: this.#formatAmount(cost),
                    contributionMargin: this.#formatAmount(contributionMargin),
                    contributionMarginRate: this.#formatRate(contributionMarginRate),
                    commissionPool: this.#formatAmount(commissionPool),
                    recalculatedFromId: current.id,
                    approvedAt: null,
                    approvedBy: null
                });

                const adjustment = em.create(CommissionAdjustment, {
                    projectId: current.projectId,
                    adjustmentType: 'recalculate',
                    relatedPayoutId: null,
                    relatedCalculationId: current.id,
                    amount: this.#formatAmount(Math.abs(commissionPool - this.#toNumber(current.commissionPool))),
                    reason: dto.reason.trim(),
                    status: 'executed',
                    executedAt: new Date(),
                    executedBy: null
                });

                em.persist([nextCalculation, adjustment]);
                await em.flush();

                return this.#toCalculationSummary(nextCalculation, user, requestContext);
            });
        } catch (error) {
            throw this.#mapSingleCurrentConflict(error);
        }
    }

    // ── Mappers ─────────────────────────────────────────────────────────────

    readonly #toRuleVersionSummary = (e: CommissionRuleVersion): CommissionRuleVersionSummary => ({
        id: e.id,
        ruleCode: e.ruleCode,
        version: e.version,
        status: e.status as CommissionRuleVersionSummary['status'],
        tierDefinitionJson: e.tierDefinitionJson,
        effectiveFrom: e.effectiveFrom ? e.effectiveFrom.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
    });

    readonly #toRoleAssignmentSummary = (e: CommissionRoleAssignment): CommissionRoleAssignmentSummary => ({
        id: e.id,
        projectId: e.projectId,
        version: e.version,
        rowVersion: e.rowVersion,
        isCurrent: e.isCurrent,
        status: e.status as CommissionRoleAssignmentSummary['status'],
        participantsJson: e.participantsJson ?? [],
        sourceHandoverId: e.sourceHandoverId ?? null,
        sourceHandoverRebaselineRecordId: e.sourceHandoverRebaselineRecordId ?? null,
        contractSummarySnapshotId: e.contractSummarySnapshotId ?? null,
        handoverSummarySnapshotId: e.handoverSummarySnapshotId ?? null,
        effectiveHandoverBaselineSnapshotId: e.effectiveHandoverBaselineSnapshotId ?? null,
        frozenAt: e.frozenAt ? e.frozenAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
    });

    readonly #toDepartureExceptionDecisionSummary = (e: CommissionDepartureExceptionDecision): CommissionDepartureExceptionDecisionSummary => ({
        id: e.id,
        projectId: e.projectId,
        freezeVersionId: e.freezeVersionId,
        version: e.version,
        rowVersion: e.rowVersion,
        isCurrent: e.isCurrent,
        departureScenarioCode: e.departureScenarioCode,
        decisionCode: e.decisionCode,
        decisionSummary: e.decisionSummary,
        confirmationRequirementSummary: e.confirmationRequirementSummary ?? null,
        summaryPackageKey: e.summaryPackageKey,
        summarySnapshotId: e.summarySnapshotId,
        projectionLevel: e.projectionLevel,
        exportPolicy: e.exportPolicy,
        status: e.status as CommissionDepartureExceptionDecisionSummary['status'],
        handledAt: e.handledAt.toISOString(),
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
    });

    readonly #toCalculationSummary = async (e: CommissionCalculation, user: SensitiveProjectionUser, requestContext: SensitiveFieldProjectionRequestContext): Promise<CommissionCalculationSummary> => {
        const { recognizedRevenueTaxExclusiveProjection, recognizedCostTaxExclusiveProjection, contributionMarginProjection, contributionMarginRateProjection } = await this.#projectCommissionSensitiveFields(
            e.id,
            user,
            requestContext,
            'operating-finance',
            'CommissionCalculation',
            [
                {
                    key: 'recognizedRevenueTaxExclusiveProjection',
                    rawValue: this.#stringifyDecimal(e.recognizedRevenueTaxExclusive)
                },
                {
                    key: 'recognizedCostTaxExclusiveProjection',
                    rawValue: this.#stringifyDecimal(e.recognizedCostTaxExclusive)
                },
                {
                    key: 'contributionMarginProjection',
                    rawValue: this.#stringifyDecimal(e.contributionMargin)
                },
                {
                    key: 'contributionMarginRateProjection',
                    rawValue: this.#stringifyDecimal(e.contributionMarginRate)
                }
            ]
        );
        const { commissionPoolProjection } = await this.#projectCommissionSensitiveFields(e.id, user, requestContext, 'commission-compensation', 'CommissionCalculation', [
            {
                key: 'commissionPoolProjection',
                rawValue: this.#stringifyDecimal(e.commissionPool)
            }
        ]);

        return {
            id: e.id,
            projectId: e.projectId,
            ruleVersionId: e.ruleVersionId,
            version: e.version,
            rowVersion: e.rowVersion,
            isCurrent: e.isCurrent,
            status: e.status as CommissionCalculationSummary['status'],
            recognizedRevenueTaxExclusiveProjection,
            recognizedCostTaxExclusiveProjection,
            contributionMarginProjection,
            contributionMarginRateProjection,
            commissionPoolProjection,
            recalculatedFromId: e.recalculatedFromId ?? null,
            approvedAt: e.approvedAt ? e.approvedAt.toISOString() : null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString()
        };
    };

    readonly #toPayoutSummary = async (e: CommissionPayout, user: SensitiveProjectionUser, requestContext: SensitiveFieldProjectionRequestContext): Promise<CommissionPayoutSummary> => {
        const { theoreticalCapAmountProjection, approvedAmountProjection, paidRecordAmountProjection } = await this.#projectCommissionSensitiveFields(e.id, user, requestContext, 'commission-compensation', 'commission-payout', [
            {
                key: 'theoreticalCapAmountProjection',
                rawValue: this.#stringifyDecimal(e.theoreticalCapAmount)
            },
            {
                key: 'approvedAmountProjection',
                rawValue: e.approvedAmount ? this.#stringifyDecimal(e.approvedAmount) : null
            },
            {
                key: 'paidRecordAmountProjection',
                rawValue: e.paidRecordAmount ? this.#stringifyDecimal(e.paidRecordAmount) : null
            }
        ]);

        return {
            id: e.id,
            projectId: e.projectId,
            calculationId: e.calculationId,
            rowVersion: e.rowVersion,
            stageType: e.stageType as CommissionPayoutSummary['stageType'],
            payoutKind: e.payoutKind as CommissionPayoutSummary['payoutKind'],
            sourcePayoutId: e.sourcePayoutId ?? null,
            selectedTier: e.selectedTier as CommissionPayoutSummary['selectedTier'],
            theoreticalCapAmountProjection,
            approvedAmountProjection,
            paidRecordAmountProjection,
            status: e.status as CommissionPayoutSummary['status'],
            approvedAt: e.approvedAt ? e.approvedAt.toISOString() : null,
            handledAt: e.handledAt ? e.handledAt.toISOString() : null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString()
        };
    };

    readonly #toAdjustmentSummary = async (e: CommissionAdjustment, user: SensitiveProjectionUser, requestContext: SensitiveFieldProjectionRequestContext): Promise<CommissionAdjustmentSummary> => {
        const { amountProjection, reasonProjection } = await this.#projectCommissionSensitiveFields(e.id, user, requestContext, 'commission-compensation', 'commission-adjustment', [
            {
                key: 'amountProjection',
                rawValue: e.amount ? this.#stringifyDecimal(e.amount) : null
            },
            {
                key: 'reasonProjection',
                rawValue: e.reason
            }
        ]);

        return {
            id: e.id,
            projectId: e.projectId,
            rowVersion: e.rowVersion,
            adjustmentType: e.adjustmentType as CommissionAdjustmentType,
            relatedPayoutId: e.relatedPayoutId ?? null,
            relatedCalculationId: e.relatedCalculationId ?? null,
            amountProjection,
            reasonProjection,
            status: e.status as CommissionAdjustmentSummary['status'],
            executedAt: e.executedAt ? e.executedAt.toISOString() : null,
            createdAt: e.createdAt.toISOString(),
            updatedAt: e.updatedAt.toISOString()
        };
    };

    async #getCurrentFinalSettlementContext(projectId: string): Promise<{
        snapshot: CommissionFinalSettlementSnapshot;
        freezeVersion: CommissionRoleAssignment;
    }> {
        const snapshot = await this.repo.findCurrentFinalSettlementSnapshot(projectId);
        return this.#assertAndBuildFinalSettlementContext(projectId, snapshot);
    }

    async #getCurrentFinalSettlementContextById(
        projectId: string,
        snapshotId: string
    ): Promise<{
        snapshot: CommissionFinalSettlementSnapshot;
        freezeVersion: CommissionRoleAssignment;
    }> {
        const snapshot = await this.repo.findFinalSettlementSnapshotById(snapshotId);
        return this.#assertAndBuildFinalSettlementContext(projectId, snapshot);
    }

    async #assertAndBuildFinalSettlementContext(
        projectId: string,
        snapshot: CommissionFinalSettlementSnapshot | null
    ): Promise<{
        snapshot: CommissionFinalSettlementSnapshot;
        freezeVersion: CommissionRoleAssignment;
    }> {
        if (!snapshot || snapshot.projectId !== projectId || !snapshot.isCurrent || snapshot.status !== 'active') {
            throw new NotFoundException(`Current CommissionFinalSettlementSnapshot for project ${projectId} not found`);
        }

        const freezeVersion = await this.repo.findRoleAssignmentById(snapshot.freezeVersionId);
        if (!freezeVersion || freezeVersion.projectId !== projectId || !freezeVersion.isCurrent || freezeVersion.status !== 'frozen') {
            throw new NotFoundException(`Current frozen CommissionRoleAssignment ${snapshot.freezeVersionId} not found for project ${projectId}`);
        }

        return { snapshot, freezeVersion };
    }

    async #getCurrentRuleExplanationSnapshot(projectId: string): Promise<CommissionRuleExplanationSnapshot> {
        const snapshot = await this.repo.findCurrentRuleExplanationSnapshot(projectId);
        if (!snapshot || snapshot.projectId !== projectId || !snapshot.isCurrent || snapshot.status !== 'active') {
            throw new NotFoundException(`Current CommissionRuleExplanationSnapshot for project ${projectId} not found`);
        }
        return snapshot;
    }

    async #loadRetentionDueEvaluationFromFreezeVersion(freezeVersion: Pick<CommissionRoleAssignment, 'effectiveHandoverBaselineSnapshotId'>): Promise<RetentionDueEvaluation> {
        if (!freezeVersion.effectiveHandoverBaselineSnapshotId) {
            return evaluateRetentionDueDate(null);
        }

        const baselineSnapshot = await this.repo.findContractTermSnapshotById(freezeVersion.effectiveHandoverBaselineSnapshotId);
        return evaluateRetentionDueDate(baselineSnapshot?.retentionDueDate ?? null);
    }

    async #loadRetentionDueEvaluationFromFreezeVersionId(freezeVersionId: string): Promise<RetentionDueEvaluation> {
        const freezeVersion = await this.repo.findRoleAssignmentById(freezeVersionId);
        if (!freezeVersion) {
            return evaluateRetentionDueDate(null);
        }
        return this.#loadRetentionDueEvaluationFromFreezeVersion(freezeVersion);
    }

    async #loadLiveRetentionQueryState(
        snapshot: Pick<
            CommissionFinalSettlementSnapshot,
            'projectId' | 'freezeVersionId' | 'gateReviewRecordId' | 'retentionReceiptRecordId' | 'departureExceptionDecisionId' | 'currentActionLevel' | 'finalSettlementStatus' | 'retentionSettlementStatus'
        >,
        freezeVersion: CommissionRoleAssignment
    ): Promise<{
        retentionDue: RetentionDueEvaluation;
        draft: RetentionSettlementDraft | null;
    }> {
        const retentionDue = await this.#loadRetentionDueEvaluationFromFreezeVersion(freezeVersion);
        if (!this.#shouldRecomputeRetentionQueryState(snapshot.finalSettlementStatus)) {
            return { retentionDue, draft: null };
        }

        const [gateReview, openDispute, departureDecision, retentionReceipt] = await Promise.all([
            this.repo.findGateReviewRecordById(snapshot.gateReviewRecordId),
            this.repo.findOpenFreezeDisputeByFreezeVersionId(snapshot.freezeVersionId),
            this.#loadRetentionDepartureDecisionForRead(snapshot.projectId, snapshot.freezeVersionId, snapshot.departureExceptionDecisionId ?? null),
            this.#loadRetentionReceiptForRead(snapshot.projectId, snapshot.retentionReceiptRecordId ?? null)
        ]);
        const gateBindingAction = await this.#loadGateBindingActionForReview(gateReview);

        return {
            retentionDue,
            draft: this.#buildRetentionSettlementDraft(
                gateBindingAction,
                gateReview,
                departureDecision,
                retentionReceipt,
                retentionDue,
                Boolean(openDispute),
                snapshot.finalSettlementStatus === FINAL_SETTLEMENT_STATUS_SETTLED_ALL || snapshot.retentionSettlementStatus === RETENTION_SETTLEMENT_STATUS_SETTLED
            )
        };
    }

    #shouldRecomputeRetentionQueryState(finalSettlementStatus: CommissionFinalSettlementStatus): boolean {
        return finalSettlementStatus === FINAL_SETTLEMENT_STATUS_PENDING_RETENTION || finalSettlementStatus === FINAL_SETTLEMENT_STATUS_SETTLED_ALL;
    }

    async #loadRetentionReceiptForRead(projectId: string, receiptRecordId: string | null): Promise<ReceiptRecord | null> {
        if (!receiptRecordId) {
            return null;
        }

        const receipt = await this.repo.findReceiptById(receiptRecordId);
        if (!receipt || receipt.projectId !== projectId || receipt.status !== 'confirmed') {
            return null;
        }
        return receipt;
    }

    async #loadRetentionDepartureDecisionForRead(projectId: string, freezeVersionId: string, departureExceptionDecisionId: string | null): Promise<CommissionDepartureExceptionDecision | null> {
        if (!departureExceptionDecisionId) {
            return null;
        }

        const decision = await this.repo.findDepartureExceptionDecisionById(departureExceptionDecisionId);
        if (!decision || decision.projectId !== projectId || decision.freezeVersionId !== freezeVersionId || !decision.isCurrent || decision.status !== 'active') {
            return null;
        }
        return decision;
    }

    #assertRetentionDueReady(retentionDue: RetentionDueEvaluation, payoutId: string, actionName: string): void {
        if (retentionDue.retentionDueStatus === 'missing') {
            throw new UnprocessableEntityException(`CommissionPayout ${payoutId} 当前缺少正式质保期届满日期，无法${actionName}`);
        }
        if (retentionDue.retentionDueStatus === 'pending') {
            throw new UnprocessableEntityException(`CommissionPayout ${payoutId} 当前质保期尚未届满（${retentionDue.retentionDueDate}），无法${actionName}`);
        }
    }

    async #buildCommissionSharedEvidencePackage(
        snapshot: CommissionFinalSettlementSnapshot,
        freezeVersion: CommissionRoleAssignment,
        user: SensitiveProjectionUser,
        requestContext: SensitiveFieldProjectionRequestContext
    ): Promise<CommissionSharedEvidencePackage> {
        const { taxImpactSummaryProjection, taxImpactPendingAmountProjection } = await this.#projectCommissionSensitiveFields(snapshot.projectId, user, requestContext, 'operating-finance', 'project', [
            {
                key: 'taxImpactSummaryProjection',
                rawValue: snapshot.taxImpactSummary
            },
            {
                key: 'taxImpactPendingAmountProjection',
                rawValue: this.#stringifyDecimal(snapshot.taxImpactPendingAmount)
            }
        ]);

        return {
            freezeVersionSummary: this.#toRoleAssignmentSummary(freezeVersion),
            baselineSelectionSource: snapshot.baselineSelectionSource as CommissionFinalSettlementView['baselineSelectionSource'],
            taxImpactSummaryProjection,
            taxImpactPendingAmountProjection,
            dataMaturityLevel: snapshot.dataMaturityLevel,
            costActionRecommendation: snapshot.costActionRecommendation as CommissionFinalSettlementView['costActionRecommendation'],
            currentActionLevel: snapshot.currentActionLevel as CommissionFinalSettlementView['currentActionLevel'],
            referencedBaselineVersion: snapshot.referencedBaselineVersion,
            referencedSnapshotVersion: snapshot.referencedSnapshotVersion,
            summaryPackageKey: snapshot.summaryPackageKey,
            summarySnapshotId: snapshot.summarySnapshotId,
            projectionLevel: snapshot.projectionLevel,
            exportPolicy: snapshot.exportPolicy
        };
    }

    #projectCommissionSensitiveField(
        targetId: string,
        rawValue: string | null,
        user: SensitiveProjectionUser,
        requestContext: SensitiveFieldProjectionRequestContext,
        fieldPackageKey: SensitiveFieldPackageKey,
        targetType = 'project'
    ): Promise<SensitiveStringFieldProjection> {
        return this.sensitiveFieldProjectionService.projectStringField({
            fieldPackageKey,
            rawValue,
            user,
            targetType,
            targetId,
            requestContext
        });
    }

    #projectCommissionSensitiveFields<TKey extends string>(
        targetId: string,
        user: SensitiveProjectionUser,
        requestContext: SensitiveFieldProjectionRequestContext,
        fieldPackageKey: SensitiveFieldPackageKey,
        targetType: string,
        fields: readonly { key: TKey; rawValue: string | null }[]
    ): Promise<Record<TKey, SensitiveStringFieldProjection>> {
        return this.sensitiveFieldProjectionService.projectStringFields({
            fieldPackageKey,
            fields,
            user,
            targetType,
            targetId,
            requestContext
        });
    }

    async #assertProjectExists(projectId: string): Promise<void> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`项目 ${projectId} 不存在`);
        }
    }

    #assertRoleAssignmentDraft(entity: CommissionRoleAssignment): void {
        if (!entity.isCurrent) {
            throw new UnprocessableEntityException('只有当前有效的角色分配草稿可以冻结，当前版本已不是 current');
        }
        if (entity.status !== 'draft') {
            throw new UnprocessableEntityException(`只有草稿状态的角色分配可以冻结，当前状态: ${entity.status}`);
        }
        if (!entity.participantsJson || entity.participantsJson.length === 0) {
            throw new UnprocessableEntityException('角色分配必须至少包含一名参与者才能冻结');
        }
    }

    #assertReceiptJudgmentFreezeMatchesHandover(
        freeze: {
            sourceHandoverId: string;
            sourceHandoverSummarySnapshotId: string;
            sourceHandoverRebaselineRecordId?: string | null;
        },
        handover: {
            id: string;
            summarySnapshotId: string;
            handoverRebaselineRecordId?: string | null;
        }
    ): void {
        if (freeze.sourceHandoverId !== handover.id) {
            throw new BadRequestException('Current receipt judgment freeze is not sourced from the requested project handover');
        }
        if (freeze.sourceHandoverSummarySnapshotId !== handover.summarySnapshotId) {
            throw new BadRequestException('Current receipt judgment freeze does not match the requested handover summary snapshot');
        }
        if ((freeze.sourceHandoverRebaselineRecordId ?? null) !== (handover.handoverRebaselineRecordId ?? null)) {
            throw new BadRequestException('Current receipt judgment freeze does not match the requested handover rebaseline reference');
        }
    }

    #buildEffectiveHandoverBaselineSummary(entity: CommissionRoleAssignment): CommissionRoleAssignmentDetailView['effectiveHandoverBaselineSummary'] {
        if (!entity.effectiveHandoverBaselineSnapshotId) {
            return {
                status: 'missing',
                baselineSnapshotId: null,
                sourceType: 'none',
                sourceId: null,
                summary: 'Effective handover baseline snapshot is not frozen yet'
            };
        }

        const sourceId = entity.sourceHandoverRebaselineRecordId ?? entity.sourceHandoverId ?? null;
        const sourceType = entity.sourceHandoverRebaselineRecordId ? 'handover-rebaseline' : entity.sourceHandoverId ? 'project-handover' : 'none';

        return {
            status: 'available',
            baselineSnapshotId: entity.effectiveHandoverBaselineSnapshotId,
            sourceType,
            sourceId,
            summary: sourceType === 'handover-rebaseline' ? `Effective handover baseline is frozen from rebaseline ${entity.sourceHandoverRebaselineRecordId}` : `Effective handover baseline is frozen from project handover ${entity.sourceHandoverId}`
        };
    }

    #buildReceiptJudgmentModeSummary(
        freeze: {
            receiptJudgmentMode: string;
            sourceType: 'project-handover' | 'project-receipt-judgment-freeze';
            sourceId: string;
        } | null
    ): CommissionRoleAssignmentDetailView['receiptJudgmentModeSummary'] {
        if (!freeze) {
            return {
                status: 'not-frozen',
                receiptJudgmentMode: null,
                sourceType: 'none',
                sourceId: null,
                summary: 'Receipt judgment mode is not frozen yet'
            };
        }

        return {
            status: 'frozen',
            receiptJudgmentMode: freeze.receiptJudgmentMode,
            sourceType: freeze.sourceType,
            sourceId: freeze.sourceId,
            summary: `Receipt judgment mode is frozen from ${freeze.sourceType} ${freeze.sourceId}`
        };
    }

    #buildRoleAssignmentAllowedActions(entity: CommissionRoleAssignment, hasOpenDispute = false): string[] {
        if (!entity.isCurrent || entity.status === 'superseded') {
            return [];
        }

        if (entity.status === 'draft' && (entity.participantsJson?.length ?? 0) > 0) {
            return [FREEZE_COMMISSION_ROLE_ASSIGNMENT_ACTION];
        }

        if (entity.status === 'frozen' && !hasOpenDispute) {
            return [SUBMIT_COMMISSION_FREEZE_DISPUTE_ACTION];
        }

        return [];
    }

    #assertCurrentFrozenRoleAssignmentWithSummary(entity: CommissionRoleAssignment, chainLabel: string): void {
        if (!entity.isCurrent || entity.status !== 'frozen') {
            throw new UnprocessableEntityException(`只有当前有效且已冻结的角色分配可以进入${chainLabel}，当前状态: ${entity.status}`);
        }
        if (!entity.handoverSummarySnapshotId) {
            throw new BadRequestException(`当前冻结版本缺少移交确认摘要快照，无法进入${chainLabel}`);
        }
    }

    #assertRoleAssignmentEligibleForDispute(entity: CommissionRoleAssignment): void {
        this.#assertCurrentFrozenRoleAssignmentWithSummary(entity, '争议链');
    }

    #assertRoleAssignmentEligibleForDepartureExceptionDecision(entity: CommissionRoleAssignment): void {
        this.#assertCurrentFrozenRoleAssignmentWithSummary(entity, '离职 / 特例结论链');
    }

    async #findFreezeSummarySnapshot(entity: CommissionRoleAssignment, chainLabel = '争议链') {
        const summarySnapshot = entity.handoverSummarySnapshotId ? await this.repo.findApprovalSummarySnapshotById(entity.handoverSummarySnapshotId) : null;
        if (!summarySnapshot || summarySnapshot.status !== 'active') {
            throw new BadRequestException(`当前冻结版本缺少有效摘要快照，无法进入${chainLabel}`);
        }
        return summarySnapshot;
    }

    async #findMatchedFreezeSummarySnapshot(entity: CommissionRoleAssignment, requestedSummarySnapshotId: string, chainLabel: string) {
        const summarySnapshot = await this.#findFreezeSummarySnapshot(entity, chainLabel);
        if (summarySnapshot.id !== requestedSummarySnapshotId) {
            throw new BadRequestException('请求摘要快照必须与当前冻结版本绑定的移交确认摘要快照一致');
        }
        return summarySnapshot;
    }

    #buildAffectedAssignmentSummary(entity: CommissionRoleAssignment, affectedAssignmentIds: string[]): string {
        const affectedIdSet = new Set(affectedAssignmentIds);
        const affectedParticipants = (entity.participantsJson ?? []).filter((participant) => affectedIdSet.has(participant.userId));

        if (affectedParticipants.length !== affectedIdSet.size) {
            throw new BadRequestException('affectedAssignmentIds 必须全部命中当前冻结版本中的参与角色');
        }

        return affectedParticipants.map((participant) => `${participant.displayName}(${participant.roleType}, weight=${participant.weight})`).join('; ');
    }

    async #buildFreezeImpactSummaries(projectId: string, recalculationImpactMode: string) {
        const [currentCalculation, payouts] = await Promise.all([this.repo.findCurrentCalculation(projectId), this.repo.findPayoutsForProject(projectId)]);

        return this.#buildFreezeImpactSummariesFromState(currentCalculation, payouts, recalculationImpactMode);
    }

    #buildFreezeImpactSummariesFromState(
        currentCalculation: CommissionCalculation | null,
        payouts: CommissionPayout[],
        recalculationImpactMode: string
    ): {
        impactAssessmentSummary: string;
        affectedCalculationSummary: string | null;
        affectedPayoutSummary: string | null;
        riskFlagSummary: string | null;
    } {
        const affectedCalculationSummary = currentCalculation ? `Current calculation ${currentCalculation.id} (${currentCalculation.status}) may require ${recalculationImpactMode}` : null;
        const affectedPayoutSummary = payouts.length > 0 ? `Payout count=${payouts.length}; statuses=${payouts.map((item) => item.status).join(',')}` : null;

        const riskFlags: string[] = [];
        if (currentCalculation?.status === 'effective') {
            riskFlags.push('effective-calculation-present');
        }
        if (payouts.some((item) => ['approved', 'paid', 'suspended'].includes(item.status))) {
            riskFlags.push('downstream-payout-chain-present');
        }
        if (payouts.some((item) => item.status === 'paid')) {
            riskFlags.push('paid-payout-requires-controlled-follow-up');
        }

        const riskFlagSummary = riskFlags.length > 0 ? riskFlags.join(', ') : 'no-downstream-risk-detected';
        const impactAssessmentSummary = [`recalculationImpactMode=${recalculationImpactMode}`, affectedCalculationSummary ?? 'no-current-calculation', affectedPayoutSummary ?? 'no-payout-records', `riskFlags=${riskFlagSummary}`].join('; ');

        return {
            impactAssessmentSummary,
            affectedCalculationSummary,
            affectedPayoutSummary,
            riskFlagSummary
        };
    }

    #assertDisputeRecordPending(disputeRecord: CommissionFreezeDisputeRecord): void {
        if (disputeRecord.status !== 'submitted' || disputeRecord.arbitrationStatus !== 'pending') {
            throw new UnprocessableEntityException(`只有待仲裁争议记录可以执行仲裁，当前状态: ${disputeRecord.status}/${disputeRecord.arbitrationStatus}`);
        }
    }

    async #assertEffectiveContractFacts(projectId: string, revenue: number, cost: number): Promise<void> {
        const activeContracts = await this.repo.findActiveContractsForProject(projectId);
        if (activeContracts.length === 0) {
            throw new UnprocessableEntityException('当前项目不存在已生效合同台账，无法触发提成计算');
        }

        const confirmedReceipts = await this.repo.findConfirmedReceiptsForProject(projectId);
        const confirmedReceiptAmount = confirmedReceipts.reduce((sum, item) => sum + this.#toNumber(item.receiptAmount), 0);
        if (revenue > 0 && confirmedReceiptAmount < revenue) {
            throw new UnprocessableEntityException(`当前项目已确认回款不足以支撑本次提成收入口径，已确认回款 ${this.#formatAmount(confirmedReceiptAmount)}，请求收入 ${this.#formatAmount(revenue)}`);
        }

        const confirmedPayments = await this.repo.findConfirmedPaymentsForProject(projectId);
        const confirmedPaymentAmount = confirmedPayments.reduce((sum, item) => sum + this.#toNumber(item.amountExcludingTax), 0);
        if (cost > 0 && confirmedPaymentAmount < cost) {
            throw new UnprocessableEntityException(`当前项目已确认成本不足以支撑本次提成成本口径，已确认成本 ${this.#formatAmount(confirmedPaymentAmount)}，请求成本 ${this.#formatAmount(cost)}`);
        }
    }

    #assertAdjustmentLinks(projectId: string, adjustmentType: CreateCommissionAdjustmentRequest['adjustmentType'], payout: CommissionPayout | null, calculation: CommissionCalculation | null): void {
        if (adjustmentType === 'recalculate') {
            throw new UnprocessableEntityException('重算请使用专用重算命令，不应通过普通调整草稿创建');
        }

        if (!payout && !calculation) {
            throw new UnprocessableEntityException('提成调整必须至少关联一条提成发放记录或提成计算结果');
        }

        if (payout && payout.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 关联的提成发放记录不存在`);
        }
        if (payout && payout.payoutKind !== 'primary') {
            throw new UnprocessableEntityException('提成调整只能关联 primary 发放记录，不能直接作用于补偿性发放记录');
        }

        if (calculation && calculation.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 关联的提成计算结果不存在`);
        }

        if ((adjustmentType === 'suspend-payout' || adjustmentType === 'reverse-payout' || adjustmentType === 'clawback' || adjustmentType === 'supplement') && !payout) {
            throw new UnprocessableEntityException('当前调整类型必须关联提成发放记录');
        }

        if (adjustmentType === 'suspend-payout') {
            this.#assertPayoutStatus(payout, ['approved', 'paid'], '暂停');
        }

        if (adjustmentType === 'reverse-payout') {
            this.#assertPayoutStatus(payout, ['paid', 'suspended'], '冲销');
        }
    }

    #mapSingleCurrentConflict(error: unknown): ConflictException {
        if (this.#matchesUniqueConstraint(error, COMMISSION_ROLE_ASSIGNMENT_PROJECT_CURRENT_UNIQUE)) {
            return new ConflictException('当前项目的提成角色分配 current 版本已发生变化，请刷新后重试');
        }
        if (this.#matchesUniqueConstraint(error, COMMISSION_CALCULATION_PROJECT_CURRENT_UNIQUE)) {
            return new ConflictException('当前项目的提成计算 current 版本已发生变化，请刷新后重试');
        }
        if (this.#matchesUniqueConstraint(error, COMMISSION_DEPARTURE_EXCEPTION_DECISION_PROJECT_CURRENT_UNIQUE) || this.#matchesUniqueConstraint(error, COMMISSION_DEPARTURE_EXCEPTION_DECISION_PROJECT_VERSION_UNIQUE)) {
            return new ConflictException('当前项目的离职 / 特例结论 current 版本已发生变化，请刷新后重试');
        }
        throw error;
    }

    #matchesUniqueConstraint(error: unknown, constraintName: string): boolean {
        for (const candidate of this.#unwrapDbErrors(error)) {
            const code = typeof candidate['code'] === 'string' ? candidate['code'] : undefined;
            const constraint = typeof candidate['constraint'] === 'string' ? candidate['constraint'] : undefined;
            const message = typeof candidate['message'] === 'string' ? candidate['message'] : '';
            if (code === '23505' && (constraint === constraintName || message.includes(constraintName))) {
                return true;
            }
        }
        return false;
    }

    #unwrapDbErrors(error: unknown): Array<Record<string, unknown>> {
        const candidates: Array<Record<string, unknown>> = [];
        const seen = new Set<unknown>();
        let current = error;

        while (current && typeof current === 'object' && !seen.has(current)) {
            seen.add(current);
            candidates.push(current as Record<string, unknown>);
            current = (current as { driverException?: unknown; cause?: unknown }).driverException ?? (current as { cause?: unknown }).cause ?? null;
        }

        return candidates;
    }

    #resolveCommissionRate(ruleVersion: CommissionRuleVersion, contributionMarginRate: number): number {
        const tiers = [...(ruleVersion.tierDefinitionJson?.tiers ?? [])].sort((a, b) => a.minMarginRate - b.minMarginRate);
        const matched = tiers.find((tier) => contributionMarginRate >= tier.minMarginRate && (tier.maxMarginRate === null || contributionMarginRate < tier.maxMarginRate));
        return matched?.commissionRate ?? 0;
    }

    #assertExpectedVersion(actualVersion: number, expectedVersion: number | undefined, resourceType: string): void {
        if (expectedVersion !== undefined && actualVersion !== expectedVersion) {
            throw new ConflictException(`${resourceType} version ${expectedVersion} does not match current version ${actualVersion}`);
        }
    }

    #assertRequestStageMatchesPayout(actualStage: string, requestedStage: string | null | undefined): void {
        if (!requestedStage) {
            throw new BadRequestException('CommissionPayout stage must be provided');
        }

        if (requestedStage !== actualStage) {
            throw new BadRequestException(`CommissionPayout stage ${requestedStage} does not match current stage ${actualStage}`);
        }
    }

    async #loadCurrentFinalGateContext(
        em: EntityManager,
        projectId: string
    ): Promise<{
        freezeVersion: CommissionRoleAssignment;
        binding: OperatingSignalToCommissionGateBinding;
        gateReview: CommissionGateReviewRecord;
    }> {
        const freezeVersion = (await em.findOne(CommissionRoleAssignment, {
            projectId,
            isCurrent: true,
            status: 'frozen'
        })) as CommissionRoleAssignment | null;
        if (!freezeVersion) {
            throw new BadRequestException(`Current frozen CommissionRoleAssignment is required before processing final payout approval for project ${projectId}`);
        }

        const binding = (await em.findOne(OperatingSignalToCommissionGateBinding, {
            projectId,
            gateStageType: 'final',
            status: 'active'
        })) as OperatingSignalToCommissionGateBinding | null;
        if (!binding) {
            throw new BadRequestException(`Active final commission gate binding is required before processing final payout approval for project ${projectId}`);
        }

        const gateReview = (await em.findOne(
            CommissionGateReviewRecord,
            {
                bindingId: binding.id,
                status: 'active'
            },
            {
                orderBy: {
                    handledAt: QueryOrder.DESC,
                    createdAt: QueryOrder.DESC
                }
            }
        )) as CommissionGateReviewRecord | null;
        if (!gateReview) {
            throw new BadRequestException(`Active final commission gate review is required before processing final payout approval for project ${projectId}`);
        }

        return { freezeVersion, binding, gateReview };
    }

    #buildFinalSettlementEvidenceFromGateContext(
        projectId: string,
        freezeVersion: Pick<CommissionRoleAssignment, 'id'>,
        binding: Pick<
            OperatingSignalToCommissionGateBinding,
            'baselineSelectionSource' | 'taxImpactSummary' | 'taxImpactPendingAmount' | 'dataMaturityLevel' | 'costActionRecommendation' | 'currentActionLevel' | 'referencedBaselineVersion' | 'referencedSnapshotVersion'
        >,
        gateReview: Pick<CommissionGateReviewRecord, 'id' | 'summaryPackageKey' | 'summarySnapshotId' | 'projectionLevel' | 'exportPolicy'>
    ) {
        return {
            projectId,
            freezeVersionId: freezeVersion.id,
            gateReviewRecordId: gateReview.id,
            baselineSelectionSource: binding.baselineSelectionSource,
            taxImpactSummary: binding.taxImpactSummary,
            taxImpactPendingAmount: binding.taxImpactPendingAmount,
            dataMaturityLevel: binding.dataMaturityLevel,
            costActionRecommendation: binding.costActionRecommendation,
            currentActionLevel: binding.currentActionLevel,
            referencedBaselineVersion: binding.referencedBaselineVersion,
            referencedSnapshotVersion: binding.referencedSnapshotVersion,
            summaryPackageKey: gateReview.summaryPackageKey,
            summarySnapshotId: gateReview.summarySnapshotId,
            projectionLevel: gateReview.projectionLevel,
            exportPolicy: gateReview.exportPolicy
        };
    }

    #buildFinalSettlementEvidenceFromSnapshot(snapshot: CommissionFinalSettlementSnapshot) {
        return {
            projectId: snapshot.projectId,
            freezeVersionId: snapshot.freezeVersionId,
            gateReviewRecordId: snapshot.gateReviewRecordId,
            baselineSelectionSource: snapshot.baselineSelectionSource,
            taxImpactSummary: snapshot.taxImpactSummary,
            taxImpactPendingAmount: snapshot.taxImpactPendingAmount,
            dataMaturityLevel: snapshot.dataMaturityLevel,
            costActionRecommendation: snapshot.costActionRecommendation,
            currentActionLevel: snapshot.currentActionLevel,
            referencedBaselineVersion: snapshot.referencedBaselineVersion,
            referencedSnapshotVersion: snapshot.referencedSnapshotVersion,
            summaryPackageKey: snapshot.summaryPackageKey,
            summarySnapshotId: snapshot.summarySnapshotId,
            projectionLevel: snapshot.projectionLevel,
            exportPolicy: snapshot.exportPolicy
        };
    }

    async #writeCurrentFinalSettlementSnapshot(
        em: EntityManager,
        evidenceBase: {
            projectId: string;
            freezeVersionId: string;
            gateReviewRecordId: string;
            baselineSelectionSource: BaselineSelectionSource;
            taxImpactSummary: string;
            taxImpactPendingAmount: string | number;
            dataMaturityLevel: CommissionSharedEvidencePackage['dataMaturityLevel'];
            costActionRecommendation: OperatingSnapshotActionLevel;
            currentActionLevel: OperatingSnapshotActionLevel;
            referencedBaselineVersion: string;
            referencedSnapshotVersion: string;
            summaryPackageKey: string;
            summarySnapshotId: string;
            projectionLevel: string;
            exportPolicy: string;
        },
        currentSnapshot: CommissionFinalSettlementSnapshot | null,
        statusPatch: Pick<RetentionSettlementDraft, 'finalSettlementStatus' | 'nonRetentionSettlementStatus' | 'retentionSettlementStatus'> & {
            retentionRequirementSummary: string | null;
            retentionReceiptSummary: string | null;
            departureExceptionSummary: string | null;
            retentionReceiptRecordId: string | null;
            departureExceptionDecisionId: string | null;
        },
        actorUserId: string | null
    ): Promise<CommissionFinalSettlementSnapshot> {
        if (currentSnapshot) {
            currentSnapshot.isCurrent = false;
            currentSnapshot.status = 'superseded';
            currentSnapshot.updatedBy = actorUserId;
            em.persist(currentSnapshot);
            await em.flush();
        }

        const nextSnapshot = em.create(CommissionFinalSettlementSnapshot, {
            id: randomUUID(),
            projectId: evidenceBase.projectId,
            freezeVersionId: evidenceBase.freezeVersionId,
            gateReviewRecordId: evidenceBase.gateReviewRecordId,
            retentionReceiptRecordId: statusPatch.retentionReceiptRecordId,
            departureExceptionDecisionId: statusPatch.departureExceptionDecisionId,
            version: currentSnapshot ? currentSnapshot.version + 1 : 1,
            isCurrent: true,
            finalSettlementStatus: statusPatch.finalSettlementStatus,
            nonRetentionSettlementStatus: statusPatch.nonRetentionSettlementStatus,
            retentionSettlementStatus: statusPatch.retentionSettlementStatus,
            retentionRequirementSummary: statusPatch.retentionRequirementSummary,
            retentionReceiptSummary: statusPatch.retentionReceiptSummary,
            departureExceptionSummary: statusPatch.departureExceptionSummary,
            baselineSelectionSource: evidenceBase.baselineSelectionSource,
            taxImpactSummary: evidenceBase.taxImpactSummary,
            taxImpactPendingAmount: this.#stringifyDecimal(evidenceBase.taxImpactPendingAmount),
            dataMaturityLevel: evidenceBase.dataMaturityLevel,
            costActionRecommendation: evidenceBase.costActionRecommendation,
            currentActionLevel: evidenceBase.currentActionLevel,
            referencedBaselineVersion: evidenceBase.referencedBaselineVersion,
            referencedSnapshotVersion: evidenceBase.referencedSnapshotVersion,
            summaryPackageKey: evidenceBase.summaryPackageKey,
            summarySnapshotId: evidenceBase.summarySnapshotId,
            projectionLevel: evidenceBase.projectionLevel,
            exportPolicy: evidenceBase.exportPolicy,
            generatedAt: new Date(),
            status: 'active',
            supersedesId: currentSnapshot?.id ?? null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        }) as CommissionFinalSettlementSnapshot;

        em.persist(nextSnapshot);
        return nextSnapshot;
    }

    async #writeCurrentRuleExplanationSnapshot(em: EntityManager, projectId: string, finalSettlementSnapshotId: string, explanation: RuleExplanationDraft, actorUserId: string | null): Promise<CommissionRuleExplanationSnapshot> {
        const currentRuleExplanation = (await em.findOne(CommissionRuleExplanationSnapshot, {
            projectId,
            isCurrent: true
        })) as CommissionRuleExplanationSnapshot | null;

        if (currentRuleExplanation) {
            currentRuleExplanation.isCurrent = false;
            currentRuleExplanation.status = 'superseded';
            currentRuleExplanation.updatedBy = actorUserId;
            em.persist(currentRuleExplanation);
            await em.flush();
        }

        const nextRuleExplanation = em.create(CommissionRuleExplanationSnapshot, {
            id: randomUUID(),
            projectId,
            finalSettlementSnapshotId,
            version: currentRuleExplanation ? currentRuleExplanation.version + 1 : 1,
            isCurrent: true,
            currentStageStatus: explanation.currentStageStatus,
            gateDecisionCode: explanation.gateDecisionCode,
            blockingReasonCategory: explanation.blockingReasonCategory,
            blockingReasonCode: explanation.blockingReasonCode,
            blockingReasonSummary: explanation.blockingReasonSummary,
            gateDecisionSummary: explanation.gateDecisionSummary,
            nextActionSummary: explanation.nextActionSummary,
            generatedAt: new Date(),
            status: 'active',
            supersedesId: currentRuleExplanation?.id ?? null,
            createdBy: actorUserId,
            updatedBy: actorUserId
        }) as CommissionRuleExplanationSnapshot;

        em.persist(nextRuleExplanation);
        return nextRuleExplanation;
    }

    async #findGateReviewById(em: EntityManager, gateReviewRecordId: string): Promise<CommissionGateReviewRecord | null> {
        return (await em.findOne(CommissionGateReviewRecord, { id: gateReviewRecordId })) as CommissionGateReviewRecord | null;
    }

    async #findGateBindingActionByReview(em: EntityManager, gateReview: Pick<CommissionGateReviewRecord, 'bindingId'> | null): Promise<string | null> {
        if (!gateReview) {
            return null;
        }

        const binding = (await em.findOne(OperatingSignalToCommissionGateBinding, {
            id: gateReview.bindingId
        })) as OperatingSignalToCommissionGateBinding | null;
        return binding?.bindingAction ?? null;
    }

    async #loadGateBindingActionForReview(gateReview: Pick<CommissionGateReviewRecord, 'bindingId'> | null): Promise<string | null> {
        if (!gateReview) {
            return null;
        }

        const binding = await this.repo.findGateBindingById(gateReview.bindingId);
        return binding?.bindingAction ?? null;
    }

    async #findLatestConfirmedRetentionReceipt(em: EntityManager, projectId: string): Promise<ReceiptRecord | null> {
        const receipts =
            ((await em.find(ReceiptRecord, {
                projectId,
                status: 'confirmed'
            })) as ReceiptRecord[] | null) ?? [];
        if (receipts.length === 0) {
            return null;
        }

        return [...receipts].sort((left, right) => {
            const leftTime = (left.confirmedAt ?? left.receiptDate ?? left.createdAt).getTime();
            const rightTime = (right.confirmedAt ?? right.receiptDate ?? right.createdAt).getTime();
            return rightTime - leftTime;
        })[0];
    }

    async #findConfirmedReceiptById(em: EntityManager, receiptRecordId: string, projectId: string): Promise<ReceiptRecord> {
        const receipt = (await em.findOne(ReceiptRecord, { id: receiptRecordId })) as ReceiptRecord | null;
        if (!receipt || receipt.projectId !== projectId || receipt.status !== 'confirmed') {
            throw new UnprocessableEntityException(`当前质保金到账记录 ${receiptRecordId} 无效`);
        }
        return receipt;
    }

    async #findCurrentActiveDepartureDecision(em: EntityManager, projectId: string, freezeVersionId: string): Promise<CommissionDepartureExceptionDecision | null> {
        const decision = (await em.findOne(CommissionDepartureExceptionDecision, {
            projectId,
            isCurrent: true
        })) as CommissionDepartureExceptionDecision | null;
        if (!decision || decision.status !== 'active' || decision.freezeVersionId !== freezeVersionId) {
            return null;
        }
        return decision;
    }

    async #findActiveDepartureDecisionById(em: EntityManager, departureExceptionDecisionId: string, projectId: string, freezeVersionId: string): Promise<CommissionDepartureExceptionDecision> {
        const decision = (await em.findOne(CommissionDepartureExceptionDecision, {
            id: departureExceptionDecisionId
        })) as CommissionDepartureExceptionDecision | null;
        if (!decision || decision.projectId !== projectId || decision.freezeVersionId !== freezeVersionId || !decision.isCurrent || decision.status !== 'active') {
            throw new UnprocessableEntityException(`当前离职 / 特例结论 ${departureExceptionDecisionId} 无效`);
        }
        return decision;
    }

    #buildRetentionSettlementDraft(
        bindingAction: string | null | undefined,
        gateReview: Pick<CommissionGateReviewRecord, 'gateReviewDecision' | 'blockingReasonCode' | 'nextActionSummary'> | null,
        departureDecision: Pick<CommissionDepartureExceptionDecision, 'decisionSummary' | 'confirmationRequirementSummary'> | null,
        retentionReceipt: Pick<ReceiptRecord, 'receiptAmount' | 'receiptDate'> | null,
        retentionDue: RetentionDueEvaluation,
        openFreezeDispute: boolean,
        markAsSettled = false
    ): RetentionSettlementDraft {
        return buildRetentionSettlementDraft({
            openFreezeDispute,
            retentionDue,
            departureDecision: departureDecision
                ? {
                      decisionSummary: departureDecision.decisionSummary,
                      confirmationRequirementSummary: departureDecision.confirmationRequirementSummary ?? null
                  }
                : null,
            retentionReceipt: retentionReceipt
                ? {
                      receiptAmount: retentionReceipt.receiptAmount,
                      receiptDate: retentionReceipt.receiptDate
                  }
                : null,
            gateBindingAction: bindingAction ?? null,
            gateReviewDecision: gateReview?.gateReviewDecision ?? null,
            gateReviewBlockingReasonCode: gateReview?.blockingReasonCode ?? null,
            gateNextActionSummary: gateReview?.nextActionSummary ?? null,
            markAsSettled
        });
    }

    #toFinalSettlementStatusPatch(draft: RetentionSettlementDraft) {
        return {
            finalSettlementStatus: draft.finalSettlementStatus,
            nonRetentionSettlementStatus: draft.nonRetentionSettlementStatus,
            retentionSettlementStatus: draft.retentionSettlementStatus,
            retentionRequirementSummary: draft.retentionRequirementSummary,
            retentionReceiptSummary: draft.retentionReceiptSummary,
            departureExceptionSummary: draft.departureExceptionSummary
        };
    }

    #calculateRemainingRetentionCap(calculationId: string, commissionPool: string | number, payouts: CommissionPayout[]): number {
        const nonRetentionPaidAmount = payouts.reduce((sum, payout) => {
            if (payout.calculationId !== calculationId || payout.payoutKind !== 'primary' || payout.stageType === 'retention' || payout.status !== 'paid' || !payout.paidRecordAmount) {
                return sum;
            }
            return sum + this.#toNumber(payout.paidRecordAmount);
        }, 0);

        return Math.max(0, this.#toNumber(commissionPool) - nonRetentionPaidAmount);
    }

    #assertRetentionSnapshotEligibleForSubmit(payout: CommissionPayout, currentSnapshot: CommissionFinalSettlementSnapshot | null): asserts currentSnapshot is CommissionFinalSettlementSnapshot {
        if (!currentSnapshot || !currentSnapshot.isCurrent || currentSnapshot.status !== 'active') {
            throw new UnprocessableEntityException(`当前项目缺少有效的最终结算快照，无法提交质保金发放审批`);
        }
        if (currentSnapshot.finalSettlementStatus !== FINAL_SETTLEMENT_STATUS_PENDING_RETENTION || currentSnapshot.nonRetentionSettlementStatus !== NON_RETENTION_SETTLEMENT_STATUS_SETTLED) {
            throw new UnprocessableEntityException(`当前项目尚未完成非质保结算，不能提交质保金发放审批`);
        }
        if (currentSnapshot.retentionSettlementStatus === RETENTION_SETTLEMENT_STATUS_SETTLED) {
            throw new UnprocessableEntityException(`CommissionPayout ${payout.id} 对应的质保金结算已收口`);
        }
    }

    #assertRetentionSnapshotReadyForApproval(payout: CommissionPayout, currentSnapshot: CommissionFinalSettlementSnapshot | null): asserts currentSnapshot is CommissionFinalSettlementSnapshot {
        this.#assertRetentionSnapshotEligibleForSubmit(payout, currentSnapshot);
        if (currentSnapshot.retentionSettlementStatus !== RETENTION_SETTLEMENT_STATUS_READY || !currentSnapshot.retentionReceiptRecordId || !currentSnapshot.departureExceptionDecisionId) {
            throw new UnprocessableEntityException(`当前项目尚未进入可批准的质保金结算状态`);
        }
    }

    #assertRetentionSnapshotReadyForRegistration(payout: CommissionPayout, currentSnapshot: CommissionFinalSettlementSnapshot | null, requestedSummarySnapshotId: string | null): asserts currentSnapshot is CommissionFinalSettlementSnapshot {
        this.#assertRetentionSnapshotReadyForApproval(payout, currentSnapshot);
        if (!requestedSummarySnapshotId) {
            throw new BadRequestException('summarySnapshotId is required for retention payout registration');
        }
        if (requestedSummarySnapshotId !== currentSnapshot.summarySnapshotId) {
            throw new BadRequestException('summarySnapshotId must match the current final-settlement snapshot');
        }
    }

    #parseDecimal(rawValue: string, fieldName: string): number {
        const parsed = Number(rawValue);
        if (!Number.isFinite(parsed)) {
            throw new UnprocessableEntityException(`${fieldName} 必须是合法数值`);
        }
        return parsed;
    }

    #assertPayoutStatus(payout: CommissionPayout | null, allowedStatuses: CommissionPayoutSummary['status'][], actionName: string): asserts payout is CommissionPayout {
        if (!payout) {
            throw new UnprocessableEntityException(`当前调整未关联提成发放记录，无法执行${actionName}`);
        }
        if (!allowedStatuses.includes(payout.status as CommissionPayoutSummary['status'])) {
            throw new UnprocessableEntityException(`提成发放当前状态 ${payout.status} 不允许执行${actionName}`);
        }
    }

    #assertPrimaryPayout(payout: CommissionPayout, actionName: string): void {
        if (payout.payoutKind !== 'primary') {
            throw new UnprocessableEntityException(`补偿性发放记录不允许直接执行${actionName}`);
        }
    }

    #assertPayoutSupportsLifecycleActions(payout: CommissionPayout): void {
        if (payout.payoutKind !== 'primary') {
            throw new UnprocessableEntityException('补偿性发放记录由调整执行链直接生成，不支持单独审批或登记');
        }
    }

    #isBlockingGateDecision(bindingAction: string | null | undefined, gateReviewDecision: string | null | undefined): boolean {
        return [bindingAction, gateReviewDecision].map((value) => value?.trim().toLowerCase()).some((value) => value === 'block' || value?.startsWith('block-'));
    }

    #requireAdjustmentAmount(adjustment: CommissionAdjustment, actionName: '扣回' | '补发'): number {
        if (!adjustment.amount) {
            throw new UnprocessableEntityException(`${actionName}调整必须填写金额`);
        }
        return this.#toNumber(adjustment.amount);
    }

    #requirePaidPayoutAmount(payout: CommissionPayout, actionName: '扣回'): number {
        if (!payout.paidRecordAmount) {
            throw new UnprocessableEntityException(`当前提成发放缺少已登记金额，无法执行${actionName}`);
        }
        return this.#toNumber(payout.paidRecordAmount);
    }

    #formatAmount(value: number): string {
        return value.toFixed(2);
    }

    #formatRate(value: number): string {
        return value.toFixed(4);
    }

    #toNumber(value: string | number): number {
        return typeof value === 'number' ? value : Number(value);
    }

    #stringifyDecimal(value: string | number): string {
        return typeof value === 'string' ? value : String(value);
    }
}
