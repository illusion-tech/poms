import { randomUUID } from 'node:crypto';
import type {
    ArbitrateCommissionFreezeDisputeRequest,
    ArbitrateCommissionFreezeDisputeResult,
    ApproveCommissionPayoutRequest,
    CommissionFreezeChangeRequestDetailView,
    CommissionFreezeDisputeDetailView,
    CommissionAdjustmentSummary,
    CommissionAdjustmentType,
    CommissionCalculationSummary,
    CommissionRoleAssignmentDetailView,
    CommissionPayoutStage,
    CommissionPayoutSummary,
    CommissionPayoutTier,
    CommissionRoleAssignmentSummary,
    CommissionRuleVersionSummary,
    ConfirmCommissionCalculationRequest,
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
    SubmitCommissionFreezeDisputeRequest,
    SubmitCommissionFreezeDisputeResult,
    SubmitCommissionPayoutApprovalRequest
} from '@poms/shared-contracts';
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommissionAdjustment } from './commission-adjustment.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionFreezeChangeRequest } from './commission-freeze-change-request.entity';
import { CommissionFreezeDisputeRecord } from './commission-freeze-dispute-record.entity';
import { CommissionPayout } from './commission-payout.entity';
import { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';
import { CommissionRepository } from './commission.repository';

const PAYOUT_CAP_RATES: Record<CommissionPayoutStage, Record<CommissionPayoutTier, number>> = {
    first: { basic: 0.2, mid: 0.25, premium: 0.3 },
    second: { basic: 0.7, mid: 0.75, premium: 0.8 },
    final: { basic: 1, mid: 1, premium: 1 }
};

const FREEZE_COMMISSION_ROLE_ASSIGNMENT_ACTION = 'freeze-commission-role-assignment';
const SUBMIT_COMMISSION_FREEZE_DISPUTE_ACTION = 'submit-commission-freeze-dispute';
const ARBITRATE_COMMISSION_FREEZE_DISPUTE_ACTION = 'arbitrate-commission-freeze-dispute';

@Injectable()
export class CommissionService {
    constructor(private readonly repo: CommissionRepository) {}

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

    async getRoleAssignmentDetail(id: string): Promise<CommissionRoleAssignmentDetailView> {
        const entity = await this.repo.findRoleAssignmentById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionRoleAssignment ${id} not found`);
        }

        const [handoverSummarySnapshot, receiptJudgmentFreeze, openDispute] = await Promise.all([
            entity.handoverSummarySnapshotId
                ? this.repo.findApprovalSummarySnapshotById(entity.handoverSummarySnapshotId)
                : Promise.resolve(null),
            this.repo.findCurrentReceiptJudgmentFreeze(entity.projectId),
            entity.status === 'frozen' && entity.isCurrent
                ? this.repo.findOpenFreezeDisputeByFreezeVersionId(entity.id)
                : Promise.resolve(null)
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
        // Mark existing current assignment as no longer current
        const existing = await this.repo.findCurrentRoleAssignment(projectId);
        const nextVersion = existing ? existing.version + 1 : 1;

        const entity = this.repo.createRoleAssignment({
            projectId,
            version: nextVersion,
            isCurrent: true,
            status: 'draft',
            participantsJson: dto.participants,
            sourceHandoverId: null,
            sourceHandoverRebaselineRecordId: null,
            contractSummarySnapshotId: null,
            handoverSummarySnapshotId: null,
            effectiveHandoverBaselineSnapshotId: null
        });

        if (existing) {
            existing.isCurrent = false;
            // Supersede only if the previous was frozen
            if (existing.status === 'frozen') {
                entity.supersedesId = existing.id;
                existing.status = 'superseded';
            }
        }

        await this.repo.persistAndFlushRoleAssignment(entity);
        return this.#toRoleAssignmentSummary(entity);
    }

    async freezeCommissionRoleAssignment(
        id: string,
        actorUserId: string,
        dto: FreezeCommissionRoleAssignmentRequest
    ): Promise<FreezeCommissionRoleAssignmentResult> {
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

    async submitCommissionFreezeDispute(
        actorUserId: string,
        dto: SubmitCommissionFreezeDisputeRequest
    ): Promise<SubmitCommissionFreezeDisputeResult> {
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
        const affectedAssignmentSummary = this.#buildAffectedAssignmentSummary(
            freezeVersion,
            dto.affectedAssignmentIds
        );
        const impactSummaries = await this.#buildFreezeImpactSummaries(
            freezeVersion.projectId,
            dto.recalculationImpactMode
        );

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
            allowedActions:
                disputeRecord.status === 'submitted' && disputeRecord.arbitrationStatus === 'pending'
                    ? [ARBITRATE_COMMISSION_FREEZE_DISPUTE_ACTION]
                    : [],
            generatedAt: new Date().toISOString()
        };
    }

    async arbitrateCommissionFreezeDispute(
        id: string,
        actorUserId: string,
        dto: ArbitrateCommissionFreezeDisputeRequest
    ): Promise<ArbitrateCommissionFreezeDisputeResult> {
        return this.repo.transactional(async (em) => {
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
            const impactSummaries = this.#buildFreezeImpactSummariesFromState(
                currentCalculation,
                payouts,
                dto.recalculationImpactMode
            );

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

                freezeVersion.isCurrent = false;
                freezeVersion.status = 'superseded';
                freezeVersion.updatedBy = actorUserId;
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

            em.persist([disputeRecord, changeRequest, freezeVersion, ...(replacementFreezeVersion ? [replacementFreezeVersion] : [])]);
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

    // ── Calculations ────────────────────────────────────────────────────────

    async listCalculations(projectId: string): Promise<CommissionCalculationSummary[]> {
        const entities = await this.repo.findCalculationsForProject(projectId);
        return entities.map(this.#toCalculationSummary);
    }

    async createCalculation(projectId: string, dto: CreateCommissionCalculationRequest): Promise<CommissionCalculationSummary> {
        await this.#assertProjectExists(projectId);
        const revenue = this.#parseDecimal(dto.recognizedRevenueTaxExclusive, 'recognizedRevenueTaxExclusive');
        const cost = this.#parseDecimal(dto.recognizedCostTaxExclusive, 'recognizedCostTaxExclusive');
        await this.#assertEffectiveContractFacts(projectId, revenue, cost);

        const activeRule = await this.#findLatestActiveRuleVersion();
        if (!activeRule) {
            throw new UnprocessableEntityException('当前不存在已激活的提成规则版本，无法触发提成计算');
        }

        const assignment = await this.repo.findCurrentRoleAssignment(projectId);
        if (!assignment || assignment.status !== 'frozen') {
            throw new UnprocessableEntityException('当前项目不存在已冻结的提成角色分配，无法触发提成计算');
        }

        const contributionMargin = revenue - cost;
        const contributionMarginRate = revenue <= 0 ? 0 : contributionMargin / revenue;
        const commissionRate = this.#resolveCommissionRate(activeRule, contributionMarginRate);
        const commissionPool = contributionMargin > 0 && commissionRate > 0 ? contributionMargin * commissionRate : 0;

        const current = await this.repo.findCurrentCalculation(projectId);
        const nextVersion = current ? current.version + 1 : 1;

        const entity = this.repo.createCalculation({
            projectId,
            ruleVersionId: activeRule.id,
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

        if (current) {
            current.isCurrent = false;
            current.status = 'superseded';
        }

        await this.repo.persistAndFlushCalculation(entity);
        return this.#toCalculationSummary(entity);
    }

    async approveCalculation(id: string, dto: ConfirmCommissionCalculationRequest): Promise<CommissionCalculationSummary> {
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
        return this.#toCalculationSummary(entity);
    }

    // ── Payouts ─────────────────────────────────────────────────────────────

    async listPayouts(projectId: string): Promise<CommissionPayoutSummary[]> {
        const entities = await this.repo.findPayoutsForProject(projectId);
        return entities.map(this.#toPayoutSummary);
    }

    async createPayout(projectId: string, dto: CreateCommissionPayoutRequest): Promise<CommissionPayoutSummary> {
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

        const capRate = PAYOUT_CAP_RATES[dto.stageType][dto.selectedTier];
        const theoreticalCapAmount = this.#formatAmount(this.#toNumber(calculation.commissionPool) * capRate);

        const entity = this.repo.createPayout({
            projectId,
            calculationId: dto.calculationId,
            stageType: dto.stageType,
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
        return this.#toPayoutSummary(entity);
    }

    async getPayoutById(id: string): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }

        return this.#toPayoutSummary(entity);
    }

    async submitPayoutApproval(id: string, dto: SubmitCommissionPayoutApprovalRequest): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'CommissionPayout');

        if (entity.status !== 'draft') {
            throw new UnprocessableEntityException(`只有草稿状态的提成发放可以提交审批，当前状态: ${entity.status}`);
        }

        entity.status = 'pending-approval';
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity);
    }

    async approvePayout(id: string, dto: ApproveCommissionPayoutRequest): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'CommissionPayout');

        if (entity.status !== 'pending-approval') {
            throw new UnprocessableEntityException(`只有待审批状态的提成发放可以批准，当前状态: ${entity.status}`);
        }

        const approvedAmount = dto.approvedAmount ? this.#parseDecimal(dto.approvedAmount, 'approvedAmount') : this.#toNumber(entity.theoreticalCapAmount);
        const capAmount = this.#toNumber(entity.theoreticalCapAmount);
        if (approvedAmount < 0 || approvedAmount > capAmount) {
            throw new UnprocessableEntityException(`批准金额必须位于 0 到理论上限 ${entity.theoreticalCapAmount} 之间`);
        }

        entity.status = 'approved';
        entity.approvedAmount = this.#formatAmount(approvedAmount);
        entity.approvedAt = new Date();
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity);
    }

    async registerPayout(id: string, dto: RegisterCommissionPayoutRequest): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionPayout ${id} not found`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'CommissionPayout');

        if (entity.status !== 'approved') {
            throw new UnprocessableEntityException(`只有已批准状态的提成发放可以登记发放，当前状态: ${entity.status}`);
        }

        const paidAmount = this.#parseDecimal(dto.paidRecordAmount, 'paidRecordAmount');
        const approvedAmount = entity.approvedAmount ? this.#toNumber(entity.approvedAmount) : 0;
        if (paidAmount < 0 || paidAmount > approvedAmount) {
            throw new UnprocessableEntityException(`登记发放金额必须位于 0 到批准金额 ${entity.approvedAmount ?? '0.00'} 之间`);
        }

        entity.status = 'paid';
        entity.paidRecordAmount = this.#formatAmount(paidAmount);
        entity.handledAt = new Date();
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity);
    }

    // ── Adjustments ────────────────────────────────────────────────────────

    async listAdjustments(projectId: string): Promise<CommissionAdjustmentSummary[]> {
        const entities = await this.repo.findAdjustmentsForProject(projectId);
        return entities.map(this.#toAdjustmentSummary);
    }

    async createAdjustment(projectId: string, dto: CreateCommissionAdjustmentRequest): Promise<CommissionAdjustmentSummary> {
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
        return this.#toAdjustmentSummary(entity);
    }

    async getAdjustmentById(id: string): Promise<CommissionAdjustmentSummary> {
        const entity = await this.repo.findAdjustmentById(id);
        if (!entity) {
            throw new NotFoundException(`CommissionAdjustment ${id} not found`);
        }

        return this.#toAdjustmentSummary(entity);
    }

    async executeAdjustment(id: string, dto: ExecuteCommissionAdjustmentRequest): Promise<CommissionAdjustmentSummary> {
        return this.repo.transactional(async (em) => {
            const adjustment = await em.findOne(CommissionAdjustment, { id });
            if (!adjustment) {
                throw new NotFoundException(`CommissionAdjustment ${id} not found`);
            }
            this.#assertExpectedVersion(adjustment.rowVersion, dto.expectedVersion, 'CommissionAdjustment');

            if (adjustment.status !== 'approved') {
                throw new UnprocessableEntityException(`只有已批准状态的提成调整可以执行，当前状态: ${adjustment.status}`);
            }

            const payout = adjustment.relatedPayoutId ? await em.findOne(CommissionPayout, { id: adjustment.relatedPayoutId }) : null;
            if (adjustment.adjustmentType !== 'recalculate' && !payout) {
                throw new UnprocessableEntityException('当前调整未关联提成发放记录，无法执行');
            }

            if (adjustment.adjustmentType === 'suspend-payout') {
                this.#assertPayoutStatus(payout, ['approved', 'paid'], '暂停');
                payout.status = 'suspended';
                payout.handledAt = new Date();
            }

            if (adjustment.adjustmentType === 'reverse-payout') {
                this.#assertPayoutStatus(payout, ['paid', 'suspended'], '冲销');
                payout.status = 'reversed';
                payout.handledAt = new Date();
            }

            if (adjustment.adjustmentType === 'clawback' || adjustment.adjustmentType === 'supplement') {
                this.#assertPayoutStatus(payout, ['paid', 'suspended', 'approved'], adjustment.adjustmentType === 'clawback' ? '扣回' : '补发');
            }

            adjustment.status = 'executed';
            adjustment.executedAt = new Date();

            em.persist([adjustment, ...(payout ? [payout] : [])]);
            await em.flush();

            return this.#toAdjustmentSummary(adjustment);
        });
    }

    async recalculateCalculation(id: string, dto: RecalculateCommissionRequest): Promise<CommissionCalculationSummary> {
        return this.repo.transactional(async (em) => {
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

            const revenue = dto.recognizedRevenueTaxExclusive
                ? this.#parseDecimal(dto.recognizedRevenueTaxExclusive, 'recognizedRevenueTaxExclusive')
                : this.#toNumber(current.recognizedRevenueTaxExclusive);
            const cost = dto.recognizedCostTaxExclusive
                ? this.#parseDecimal(dto.recognizedCostTaxExclusive, 'recognizedCostTaxExclusive')
                : this.#toNumber(current.recognizedCostTaxExclusive);
            const contributionMargin = revenue - cost;
            const contributionMarginRate = revenue <= 0 ? 0 : contributionMargin / revenue;
            const commissionRate = this.#resolveCommissionRate(ruleVersion, contributionMarginRate);
            const commissionPool = contributionMargin > 0 && commissionRate > 0 ? contributionMargin * commissionRate : 0;

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

            current.isCurrent = false;
            current.status = 'superseded';

            em.persist([current, nextCalculation, adjustment]);
            await em.flush();

            return this.#toCalculationSummary(nextCalculation);
        });
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

    readonly #toCalculationSummary = (e: CommissionCalculation): CommissionCalculationSummary => ({
        id: e.id,
        projectId: e.projectId,
        ruleVersionId: e.ruleVersionId,
        version: e.version,
        rowVersion: e.rowVersion,
        isCurrent: e.isCurrent,
        status: e.status as CommissionCalculationSummary['status'],
        recognizedRevenueTaxExclusive: this.#stringifyDecimal(e.recognizedRevenueTaxExclusive),
        recognizedCostTaxExclusive: this.#stringifyDecimal(e.recognizedCostTaxExclusive),
        contributionMargin: this.#stringifyDecimal(e.contributionMargin),
        contributionMarginRate: this.#stringifyDecimal(e.contributionMarginRate),
        commissionPool: this.#stringifyDecimal(e.commissionPool),
        recalculatedFromId: e.recalculatedFromId ?? null,
        approvedAt: e.approvedAt ? e.approvedAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
    });

    readonly #toPayoutSummary = (e: CommissionPayout): CommissionPayoutSummary => ({
        id: e.id,
        projectId: e.projectId,
        calculationId: e.calculationId,
        rowVersion: e.rowVersion,
        stageType: e.stageType as CommissionPayoutSummary['stageType'],
        selectedTier: e.selectedTier as CommissionPayoutSummary['selectedTier'],
        theoreticalCapAmount: this.#stringifyDecimal(e.theoreticalCapAmount),
        approvedAmount: e.approvedAmount ? this.#stringifyDecimal(e.approvedAmount) : null,
        paidRecordAmount: e.paidRecordAmount ? this.#stringifyDecimal(e.paidRecordAmount) : null,
        status: e.status as CommissionPayoutSummary['status'],
        approvedAt: e.approvedAt ? e.approvedAt.toISOString() : null,
        handledAt: e.handledAt ? e.handledAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
    });

    readonly #toAdjustmentSummary = (e: CommissionAdjustment): CommissionAdjustmentSummary => ({
        id: e.id,
        projectId: e.projectId,
        rowVersion: e.rowVersion,
        adjustmentType: e.adjustmentType as CommissionAdjustmentType,
        relatedPayoutId: e.relatedPayoutId ?? null,
        relatedCalculationId: e.relatedCalculationId ?? null,
        amount: e.amount ? this.#stringifyDecimal(e.amount) : null,
        reason: e.reason,
        status: e.status as CommissionAdjustmentSummary['status'],
        executedAt: e.executedAt ? e.executedAt.toISOString() : null,
        createdAt: e.createdAt.toISOString(),
        updatedAt: e.updatedAt.toISOString()
    });

    async #assertProjectExists(projectId: string): Promise<void> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`项目 ${projectId} 不存在`);
        }
    }

    #assertRoleAssignmentDraft(entity: CommissionRoleAssignment): void {
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

    #buildEffectiveHandoverBaselineSummary(
        entity: CommissionRoleAssignment
    ): CommissionRoleAssignmentDetailView['effectiveHandoverBaselineSummary'] {
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
        const sourceType =
            entity.sourceHandoverRebaselineRecordId
                ? 'handover-rebaseline'
                : entity.sourceHandoverId
                    ? 'project-handover'
                    : 'none';

        return {
            status: 'available',
            baselineSnapshotId: entity.effectiveHandoverBaselineSnapshotId,
            sourceType,
            sourceId,
            summary:
                sourceType === 'handover-rebaseline'
                    ? `Effective handover baseline is frozen from rebaseline ${entity.sourceHandoverRebaselineRecordId}`
                    : `Effective handover baseline is frozen from project handover ${entity.sourceHandoverId}`
        };
    }

    #buildReceiptJudgmentModeSummary(
        freeze:
            | {
                  receiptJudgmentMode: string;
                  sourceType: 'project-handover' | 'project-receipt-judgment-freeze';
                  sourceId: string;
              }
            | null
    ): CommissionRoleAssignmentDetailView['receiptJudgmentModeSummary'] {
        if (!freeze) {
            return {
                status: 'not_frozen',
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

    #assertRoleAssignmentEligibleForDispute(entity: CommissionRoleAssignment): void {
        if (!entity.isCurrent || entity.status !== 'frozen') {
            throw new UnprocessableEntityException(`只有当前有效且已冻结的角色分配可以发起争议，当前状态: ${entity.status}`);
        }
        if (!entity.handoverSummarySnapshotId) {
            throw new BadRequestException('当前冻结版本缺少移交确认摘要快照，无法进入争议链');
        }
    }

    async #findFreezeSummarySnapshot(entity: CommissionRoleAssignment) {
        const summarySnapshot = entity.handoverSummarySnapshotId
            ? await this.repo.findApprovalSummarySnapshotById(entity.handoverSummarySnapshotId)
            : null;
        if (!summarySnapshot || summarySnapshot.status !== 'active') {
            throw new BadRequestException('当前冻结版本缺少有效摘要快照，无法进入争议链');
        }
        return summarySnapshot;
    }

    #buildAffectedAssignmentSummary(entity: CommissionRoleAssignment, affectedAssignmentIds: string[]): string {
        const affectedIdSet = new Set(affectedAssignmentIds);
        const affectedParticipants = (entity.participantsJson ?? []).filter((participant) =>
            affectedIdSet.has(participant.userId)
        );

        if (affectedParticipants.length !== affectedIdSet.size) {
            throw new BadRequestException('affectedAssignmentIds 必须全部命中当前冻结版本中的参与角色');
        }

        return affectedParticipants
            .map(
                (participant) =>
                    `${participant.displayName}(${participant.roleType}, weight=${participant.weight})`
            )
            .join('; ');
    }

    async #buildFreezeImpactSummaries(projectId: string, recalculationImpactMode: string) {
        const [currentCalculation, payouts] = await Promise.all([
            this.repo.findCurrentCalculation(projectId),
            this.repo.findPayoutsForProject(projectId)
        ]);

        return this.#buildFreezeImpactSummariesFromState(
            currentCalculation,
            payouts,
            recalculationImpactMode
        );
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
        const affectedCalculationSummary = currentCalculation
            ? `Current calculation ${currentCalculation.id} (${currentCalculation.status}) may require ${recalculationImpactMode}`
            : null;
        const affectedPayoutSummary =
            payouts.length > 0
                ? `Payout count=${payouts.length}; statuses=${payouts.map((item) => item.status).join(',')}`
                : null;

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
        const impactAssessmentSummary = [
            `recalculationImpactMode=${recalculationImpactMode}`,
            affectedCalculationSummary ?? 'no-current-calculation',
            affectedPayoutSummary ?? 'no-payout-records',
            `riskFlags=${riskFlagSummary}`
        ].join('; ');

        return {
            impactAssessmentSummary,
            affectedCalculationSummary,
            affectedPayoutSummary,
            riskFlagSummary
        };
    }

    #assertDisputeRecordPending(disputeRecord: CommissionFreezeDisputeRecord): void {
        if (disputeRecord.status !== 'submitted' || disputeRecord.arbitrationStatus !== 'pending') {
            throw new UnprocessableEntityException(
                `只有待仲裁争议记录可以执行仲裁，当前状态: ${disputeRecord.status}/${disputeRecord.arbitrationStatus}`
            );
        }
    }

    async #assertEffectiveContractFacts(projectId: string, revenue: number, cost: number): Promise<void> {
        const activeContracts = await this.repo.findActiveContractsForProject(projectId);
        if (activeContracts.length === 0) {
            throw new UnprocessableEntityException('当前项目不存在已生效合同台账，无法触发提成计算');
        }

        const confirmedReceipts = await this.repo.findConfirmedReceiptsForProject(projectId);
        const confirmedReceiptAmount = confirmedReceipts.reduce(
            (sum, item) => sum + this.#toNumber(item.receiptAmount),
            0
        );
        if (revenue > 0 && confirmedReceiptAmount < revenue) {
            throw new UnprocessableEntityException(
                `当前项目已确认回款不足以支撑本次提成收入口径，已确认回款 ${this.#formatAmount(confirmedReceiptAmount)}，请求收入 ${this.#formatAmount(revenue)}`
            );
        }

        const confirmedPayments = await this.repo.findConfirmedPaymentsForProject(projectId);
        const confirmedPaymentAmount = confirmedPayments.reduce(
            (sum, item) => sum + this.#toNumber(item.amountExcludingTax),
            0
        );
        if (cost > 0 && confirmedPaymentAmount < cost) {
            throw new UnprocessableEntityException(
                `当前项目已确认成本不足以支撑本次提成成本口径，已确认成本 ${this.#formatAmount(confirmedPaymentAmount)}，请求成本 ${this.#formatAmount(cost)}`
            );
        }
    }

    async #findLatestActiveRuleVersion(): Promise<CommissionRuleVersion | null> {
        const versions = await this.repo.findAllRuleVersions();
        return versions.find((version) => version.status === 'active') ?? null;
    }

    #assertAdjustmentLinks(
        projectId: string,
        adjustmentType: CreateCommissionAdjustmentRequest['adjustmentType'],
        payout: CommissionPayout | null,
        calculation: CommissionCalculation | null
    ): void {
        if (adjustmentType === 'recalculate') {
            throw new UnprocessableEntityException('重算请使用专用重算命令，不应通过普通调整草稿创建');
        }

        if (!payout && !calculation) {
            throw new UnprocessableEntityException('提成调整必须至少关联一条提成发放记录或提成计算结果');
        }

        if (payout && payout.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 关联的提成发放记录不存在`);
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
