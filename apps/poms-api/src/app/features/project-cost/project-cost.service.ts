import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import type { CommandResult, PublishInternalCostRateVersionRequest, RegisterLaborCostRecordRequest, ReplaceLaborCostRecordRequest } from '@poms/shared-contracts';
import { InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

@Injectable()
export class ProjectCostService {
    constructor(
        private readonly internalCostRateVersionRepository: InternalCostRateVersionRepository,
        private readonly projectActualCostRecordRepository: ProjectActualCostRecordRepository
    ) {}

    async publishInternalCostRateVersion(input: PublishInternalCostRateVersionRequest, userId: string): Promise<CommandResult> {
        const active = await this.internalCostRateVersionRepository.findActiveVersion(
            input.rateScopeType,
            new Date(input.effectiveFrom),
            input.personId ?? undefined,
            input.roleCode ?? undefined
        );

        if (active) {
            throw new ConflictException(`A rate version is already active for this period`);
        }

        const entity = this.internalCostRateVersionRepository.create({
            rateScopeType: input.rateScopeType,
            personId: input.personId ?? null,
            roleCode: input.roleCode ?? null,
            rateUnit: input.rateUnit,
            rateValue: input.rateValue,
            currency: input.currency,
            effectiveFrom: new Date(input.effectiveFrom),
            changeReason: input.changeReason ?? null,
            supersedesRateVersionId: input.supersedesRateVersionId ?? null,
            publishedAt: new Date(),
            publishedBy: userId,
            createdBy: userId,
            updatedBy: userId
        });

        await this.internalCostRateVersionRepository.save(entity);

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
        const rateVersion = await this.internalCostRateVersionRepository.findById(input.rateVersionId);
        if (!rateVersion) {
            throw new NotFoundException(`Rate version ${input.rateVersionId} not found`);
        }

        const entity = this.projectActualCostRecordRepository.create({
            projectId: input.projectId,
            recordNo: `LABOR-${Date.now()}`,
            costType: 'LABOR',
            costSubtype: null,
            occurredOn: new Date(input.laborPeriodStart),
            recordStatus: 'REGISTERED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: input.attachmentIds?.length ?? 0,
            currency: 'CNY',
            amountExcludingTax: '0',
            taxCostAmount: '0',
            amountIncludingTax: '0',
            laborPersonId: input.laborPersonId ?? null,
            laborRole: input.laborRole ?? null,
            laborPeriodType: input.laborPeriodType,
            laborPeriodStart: new Date(input.laborPeriodStart),
            laborPeriodEnd: new Date(input.laborPeriodEnd),
            actualHours: input.actualHours ?? null,
            actualPersonDays: input.actualPersonDays ?? null,
            rateVersion: input.rateVersionId,
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
        const originalRecord = await this.projectActualCostRecordRepository.findById(input.replacementOfRecordId);
        if (!originalRecord) {
            throw new NotFoundException(`Record ${input.replacementOfRecordId} not found`);
        }

        if (input.expectedVersion && originalRecord.rowVersion !== input.expectedVersion) {
            throw new ConflictException(`Optimistic locking failed for record ${input.replacementOfRecordId}`);
        }

        if (originalRecord.isIncludedInProjectCost) {
            throw new ConflictException(`Record ${input.replacementOfRecordId} is already included in project cost`);
        }

        originalRecord.recordStatus = 'REPLACED';
        originalRecord.updatedBy = userId;
        await this.projectActualCostRecordRepository.save(originalRecord);

        const newEntity = this.projectActualCostRecordRepository.create({
            projectId: originalRecord.projectId,
            recordNo: `LABOR-${Date.now()}`,
            costType: 'LABOR',
            costSubtype: originalRecord.costSubtype,
            occurredOn: new Date(input.laborPeriodStart),
            recordStatus: 'REGISTERED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: 0,
            currency: originalRecord.currency,
            amountExcludingTax: '0',
            taxCostAmount: '0',
            amountIncludingTax: '0',
            laborPersonId: originalRecord.laborPersonId,
            laborRole: originalRecord.laborRole,
            laborPeriodType: originalRecord.laborPeriodType,
            laborPeriodStart: new Date(input.laborPeriodStart),
            laborPeriodEnd: new Date(input.laborPeriodEnd),
            actualHours: input.actualHours ?? null,
            actualPersonDays: input.actualPersonDays ?? null,
            rateVersion: input.rateVersionId,
            workSummary: input.workSummary ?? null,
            supersedesRecord: originalRecord.id,
            costDescription: input.replaceReason,
            registeredBy: userId,
            createdBy: userId,
            updatedBy: userId,
            registeredAt: new Date()
        });

        await this.projectActualCostRecordRepository.save(newEntity);

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
}
