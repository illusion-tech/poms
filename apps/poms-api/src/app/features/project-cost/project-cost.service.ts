import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import type {
    CommandResult,
    ConfirmExpenseRecordRequest,
    CreateExpenseRecordRequest,
    ExpenseRecordDetailView,
    ExpenseRecordSummary,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordSummary,
    RegisterInvoiceCostRecordRequest,
    PublishInternalCostRateVersionRequest,
    RegisterLaborCostRecordRequest,
    RegisterPaymentFactCostRecordRequest,
    ReplaceLaborCostRecordRequest,
    UpdateExpenseRecordRequest,
    VoidExpenseRecordRequest
} from '@poms/shared-contracts';
import { ContractFinanceRepository } from '../contract-finance/contract-finance.repository';
import type { InvoiceRecord } from '../contract-finance/invoice-record.entity';
import type { PaymentRecord } from '../contract-finance/payment-record.entity';
import type { ExpenseRecord } from './expense-record.entity';
import type { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import type { ProjectActualCostRecord } from './project-actual-cost-record.entity';
import { ExpenseRecordRepository, InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';

interface ProjectActualCostRecordFilters {
    costType?: string;
    recordStatus?: string;
    sourceType?: string;
}

@Injectable()
export class ProjectCostService {
    constructor(
        private readonly expenseRecordRepository: ExpenseRecordRepository,
        private readonly internalCostRateVersionRepository: InternalCostRateVersionRepository,
        private readonly projectActualCostRecordRepository: ProjectActualCostRecordRepository,
        private readonly contractFinanceRepository: ContractFinanceRepository
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

    async registerPaymentFactCostRecord(input: RegisterPaymentFactCostRecordRequest, userId: string): Promise<CommandResult> {
        const paymentRecord = await this.contractFinanceRepository.findPaymentById(input.paymentRecordId);
        if (!paymentRecord) {
            throw new NotFoundException(`PaymentRecord ${input.paymentRecordId} not found`);
        }

        if (paymentRecord.projectId !== input.projectId) {
            throw new ConflictException(`PaymentRecord ${input.paymentRecordId} does not belong to project ${input.projectId}`);
        }

        if (input.expectedVersion && paymentRecord.rowVersion !== input.expectedVersion) {
            throw new ConflictException(`Optimistic locking failed for payment record ${input.paymentRecordId}`);
        }

        if (paymentRecord.status !== 'confirmed') {
            throw new ConflictException(`PaymentRecord ${input.paymentRecordId} is not confirmed`);
        }

        const existing = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('PAYMENT_RECORD', paymentRecord.id);
        if (existing) {
            throw new ConflictException(`PaymentRecord ${input.paymentRecordId} already has a current payment fact mapping`);
        }

        const confirmedAt = paymentRecord.confirmedAt ?? new Date();
        const entity = this.projectActualCostRecordRepository.create({
            projectId: input.projectId,
            recordNo: `PAYMENT-${Date.now()}`,
            costType: 'PAYMENT_FACT',
            costSubtype: paymentRecord.costCategory,
            occurredOn: this.toIsoDate(paymentRecord.paymentDate),
            registeredAt: confirmedAt,
            confirmedAt,
            recordStatus: 'CONFIRMED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: 0,
            currency: 'CNY',
            amountExcludingTax: null,
            taxCostAmount: null,
            amountIncludingTax: this.formatAmount(this.toNumber(paymentRecord.paymentAmount)),
            sourceType: 'PAYMENT_RECORD',
            sourceId: paymentRecord.id,
            sourceRefNo: paymentRecord.id,
            evidenceSummary: input.evidenceSummary ?? null,
            registeredBy: userId,
            confirmedBy: paymentRecord.confirmedBy ?? userId,
            costDescription: input.costDescription ?? null,
            createdBy: userId,
            updatedBy: userId
        });

        await this.projectActualCostRecordRepository.save(entity);

        return {
            targetId: entity.id,
            targetType: 'ProjectActualCostRecord',
            resultStatus: 'success',
            businessStatusAfter: 'CONFIRMED',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async registerInvoiceCostRecord(input: RegisterInvoiceCostRecordRequest, userId: string): Promise<CommandResult> {
        const invoiceRecord = await this.contractFinanceRepository.findInvoiceById(input.invoiceRecordId);
        if (!invoiceRecord) {
            throw new NotFoundException(`InvoiceRecord ${input.invoiceRecordId} not found`);
        }

        if (invoiceRecord.projectId !== input.projectId) {
            throw new ConflictException(`InvoiceRecord ${input.invoiceRecordId} does not belong to project ${input.projectId}`);
        }

        if (input.expectedVersion && invoiceRecord.rowVersion !== input.expectedVersion) {
            throw new ConflictException(`Optimistic locking failed for invoice record ${input.invoiceRecordId}`);
        }

        this.assertInvoiceEligibleForCostMapping(invoiceRecord);

        const existing = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('INVOICE_RECORD', invoiceRecord.id);
        if (existing) {
            throw new ConflictException(`InvoiceRecord ${input.invoiceRecordId} already has a current invoice mapping`);
        }

        const confirmedAt = invoiceRecord.updatedAt;
        const entity = this.projectActualCostRecordRepository.create({
            projectId: input.projectId,
            recordNo: `INVOICE-${Date.now()}`,
            costType: 'INVOICE',
            costSubtype: invoiceRecord.invoiceType,
            occurredOn: this.toIsoDate(invoiceRecord.invoiceDate),
            registeredAt: confirmedAt,
            confirmedAt,
            recordStatus: 'CONFIRMED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: 0,
            currency: 'CNY',
            amountExcludingTax: null,
            taxCostAmount: null,
            amountIncludingTax: this.formatAmount(this.toNumber(invoiceRecord.invoiceAmount)),
            sourceType: 'INVOICE_RECORD',
            sourceId: invoiceRecord.id,
            sourceRefNo: invoiceRecord.invoiceNumber,
            evidenceSummary: input.evidenceSummary ?? null,
            taxImpactSummary: input.taxImpactSummary ?? null,
            registeredBy: userId,
            confirmedBy: userId,
            costDescription: input.costDescription ?? null,
            createdBy: userId,
            updatedBy: userId
        });

        await this.projectActualCostRecordRepository.save(entity);

        return {
            targetId: entity.id,
            targetType: 'ProjectActualCostRecord',
            resultStatus: 'success',
            businessStatusAfter: 'CONFIRMED',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async listExpenseRecords(projectId: string): Promise<ExpenseRecordSummary[]> {
        const records = await this.expenseRecordRepository.findByProjectId(projectId);
        return records.map((record) => this.toExpenseRecordSummary(record));
    }

    async getExpenseRecordDetail(id: string): Promise<ExpenseRecordDetailView> {
        const record = await this.expenseRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ExpenseRecord ${id} not found`);
        }

        return {
            ...this.toExpenseRecordSummary(record),
            allowedActions: this.buildExpenseAllowedActions(record)
        };
    }

    async createExpenseRecord(
        projectId: string,
        input: CreateExpenseRecordRequest,
        userId: string
    ): Promise<ExpenseRecordSummary> {
        await this.assertExpenseProjectAndContract(projectId, input.contractId ?? null);
        this.assertExpenseAmountsConsistent(input.amountIncludingTax, input.taxAmount, input.amountExcludingTax);

        const entity = this.expenseRecordRepository.create({
            projectId,
            contractId: input.contractId ?? null,
            expenseCategory: input.expenseCategory,
            expenseDescription: input.expenseDescription.trim(),
            expenseDate: input.expenseDate,
            currency: input.currency?.trim() ?? 'CNY',
            amountIncludingTax: input.amountIncludingTax,
            taxAmount: input.taxAmount ?? null,
            amountExcludingTax: input.amountExcludingTax ?? null,
            sourceType: input.sourceType ?? 'manual',
            status: 'recorded',
            evidenceSummary: input.evidenceSummary ?? null,
            attachmentCount: input.attachmentCount ?? 0,
            confirmedAt: null,
            confirmedBy: null,
            voidedAt: null,
            voidReason: null
        });

        await this.expenseRecordRepository.save(entity);
        return this.toExpenseRecordSummary(entity);
    }

    async updateExpenseRecord(id: string, input: UpdateExpenseRecordRequest): Promise<ExpenseRecordSummary> {
        const record = await this.expenseRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ExpenseRecord ${id} not found`);
        }

        this.assertExpectedVersion(record.rowVersion, input.expectedVersion, 'ExpenseRecord');
        if (record.status === 'confirmed' || record.status === 'voided') {
            throw new UnprocessableEntityException(`ExpenseRecord ${id} can no longer be updated in status ${record.status}`);
        }

        if (input.contractId !== undefined) {
            await this.assertExpenseProjectAndContract(record.projectId, input.contractId);
            record.contractId = input.contractId;
        }
        if (input.expenseCategory !== undefined) {
            record.expenseCategory = input.expenseCategory;
        }
        if (input.expenseDescription !== undefined) {
            record.expenseDescription = input.expenseDescription.trim();
        }
        if (input.expenseDate !== undefined) {
            record.expenseDate = input.expenseDate;
        }
        if (input.currency !== undefined) {
            record.currency = input.currency.trim();
        }
        if (input.amountIncludingTax !== undefined) {
            record.amountIncludingTax = input.amountIncludingTax;
        }
        if (input.taxAmount !== undefined) {
            record.taxAmount = input.taxAmount;
        }
        if (input.amountExcludingTax !== undefined) {
            record.amountExcludingTax = input.amountExcludingTax;
        }
        if (input.sourceType !== undefined) {
            record.sourceType = input.sourceType;
        }
        if (input.evidenceSummary !== undefined) {
            record.evidenceSummary = input.evidenceSummary;
        }
        if (input.attachmentCount !== undefined) {
            record.attachmentCount = input.attachmentCount;
        }

        this.assertExpenseAmountsConsistent(record.amountIncludingTax, record.taxAmount, record.amountExcludingTax);
        await this.expenseRecordRepository.save(record);
        return this.toExpenseRecordSummary(record);
    }

    async confirmExpenseRecord(
        id: string,
        userId: string,
        input: ConfirmExpenseRecordRequest
    ): Promise<ExpenseRecordSummary> {
        const record = await this.expenseRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ExpenseRecord ${id} not found`);
        }

        this.assertExpectedVersion(record.rowVersion, input.expectedVersion, 'ExpenseRecord');
        if (record.status !== 'recorded') {
            throw new UnprocessableEntityException(
                `Only recorded expense records can be confirmed, current status: ${record.status}`
            );
        }

        record.status = 'confirmed';
        record.confirmedAt = new Date();
        record.confirmedBy = userId;
        await this.expenseRecordRepository.save(record);
        return this.toExpenseRecordSummary(record);
    }

    async voidExpenseRecord(id: string, input: VoidExpenseRecordRequest): Promise<ExpenseRecordSummary> {
        const record = await this.expenseRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ExpenseRecord ${id} not found`);
        }

        this.assertExpectedVersion(record.rowVersion, input.expectedVersion, 'ExpenseRecord');
        if (record.status === 'voided') {
            throw new UnprocessableEntityException(`ExpenseRecord ${id} is already voided`);
        }

        record.status = 'voided';
        record.voidedAt = new Date();
        record.voidReason = this.appendComment(input.reason.trim(), input.comment);
        await this.expenseRecordRepository.save(record);
        return this.toExpenseRecordSummary(record);
    }

    async listProjectActualCostRecords(projectId: string, filters: ProjectActualCostRecordFilters = {}): Promise<ProjectActualCostRecordSummary[]> {
        const records = await this.projectActualCostRecordRepository.findByProjectId(projectId, filters);
        return records.map((record) => this.toProjectActualCostRecordSummary(record));
    }

    async getProjectActualCostRecordDetail(id: string): Promise<ProjectActualCostRecordDetailView> {
        const record = await this.projectActualCostRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ProjectActualCostRecord ${id} not found`);
        }

        const [paymentRecord, invoiceRecord, rateVersion, replacementRecord] = await Promise.all([
            record.sourceType === 'PAYMENT_RECORD' && record.sourceId
                ? this.contractFinanceRepository.findPaymentById(record.sourceId)
                : Promise.resolve(null),
            record.sourceType === 'INVOICE_RECORD' && record.sourceId
                ? this.contractFinanceRepository.findInvoiceById(record.sourceId)
                : Promise.resolve(null),
            record.rateVersionId ? this.internalCostRateVersionRepository.findById(record.rateVersionId) : Promise.resolve(null),
            this.projectActualCostRecordRepository.findReplacementBySupersedesRecordId(record.id)
        ]);

        return {
            ...this.toProjectActualCostRecordSummary(record),
            sourceStatusSummary: this.buildSourceStatusSummary(record, paymentRecord, invoiceRecord, rateVersion),
            effectivePeriodSummary: this.buildEffectivePeriodSummary(record, paymentRecord, invoiceRecord, rateVersion),
            measurementBasisSummary: this.buildMeasurementBasisSummary(record, paymentRecord, invoiceRecord),
            supersedesSummary: this.buildSupersedesSummary(record, replacementRecord),
            allowedActions: this.buildAllowedActions(record),
            laborPersonId: record.laborPersonId ?? null,
            laborRole: record.laborRole ?? null,
            laborPeriodType: this.toLaborPeriodType(record.laborPeriodType),
            laborPeriodStart: this.toNullableDate(record.laborPeriodStart),
            laborPeriodEnd: this.toNullableDate(record.laborPeriodEnd),
            actualHours: this.toNullableDecimal(record.actualHours),
            actualPersonDays: this.toNullableDecimal(record.actualPersonDays),
            internalCostRate: this.toNullableDecimal(record.internalCostRate),
            rateVersionId: record.rateVersionId ?? null,
            laborAmount: this.toNullableDecimal(record.laborAmount),
            workSummary: record.workSummary ?? null,
            deliveryStage: record.deliveryStage ?? null
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

    private assertInvoiceEligibleForCostMapping(invoiceRecord: InvoiceRecord): void {
        if (invoiceRecord.invoiceType !== 'input') {
            throw new ConflictException(`Only input invoices can be mapped into project actual cost records`);
        }
        if (invoiceRecord.status !== 'verified') {
            throw new ConflictException(`InvoiceRecord ${invoiceRecord.id} is not verified`);
        }
        if (invoiceRecord.exceptionStatus === 'open') {
            throw new ConflictException(`InvoiceRecord ${invoiceRecord.id} still has an open exception`);
        }
    }

    private async assertExpenseProjectAndContract(projectId: string, contractId: string | null | undefined): Promise<void> {
        const project = await this.contractFinanceRepository.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        if (!contractId) {
            return;
        }

        const contract = await this.contractFinanceRepository.findContractById(contractId);
        if (!contract || contract.projectId !== projectId) {
            throw new NotFoundException(`Contract ${contractId} not found for project ${projectId}`);
        }
    }

    private assertExpenseAmountsConsistent(
        amountIncludingTax: string | number,
        taxAmount: string | number | null | undefined,
        amountExcludingTax: string | number | null | undefined
    ): void {
        const total = this.parsePositiveDecimal(amountIncludingTax, 'amountIncludingTax');
        const tax = taxAmount == null ? null : this.parseNonNegativeDecimal(taxAmount, 'taxAmount');
        const excluding = amountExcludingTax == null ? null : this.parseNonNegativeDecimal(amountExcludingTax, 'amountExcludingTax');

        if (tax !== null && excluding !== null && Math.abs(total - (tax + excluding)) > 0.0001) {
            throw new UnprocessableEntityException(
                'amountIncludingTax must equal taxAmount + amountExcludingTax when both fields are provided'
            );
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

    private toExpenseRecordSummary(record: ExpenseRecord): ExpenseRecordSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            contractId: record.contractId ?? null,
            expenseCategory: record.expenseCategory,
            expenseDescription: record.expenseDescription,
            expenseDate: this.toIsoDate(record.expenseDate),
            currency: record.currency,
            amountIncludingTax: this.toNullableDecimal(record.amountIncludingTax) ?? '0.0000',
            taxAmount: this.toNullableDecimal(record.taxAmount),
            amountExcludingTax: this.toNullableDecimal(record.amountExcludingTax),
            sourceType: record.sourceType,
            status: record.status,
            evidenceSummary: record.evidenceSummary ?? null,
            attachmentCount: record.attachmentCount,
            confirmedAt: this.toNullableDateTime(record.confirmedAt),
            confirmedBy: record.confirmedBy ?? null,
            voidedAt: this.toNullableDateTime(record.voidedAt),
            voidReason: record.voidReason ?? null,
            rowVersion: record.rowVersion,
            createdAt: this.toRequiredDateTime(record.createdAt),
            updatedAt: this.toRequiredDateTime(record.updatedAt)
        };
    }

    private toProjectActualCostRecordSummary(record: ProjectActualCostRecord): ProjectActualCostRecordSummary {
        return {
            id: record.id,
            projectId: record.projectId,
            recordNo: record.recordNo ?? null,
            costType: record.costType as ProjectActualCostRecordSummary['costType'],
            costSubtype: record.costSubtype ?? null,
            occurredOn: this.toNullableDate(record.occurredOn),
            accountingPeriod: record.accountingPeriod ?? null,
            registeredAt: this.toNullableDateTime(record.registeredAt),
            confirmedAt: this.toNullableDateTime(record.confirmedAt),
            includedAt: this.toNullableDateTime(record.includedAt),
            executionStageCode: record.executionStageCode ?? null,
            stageDerivedFromType: record.stageDerivedFromType ?? null,
            stageDerivedFromId: record.stageDerivedFromId ?? null,
            stageDerivedAt: this.toNullableDateTime(record.stageDerivedAt),
            stageLockedAt: this.toNullableDateTime(record.stageLockedAt),
            currency: record.currency,
            amountExcludingTax: this.toNullableDecimal(record.amountExcludingTax),
            taxCostAmount: this.toNullableDecimal(record.taxCostAmount),
            amountIncludingTax: this.toNullableDecimal(record.amountIncludingTax),
            recordStatus: record.recordStatus as ProjectActualCostRecordSummary['recordStatus'],
            isIncludedInProjectCost: record.isIncludedInProjectCost,
            isHighRisk: record.isHighRisk,
            sourceType: record.sourceType ?? null,
            sourceId: record.sourceId ?? null,
            sourceRefNo: record.sourceRefNo ?? null,
            evidenceSummary: record.evidenceSummary ?? null,
            attachmentCount: record.attachmentCount,
            registeredBy: record.registeredBy ?? null,
            confirmedBy: record.confirmedBy ?? null,
            includedBy: record.includedBy ?? null,
            ownerRole: record.ownerRole ?? null,
            costDescription: record.costDescription ?? null,
            taxImpactSummary: record.taxImpactSummary ?? null,
            riskNote: record.riskNote ?? null,
            supersedesRecordId: record.supersedesRecordId ?? null,
            voidReason: record.voidReason ?? null,
            rowVersion: record.rowVersion,
            createdAt: this.toRequiredDateTime(record.createdAt),
            updatedAt: this.toRequiredDateTime(record.updatedAt)
        };
    }

    private buildSourceStatusSummary(
        record: ProjectActualCostRecord,
        paymentRecord: PaymentRecord | null,
        invoiceRecord: InvoiceRecord | null,
        rateVersion: InternalCostRateVersion | null
    ): string | null {
        if (paymentRecord) {
            return `PaymentRecord:${paymentRecord.status}`;
        }
        if (invoiceRecord) {
            return `InvoiceRecord:${invoiceRecord.status}/${invoiceRecord.exceptionStatus}`;
        }
        if (rateVersion) {
            return `InternalCostRateVersion:${rateVersion.status}`;
        }
        if (record.sourceType) {
            return `${record.sourceType}:${record.recordStatus}`;
        }
        return null;
    }

    private buildEffectivePeriodSummary(
        record: ProjectActualCostRecord,
        paymentRecord: PaymentRecord | null,
        invoiceRecord: InvoiceRecord | null,
        rateVersion: InternalCostRateVersion | null
    ): string | null {
        if (paymentRecord) {
            return this.toIsoDate(paymentRecord.paymentDate);
        }
        if (invoiceRecord) {
            return this.toIsoDate(invoiceRecord.invoiceDate);
        }
        if (record.laborPeriodStart || record.laborPeriodEnd) {
            return `${this.toNullableDate(record.laborPeriodStart) ?? '-'} ~ ${this.toNullableDate(record.laborPeriodEnd) ?? '-'}`;
        }
        if (rateVersion) {
            return `${this.toIsoDate(rateVersion.effectiveFrom)} ~ ${this.toNullableDate(rateVersion.effectiveTo) ?? 'open'}`;
        }
        return null;
    }

    private buildMeasurementBasisSummary(
        record: ProjectActualCostRecord,
        paymentRecord: PaymentRecord | null,
        invoiceRecord: InvoiceRecord | null
    ): string | null {
        if (paymentRecord) {
            return `${this.formatAmount(this.toNumber(paymentRecord.paymentAmount))} ${record.currency} @ ${this.toIsoDate(paymentRecord.paymentDate)}`;
        }
        if (invoiceRecord) {
            return `${this.formatAmount(this.toNumber(invoiceRecord.invoiceAmount))} ${record.currency} @ ${this.toIsoDate(invoiceRecord.invoiceDate)}`;
        }
        if (record.actualHours && record.internalCostRate) {
            return `${this.toNullableDecimal(record.actualHours)}h x ${this.toNullableDecimal(record.internalCostRate)} ${record.currency}`;
        }
        if (record.actualPersonDays && record.internalCostRate) {
            return `${this.toNullableDecimal(record.actualPersonDays)}d x ${this.toNullableDecimal(record.internalCostRate)} ${record.currency}`;
        }
        return null;
    }

    private buildSupersedesSummary(record: ProjectActualCostRecord, replacementRecord: ProjectActualCostRecord | null): string | null {
        if (record.supersedesRecordId) {
            return `Supersedes ${record.supersedesRecordId}`;
        }
        if (replacementRecord) {
            return `Replaced by ${replacementRecord.id}`;
        }
        return null;
    }

    private buildAllowedActions(record: ProjectActualCostRecord): string[] {
        if (record.costType === 'LABOR' && !record.isIncludedInProjectCost && record.recordStatus !== 'REPLACED') {
            return ['replace'];
        }
        return [];
    }

    private buildExpenseAllowedActions(record: ExpenseRecord): string[] {
        if (record.status === 'recorded') {
            return ['update', 'confirm', 'void'];
        }
        if (record.status === 'confirmed') {
            return ['void'];
        }
        return [];
    }

    private assertExpectedVersion(currentVersion: number, expectedVersion: number | undefined, targetType: string): void {
        if (expectedVersion !== undefined && currentVersion !== expectedVersion) {
            throw new ConflictException(`Optimistic locking failed for ${targetType}`);
        }
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

    private parseNonNegativeDecimal(value: string | number, fieldName: string): number {
        const parsed = this.toNumber(value);
        if (parsed < 0) {
            throw new UnprocessableEntityException(`${fieldName} must be greater than or equal to 0`);
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

    private toIsoDate(value: Date | string): string {
        if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
            return value;
        }
        return this.toDate(value).toISOString().slice(0, 10);
    }

    private toNullableDate(value: Date | string | null | undefined): string | null {
        if (!value) {
            return null;
        }
        return this.toIsoDate(value);
    }

    private toRequiredDateTime(value: Date | string): string {
        return this.toDate(value).toISOString();
    }

    private toNullableDateTime(value: Date | string | null | undefined): string | null {
        if (!value) {
            return null;
        }
        return this.toRequiredDateTime(value);
    }

    private toNullableDecimal(value: string | number | null | undefined): string | null {
        if (value === null || value === undefined) {
            return null;
        }
        return typeof value === 'string' ? value : String(value);
    }

    private toLaborPeriodType(value: string | null | undefined): 'WEEK' | 'MONTH' | null {
        return value === 'WEEK' || value === 'MONTH' ? value : null;
    }

    private formatAmount(value: number): string {
        return value.toFixed(4);
    }

    private appendComment(value: string, comment: string | null | undefined): string {
        const suffix = comment?.trim();
        return suffix ? `${value}: ${suffix}` : value;
    }
}
