import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type { CommandResult, PublishInternalCostRateVersionRequest, RegisterLaborCostRecordRequest, ReplaceLaborCostRecordRequest } from '@poms/shared-contracts';
import type { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

@Injectable()
export class ProjectCostService {
    constructor(
        private readonly internalCostRateVersionRepository: InternalCostRateVersionRepository,
        private readonly projectActualCostRecordRepository: ProjectActualCostRecordRepository
    ) {}

    async publishInternalCostRateVersion(input: PublishInternalCostRateVersionRequest, userId: string): Promise<CommandResult> {
        const effectiveFrom = this.parseDateOnly(input.effectiveFrom, 'effectiveFrom');
        const effectiveTo = input.effectiveTo ? this.parseDateOnly(input.effectiveTo, 'effectiveTo') : null;
        this.assertDateRange(effectiveFrom, effectiveTo ?? effectiveFrom, 'effectiveFrom', 'effectiveTo');

        const rateKey = this.resolveRateKey(input);
        const current = await this.internalCostRateVersionRepository.findCurrentByRateKey(rateKey);

        if (input.expectedVersion && current && current.rowVersion !== input.expectedVersion) {
            throw new ConflictException(`Optimistic locking failed for rate key ${rateKey}`);
        }

        let supersededRateVersion: InternalCostRateVersion | null = null;
        if (input.supersedesRateVersionId) {
            supersededRateVersion = await this.internalCostRateVersionRepository.findById(input.supersedesRateVersionId);
            if (!supersededRateVersion) {
                throw new NotFoundException(`Rate version ${input.supersedesRateVersionId} not found`);
            }
            if (supersededRateVersion.rateKey !== rateKey) {
                throw new ConflictException(`Superseded rate version does not belong to rate key ${rateKey}`);
            }
            if (!supersededRateVersion.isCurrent || supersededRateVersion.status !== 'active') {
                throw new ConflictException(`Only current active rate version can be superseded`);
            }
            if (this.toDate(supersededRateVersion.effectiveFrom) >= this.toDate(effectiveFrom)) {
                throw new ConflictException(`New rate version effectiveFrom must be after the superseded version effectiveFrom`);
            }
        } else if (current) {
            throw new ConflictException(`Rate key ${rateKey} already has a current version; publish a superseding version instead`);
        }

        const overlapping = await this.internalCostRateVersionRepository.findOverlappingActiveVersion(
            rateKey,
            effectiveFrom,
            effectiveTo,
            supersededRateVersion?.id
        );
        if (overlapping) {
            throw new ConflictException(`A rate version is already active for this period`);
        }

        const nextVersion = (current?.version ?? supersededRateVersion?.version ?? 0) + 1;
        const entity = this.internalCostRateVersionRepository.create({
            rateKey,
            version: nextVersion,
            status: 'active',
            isCurrent: true,
            rateScopeType: input.rateScopeType,
            personId: input.personId ?? null,
            roleCode: input.roleCode ?? null,
            rateUnit: input.rateUnit,
            rateValue: input.rateValue,
            currency: input.currency,
            effectiveFrom,
            effectiveTo,
            changeReason: input.changeReason ?? null,
            supersedesRateVersionId: input.supersedesRateVersionId ?? null,
            publishedAt: new Date(),
            publishedBy: userId,
            createdBy: userId,
            updatedBy: userId
        });

        if (supersededRateVersion) {
            supersededRateVersion.status = 'superseded';
            supersededRateVersion.isCurrent = false;
            if (!supersededRateVersion.effectiveTo || this.toDate(supersededRateVersion.effectiveTo) >= this.toDate(effectiveFrom)) {
                supersededRateVersion.effectiveTo = this.dayBefore(effectiveFrom);
            }
            supersededRateVersion.updatedBy = userId;
            await this.internalCostRateVersionRepository.saveAll([supersededRateVersion, entity]);
        } else {
            await this.internalCostRateVersionRepository.save(entity);
        }

        return {
            targetId: entity.id,
            targetType: 'InternalCostRateVersion',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async registerLaborCostRecord(input: RegisterLaborCostRecordRequest, userId: string): Promise<CommandResult> {
        const laborPeriodStart = this.parseDateOnly(input.laborPeriodStart, 'laborPeriodStart');
        const laborPeriodEnd = this.parseDateOnly(input.laborPeriodEnd, 'laborPeriodEnd');
        this.assertDateRange(laborPeriodStart, laborPeriodEnd, 'laborPeriodStart', 'laborPeriodEnd');

        const rateVersion = await this.internalCostRateVersionRepository.findById(input.rateVersionId);
        if (!rateVersion) {
            throw new NotFoundException(`Rate version ${input.rateVersionId} not found`);
        }
        this.assertRateCoversLaborPeriod(rateVersion, laborPeriodStart, laborPeriodEnd);
        this.assertLaborScopeMatchesRate(rateVersion, input.laborPersonId ?? null, input.laborRole ?? null);

        const laborAmount = this.calculateLaborAmount(rateVersion, input.actualHours ?? null, input.actualPersonDays ?? null);

        const entity = this.projectActualCostRecordRepository.create({
            projectId: input.projectId,
            recordNo: `LABOR-${Date.now()}`,
            costType: 'LABOR',
            costSubtype: null,
            occurredOn: laborPeriodStart,
            recordStatus: 'REGISTERED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: input.attachmentIds?.length ?? 0,
            currency: rateVersion.currency,
            amountExcludingTax: laborAmount,
            taxCostAmount: '0.0000',
            amountIncludingTax: laborAmount,
            sourceType: 'LABOR',
            sourceId: rateVersion.id,
            sourceRefNo: rateVersion.rateKey,
            laborPersonId: input.laborPersonId ?? rateVersion.personId ?? null,
            laborRole: input.laborRole ?? rateVersion.roleCode ?? null,
            laborPeriodType: input.laborPeriodType,
            laborPeriodStart,
            laborPeriodEnd,
            actualHours: input.actualHours ?? null,
            actualPersonDays: input.actualPersonDays ?? null,
            internalCostRate: this.formatAmount(this.toNumber(rateVersion.rateValue)),
            laborAmount,
            rateVersionId: input.rateVersionId,
            workSummary: input.workSummary ?? null,
            costDescription: input.costDescription ?? null,
            registeredBy: userId,
            createdBy: userId,
            updatedBy: userId,
            registeredAt: new Date()
        });

        await this.projectActualCostRecordRepository.save(entity);

        return {
            targetId: entity.id,
            targetType: 'ProjectActualCostRecord',
            resultStatus: 'success',
            businessStatusAfter: 'REGISTERED',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async replaceLaborCostRecord(input: ReplaceLaborCostRecordRequest, userId: string): Promise<CommandResult> {
        const laborPeriodStart = this.parseDateOnly(input.laborPeriodStart, 'laborPeriodStart');
        const laborPeriodEnd = this.parseDateOnly(input.laborPeriodEnd, 'laborPeriodEnd');
        this.assertDateRange(laborPeriodStart, laborPeriodEnd, 'laborPeriodStart', 'laborPeriodEnd');

        const originalRecord = await this.projectActualCostRecordRepository.findById(input.supersedesRecordId);
        if (!originalRecord) {
            throw new NotFoundException(`Record ${input.supersedesRecordId} not found`);
        }

        if (input.expectedVersion && originalRecord.rowVersion !== input.expectedVersion) {
            throw new ConflictException(`Optimistic locking failed for record ${input.supersedesRecordId}`);
        }

        if (originalRecord.isIncludedInProjectCost) {
            throw new ConflictException(`Record ${input.supersedesRecordId} is already included in project cost`);
        }

        if (originalRecord.costType !== 'LABOR') {
            throw new ConflictException(`Only LABOR records can be replaced by replaceLaborCostRecord`);
        }

        const rateVersion = await this.internalCostRateVersionRepository.findById(input.rateVersionId);
        if (!rateVersion) {
            throw new NotFoundException(`Rate version ${input.rateVersionId} not found`);
        }
        this.assertRateCoversLaborPeriod(rateVersion, laborPeriodStart, laborPeriodEnd);
        this.assertLaborScopeMatchesRate(rateVersion, originalRecord.laborPersonId ?? null, originalRecord.laborRole ?? null);

        const laborAmount = this.calculateLaborAmount(rateVersion, input.actualHours ?? null, input.actualPersonDays ?? null);

        const newEntity = this.projectActualCostRecordRepository.create({
            projectId: originalRecord.projectId,
            recordNo: `LABOR-${Date.now()}`,
            costType: 'LABOR',
            costSubtype: originalRecord.costSubtype,
            occurredOn: laborPeriodStart,
            recordStatus: 'REGISTERED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: 0,
            currency: rateVersion.currency,
            amountExcludingTax: laborAmount,
            taxCostAmount: '0.0000',
            amountIncludingTax: laborAmount,
            sourceType: 'LABOR',
            sourceId: rateVersion.id,
            sourceRefNo: rateVersion.rateKey,
            laborPersonId: originalRecord.laborPersonId,
            laborRole: originalRecord.laborRole,
            laborPeriodType: originalRecord.laborPeriodType,
            laborPeriodStart,
            laborPeriodEnd,
            actualHours: input.actualHours ?? null,
            actualPersonDays: input.actualPersonDays ?? null,
            internalCostRate: this.formatAmount(this.toNumber(rateVersion.rateValue)),
            laborAmount,
            rateVersionId: input.rateVersionId,
            workSummary: input.workSummary ?? null,
            supersedesRecordId: originalRecord.id,
            costDescription: input.replaceReason,
            registeredBy: userId,
            createdBy: userId,
            updatedBy: userId,
            registeredAt: new Date()
        });

        originalRecord.recordStatus = 'REPLACED';
        originalRecord.updatedBy = userId;
        await this.projectActualCostRecordRepository.saveAll([originalRecord, newEntity]);

        return {
            targetId: newEntity.id,
            targetType: 'ProjectActualCostRecord',
            resultStatus: 'success',
            businessStatusAfter: 'REGISTERED',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    private resolveRateKey(input: Pick<PublishInternalCostRateVersionRequest, 'rateScopeType' | 'personId' | 'roleCode' | 'rateUnit'>): string {
        if (input.rateScopeType === 'PERSON') {
            if (!input.personId) {
                throw new UnprocessableEntityException('PERSON rate scope requires personId');
            }
            return `PERSON:${input.personId}:${input.rateUnit}`;
        }

        if (!input.roleCode) {
            throw new UnprocessableEntityException('ROLE rate scope requires roleCode');
        }
        return `ROLE:${input.roleCode}:${input.rateUnit}`;
    }

    private assertRateCoversLaborPeriod(rateVersion: InternalCostRateVersion, periodStart: string, periodEnd: string): void {
        if (rateVersion.status !== 'active') {
            throw new ConflictException(`Rate version ${rateVersion.id} is not active`);
        }

        const effectiveFrom = this.toDate(rateVersion.effectiveFrom);
        const effectiveTo = rateVersion.effectiveTo ? this.toDate(rateVersion.effectiveTo) : null;
        const periodStartDate = this.toDate(periodStart);
        const periodEndDate = this.toDate(periodEnd);
        if (effectiveFrom > periodStartDate || (effectiveTo && effectiveTo < periodEndDate)) {
            throw new ConflictException(`Rate version ${rateVersion.id} does not cover the full labor period`);
        }
    }

    private assertLaborScopeMatchesRate(rateVersion: InternalCostRateVersion, laborPersonId: string | null, laborRole: string | null): void {
        if (rateVersion.rateScopeType === 'PERSON') {
            if (!rateVersion.personId) {
                throw new ConflictException(`PERSON rate version ${rateVersion.id} is missing personId`);
            }
            if (laborPersonId && laborPersonId !== rateVersion.personId) {
                throw new ConflictException(`Labor person does not match rate version scope`);
            }
            return;
        }

        if (!rateVersion.roleCode) {
            throw new ConflictException(`ROLE rate version ${rateVersion.id} is missing roleCode`);
        }
        if (laborRole && laborRole !== rateVersion.roleCode) {
            throw new ConflictException(`Labor role does not match rate version scope`);
        }
    }

    private calculateLaborAmount(rateVersion: InternalCostRateVersion, actualHours: string | null, actualPersonDays: string | null): string {
        const rateValue = this.parsePositiveDecimal(rateVersion.rateValue, 'rateValue');
        if (rateVersion.rateUnit === 'HOUR') {
            const hours = this.parsePositiveDecimal(actualHours, 'actualHours');
            return this.formatAmount(hours * rateValue);
        }

        if (rateVersion.rateUnit === 'DAY') {
            const personDays = this.parsePositiveDecimal(actualPersonDays, 'actualPersonDays');
            return this.formatAmount(personDays * rateValue);
        }

        throw new ConflictException(`Unsupported rate unit ${rateVersion.rateUnit}`);
    }

    private parseDateOnly(value: string, fieldName: string): string {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
            throw new UnprocessableEntityException(`${fieldName} must use YYYY-MM-DD date format`);
        }
        const parsed = new Date(`${value}T00:00:00.000Z`);
        if (Number.isNaN(parsed.getTime())) {
            throw new UnprocessableEntityException(`${fieldName} must be a valid date`);
        }
        return value;
    }

    private assertDateRange(start: string, end: string, startField: string, endField: string): void {
        if (this.toDate(start) > this.toDate(end)) {
            throw new UnprocessableEntityException(`${startField} must be on or before ${endField}`);
        }
    }

    private dayBefore(date: string): string {
        const result = this.toDate(date);
        result.setUTCDate(result.getUTCDate() - 1);
        return result.toISOString().slice(0, 10);
    }

    private parsePositiveDecimal(value: string | number | null | undefined, fieldName: string): number {
        if (value === null || value === undefined || value === '') {
            throw new UnprocessableEntityException(`${fieldName} is required`);
        }
        const parsed = this.toNumber(value);
        if (parsed <= 0) {
            throw new UnprocessableEntityException(`${fieldName} must be greater than 0`);
        }
        return parsed;
    }

    private toNumber(value: string | number): number {
        const parsed = Number(value);
        if (!Number.isFinite(parsed)) {
            throw new UnprocessableEntityException(`Value must be a valid number`);
        }
        return parsed;
    }

    private toDate(value: Date | string): Date {
        return value instanceof Date ? value : new Date(value);
    }

    private formatAmount(value: number): string {
        return value.toFixed(4);
    }
}
