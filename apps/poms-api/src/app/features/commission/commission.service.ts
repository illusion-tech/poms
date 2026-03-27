import type {
    ApproveCommissionPayoutRequest,
    CommissionAdjustmentSummary,
    CommissionAdjustmentType,
    CommissionCalculationSummary,
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
    RecalculateCommissionRequest,
    RegisterCommissionPayoutRequest,
    SubmitCommissionPayoutApprovalRequest
} from '@poms/shared-contracts';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { CommissionAdjustment } from './commission-adjustment.entity';
import { CommissionCalculation } from './commission-calculation.entity';
import { CommissionPayout } from './commission-payout.entity';
import type { CommissionRoleAssignment } from './commission-role-assignment.entity';
import { CommissionRuleVersion } from './commission-rule-version.entity';
import { CommissionRepository } from './commission.repository';

const PAYOUT_CAP_RATES: Record<CommissionPayoutStage, Record<CommissionPayoutTier, number>> = {
    first: { basic: 0.2, mid: 0.25, premium: 0.3 },
    second: { basic: 0.7, mid: 0.75, premium: 0.8 },
    final: { basic: 1, mid: 1, premium: 1 }
};

const ROLE_FREEZE_ALLOWED_STAGES = new Set(['handover', 'execution', 'acceptance', 'completed']);

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

    async createRoleAssignment(projectId: string, dto: CreateCommissionRoleAssignmentRequest): Promise<CommissionRoleAssignmentSummary> {
        // Mark existing current assignment as no longer current
        const existing = await this.repo.findCurrentRoleAssignment(projectId);
        const nextVersion = existing ? existing.version + 1 : 1;

        const entity = this.repo.createRoleAssignment({
            projectId,
            version: nextVersion,
            isCurrent: true,
            status: 'draft',
            participantsJson: dto.participants
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

    async freezeRoleAssignment(projectId: string, id: string): Promise<CommissionRoleAssignmentSummary> {
        const entity = await this.repo.findRoleAssignmentById(id);
        if (!entity || entity.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 的角色分配 ${id} 不存在`);
        }
        if (entity.status !== 'draft') {
            throw new UnprocessableEntityException(`只有草稿状态的角色分配可以冻结，当前状态: ${entity.status}`);
        }
        if (!entity.participantsJson || entity.participantsJson.length === 0) {
            throw new UnprocessableEntityException('角色分配必须至少包含一名参与者才能冻结');
        }

        await this.#assertProjectReadyForRoleFreeze(projectId);

        entity.status = 'frozen';
        entity.frozenAt = new Date();
        await this.repo.flushRoleAssignment();
        return this.#toRoleAssignmentSummary(entity);
    }

    // ── Calculations ────────────────────────────────────────────────────────

    async listCalculations(projectId: string): Promise<CommissionCalculationSummary[]> {
        const entities = await this.repo.findCalculationsForProject(projectId);
        return entities.map(this.#toCalculationSummary);
    }

    async triggerCalculation(projectId: string, dto: CreateCommissionCalculationRequest): Promise<CommissionCalculationSummary> {
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

    async confirmCalculation(projectId: string, id: string, dto: ConfirmCommissionCalculationRequest): Promise<CommissionCalculationSummary> {
        const entity = await this.repo.findCalculationById(id);
        if (!entity || entity.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 的提成计算 ${id} 不存在`);
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

    async submitPayoutApproval(projectId: string, id: string, dto: SubmitCommissionPayoutApprovalRequest): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity || entity.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 的提成发放 ${id} 不存在`);
        }
        this.#assertExpectedVersion(entity.rowVersion, dto.expectedVersion, 'CommissionPayout');

        if (entity.status !== 'draft') {
            throw new UnprocessableEntityException(`只有草稿状态的提成发放可以提交审批，当前状态: ${entity.status}`);
        }

        entity.status = 'pending-approval';
        await this.repo.flushPayout();
        return this.#toPayoutSummary(entity);
    }

    async approvePayout(projectId: string, id: string, dto: ApproveCommissionPayoutRequest): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity || entity.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 的提成发放 ${id} 不存在`);
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

    async registerPayout(projectId: string, id: string, dto: RegisterCommissionPayoutRequest): Promise<CommissionPayoutSummary> {
        const entity = await this.repo.findPayoutById(id);
        if (!entity || entity.projectId !== projectId) {
            throw new NotFoundException(`项目 ${projectId} 的提成发放 ${id} 不存在`);
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

    async executeAdjustment(projectId: string, id: string, dto: ExecuteCommissionAdjustmentRequest): Promise<CommissionAdjustmentSummary> {
        return this.repo.transactional(async (em) => {
            const adjustment = await em.findOne(CommissionAdjustment, { id });
            if (!adjustment || adjustment.projectId !== projectId) {
                throw new NotFoundException(`项目 ${projectId} 的提成调整 ${id} 不存在`);
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

    async recalculateCalculation(projectId: string, id: string, dto: RecalculateCommissionRequest): Promise<CommissionCalculationSummary> {
        return this.repo.transactional(async (em) => {
            const current = await em.findOne(CommissionCalculation, { id });
            if (!current || current.projectId !== projectId) {
                throw new NotFoundException(`项目 ${projectId} 的提成计算 ${id} 不存在`);
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
                projectId,
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
                projectId,
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
        isCurrent: e.isCurrent,
        status: e.status as CommissionRoleAssignmentSummary['status'],
        participantsJson: e.participantsJson ?? [],
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

    async #assertProjectReadyForRoleFreeze(projectId: string): Promise<void> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`项目 ${projectId} 不存在`);
        }

        if (!ROLE_FREEZE_ALLOWED_STAGES.has(project.currentStage)) {
            throw new UnprocessableEntityException(`项目当前阶段 ${project.currentStage} 尚未完成移交，不能冻结提成角色分配`);
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
            (sum, item) => sum + this.#toNumber(item.paymentAmount),
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
