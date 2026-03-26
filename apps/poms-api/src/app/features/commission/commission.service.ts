import type {
    ApproveCommissionPayoutRequest,
    CommissionCalculationSummary,
    CommissionPayoutStage,
    CommissionPayoutSummary,
    CommissionPayoutTier,
    CommissionRoleAssignmentSummary,
    CommissionRuleVersionSummary,
    ConfirmCommissionCalculationRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionPayoutRequest,
    CreateCommissionRoleAssignmentRequest,
    CreateCommissionRuleVersionRequest,
    RegisterCommissionPayoutRequest,
    SubmitCommissionPayoutApprovalRequest
} from '@poms/shared-contracts';
import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { CommissionCalculation } from './commission-calculation.entity';
import type { CommissionPayout } from './commission-payout.entity';
import type { CommissionRoleAssignment } from './commission-role-assignment.entity';
import type { CommissionRuleVersion } from './commission-rule-version.entity';
import { CommissionRepository } from './commission.repository';

const PAYOUT_CAP_RATES: Record<CommissionPayoutStage, Record<CommissionPayoutTier, number>> = {
    first: { basic: 0.2, mid: 0.25, premium: 0.3 },
    second: { basic: 0.7, mid: 0.75, premium: 0.8 },
    final: { basic: 1, mid: 1, premium: 1 }
};

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

        const activeRule = await this.#findLatestActiveRuleVersion();
        if (!activeRule) {
            throw new UnprocessableEntityException('当前不存在已激活的提成规则版本，无法触发提成计算');
        }

        const assignment = await this.repo.findCurrentRoleAssignment(projectId);
        if (!assignment || assignment.status !== 'frozen') {
            throw new UnprocessableEntityException('当前项目不存在已冻结的提成角色分配，无法触发提成计算');
        }

        const revenue = this.#parseDecimal(dto.recognizedRevenueTaxExclusive, 'recognizedRevenueTaxExclusive');
        const cost = this.#parseDecimal(dto.recognizedCostTaxExclusive, 'recognizedCostTaxExclusive');
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

    async #assertProjectExists(projectId: string): Promise<void> {
        const project = await this.repo.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`项目 ${projectId} 不存在`);
        }
    }

    async #findLatestActiveRuleVersion(): Promise<CommissionRuleVersion | null> {
        const versions = await this.repo.findAllRuleVersions();
        return versions.find((version) => version.status === 'active') ?? null;
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
