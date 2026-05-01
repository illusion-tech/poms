import { ConflictException, Injectable, NotFoundException, UnprocessableEntityException } from '@nestjs/common';
import { createHash, randomUUID } from 'node:crypto';
import { ExpenseRecordStatusValue, ExpenseSourceTypeValue, InvoiceRecordExceptionStatusValue, InvoiceRecordStatusValue, InvoiceRecordTypeValue, PayableRecordStatusValue, PaymentRecordStatusValue } from '@poms/shared-contracts';
import type {
    ActivateOperatingBaselinePackageRequest,
    AccountingTaxTreatmentListView,
    AccountingTaxTreatmentSnapshotSummary,
    BusinessAccountingFeedbackView,
    CommissionGateBindingHistoryView,
    CommandResult,
    ConfirmAccountingTaxTreatmentRequest,
    ConfirmCostStageAttributionRequest,
    ConfirmExpenseRecordRequest,
    ConfirmSharedCostAllocationBasisRequest,
    CostStageAttributionHistoryView,
    CostStageAttributionSnapshotSummary,
    CreateExpenseProjectActualCostRecordRequest,
    CreateExpenseRecordRequest,
    CreateInvoiceProjectActualCostRecordRequest,
    CreateLaborProjectActualCostRecordRequest,
    CreateOperatingRestatementRequest,
    CreatePeriodClosingSnapshotRequest,
    CreatePaymentFactProjectActualCostRecordRequest,
    CreateProcurementProjectActualCostRecordRequest,
    CreateProjectActualCostRecordRequest,
    CreateProjectOperatingSnapshotRequest,
    ExpenseRecordDetailView,
    ExpenseRecordSummary,
    OperatingBaselinePackageSummary,
    OperatingSignalEvaluationView,
    OperatingRestatementSummary,
    PeriodClosingSnapshotSummary,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordSummary,
    ProjectBusinessOutcomeOverviewView,
    ProjectOperatingSnapshotSummary,
    ProjectUnifiedAccountingView,
    ProjectVarianceRiskExplanationView,
    ReclassifyCostStageAttributionRequest,
    PublishInternalCostRateVersionRequest,
    ReviewCommissionGateBindingRequest,
    ReviewCommissionGateBindingResult,
    ReviewOperatingSignalEvaluationRequest,
    ReviewOperatingSignalEvaluationResult,
    ReplaceAccountingTaxTreatmentRequest,
    ReplaceSharedCostAllocationResultRequest,
    ReplaceLaborCostRecordRequest,
    SharedCostAllocationBasisSummary,
    SharedCostAllocationResultListView,
    SharedCostAllocationResultSummary,
    SensitiveStringFieldProjection,
    UpdateExpenseRecordRequest,
    UserPayload,
    VoidExpenseRecordRequest
} from '@poms/shared-contracts';
import { BusinessNumberService } from '../business-number/business-number.service';
import { ContractFinanceRepository } from '../contract-finance/contract-finance.repository';
import { ContractHandoverRebaselineRecordRepository } from '../project-handover/project-handover.repository';
import { SensitiveFieldProjectionService, type SensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection.service';
import type { ApprovalSummarySnapshot } from '../approval-summary/approval-summary.entity';
import { AccountingTaxTreatmentSnapshot } from './accounting-tax-treatment-snapshot.entity';
import type { CommissionGateReviewRecord } from './commission-gate-review-record.entity';
import { CostStageAttributionSnapshot } from './cost-stage-attribution-snapshot.entity';
import type { DataMaturityEvaluationResult } from './data-maturity-evaluation-result.entity';
import type { InvoiceRecord } from '../contract-finance/invoice-record.entity';
import type { OperatingSignalEvaluationResult } from './operating-signal-evaluation-result.entity';
import type { PayableRecord } from '../contract-finance/payable-record.entity';
import type { PaymentRecord } from '../contract-finance/payment-record.entity';
import type { ExpenseRecord } from './expense-record.entity';
import type { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { OperatingBaselinePackage } from './operating-baseline-package.entity';
import type { OperatingSignalReviewRecord } from './operating-signal-review-record.entity';
import type { OperatingSignalToCommissionGateBinding } from './operating-signal-gate-binding.entity';
import type { OperatingRestatementRecord } from './operating-restatement-record.entity';
import type { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import type { ProjectActualCostRecord } from './project-actual-cost-record.entity';
import type { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';
import type { SharedCostAllocationBasis } from './shared-cost-allocation-basis.entity';
import { SharedCostAllocationResult } from './shared-cost-allocation-result.entity';
import { ApprovalSummarySnapshotRepository } from '../approval-summary/approval-summary.repository';
import { toBusinessDateOnly } from '../../core/date/business-date.utils';
import {
    AccountingTaxTreatmentSnapshotRepository,
    ChangePackageBaselineRepository,
    CommissionGateReviewRecordRepository,
    CostStageAttributionSnapshotRepository,
    DataMaturityEvaluationResultRepository,
    ExpenseRecordRepository,
    InternalCostRateVersionRepository,
    OperatingBaselinePackageRepository,
    OperatingRestatementRecordRepository,
    OperatingSignalEvaluationResultRepository,
    OperatingSignalReviewRecordRepository,
    OperatingSignalToCommissionGateBindingRepository,
    PeriodClosingSnapshotRepository,
    ProjectActualCostRecordRepository,
    ProjectOperatingSnapshotRepository,
    SharedCostAllocationBasisRepository,
    SharedCostAllocationResultRepository
} from './project-cost.repository';

interface ProjectActualCostRecordFilters {
    costType?: string;
    recordStatus?: string;
    sourceType?: string;
}

type SensitiveProjectionUser = Pick<UserPayload, 'sub' | 'username' | 'permissions'> | null;

@Injectable()
export class ProjectCostService {
    constructor(
        private readonly expenseRecordRepository: ExpenseRecordRepository,
        private readonly internalCostRateVersionRepository: InternalCostRateVersionRepository,
        private readonly projectActualCostRecordRepository: ProjectActualCostRecordRepository,
        private readonly contractFinanceRepository: ContractFinanceRepository,
        private readonly operatingBaselinePackageRepository: OperatingBaselinePackageRepository,
        private readonly changePackageBaselineRepository: ChangePackageBaselineRepository,
        private readonly projectOperatingSnapshotRepository: ProjectOperatingSnapshotRepository,
        private readonly periodClosingSnapshotRepository: PeriodClosingSnapshotRepository,
        private readonly operatingRestatementRecordRepository: OperatingRestatementRecordRepository,
        private readonly sharedCostAllocationBasisRepository: SharedCostAllocationBasisRepository,
        private readonly sharedCostAllocationResultRepository: SharedCostAllocationResultRepository,
        private readonly costStageAttributionSnapshotRepository: CostStageAttributionSnapshotRepository,
        private readonly accountingTaxTreatmentSnapshotRepository: AccountingTaxTreatmentSnapshotRepository,
        private readonly contractHandoverRebaselineRecordRepository: ContractHandoverRebaselineRecordRepository,
        private readonly businessNumberService: BusinessNumberService,
        private readonly dataMaturityEvaluationResultRepository: DataMaturityEvaluationResultRepository,
        private readonly operatingSignalEvaluationResultRepository: OperatingSignalEvaluationResultRepository,
        private readonly operatingSignalReviewRecordRepository: OperatingSignalReviewRecordRepository,
        private readonly operatingSignalToCommissionGateBindingRepository: OperatingSignalToCommissionGateBindingRepository,
        private readonly commissionGateReviewRecordRepository: CommissionGateReviewRecordRepository,
        private readonly approvalSummarySnapshotRepository: ApprovalSummarySnapshotRepository,
        private readonly sensitiveFieldProjectionService: SensitiveFieldProjectionService
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

        const overlapping = await this.internalCostRateVersionRepository.findOverlappingActiveVersion(rateKey, effectiveFrom, effectiveTo, supersededRateVersion?.id);
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

    async createProjectActualCostRecord(projectId: string, input: CreateProjectActualCostRecordRequest, userId: string): Promise<CommandResult> {
        switch (input.costType) {
            case 'PAYMENT_FACT':
                return this.registerPaymentFactCostRecord(projectId, input, userId);
            case 'INVOICE':
                return this.registerInvoiceCostRecord(projectId, input, userId);
            case 'EXPENSE':
                return this.registerExpenseCostRecord(projectId, input, userId);
            case 'PROCUREMENT':
                return this.registerProcurementCostRecord(projectId, input, userId);
            case 'LABOR':
                return this.registerLaborCostRecord(projectId, input, userId);
        }
    }

    async registerPaymentFactCostRecord(projectId: string, input: CreatePaymentFactProjectActualCostRecordRequest, userId: string): Promise<CommandResult> {
        const paymentRecord = await this.contractFinanceRepository.findPaymentById(input.paymentRecordId);
        if (!paymentRecord) {
            throw new NotFoundException(`PaymentRecord ${input.paymentRecordId} not found`);
        }

        if (paymentRecord.projectId !== projectId) {
            throw new ConflictException(`PaymentRecord ${input.paymentRecordId} does not belong to project ${projectId}`);
        }

        if (input.expectedSourceVersion && paymentRecord.rowVersion !== input.expectedSourceVersion) {
            throw new ConflictException(`Optimistic locking failed for payment record ${input.paymentRecordId}`);
        }

        if (paymentRecord.status !== PaymentRecordStatusValue.Confirmed) {
            throw new ConflictException(`PaymentRecord ${input.paymentRecordId} is not confirmed`);
        }

        const existing = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('PAYMENT_RECORD', paymentRecord.id);
        if (existing) {
            throw new ConflictException(`PaymentRecord ${input.paymentRecordId} already has a current payment fact mapping`);
        }

        const confirmedAt = paymentRecord.confirmedAt ?? new Date();
        const entity = this.projectActualCostRecordRepository.create({
            projectId,
            recordNo: await this.businessNumberService.next('cost-payment-fact'),
            costType: 'PAYMENT_FACT',
            costSubtype: paymentRecord.costCategory,
            occurredOn: this.toIsoDate(paymentRecord.paymentDate),
            registeredAt: confirmedAt,
            confirmedAt,
            recordStatus: 'CONFIRMED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: 0,
            currency: paymentRecord.currency,
            amountExcludingTax: this.formatAmount(this.toNumber(paymentRecord.amountExcludingTax)),
            taxCostAmount: this.toNullableDecimal(paymentRecord.taxAmount),
            amountIncludingTax: this.toNullableDecimal(paymentRecord.amountIncludingTax),
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

    async registerInvoiceCostRecord(projectId: string, input: CreateInvoiceProjectActualCostRecordRequest, userId: string): Promise<CommandResult> {
        const invoiceRecord = await this.contractFinanceRepository.findInvoiceById(input.invoiceRecordId);
        if (!invoiceRecord) {
            throw new NotFoundException(`InvoiceRecord ${input.invoiceRecordId} not found`);
        }

        if (invoiceRecord.projectId !== projectId) {
            throw new ConflictException(`InvoiceRecord ${input.invoiceRecordId} does not belong to project ${projectId}`);
        }

        if (input.expectedSourceVersion && invoiceRecord.rowVersion !== input.expectedSourceVersion) {
            throw new ConflictException(`Optimistic locking failed for invoice record ${input.invoiceRecordId}`);
        }

        this.assertInvoiceEligibleForCostMapping(invoiceRecord);

        const existing = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('INVOICE_RECORD', invoiceRecord.id);
        if (existing) {
            throw new ConflictException(`InvoiceRecord ${input.invoiceRecordId} already has a current invoice mapping`);
        }

        const confirmedAt = invoiceRecord.updatedAt;
        const entity = this.projectActualCostRecordRepository.create({
            projectId,
            recordNo: await this.businessNumberService.next('cost-invoice'),
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

    async registerExpenseCostRecord(projectId: string, input: CreateExpenseProjectActualCostRecordRequest, userId: string): Promise<CommandResult> {
        const expenseRecord = await this.expenseRecordRepository.findById(input.expenseRecordId);
        if (!expenseRecord) {
            throw new NotFoundException(`ExpenseRecord ${input.expenseRecordId} not found`);
        }

        if (expenseRecord.projectId !== projectId) {
            throw new ConflictException(`ExpenseRecord ${input.expenseRecordId} does not belong to project ${projectId}`);
        }

        if (input.expectedSourceVersion && expenseRecord.rowVersion !== input.expectedSourceVersion) {
            throw new ConflictException(`Optimistic locking failed for expense record ${input.expenseRecordId}`);
        }

        this.assertExpenseEligibleForCostMapping(expenseRecord);

        const existing = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('EXPENSE_RECORD', expenseRecord.id);
        if (existing) {
            throw new ConflictException(`ExpenseRecord ${input.expenseRecordId} already has a current expense mapping`);
        }

        const confirmedAt = expenseRecord.confirmedAt ?? new Date();
        const entity = this.projectActualCostRecordRepository.create({
            projectId,
            recordNo: await this.businessNumberService.next('cost-expense'),
            costType: 'EXPENSE',
            costSubtype: expenseRecord.expenseCategory,
            occurredOn: this.toIsoDate(expenseRecord.expenseDate),
            registeredAt: confirmedAt,
            confirmedAt,
            recordStatus: 'CONFIRMED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: expenseRecord.attachmentCount,
            currency: expenseRecord.currency,
            amountExcludingTax: this.toNullableDecimal(expenseRecord.amountExcludingTax),
            taxCostAmount: this.toNullableDecimal(expenseRecord.taxAmount),
            amountIncludingTax: this.formatAmount(this.toNumber(expenseRecord.amountIncludingTax)),
            sourceType: 'EXPENSE_RECORD',
            sourceId: expenseRecord.id,
            sourceRefNo: expenseRecord.id,
            evidenceSummary: input.evidenceSummary ?? expenseRecord.evidenceSummary ?? null,
            taxImpactSummary: input.taxImpactSummary ?? null,
            registeredBy: userId,
            confirmedBy: expenseRecord.confirmedBy ?? userId,
            costDescription: input.costDescription ?? expenseRecord.expenseDescription,
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

    async registerProcurementCostRecord(projectId: string, input: CreateProcurementProjectActualCostRecordRequest, userId: string): Promise<CommandResult> {
        const payableRecord = await this.contractFinanceRepository.findPayableById(input.payableRecordId);
        if (!payableRecord) {
            throw new NotFoundException(`PayableRecord ${input.payableRecordId} not found`);
        }

        if (payableRecord.projectId !== projectId) {
            throw new ConflictException(`PayableRecord ${input.payableRecordId} does not belong to project ${projectId}`);
        }

        if (input.expectedSourceVersion && payableRecord.rowVersion !== input.expectedSourceVersion) {
            throw new ConflictException(`Optimistic locking failed for payable record ${input.payableRecordId}`);
        }

        this.assertPayableEligibleForCostMapping(payableRecord);

        const existing = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('PAYABLE_RECORD', payableRecord.id, ['REGISTERED', 'CONFIRMED', 'INCLUDED']);
        if (existing) {
            throw new ConflictException(`PayableRecord ${input.payableRecordId} already has a current procurement mapping`);
        }

        const entity = this.projectActualCostRecordRepository.create({
            projectId,
            recordNo: await this.businessNumberService.next('cost-procurement'),
            costType: 'PROCUREMENT',
            costSubtype: payableRecord.costCategory,
            occurredOn: this.toIsoDate(payableRecord.expectedPaymentDate),
            registeredAt: payableRecord.createdAt,
            confirmedAt: null,
            recordStatus: 'REGISTERED',
            isIncludedInProjectCost: false,
            isHighRisk: false,
            attachmentCount: payableRecord.attachmentCount,
            currency: payableRecord.currency,
            amountExcludingTax: this.formatAmount(this.toNumber(payableRecord.amountExcludingTax)),
            taxCostAmount: this.toNullableDecimal(payableRecord.taxAmount),
            amountIncludingTax: this.toNullableDecimal(payableRecord.amountIncludingTax),
            sourceType: 'PAYABLE_RECORD',
            sourceId: payableRecord.id,
            sourceRefNo: payableRecord.id,
            evidenceSummary: input.evidenceSummary ?? payableRecord.evidenceSummary ?? null,
            taxImpactSummary: input.taxImpactSummary ?? null,
            riskNote: 'PROCUREMENT mapping expresses commitment boundary only; default not included until downstream inclusion rules say so',
            registeredBy: userId,
            confirmedBy: null,
            costDescription: input.costDescription ?? payableRecord.payableDescription,
            createdBy: userId,
            updatedBy: userId
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

    async listExpenseRecords(projectId: string): Promise<ExpenseRecordSummary[]> {
        const records = await this.expenseRecordRepository.findByProjectId(projectId);
        return records.map((record) => this.toExpenseRecordSummary(record));
    }

    async getExpenseRecordDetail(id: string): Promise<ExpenseRecordDetailView> {
        const record = await this.expenseRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ExpenseRecord ${id} not found`);
        }
        const hasCurrentCostMapping = record.status === ExpenseRecordStatusValue.Confirmed ? !!(await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('EXPENSE_RECORD', id)) : false;

        return {
            ...this.toExpenseRecordSummary(record),
            allowedActions: this.buildExpenseAllowedActions(record, hasCurrentCostMapping)
        };
    }

    async createExpenseRecord(projectId: string, input: CreateExpenseRecordRequest): Promise<ExpenseRecordSummary> {
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
            sourceType: input.sourceType ?? ExpenseSourceTypeValue.Manual,
            status: ExpenseRecordStatusValue.Recorded,
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
        if (record.status === ExpenseRecordStatusValue.Confirmed || record.status === ExpenseRecordStatusValue.Voided) {
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

    async confirmExpenseRecord(id: string, userId: string, input: ConfirmExpenseRecordRequest): Promise<ExpenseRecordSummary> {
        const record = await this.expenseRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`ExpenseRecord ${id} not found`);
        }

        this.assertExpectedVersion(record.rowVersion, input.expectedVersion, 'ExpenseRecord');
        if (record.status !== ExpenseRecordStatusValue.Recorded) {
            throw new UnprocessableEntityException(`Only recorded expense records can be confirmed, current status: ${record.status}`);
        }

        record.status = ExpenseRecordStatusValue.Confirmed;
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
        if (record.status === ExpenseRecordStatusValue.Voided) {
            throw new UnprocessableEntityException(`ExpenseRecord ${id} is already voided`);
        }
        const currentMapping = await this.projectActualCostRecordRepository.findCurrentEffectiveBySource('EXPENSE_RECORD', record.id);
        if (currentMapping) {
            throw new UnprocessableEntityException(`EXPENSE_RECORD ${record.id} 已存在统一成本映射 ${currentMapping.id}，当前不允许继续作废费用事实；如需调整请走替代/作废链`);
        }

        record.status = ExpenseRecordStatusValue.Voided;
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

        const [paymentRecord, invoiceRecord, expenseRecord, payableRecord, rateVersion, replacementRecord] = await Promise.all([
            record.sourceType === 'PAYMENT_RECORD' && record.sourceId ? this.contractFinanceRepository.findPaymentById(record.sourceId) : Promise.resolve(null),
            record.sourceType === 'INVOICE_RECORD' && record.sourceId ? this.contractFinanceRepository.findInvoiceById(record.sourceId) : Promise.resolve(null),
            record.sourceType === 'EXPENSE_RECORD' && record.sourceId ? this.expenseRecordRepository.findById(record.sourceId) : Promise.resolve(null),
            record.sourceType === 'PAYABLE_RECORD' && record.sourceId ? this.contractFinanceRepository.findPayableById(record.sourceId) : Promise.resolve(null),
            record.rateVersionId ? this.internalCostRateVersionRepository.findById(record.rateVersionId) : Promise.resolve(null),
            this.projectActualCostRecordRepository.findReplacementBySupersedesRecordId(record.id)
        ]);

        return {
            ...this.toProjectActualCostRecordSummary(record),
            sourceStatusSummary: this.buildSourceStatusSummary(record, paymentRecord, invoiceRecord, expenseRecord, payableRecord, rateVersion),
            effectivePeriodSummary: this.buildEffectivePeriodSummary(record, paymentRecord, invoiceRecord, expenseRecord, payableRecord, rateVersion),
            measurementBasisSummary: this.buildMeasurementBasisSummary(record, paymentRecord, invoiceRecord, expenseRecord, payableRecord),
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

    async activateOperatingBaselinePackage(input: ActivateOperatingBaselinePackageRequest, userId: string): Promise<CommandResult> {
        const project = await this.contractFinanceRepository.findProjectById(input.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }

        if (input.baselineSelectionSource === 'handover_rebaseline' && !input.effectiveOperatingBaselineId) {
            throw new UnprocessableEntityException('effectiveOperatingBaselineId is required for handover_rebaseline baseline selection');
        }

        const current = await this.operatingBaselinePackageRepository.findCurrentByProjectId(input.projectId);
        if (input.expectedCurrentPackageVersion !== undefined && !current) {
            throw new ConflictException(`No current operating baseline package exists for project ${input.projectId}`);
        }
        if (current) {
            this.assertExpectedVersion(current.rowVersion, input.expectedCurrentPackageVersion, 'OperatingBaselinePackage');
        }

        const originalBaselineCost = this.parseNonNegativeDecimal(input.originalBaselineCost, 'originalBaselineCost');
        const changePackageTotal = (input.changePackages ?? []).reduce((sum, item, index) => sum + this.parseDecimal(item.changeAmount, `changePackages[${index}].changeAmount`), 0);
        const currentEffectiveBaselineCost = originalBaselineCost + changePackageTotal;
        if (currentEffectiveBaselineCost < 0) {
            throw new UnprocessableEntityException('currentEffectiveBaselineCost must be greater than or equal to 0');
        }

        const now = new Date();
        const baselinePackageId = randomUUID();
        const baselinePackage = this.operatingBaselinePackageRepository.create({
            id: baselinePackageId,
            projectId: input.projectId,
            originalBaselineCost: this.formatAmount(originalBaselineCost),
            changePackageTotal: this.formatAmount(changePackageTotal),
            currentEffectiveBaselineCost: this.formatAmount(currentEffectiveBaselineCost),
            baselineSelectionSource: input.baselineSelectionSource,
            effectiveOperatingBaselineId: input.effectiveOperatingBaselineId ?? null,
            baselineSummary: input.baselineSummary ?? null,
            isCurrent: true,
            status: 'active',
            effectiveAt: now,
            effectiveBy: userId,
            createdBy: userId,
            updatedBy: userId
        });

        const changeBaselines = (input.changePackages ?? []).map((item) =>
            this.changePackageBaselineRepository.create({
                id: randomUUID(),
                baselinePackageId,
                changePackageId: item.changePackageId,
                changeAmount: this.formatAmount(this.parseDecimal(item.changeAmount, 'changeAmount')),
                changeSummary: item.changeSummary ?? null,
                status: 'active',
                effectiveAt: item.effectiveAt ? new Date(item.effectiveAt) : now,
                createdBy: userId,
                updatedBy: userId
            })
        );
        await this.projectActualCostRecordRepository.transactional(async (em) => {
            if (current) {
                await em.nativeUpdate(OperatingBaselinePackage, { id: current.id }, { isCurrent: false, status: 'superseded', updatedBy: userId });
            }

            await em.persist([baselinePackage, ...changeBaselines]).flush();
        });
        if (current) {
            current.isCurrent = false;
            current.status = 'superseded';
            current.updatedBy = userId;
        }

        return {
            targetId: baselinePackage.id,
            targetType: 'OperatingBaselinePackage',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async getCurrentOperatingBaselinePackage(projectId: string): Promise<OperatingBaselinePackageSummary> {
        const current = await this.operatingBaselinePackageRepository.findCurrentByProjectId(projectId);
        if (!current) {
            throw new NotFoundException(`Current operating baseline package for project ${projectId} not found`);
        }
        return this.toOperatingBaselinePackageSummary(current);
    }

    async createProjectOperatingSnapshot(input: CreateProjectOperatingSnapshotRequest, userId: string): Promise<CommandResult> {
        const project = await this.contractFinanceRepository.findProjectById(input.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }
        this.assertNullableDateRange(input.sourceWindowStart ?? null, input.sourceWindowEnd ?? null, 'sourceWindowStart', 'sourceWindowEnd');
        const handoverRebaselineRecordId = await this.assertValidHandoverRebaselineReference(input.projectId, input.baselineSelectionSource, input.handoverRebaselineRecordId ?? null);

        const calculated = this.calculateOperatingSnapshotAmounts(input);
        const entity = this.projectOperatingSnapshotRepository.create({
            id: randomUUID(),
            projectId: input.projectId,
            snapshotMode: input.snapshotMode,
            snapshotAt: new Date(),
            sourceWindowStart: input.sourceWindowStart ?? null,
            sourceWindowEnd: input.sourceWindowEnd ?? null,
            ...calculated,
            taxImpactSummary: input.taxImpactSummary,
            taxImpactPendingAmount: this.formatAmount(this.parseNonNegativeDecimal(input.taxImpactPendingAmount, 'taxImpactPendingAmount')),
            allocationStabilitySummary: input.allocationStabilitySummary ?? null,
            unmappedCostSummary: input.unmappedCostSummary ?? null,
            currentActionLevel: input.currentActionLevel,
            referencedBaselineVersion: input.referencedBaselineVersion,
            baselineSelectionSource: input.baselineSelectionSource,
            handoverRebaselineRecordId,
            status: 'active',
            supersedesId: null,
            createdBy: userId,
            updatedBy: userId
        });

        await this.projectOperatingSnapshotRepository.save(entity);

        return {
            targetId: entity.id,
            targetType: 'ProjectOperatingSnapshot',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async getProjectOperatingSnapshot(id: string): Promise<ProjectOperatingSnapshotSummary> {
        const snapshot = await this.projectOperatingSnapshotRepository.findById(id);
        if (!snapshot) {
            throw new NotFoundException(`ProjectOperatingSnapshot ${id} not found`);
        }
        return this.toProjectOperatingSnapshotSummary(snapshot);
    }

    async createPeriodClosingSnapshot(input: CreatePeriodClosingSnapshotRequest, userId: string): Promise<CommandResult> {
        const project = await this.contractFinanceRepository.findProjectById(input.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${input.projectId} not found`);
        }

        const current = await this.periodClosingSnapshotRepository.findActiveByProjectAndPeriod(input.projectId, input.periodKey);
        if (current) {
            this.assertExpectedVersion(current.rowVersion, input.expectedCurrentSnapshotVersion, 'PeriodClosingSnapshot');
            throw new ConflictException(`Project ${input.projectId} already has an active period closing snapshot for ${input.periodKey}`);
        }
        const handoverRebaselineRecordId = await this.assertValidHandoverRebaselineReference(input.projectId, input.baselineSelectionSource, input.handoverRebaselineRecordId ?? null);

        const calculated = this.calculateOperatingSnapshotAmounts(input);
        const entity = this.periodClosingSnapshotRepository.create({
            id: randomUUID(),
            projectId: input.projectId,
            periodKey: input.periodKey,
            snapshotMode: 'period-end',
            snapshotAt: new Date(),
            ...calculated,
            taxImpactSummary: input.taxImpactSummary,
            taxImpactPendingAmount: this.formatAmount(this.parseNonNegativeDecimal(input.taxImpactPendingAmount, 'taxImpactPendingAmount')),
            allocationStabilitySummary: input.allocationStabilitySummary ?? null,
            unmappedCostSummary: input.unmappedCostSummary ?? null,
            currentActionLevel: input.currentActionLevel,
            referencedBaselineVersion: input.referencedBaselineVersion,
            baselineSelectionSource: input.baselineSelectionSource,
            handoverRebaselineRecordId,
            status: 'active',
            createdBy: userId,
            updatedBy: userId
        });

        await this.periodClosingSnapshotRepository.save(entity);

        return {
            targetId: entity.id,
            targetType: 'PeriodClosingSnapshot',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async createOperatingRestatement(input: CreateOperatingRestatementRequest, userId: string): Promise<CommandResult> {
        const [periodEndSnapshot, restatesSnapshot, existingRestatement] = await Promise.all([
            this.periodClosingSnapshotRepository.findById(input.periodEndSnapshotId),
            this.projectOperatingSnapshotRepository.findById(input.restatesSnapshotId),
            this.operatingRestatementRecordRepository.findActiveByRestatesSnapshotId(input.restatesSnapshotId)
        ]);

        if (!periodEndSnapshot) {
            throw new NotFoundException(`PeriodClosingSnapshot ${input.periodEndSnapshotId} not found`);
        }
        if (!restatesSnapshot) {
            throw new NotFoundException(`ProjectOperatingSnapshot ${input.restatesSnapshotId} not found`);
        }
        if (periodEndSnapshot.projectId !== input.projectId || restatesSnapshot.projectId !== input.projectId) {
            throw new ConflictException(`Restatement snapshots do not belong to project ${input.projectId}`);
        }
        if (periodEndSnapshot.status !== 'active') {
            throw new ConflictException(`PeriodClosingSnapshot ${input.periodEndSnapshotId} is not active`);
        }
        if (restatesSnapshot.status !== 'active') {
            throw new ConflictException(`ProjectOperatingSnapshot ${input.restatesSnapshotId} is not active`);
        }
        this.assertExpectedVersion(restatesSnapshot.rowVersion, input.expectedRestatesSnapshotVersion, 'ProjectOperatingSnapshot');
        if (existingRestatement) {
            throw new ConflictException(`ProjectOperatingSnapshot ${input.restatesSnapshotId} already has an active restatement`);
        }

        const restatedSnapshotId = randomUUID();
        const restatedValues = this.mergeRestatedSnapshotValues(restatesSnapshot, input.restatedValues);
        const restatedSnapshot = this.projectOperatingSnapshotRepository.create({
            id: restatedSnapshotId,
            projectId: input.projectId,
            snapshotMode: 'restated',
            snapshotAt: new Date(),
            sourceWindowStart: restatedValues.sourceWindowStart,
            sourceWindowEnd: restatedValues.sourceWindowEnd,
            effectiveContractTotal: restatedValues.effectiveContractTotal,
            receivableConfirmedTotal: restatedValues.receivableConfirmedTotal,
            includedCostTotal: restatedValues.includedCostTotal,
            originalBaselineCost: restatedValues.originalBaselineCost,
            currentEffectiveBaselineCost: restatedValues.currentEffectiveBaselineCost,
            grossMarginAmount: restatedValues.grossMarginAmount,
            grossMarginRate: restatedValues.grossMarginRate,
            taxImpactSummary: restatedValues.taxImpactSummary,
            taxImpactPendingAmount: restatedValues.taxImpactPendingAmount,
            allocationStabilitySummary: restatedValues.allocationStabilitySummary,
            unmappedCostSummary: restatedValues.unmappedCostSummary,
            currentActionLevel: restatedValues.currentActionLevel,
            referencedBaselineVersion: restatedValues.referencedBaselineVersion,
            baselineSelectionSource: restatedValues.baselineSelectionSource,
            handoverRebaselineRecordId: restatedValues.handoverRebaselineRecordId,
            status: 'active',
            supersedesId: restatesSnapshot.id,
            createdBy: userId,
            updatedBy: userId
        });

        restatesSnapshot.status = 'superseded';
        restatesSnapshot.updatedBy = userId;

        const restatementRecord = this.operatingRestatementRecordRepository.create({
            id: randomUUID(),
            projectId: input.projectId,
            periodEndSnapshotId: periodEndSnapshot.id,
            restatesSnapshotId: restatesSnapshot.id,
            restatedSnapshotId,
            restatementReason: input.restatementReason,
            restatementSummary: input.restatementSummary,
            status: 'active',
            handledAt: new Date(),
            handledBy: userId,
            createdBy: userId,
            updatedBy: userId
        });
        await this.projectActualCostRecordRepository.transactional(async (em) => {
            await em.persist([restatesSnapshot, restatedSnapshot, restatementRecord]).flush();
        });

        return {
            targetId: restatementRecord.id,
            targetType: 'OperatingRestatementRecord',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async listOperatingRestatements(projectId: string): Promise<OperatingRestatementSummary[]> {
        const records = await this.operatingRestatementRecordRepository.findByProjectId(projectId);
        return records.map((record) => this.toOperatingRestatementSummary(record));
    }

    async getPeriodClosingSnapshot(id: string): Promise<PeriodClosingSnapshotSummary> {
        const snapshot = await this.periodClosingSnapshotRepository.findById(id);
        if (!snapshot) {
            throw new NotFoundException(`PeriodClosingSnapshot ${id} not found`);
        }
        return this.toPeriodClosingSnapshotSummary(snapshot);
    }

    async getOperatingRestatement(id: string): Promise<OperatingRestatementSummary> {
        const record = await this.operatingRestatementRecordRepository.findById(id);
        if (!record) {
            throw new NotFoundException(`OperatingRestatementRecord ${id} not found`);
        }
        return this.toOperatingRestatementSummary(record);
    }

    async confirmSharedCostAllocationBasis(input: ConfirmSharedCostAllocationBasisRequest, userId: string): Promise<CommandResult> {
        const uniqueSourceCostRecordIds = [...new Set(input.sourceCostRecordIds)].sort();
        if (uniqueSourceCostRecordIds.length !== input.sourceCostRecordIds.length) {
            throw new UnprocessableEntityException('sourceCostRecordIds must not contain duplicates');
        }

        const sourceRecords = await Promise.all(uniqueSourceCostRecordIds.map((id) => this.projectActualCostRecordRepository.findById(id)));
        const missingRecordId = uniqueSourceCostRecordIds[sourceRecords.findIndex((record) => !record)];
        if (missingRecordId) {
            throw new NotFoundException(`ProjectActualCostRecord ${missingRecordId} not found`);
        }

        const sourceCostScopeKey = this.buildSourceCostScopeKey(uniqueSourceCostRecordIds);
        const activeBasis = await this.sharedCostAllocationBasisRepository.findActiveByScopeKey(sourceCostScopeKey);
        if (activeBasis) {
            throw new ConflictException(`Source cost scope already has an active allocation basis`);
        }

        const projectIds = new Set(input.projectShareItems.map((item) => item.projectId));
        if (projectIds.size !== input.projectShareItems.length) {
            throw new UnprocessableEntityException('projectShareItems must contain unique projectId values');
        }
        for (const item of input.projectShareItems) {
            const project = await this.contractFinanceRepository.findProjectById(item.projectId);
            if (!project) {
                throw new NotFoundException(`Project ${item.projectId} not found`);
            }
        }

        const now = new Date();
        const basisId = randomUUID();
        const basis = this.sharedCostAllocationBasisRepository.create({
            id: basisId,
            sourceCostScopeKey,
            basisType: input.basisType,
            allocationMethod: input.allocationMethod,
            basisSummary: this.appendComment(input.basisSummary ?? `Source cost records: ${uniqueSourceCostRecordIds.length}`, input.comment),
            status: 'active',
            effectiveAt: now,
            effectiveBy: userId,
            supersedesId: null,
            createdBy: userId,
            updatedBy: userId
        });

        const results = input.projectShareItems.map((item) =>
            this.sharedCostAllocationResultRepository.create({
                id: randomUUID(),
                basisId,
                projectId: item.projectId,
                allocatedAmount: this.formatAmount(this.parseNonNegativeDecimal(item.allocatedAmount, 'allocatedAmount')),
                allocationRatio: this.parseNullableRatio(item.allocationRatio ?? null, 'allocationRatio'),
                allocationSummary: item.allocationSummary ?? null,
                status: 'active',
                effectiveAt: now,
                supersedesId: null,
                createdBy: userId,
                updatedBy: userId
            })
        );
        await this.projectActualCostRecordRepository.transactional(async (em) => {
            await em.persist([basis, ...results]).flush();
        });

        return {
            targetId: basis.id,
            targetType: 'SharedCostAllocationBasis',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async getSharedCostAllocationBasis(id: string): Promise<SharedCostAllocationBasisSummary> {
        const basis = await this.sharedCostAllocationBasisRepository.findById(id);
        if (!basis) {
            throw new NotFoundException(`SharedCostAllocationBasis ${id} not found`);
        }
        const results = await this.sharedCostAllocationResultRepository.findByBasisId(id);
        return this.toSharedCostAllocationBasisSummary(basis, results);
    }

    async listSharedCostAllocationResults(basisId: string): Promise<SharedCostAllocationResultListView> {
        const basis = await this.sharedCostAllocationBasisRepository.findById(basisId);
        if (!basis) {
            throw new NotFoundException(`SharedCostAllocationBasis ${basisId} not found`);
        }
        const results = await this.sharedCostAllocationResultRepository.findByBasisId(basisId);
        return results.map((result) => this.toSharedCostAllocationResultSummary(result));
    }

    async replaceSharedCostAllocationResult(supersededAllocationResultId: string, input: ReplaceSharedCostAllocationResultRequest, userId: string): Promise<CommandResult> {
        const superseded = await this.sharedCostAllocationResultRepository.findById(supersededAllocationResultId);
        if (!superseded) {
            throw new NotFoundException(`SharedCostAllocationResult ${supersededAllocationResultId} not found`);
        }
        if (superseded.status !== 'active') {
            throw new ConflictException(`Only active allocation result can be replaced`);
        }
        this.assertExpectedVersion(superseded.rowVersion, input.expectedVersion, 'SharedCostAllocationResult');

        const active = await this.sharedCostAllocationResultRepository.findActiveByBasisAndProject(superseded.basisId, superseded.projectId);
        if (active && active.id !== superseded.id) {
            throw new ConflictException(`Another active allocation result already exists for the same basis and project`);
        }

        const replacement = this.sharedCostAllocationResultRepository.create({
            id: randomUUID(),
            basisId: superseded.basisId,
            projectId: superseded.projectId,
            allocatedAmount: this.formatAmount(this.parseNonNegativeDecimal(input.allocatedAmount, 'allocatedAmount')),
            allocationRatio: this.parseNullableRatio(input.allocationRatio ?? null, 'allocationRatio'),
            allocationSummary: this.appendComment(input.allocationSummary ?? input.replacementReason, input.comment),
            status: 'active',
            effectiveAt: new Date(),
            supersedesId: superseded.id,
            createdBy: userId,
            updatedBy: userId
        });
        await this.projectActualCostRecordRepository.transactional(async (em) => {
            await em.nativeUpdate(SharedCostAllocationResult, { id: superseded.id }, { status: 'superseded', updatedBy: userId });
            await em.persist(replacement).flush();
        });
        superseded.status = 'superseded';
        superseded.updatedBy = userId;

        return {
            targetId: replacement.id,
            targetType: 'SharedCostAllocationResult',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async confirmCostStageAttribution(costRecordId: string, input: ConfirmCostStageAttributionRequest, userId: string): Promise<CommandResult> {
        const costRecord = await this.projectActualCostRecordRepository.findById(costRecordId);
        if (!costRecord) {
            throw new NotFoundException(`ProjectActualCostRecord ${costRecordId} not found`);
        }
        this.assertExpectedVersion(costRecord.rowVersion, input.expectedVersion, 'ProjectActualCostRecord');
        const active = await this.costStageAttributionSnapshotRepository.findActiveByCostRecordId(costRecordId);
        if (active) {
            throw new ConflictException(`ProjectActualCostRecord ${costRecordId} already has an active stage attribution`);
        }

        const now = new Date();
        const snapshot = this.costStageAttributionSnapshotRepository.create({
            id: randomUUID(),
            costRecordId,
            attributedStage: input.attributedStage,
            attributionMode: input.stageAttributionMode,
            lockedBySnapshotId: input.lockedBySnapshotId ?? null,
            attributionSummary: this.appendComment(input.attributionSummary ?? `Stage attributed to ${input.attributedStage}`, input.comment),
            status: 'active',
            supersedesId: null,
            handledAt: now,
            handledBy: userId,
            createdBy: userId,
            updatedBy: userId
        });

        costRecord.executionStageCode = input.attributedStage;
        costRecord.stageDerivedFromType = 'CostStageAttributionSnapshot';
        costRecord.stageDerivedFromId = snapshot.id;
        costRecord.stageDerivedAt = now;
        costRecord.stageLockedAt = input.lockedBySnapshotId ? now : null;
        costRecord.updatedBy = userId;
        await this.projectActualCostRecordRepository.transactional(async (em) => {
            await em.persist([snapshot, costRecord]).flush();
        });

        return {
            targetId: snapshot.id,
            targetType: 'CostStageAttributionSnapshot',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async reclassifyCostStageAttribution(supersededAttributionId: string, input: ReclassifyCostStageAttributionRequest, userId: string): Promise<CommandResult> {
        const superseded = await this.costStageAttributionSnapshotRepository.findById(supersededAttributionId);
        if (!superseded) {
            throw new NotFoundException(`CostStageAttributionSnapshot ${supersededAttributionId} not found`);
        }
        if (superseded.status !== 'active') {
            throw new ConflictException(`Only active cost stage attribution can be reclassified`);
        }
        this.assertExpectedVersion(superseded.rowVersion, input.expectedVersion, 'CostStageAttributionSnapshot');

        const costRecord = await this.projectActualCostRecordRepository.findById(superseded.costRecordId);
        if (!costRecord) {
            throw new NotFoundException(`ProjectActualCostRecord ${superseded.costRecordId} not found`);
        }

        const now = new Date();
        const replacement = this.costStageAttributionSnapshotRepository.create({
            id: randomUUID(),
            costRecordId: superseded.costRecordId,
            attributedStage: input.newAttributedStage,
            attributionMode: 'reclassified',
            lockedBySnapshotId: input.lockedBySnapshotId ?? superseded.lockedBySnapshotId ?? null,
            attributionSummary: this.appendComment(input.reclassifyReason, input.comment),
            status: 'active',
            supersedesId: superseded.id,
            handledAt: now,
            handledBy: userId,
            createdBy: userId,
            updatedBy: userId
        });
        costRecord.executionStageCode = input.newAttributedStage;
        costRecord.stageDerivedFromType = 'CostStageAttributionSnapshot';
        costRecord.stageDerivedFromId = replacement.id;
        costRecord.stageDerivedAt = now;
        costRecord.stageLockedAt = replacement.lockedBySnapshotId ? now : null;
        costRecord.updatedBy = userId;
        await this.projectActualCostRecordRepository.transactional(async (em) => {
            await em.nativeUpdate(CostStageAttributionSnapshot, { id: superseded.id }, { status: 'superseded', updatedBy: userId });
            await em.persist([replacement, costRecord]).flush();
        });
        superseded.status = 'superseded';
        superseded.updatedBy = userId;

        return {
            targetId: replacement.id,
            targetType: 'CostStageAttributionSnapshot',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async listCostStageAttributions(costRecordId: string): Promise<CostStageAttributionHistoryView> {
        const costRecord = await this.projectActualCostRecordRepository.findById(costRecordId);
        if (!costRecord) {
            throw new NotFoundException(`ProjectActualCostRecord ${costRecordId} not found`);
        }
        const snapshots = await this.costStageAttributionSnapshotRepository.findByCostRecordId(costRecordId);
        return snapshots.map((snapshot) => this.toCostStageAttributionSnapshotSummary(snapshot));
    }

    async getCostStageAttribution(id: string): Promise<CostStageAttributionSnapshotSummary> {
        const snapshot = await this.costStageAttributionSnapshotRepository.findById(id);
        if (!snapshot) {
            throw new NotFoundException(`CostStageAttributionSnapshot ${id} not found`);
        }
        return this.toCostStageAttributionSnapshotSummary(snapshot);
    }

    async confirmAccountingTaxTreatment(projectId: string, input: ConfirmAccountingTaxTreatmentRequest, userId: string): Promise<CommandResult> {
        const project = await this.contractFinanceRepository.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }

        const activeSnapshot = await this.accountingTaxTreatmentSnapshotRepository.findActiveByProjectAndTaxTreatmentType(projectId, input.taxTreatmentType);
        if (activeSnapshot) {
            throw new ConflictException(`Project ${projectId} already has an active tax treatment snapshot for ${input.taxTreatmentType}; replace it instead`);
        }

        const snapshot = this.accountingTaxTreatmentSnapshotRepository.create({
            id: randomUUID(),
            projectId,
            taxTreatmentType: input.taxTreatmentType,
            deductibilityStatus: input.deductibilityStatus,
            taxImpactAmount: this.formatAmount(this.parseDecimal(input.taxImpactAmount, 'taxImpactAmount')),
            taxPendingFlag: input.taxPendingFlag,
            taxImpactSummary: input.taxImpactSummary,
            taxImpactPendingAmount: this.formatAmount(this.parseNonNegativeDecimal(input.taxImpactPendingAmount, 'taxImpactPendingAmount')),
            basisSummary: input.basisSummary ?? null,
            status: 'active',
            supersedesId: null,
            confirmedAt: new Date(),
            confirmedBy: userId,
            createdBy: userId,
            updatedBy: userId
        });

        await this.accountingTaxTreatmentSnapshotRepository.save(snapshot);

        return {
            targetId: snapshot.id,
            targetType: 'AccountingTaxTreatmentSnapshot',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async replaceAccountingTaxTreatment(supersededTaxTreatmentSnapshotId: string, input: ReplaceAccountingTaxTreatmentRequest, userId: string): Promise<CommandResult> {
        const superseded = await this.accountingTaxTreatmentSnapshotRepository.findById(supersededTaxTreatmentSnapshotId);
        if (!superseded) {
            throw new NotFoundException(`AccountingTaxTreatmentSnapshot ${supersededTaxTreatmentSnapshotId} not found`);
        }
        if (superseded.status !== 'active') {
            throw new ConflictException(`Only active tax treatment snapshot can be replaced`);
        }
        this.assertExpectedVersion(superseded.rowVersion, input.expectedVersion, 'AccountingTaxTreatmentSnapshot');

        const project = await this.contractFinanceRepository.findProjectById(superseded.projectId);
        if (!project) {
            throw new NotFoundException(`Project ${superseded.projectId} not found`);
        }

        const activeSnapshot = await this.accountingTaxTreatmentSnapshotRepository.findActiveByProjectAndTaxTreatmentType(superseded.projectId, input.taxTreatmentType);
        if (activeSnapshot && activeSnapshot.id !== superseded.id) {
            throw new ConflictException(`Project ${superseded.projectId} already has another active tax treatment snapshot for ${input.taxTreatmentType}`);
        }

        const snapshot = this.accountingTaxTreatmentSnapshotRepository.create({
            id: randomUUID(),
            projectId: superseded.projectId,
            taxTreatmentType: input.taxTreatmentType,
            deductibilityStatus: input.deductibilityStatus,
            taxImpactAmount: this.formatAmount(this.parseDecimal(input.taxImpactAmount, 'taxImpactAmount')),
            taxPendingFlag: input.taxPendingFlag,
            taxImpactSummary: input.taxImpactSummary,
            taxImpactPendingAmount: this.formatAmount(this.parseNonNegativeDecimal(input.taxImpactPendingAmount, 'taxImpactPendingAmount')),
            basisSummary: input.basisSummary ?? null,
            status: 'active',
            supersedesId: superseded.id,
            confirmedAt: new Date(),
            confirmedBy: userId,
            createdBy: userId,
            updatedBy: userId
        });

        await this.projectActualCostRecordRepository.transactional(async (em) => {
            await em.nativeUpdate(AccountingTaxTreatmentSnapshot, { id: superseded.id }, { status: 'superseded', updatedBy: userId });
            await em.persist(snapshot).flush();
        });
        superseded.status = 'superseded';
        superseded.updatedBy = userId;

        return {
            targetId: snapshot.id,
            targetType: 'AccountingTaxTreatmentSnapshot',
            resultStatus: 'success',
            businessStatusAfter: 'active',
            approvalRecordId: null,
            confirmationRecordId: null,
            todoItemIds: []
        };
    }

    async listAccountingTaxTreatments(projectId: string): Promise<AccountingTaxTreatmentListView> {
        const project = await this.contractFinanceRepository.findProjectById(projectId);
        if (!project) {
            throw new NotFoundException(`Project ${projectId} not found`);
        }
        const snapshots = await this.accountingTaxTreatmentSnapshotRepository.findByProjectId(projectId);
        return snapshots.map((snapshot) => this.toAccountingTaxTreatmentSnapshotSummary(snapshot));
    }

    async getAccountingTaxTreatment(id: string): Promise<AccountingTaxTreatmentSnapshotSummary> {
        const snapshot = await this.accountingTaxTreatmentSnapshotRepository.findById(id);
        if (!snapshot) {
            throw new NotFoundException(`AccountingTaxTreatmentSnapshot ${id} not found`);
        }
        return this.toAccountingTaxTreatmentSnapshotSummary(snapshot);
    }

    async reviewOperatingSignalEvaluation(id: string, input: ReviewOperatingSignalEvaluationRequest, userId: string): Promise<ReviewOperatingSignalEvaluationResult> {
        const evaluation = await this.operatingSignalEvaluationResultRepository.findById(id);
        if (!evaluation) {
            throw new NotFoundException(`OperatingSignalEvaluationResult ${id} not found`);
        }
        if (evaluation.status !== 'active') {
            throw new ConflictException(`OperatingSignalEvaluationResult ${id} is not active`);
        }

        this.assertExpectedVersion(evaluation.rowVersion, input.expectedVersion, 'OperatingSignalEvaluationResult');

        const dataMaturity = await this.dataMaturityEvaluationResultRepository.findById(evaluation.dataMaturityEvaluationId);
        if (!dataMaturity) {
            throw new NotFoundException(`DataMaturityEvaluationResult ${evaluation.dataMaturityEvaluationId} not found for signal evaluation ${id}`);
        }

        const activeReview = await this.operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId(evaluation.id);
        const resolvedCurrentActionLevel = this.resolveReviewedCurrentActionLevel(evaluation, dataMaturity, input.resolvedDataMaturityLevel, input.costActionRecommendation);

        const reviewRecord = this.operatingSignalReviewRecordRepository.create({
            id: randomUUID(),
            signalEvaluationId: evaluation.id,
            reviewDecision: input.reviewDecision,
            resolvedDataMaturityLevel: input.resolvedDataMaturityLevel,
            resolvedCostActionRecommendation: input.costActionRecommendation,
            resolvedCurrentActionLevel,
            referencedBaselineVersion: input.referencedBaselineVersion,
            referencedSnapshotVersion: input.referencedSnapshotVersion,
            reviewComment: input.reviewComment ?? null,
            handledAt: new Date(),
            handledBy: userId,
            status: 'active',
            createdBy: userId,
            updatedBy: userId
        });

        const recordsToSave = [reviewRecord];
        if (activeReview) {
            activeReview.status = 'superseded';
            activeReview.updatedBy = userId;
            recordsToSave.unshift(activeReview);
        }
        await this.operatingSignalReviewRecordRepository.saveAll(recordsToSave);

        return {
            targetId: reviewRecord.id,
            signalEvaluationId: evaluation.id,
            reviewRecordId: reviewRecord.id,
            taxImpactSummary: evaluation.taxImpactSummary,
            dataMaturityLevel: input.resolvedDataMaturityLevel,
            costActionRecommendation: input.costActionRecommendation,
            currentActionLevel: resolvedCurrentActionLevel,
            referencedBaselineVersion: input.referencedBaselineVersion,
            referencedSnapshotVersion: input.referencedSnapshotVersion,
            resultStatus: 'success'
        };
    }

    async getOperatingSignalEvaluation(id: string): Promise<OperatingSignalEvaluationView> {
        const evaluation = await this.operatingSignalEvaluationResultRepository.findById(id);
        if (!evaluation) {
            throw new NotFoundException(`OperatingSignalEvaluationResult ${id} not found`);
        }

        const dataMaturity = await this.dataMaturityEvaluationResultRepository.findById(evaluation.dataMaturityEvaluationId);
        if (!dataMaturity) {
            throw new NotFoundException(`DataMaturityEvaluationResult ${evaluation.dataMaturityEvaluationId} not found for signal evaluation ${id}`);
        }

        const activeReview = await this.operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId(evaluation.id);
        const resolvedSignalInput = this.resolveSignalEvaluationInput(evaluation, dataMaturity, activeReview);

        return {
            signalEvaluationId: evaluation.id,
            projectId: evaluation.projectId,
            formulaBoundaryAction: evaluation.formulaBoundaryAction,
            signalLevel: evaluation.signalLevel,
            taxImpactSummary: evaluation.taxImpactSummary,
            allocationStabilitySummary: evaluation.allocationStabilitySummary ?? dataMaturity.allocationStabilitySummary ?? null,
            unmappedCostSummary: evaluation.unmappedCostSummary ?? dataMaturity.unmappedCostSummary ?? null,
            dataMaturityLevel: resolvedSignalInput.dataMaturityLevel,
            costActionRecommendation: resolvedSignalInput.costActionRecommendation,
            currentActionLevel: resolvedSignalInput.currentActionLevel,
            referencedBaselineVersion: resolvedSignalInput.referencedBaselineVersion,
            referencedSnapshotVersion: resolvedSignalInput.referencedSnapshotVersion,
            reviewRequired: evaluation.reviewRequired,
            reviewSummary: this.buildOperatingSignalReviewSummary(activeReview)
        };
    }

    async reviewCommissionGateBinding(id: string, input: ReviewCommissionGateBindingRequest, userId: string): Promise<ReviewCommissionGateBindingResult> {
        const binding = await this.operatingSignalToCommissionGateBindingRepository.findById(id);
        if (!binding) {
            throw new NotFoundException(`OperatingSignalToCommissionGateBinding ${id} not found`);
        }
        if (binding.status !== 'active') {
            throw new ConflictException(`OperatingSignalToCommissionGateBinding ${id} is not active`);
        }

        this.assertExpectedVersion(binding.rowVersion, input.expectedVersion, 'OperatingSignalToCommissionGateBinding');
        this.assertGateBindingReviewable(binding);
        this.assertCommissionGateReviewPayload(input);

        const [evaluation, summarySnapshot, existingReviews] = await Promise.all([
            this.operatingSignalEvaluationResultRepository.findById(binding.signalEvaluationId),
            this.approvalSummarySnapshotRepository.findById(input.summarySnapshotId),
            this.commissionGateReviewRecordRepository.findByBindingId(binding.id)
        ]);

        if (!evaluation) {
            throw new NotFoundException(`OperatingSignalEvaluationResult ${binding.signalEvaluationId} not found for binding ${id}`);
        }

        const dataMaturity = await this.dataMaturityEvaluationResultRepository.findById(evaluation.dataMaturityEvaluationId);
        if (!dataMaturity) {
            throw new NotFoundException(`DataMaturityEvaluationResult ${evaluation.dataMaturityEvaluationId} not found for binding ${id}`);
        }

        this.assertApprovalSummarySnapshot(summarySnapshot, input.summaryPackageKey, input.summarySnapshotId);

        const activeSignalReview = await this.operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId(evaluation.id);
        const resolvedSignalInput = this.resolveSignalEvaluationInput(evaluation, dataMaturity, activeSignalReview);
        const nextActionSummary = this.buildCommissionGateNextActionSummary(input.bindingAction, input.gateReviewDecision, input.blockingReasonCode ?? null, binding.nextActionSummary ?? null);

        binding.bindingAction = input.bindingAction;
        binding.baselineSelectionSource = input.baselineSelectionSource;
        binding.dataMaturityLevel = resolvedSignalInput.dataMaturityLevel;
        binding.costActionRecommendation = resolvedSignalInput.costActionRecommendation;
        binding.currentActionLevel = resolvedSignalInput.currentActionLevel;
        binding.referencedBaselineVersion = input.referencedBaselineVersion;
        binding.referencedSnapshotVersion = input.referencedSnapshotVersion;
        binding.nextActionSummary = nextActionSummary;
        binding.updatedBy = userId;

        const reviewRecord = this.commissionGateReviewRecordRepository.create({
            id: randomUUID(),
            bindingId: binding.id,
            gateReviewDecision: input.gateReviewDecision,
            blockingReasonCode: input.blockingReasonCode ?? null,
            summaryPackageKey: summarySnapshot.summaryPackageKey,
            summarySnapshotId: summarySnapshot.id,
            projectionLevel: summarySnapshot.projectionLevel,
            exportPolicy: summarySnapshot.exportPolicy,
            nextActionSummary,
            handledAt: new Date(),
            handledBy: userId,
            status: 'active',
            createdBy: userId,
            updatedBy: userId
        });

        const reviewsToSave = existingReviews.filter((record) => record.status === 'active');
        for (const record of reviewsToSave) {
            record.status = 'superseded';
            record.updatedBy = userId;
        }

        await this.operatingSignalToCommissionGateBindingRepository.save(binding);
        await this.commissionGateReviewRecordRepository.saveAll([...reviewsToSave, reviewRecord]);

        return {
            targetId: reviewRecord.id,
            bindingResultId: binding.id,
            gateReviewRecordId: reviewRecord.id,
            taxImpactSummary: binding.taxImpactSummary,
            taxImpactPendingAmount: this.toNullableDecimal(binding.taxImpactPendingAmount) ?? '0.0000',
            dataMaturityLevel: binding.dataMaturityLevel,
            costActionRecommendation: binding.costActionRecommendation as ReviewCommissionGateBindingResult['costActionRecommendation'],
            currentActionLevel: binding.currentActionLevel as ReviewCommissionGateBindingResult['currentActionLevel'],
            baselineSelectionSource: binding.baselineSelectionSource as ReviewCommissionGateBindingResult['baselineSelectionSource'],
            referencedBaselineVersion: binding.referencedBaselineVersion,
            referencedSnapshotVersion: binding.referencedSnapshotVersion,
            summaryPackageKey: reviewRecord.summaryPackageKey,
            summarySnapshotId: reviewRecord.summarySnapshotId,
            projectionLevel: reviewRecord.projectionLevel,
            exportPolicy: reviewRecord.exportPolicy,
            nextActionSummary: reviewRecord.nextActionSummary ?? null,
            businessStatusAfter: binding.bindingAction
        };
    }

    async getCommissionGateBinding(id: string): Promise<CommissionGateBindingHistoryView> {
        const binding = await this.operatingSignalToCommissionGateBindingRepository.findById(id);
        if (!binding) {
            throw new NotFoundException(`OperatingSignalToCommissionGateBinding ${id} not found`);
        }

        const evaluation = await this.operatingSignalEvaluationResultRepository.findById(binding.signalEvaluationId);
        if (!evaluation) {
            throw new NotFoundException(`OperatingSignalEvaluationResult ${binding.signalEvaluationId} not found for binding ${id}`);
        }

        const dataMaturity = await this.dataMaturityEvaluationResultRepository.findById(evaluation.dataMaturityEvaluationId);
        if (!dataMaturity) {
            throw new NotFoundException(`DataMaturityEvaluationResult ${evaluation.dataMaturityEvaluationId} not found for binding ${id}`);
        }

        const [activeSignalReview, reviewRecords] = await Promise.all([this.operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId(evaluation.id), this.commissionGateReviewRecordRepository.findByBindingId(binding.id)]);
        const latestGateReview = this.selectLatestCommissionGateReview(reviewRecords);
        const resolvedSignalInput = this.resolveSignalEvaluationInput(evaluation, dataMaturity, activeSignalReview);

        return {
            bindingId: binding.id,
            projectId: binding.projectId,
            signalEvaluationId: binding.signalEvaluationId,
            gateStageType: binding.gateStageType,
            signalLevel: evaluation.signalLevel,
            taxImpactSummary: binding.taxImpactSummary,
            taxImpactPendingAmount: this.toNullableDecimal(binding.taxImpactPendingAmount) ?? '0.0000',
            dataMaturityLevel: resolvedSignalInput.dataMaturityLevel,
            costActionRecommendation: resolvedSignalInput.costActionRecommendation,
            currentActionLevel: resolvedSignalInput.currentActionLevel,
            baselineSelectionSource: binding.baselineSelectionSource as CommissionGateBindingHistoryView['baselineSelectionSource'],
            referencedBaselineVersion: resolvedSignalInput.referencedBaselineVersion,
            referencedSnapshotVersion: resolvedSignalInput.referencedSnapshotVersion,
            bindingAction: binding.bindingAction as CommissionGateBindingHistoryView['bindingAction'],
            gateReviewDecision: latestGateReview?.gateReviewDecision ?? null,
            blockingReasonSummary: latestGateReview?.blockingReasonCode ?? null,
            summaryPackageKey: latestGateReview?.summaryPackageKey ?? null,
            summarySnapshotId: latestGateReview?.summarySnapshotId ?? null,
            projectionLevel: latestGateReview?.projectionLevel ?? null,
            exportPolicy: latestGateReview?.exportPolicy ?? null,
            nextActionSummary: latestGateReview?.nextActionSummary ?? binding.nextActionSummary ?? null,
            handledBy: latestGateReview?.handledBy ?? null,
            handledAt: latestGateReview ? this.toRequiredDateTime(latestGateReview.handledAt) : null,
            allowedActions: this.buildCommissionGateAllowedActions(
                binding.bindingAction,
                binding.taxImpactSummary,
                resolvedSignalInput.dataMaturityLevel,
                resolvedSignalInput.costActionRecommendation,
                resolvedSignalInput.referencedBaselineVersion,
                resolvedSignalInput.referencedSnapshotVersion
            )
        };
    }

    async getProjectBusinessOutcomeOverview(
        projectId: string,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `project-business-outcome-overview:${projectId}` }
    ): Promise<ProjectBusinessOutcomeOverviewView> {
        const context = await this.getCurrentProjectOperatingSignalContext(projectId);
        const effectiveContractSetSummary = this.toNullableDecimal(context.snapshot.effectiveContractTotal) ?? '0.0000';
        const receivableConfirmedAmountSummary = this.toNullableDecimal(context.snapshot.receivableConfirmedTotal) ?? '0.0000';
        const includedCostTotalSummary = this.toNullableDecimal(context.snapshot.includedCostTotal) ?? '0.0000';
        const currentEffectiveBaselineCostSummary = this.toNullableDecimal(context.snapshot.currentEffectiveBaselineCost) ?? '0.0000';
        const grossMarginAmount = this.toNullableDecimal(context.snapshot.grossMarginAmount) ?? '0.0000';
        const grossMarginRate = this.toNullableDecimal(context.snapshot.grossMarginRate);
        const taxImpactSummary = context.snapshot.taxImpactSummary;
        const {
            effectiveContractSetSummaryProjection,
            receivableConfirmedAmountSummaryProjection,
            includedCostTotalSummaryProjection,
            currentEffectiveBaselineCostSummaryProjection,
            grossMarginAmountProjection,
            grossMarginRateProjection,
            taxImpactSummaryProjection
        } = await this.projectOperatingFinanceFields(projectId, user, requestContext, [
            { key: 'effectiveContractSetSummaryProjection', rawValue: effectiveContractSetSummary },
            { key: 'receivableConfirmedAmountSummaryProjection', rawValue: receivableConfirmedAmountSummary },
            { key: 'includedCostTotalSummaryProjection', rawValue: includedCostTotalSummary },
            { key: 'currentEffectiveBaselineCostSummaryProjection', rawValue: currentEffectiveBaselineCostSummary },
            { key: 'grossMarginAmountProjection', rawValue: grossMarginAmount },
            { key: 'grossMarginRateProjection', rawValue: grossMarginRate },
            { key: 'taxImpactSummaryProjection', rawValue: taxImpactSummary }
        ]);

        return {
            projectId,
            effectiveContractSetSummaryProjection,
            receivableConfirmedAmountSummaryProjection,
            includedCostTotalSummaryProjection,
            currentEffectiveBaselineCostSummaryProjection,
            grossMarginAmountProjection,
            grossMarginRateProjection,
            taxImpactSummaryProjection,
            allocationStabilitySummary: context.evaluation.allocationStabilitySummary ?? context.dataMaturity.allocationStabilitySummary ?? null,
            unmappedCostSummary: context.evaluation.unmappedCostSummary ?? context.dataMaturity.unmappedCostSummary ?? null,
            dataMaturityLevel: context.resolvedSignalInput.dataMaturityLevel,
            currentActionLevel: context.resolvedSignalInput.currentActionLevel,
            referencedBaselineVersion: context.resolvedSignalInput.referencedBaselineVersion,
            referencedSnapshotVersion: context.resolvedSignalInput.referencedSnapshotVersion,
            allowedActions: this.buildOperatingSignalAllowedActions(context.evaluation.reviewRequired, context.resolvedSignalInput.currentActionLevel)
        };
    }

    async getProjectUnifiedAccounting(projectId: string, user: SensitiveProjectionUser = null, requestContext: SensitiveFieldProjectionRequestContext = { path: `project-unified-accounting:${projectId}` }): Promise<ProjectUnifiedAccountingView> {
        const context = await this.getCurrentProjectOperatingSignalContext(projectId);
        const originalBaselineCostSummary = this.toNullableDecimal(context.snapshot.originalBaselineCost) ?? '0.0000';
        const currentEffectiveBaselineCostSummary = this.toNullableDecimal(context.snapshot.currentEffectiveBaselineCost) ?? '0.0000';
        const includedCostTotalSummary = this.toNullableDecimal(context.snapshot.includedCostTotal) ?? '0.0000';
        const receivableConfirmedAmountSummary = this.toNullableDecimal(context.snapshot.receivableConfirmedTotal) ?? '0.0000';
        const taxImpactSummary = context.snapshot.taxImpactSummary;
        const taxImpactPendingAmount = this.toNullableDecimal(context.snapshot.taxImpactPendingAmount) ?? '0.0000';
        const { originalBaselineCostSummaryProjection, currentEffectiveBaselineCostSummaryProjection, includedCostTotalSummaryProjection, receivableConfirmedAmountSummaryProjection, taxImpactSummaryProjection, taxImpactPendingAmountProjection } =
            await this.projectOperatingFinanceFields(projectId, user, requestContext, [
                { key: 'originalBaselineCostSummaryProjection', rawValue: originalBaselineCostSummary },
                { key: 'currentEffectiveBaselineCostSummaryProjection', rawValue: currentEffectiveBaselineCostSummary },
                { key: 'includedCostTotalSummaryProjection', rawValue: includedCostTotalSummary },
                { key: 'receivableConfirmedAmountSummaryProjection', rawValue: receivableConfirmedAmountSummary },
                { key: 'taxImpactSummaryProjection', rawValue: taxImpactSummary },
                { key: 'taxImpactPendingAmountProjection', rawValue: taxImpactPendingAmount }
            ]);

        return {
            projectId,
            snapshotId: context.snapshot.id,
            originalBaselineCostSummaryProjection,
            currentEffectiveBaselineCostSummaryProjection,
            includedCostTotalSummaryProjection,
            receivableConfirmedAmountSummaryProjection,
            taxImpactSummaryProjection,
            taxImpactPendingAmountProjection,
            allocationStabilitySummary: context.evaluation.allocationStabilitySummary ?? context.dataMaturity.allocationStabilitySummary ?? null,
            unmappedCostSummary: context.evaluation.unmappedCostSummary ?? context.dataMaturity.unmappedCostSummary ?? null,
            dataMaturityLevel: context.resolvedSignalInput.dataMaturityLevel,
            costActionRecommendation: context.resolvedSignalInput.costActionRecommendation,
            referencedBaselineVersion: context.resolvedSignalInput.referencedBaselineVersion,
            referencedSnapshotVersion: context.resolvedSignalInput.referencedSnapshotVersion,
            allowedActions: this.buildOperatingSignalAllowedActions(context.evaluation.reviewRequired, context.resolvedSignalInput.currentActionLevel)
        };
    }

    async getProjectVarianceRiskExplanation(
        projectId: string,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `project-variance-risk-explanation:${projectId}` }
    ): Promise<ProjectVarianceRiskExplanationView> {
        const context = await this.getCurrentProjectOperatingSignalContext(projectId);
        const varianceSourceSummary = context.evaluation.varianceSourceSummary;
        const taxImpactSummary = context.evaluation.taxImpactSummary;
        const { varianceSourceSummaryProjection, taxImpactSummaryProjection } = await this.projectOperatingFinanceFields(projectId, user, requestContext, [
            { key: 'varianceSourceSummaryProjection', rawValue: varianceSourceSummary },
            { key: 'taxImpactSummaryProjection', rawValue: taxImpactSummary }
        ]);

        return {
            projectId,
            signalEvaluationId: context.evaluation.id,
            varianceSourceSummaryProjection,
            riskLevel: context.evaluation.riskLevel,
            taxImpactSummaryProjection,
            allocationStabilitySummary: context.evaluation.allocationStabilitySummary ?? context.dataMaturity.allocationStabilitySummary ?? null,
            unmappedCostSummary: context.evaluation.unmappedCostSummary ?? context.dataMaturity.unmappedCostSummary ?? null,
            dataMaturityLevel: context.resolvedSignalInput.dataMaturityLevel,
            costActionRecommendation: context.resolvedSignalInput.costActionRecommendation,
            currentActionLevel: context.resolvedSignalInput.currentActionLevel,
            referencedBaselineVersion: context.resolvedSignalInput.referencedBaselineVersion,
            referencedSnapshotVersion: context.resolvedSignalInput.referencedSnapshotVersion,
            recommendedActionSummary: context.evaluation.recommendedActionSummary ?? null,
            allowedActions: this.buildOperatingSignalAllowedActions(context.evaluation.reviewRequired, context.resolvedSignalInput.currentActionLevel)
        };
    }

    async getBusinessAccountingFeedback(
        projectId: string,
        user: SensitiveProjectionUser = null,
        requestContext: SensitiveFieldProjectionRequestContext = { path: `business-accounting-feedback:${projectId}` }
    ): Promise<BusinessAccountingFeedbackView> {
        const context = await this.getCurrentProjectOperatingSignalContext(projectId);
        const bindings = await this.operatingSignalToCommissionGateBindingRepository.findActiveByProject(projectId);
        if (bindings.length === 0) {
            throw new NotFoundException(`No active OperatingSignalToCommissionGateBinding found for project ${projectId}`);
        }

        const selectedBinding = this.selectMostSevereBinding(bindings);
        const selectedEvaluation = await this.operatingSignalEvaluationResultRepository.findById(selectedBinding.signalEvaluationId);
        if (!selectedEvaluation) {
            throw new NotFoundException(`OperatingSignalEvaluationResult ${selectedBinding.signalEvaluationId} not found for project ${projectId}`);
        }

        const mostSevereBindings = bindings.filter((binding) => this.getActionSeverity(binding.bindingAction) === this.getActionSeverity(selectedBinding.bindingAction));
        const taxImpactSummary = selectedBinding.taxImpactSummary;
        const nextActionSummary = this.combineSummaries(mostSevereBindings.map((binding) => binding.nextActionSummary ?? null));
        const downstreamConsumerSummary = this.combineSummaries(mostSevereBindings.map((binding) => binding.downstreamConsumerSummary ?? null));
        const { taxImpactSummaryProjection, nextActionSummaryProjection, downstreamConsumerSummaryProjection } = await this.projectOperatingFinanceFields(projectId, user, requestContext, [
            { key: 'taxImpactSummaryProjection', rawValue: taxImpactSummary },
            { key: 'nextActionSummaryProjection', rawValue: nextActionSummary },
            { key: 'downstreamConsumerSummaryProjection', rawValue: downstreamConsumerSummary }
        ]);

        return {
            projectId,
            signalLevel: selectedEvaluation.signalLevel,
            currentActionLevel: context.resolvedSignalInput.currentActionLevel,
            taxImpactSummaryProjection,
            allocationStabilitySummary: selectedBinding.allocationStabilitySummary ?? null,
            unmappedCostSummary: selectedBinding.unmappedCostSummary ?? null,
            dataMaturityLevel: context.resolvedSignalInput.dataMaturityLevel,
            costActionRecommendation: context.resolvedSignalInput.costActionRecommendation,
            referencedBaselineVersion: context.resolvedSignalInput.referencedBaselineVersion,
            referencedSnapshotVersion: context.resolvedSignalInput.referencedSnapshotVersion,
            nextActionSummaryProjection,
            downstreamConsumerSummaryProjection,
            allowedActions: this.buildCommissionGateAllowedActions(
                selectedBinding.bindingAction,
                selectedBinding.taxImpactSummary,
                context.resolvedSignalInput.dataMaturityLevel,
                context.resolvedSignalInput.costActionRecommendation,
                context.resolvedSignalInput.referencedBaselineVersion,
                context.resolvedSignalInput.referencedSnapshotVersion
            )
        };
    }

    async registerLaborCostRecord(projectId: string, input: CreateLaborProjectActualCostRecordRequest, userId: string): Promise<CommandResult> {
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
            projectId,
            recordNo: await this.businessNumberService.next('cost-labor'),
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

    async replaceLaborCostRecord(supersededRecordId: string, input: ReplaceLaborCostRecordRequest, userId: string): Promise<CommandResult> {
        const laborPeriodStart = this.parseDateOnly(input.laborPeriodStart, 'laborPeriodStart');
        const laborPeriodEnd = this.parseDateOnly(input.laborPeriodEnd, 'laborPeriodEnd');
        this.assertDateRange(laborPeriodStart, laborPeriodEnd, 'laborPeriodStart', 'laborPeriodEnd');

        const originalRecord = await this.projectActualCostRecordRepository.findById(supersededRecordId);
        if (!originalRecord) {
            throw new NotFoundException(`Record ${supersededRecordId} not found`);
        }

        if (input.expectedSupersededRecordVersion && originalRecord.rowVersion !== input.expectedSupersededRecordVersion) {
            throw new ConflictException(`Optimistic locking failed for record ${supersededRecordId}`);
        }

        if (originalRecord.isIncludedInProjectCost) {
            throw new ConflictException(`Record ${supersededRecordId} is already included in project cost`);
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
            recordNo: await this.businessNumberService.next('cost-labor'),
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
        if (invoiceRecord.invoiceType !== InvoiceRecordTypeValue.Input) {
            throw new ConflictException(`Only input invoices can be mapped into project actual cost records`);
        }
        if (invoiceRecord.status !== InvoiceRecordStatusValue.Verified) {
            throw new ConflictException(`InvoiceRecord ${invoiceRecord.id} is not verified`);
        }
        if (invoiceRecord.exceptionStatus === InvoiceRecordExceptionStatusValue.Open) {
            throw new ConflictException(`InvoiceRecord ${invoiceRecord.id} still has an open exception`);
        }
    }

    private assertExpenseEligibleForCostMapping(expenseRecord: ExpenseRecord): void {
        if (expenseRecord.status !== ExpenseRecordStatusValue.Confirmed) {
            throw new ConflictException(`ExpenseRecord ${expenseRecord.id} is not confirmed`);
        }
    }

    private assertPayableEligibleForCostMapping(payableRecord: PayableRecord): void {
        if (payableRecord.status === PayableRecordStatusValue.Draft || payableRecord.status === PayableRecordStatusValue.Voided) {
            throw new ConflictException(`PayableRecord ${payableRecord.id} is not in a formal commitment state`);
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

    private assertExpenseAmountsConsistent(amountIncludingTax: string | number, taxAmount: string | number | null | undefined, amountExcludingTax: string | number | null | undefined): void {
        const total = this.parsePositiveDecimal(amountIncludingTax, 'amountIncludingTax');
        const tax = taxAmount == null ? null : this.parseNonNegativeDecimal(taxAmount, 'taxAmount');
        const excluding = amountExcludingTax == null ? null : this.parseNonNegativeDecimal(amountExcludingTax, 'amountExcludingTax');

        if (tax !== null && excluding !== null && Math.abs(total - (tax + excluding)) > 0.0001) {
            throw new UnprocessableEntityException('amountIncludingTax must equal taxAmount + amountExcludingTax when both fields are provided');
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
            recordNo: record.recordNo,
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

    private toOperatingBaselinePackageSummary(entity: OperatingBaselinePackage): OperatingBaselinePackageSummary {
        return {
            id: entity.id,
            projectId: entity.projectId,
            originalBaselineCost: this.toNullableDecimal(entity.originalBaselineCost) ?? '0.0000',
            changePackageTotal: this.toNullableDecimal(entity.changePackageTotal) ?? '0.0000',
            currentEffectiveBaselineCost: this.toNullableDecimal(entity.currentEffectiveBaselineCost) ?? '0.0000',
            baselineSelectionSource: entity.baselineSelectionSource as OperatingBaselinePackageSummary['baselineSelectionSource'],
            effectiveOperatingBaselineId: entity.effectiveOperatingBaselineId ?? null,
            baselineSummary: entity.baselineSummary ?? null,
            isCurrent: entity.isCurrent,
            status: entity.status as OperatingBaselinePackageSummary['status'],
            effectiveAt: this.toNullableDateTime(entity.effectiveAt),
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private toProjectOperatingSnapshotSummary(entity: ProjectOperatingSnapshot): ProjectOperatingSnapshotSummary {
        return {
            id: entity.id,
            projectId: entity.projectId,
            snapshotMode: entity.snapshotMode as ProjectOperatingSnapshotSummary['snapshotMode'],
            snapshotAt: this.toRequiredDateTime(entity.snapshotAt),
            sourceWindowStart: this.toNullableDate(entity.sourceWindowStart),
            sourceWindowEnd: this.toNullableDate(entity.sourceWindowEnd),
            effectiveContractTotal: this.toNullableDecimal(entity.effectiveContractTotal) ?? '0.0000',
            receivableConfirmedTotal: this.toNullableDecimal(entity.receivableConfirmedTotal) ?? '0.0000',
            includedCostTotal: this.toNullableDecimal(entity.includedCostTotal) ?? '0.0000',
            originalBaselineCost: this.toNullableDecimal(entity.originalBaselineCost) ?? '0.0000',
            currentEffectiveBaselineCost: this.toNullableDecimal(entity.currentEffectiveBaselineCost) ?? '0.0000',
            grossMarginAmount: this.toNullableDecimal(entity.grossMarginAmount) ?? '0.0000',
            grossMarginRate: this.toNullableDecimal(entity.grossMarginRate),
            taxImpactSummary: entity.taxImpactSummary,
            taxImpactPendingAmount: this.toNullableDecimal(entity.taxImpactPendingAmount) ?? '0.0000',
            allocationStabilitySummary: entity.allocationStabilitySummary ?? null,
            unmappedCostSummary: entity.unmappedCostSummary ?? null,
            currentActionLevel: entity.currentActionLevel as ProjectOperatingSnapshotSummary['currentActionLevel'],
            referencedBaselineVersion: entity.referencedBaselineVersion,
            baselineSelectionSource: entity.baselineSelectionSource as ProjectOperatingSnapshotSummary['baselineSelectionSource'],
            handoverRebaselineRecordId: entity.handoverRebaselineRecordId ?? null,
            status: entity.status as ProjectOperatingSnapshotSummary['status'],
            supersedesId: entity.supersedesId ?? null,
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private toPeriodClosingSnapshotSummary(entity: PeriodClosingSnapshot): PeriodClosingSnapshotSummary {
        return {
            id: entity.id,
            projectId: entity.projectId,
            periodKey: entity.periodKey,
            snapshotMode: 'period-end',
            snapshotAt: this.toRequiredDateTime(entity.snapshotAt),
            effectiveContractTotal: this.toNullableDecimal(entity.effectiveContractTotal) ?? '0.0000',
            receivableConfirmedTotal: this.toNullableDecimal(entity.receivableConfirmedTotal) ?? '0.0000',
            includedCostTotal: this.toNullableDecimal(entity.includedCostTotal) ?? '0.0000',
            originalBaselineCost: this.toNullableDecimal(entity.originalBaselineCost) ?? '0.0000',
            currentEffectiveBaselineCost: this.toNullableDecimal(entity.currentEffectiveBaselineCost) ?? '0.0000',
            grossMarginAmount: this.toNullableDecimal(entity.grossMarginAmount) ?? '0.0000',
            grossMarginRate: this.toNullableDecimal(entity.grossMarginRate),
            taxImpactSummary: entity.taxImpactSummary,
            taxImpactPendingAmount: this.toNullableDecimal(entity.taxImpactPendingAmount) ?? '0.0000',
            allocationStabilitySummary: entity.allocationStabilitySummary ?? null,
            unmappedCostSummary: entity.unmappedCostSummary ?? null,
            currentActionLevel: entity.currentActionLevel as PeriodClosingSnapshotSummary['currentActionLevel'],
            referencedBaselineVersion: entity.referencedBaselineVersion,
            baselineSelectionSource: entity.baselineSelectionSource as PeriodClosingSnapshotSummary['baselineSelectionSource'],
            handoverRebaselineRecordId: entity.handoverRebaselineRecordId ?? null,
            status: entity.status as PeriodClosingSnapshotSummary['status'],
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private toOperatingRestatementSummary(entity: OperatingRestatementRecord): OperatingRestatementSummary {
        return {
            id: entity.id,
            projectId: entity.projectId,
            periodEndSnapshotId: entity.periodEndSnapshotId,
            restatesSnapshotId: entity.restatesSnapshotId,
            restatedSnapshotId: entity.restatedSnapshotId,
            restatementReason: entity.restatementReason,
            restatementSummary: entity.restatementSummary,
            status: entity.status as OperatingRestatementSummary['status'],
            handledAt: this.toRequiredDateTime(entity.handledAt),
            handledBy: entity.handledBy ?? null,
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private toSharedCostAllocationBasisSummary(entity: SharedCostAllocationBasis, results: SharedCostAllocationResult[]): SharedCostAllocationBasisSummary {
        return {
            id: entity.id,
            sourceCostScopeKey: entity.sourceCostScopeKey,
            basisType: entity.basisType,
            allocationMethod: entity.allocationMethod,
            basisSummary: entity.basisSummary ?? null,
            status: entity.status as SharedCostAllocationBasisSummary['status'],
            effectiveAt: this.toNullableDateTime(entity.effectiveAt),
            effectiveBy: entity.effectiveBy ?? null,
            supersedesId: entity.supersedesId ?? null,
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt),
            results: results.map((result) => this.toSharedCostAllocationResultSummary(result))
        };
    }

    private toSharedCostAllocationResultSummary(entity: SharedCostAllocationResult): SharedCostAllocationResultSummary {
        return {
            id: entity.id,
            basisId: entity.basisId,
            projectId: entity.projectId,
            allocatedAmount: this.toNullableDecimal(entity.allocatedAmount) ?? '0.0000',
            allocationRatio: this.toNullableDecimal(entity.allocationRatio),
            allocationSummary: entity.allocationSummary ?? null,
            status: entity.status as SharedCostAllocationResultSummary['status'],
            effectiveAt: this.toNullableDateTime(entity.effectiveAt),
            supersedesId: entity.supersedesId ?? null,
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private toCostStageAttributionSnapshotSummary(entity: CostStageAttributionSnapshot): CostStageAttributionSnapshotSummary {
        return {
            id: entity.id,
            costRecordId: entity.costRecordId,
            attributedStage: entity.attributedStage,
            attributionMode: entity.attributionMode as CostStageAttributionSnapshotSummary['attributionMode'],
            lockedBySnapshotId: entity.lockedBySnapshotId ?? null,
            attributionSummary: entity.attributionSummary ?? null,
            status: entity.status as CostStageAttributionSnapshotSummary['status'],
            supersedesId: entity.supersedesId ?? null,
            handledAt: this.toNullableDateTime(entity.handledAt),
            handledBy: entity.handledBy ?? null,
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private toAccountingTaxTreatmentSnapshotSummary(entity: AccountingTaxTreatmentSnapshot): AccountingTaxTreatmentSnapshotSummary {
        return {
            id: entity.id,
            projectId: entity.projectId,
            taxTreatmentType: entity.taxTreatmentType,
            deductibilityStatus: entity.deductibilityStatus,
            taxImpactAmount: this.toNullableDecimal(entity.taxImpactAmount) ?? '0.0000',
            taxPendingFlag: entity.taxPendingFlag,
            taxImpactSummary: entity.taxImpactSummary,
            taxImpactPendingAmount: this.toNullableDecimal(entity.taxImpactPendingAmount) ?? '0.0000',
            basisSummary: entity.basisSummary ?? null,
            status: entity.status as AccountingTaxTreatmentSnapshotSummary['status'],
            supersedesId: entity.supersedesId ?? null,
            confirmedAt: this.toNullableDateTime(entity.confirmedAt),
            confirmedBy: entity.confirmedBy ?? null,
            rowVersion: entity.rowVersion,
            createdAt: this.toRequiredDateTime(entity.createdAt),
            updatedAt: this.toRequiredDateTime(entity.updatedAt)
        };
    }

    private calculateOperatingSnapshotAmounts(input: { effectiveContractTotal: string; receivableConfirmedTotal: string; includedCostTotal: string; originalBaselineCost: string; currentEffectiveBaselineCost: string }): {
        effectiveContractTotal: string;
        receivableConfirmedTotal: string;
        includedCostTotal: string;
        originalBaselineCost: string;
        currentEffectiveBaselineCost: string;
        grossMarginAmount: string;
        grossMarginRate: string | null;
    } {
        const effectiveContractTotal = this.parseNonNegativeDecimal(input.effectiveContractTotal, 'effectiveContractTotal');
        const receivableConfirmedTotal = this.parseNonNegativeDecimal(input.receivableConfirmedTotal, 'receivableConfirmedTotal');
        const includedCostTotal = this.parseNonNegativeDecimal(input.includedCostTotal, 'includedCostTotal');
        const originalBaselineCost = this.parseNonNegativeDecimal(input.originalBaselineCost, 'originalBaselineCost');
        const currentEffectiveBaselineCost = this.parseNonNegativeDecimal(input.currentEffectiveBaselineCost, 'currentEffectiveBaselineCost');
        const grossMarginAmount = effectiveContractTotal - includedCostTotal;

        return {
            effectiveContractTotal: this.formatAmount(effectiveContractTotal),
            receivableConfirmedTotal: this.formatAmount(receivableConfirmedTotal),
            includedCostTotal: this.formatAmount(includedCostTotal),
            originalBaselineCost: this.formatAmount(originalBaselineCost),
            currentEffectiveBaselineCost: this.formatAmount(currentEffectiveBaselineCost),
            grossMarginAmount: this.formatAmount(grossMarginAmount),
            grossMarginRate: effectiveContractTotal === 0 ? null : this.formatRate(grossMarginAmount / effectiveContractTotal)
        };
    }

    private mergeRestatedSnapshotValues(
        current: ProjectOperatingSnapshot,
        overrides: CreateOperatingRestatementRequest['restatedValues']
    ): {
        sourceWindowStart: string | null;
        sourceWindowEnd: string | null;
        effectiveContractTotal: string;
        receivableConfirmedTotal: string;
        includedCostTotal: string;
        originalBaselineCost: string;
        currentEffectiveBaselineCost: string;
        grossMarginAmount: string;
        grossMarginRate: string | null;
        taxImpactSummary: string;
        taxImpactPendingAmount: string;
        allocationStabilitySummary: string | null;
        unmappedCostSummary: string | null;
        currentActionLevel: string;
        referencedBaselineVersion: string;
        baselineSelectionSource: string;
        handoverRebaselineRecordId: string | null;
    } {
        const amountInput = {
            effectiveContractTotal: overrides.effectiveContractTotal ?? this.toNullableDecimal(current.effectiveContractTotal) ?? '0',
            receivableConfirmedTotal: overrides.receivableConfirmedTotal ?? this.toNullableDecimal(current.receivableConfirmedTotal) ?? '0',
            includedCostTotal: overrides.includedCostTotal ?? this.toNullableDecimal(current.includedCostTotal) ?? '0',
            originalBaselineCost: overrides.originalBaselineCost ?? this.toNullableDecimal(current.originalBaselineCost) ?? '0',
            currentEffectiveBaselineCost: overrides.currentEffectiveBaselineCost ?? this.toNullableDecimal(current.currentEffectiveBaselineCost) ?? '0'
        };
        const calculated = this.calculateOperatingSnapshotAmounts(amountInput);

        return {
            ...calculated,
            sourceWindowStart: overrides.sourceWindowStart === undefined ? this.toNullableDate(current.sourceWindowStart) : overrides.sourceWindowStart,
            sourceWindowEnd: overrides.sourceWindowEnd === undefined ? this.toNullableDate(current.sourceWindowEnd) : overrides.sourceWindowEnd,
            taxImpactSummary: overrides.taxImpactSummary ?? current.taxImpactSummary,
            taxImpactPendingAmount: this.formatAmount(this.parseNonNegativeDecimal(overrides.taxImpactPendingAmount ?? this.toNullableDecimal(current.taxImpactPendingAmount) ?? '0', 'taxImpactPendingAmount')),
            allocationStabilitySummary: overrides.allocationStabilitySummary === undefined ? (current.allocationStabilitySummary ?? null) : overrides.allocationStabilitySummary,
            unmappedCostSummary: overrides.unmappedCostSummary === undefined ? (current.unmappedCostSummary ?? null) : overrides.unmappedCostSummary,
            currentActionLevel: overrides.currentActionLevel ?? current.currentActionLevel,
            referencedBaselineVersion: overrides.referencedBaselineVersion ?? current.referencedBaselineVersion,
            baselineSelectionSource: overrides.baselineSelectionSource ?? current.baselineSelectionSource,
            handoverRebaselineRecordId: overrides.handoverRebaselineRecordId === undefined ? (current.handoverRebaselineRecordId ?? null) : overrides.handoverRebaselineRecordId
        };
    }

    private buildSourceStatusSummary(
        record: ProjectActualCostRecord,
        paymentRecord: PaymentRecord | null,
        invoiceRecord: InvoiceRecord | null,
        expenseRecord: ExpenseRecord | null,
        payableRecord: PayableRecord | null,
        rateVersion: InternalCostRateVersion | null
    ): string | null {
        if (paymentRecord) {
            return `PaymentRecord:${paymentRecord.status}`;
        }
        if (invoiceRecord) {
            return `InvoiceRecord:${invoiceRecord.status}/${invoiceRecord.exceptionStatus}`;
        }
        if (expenseRecord) {
            return `ExpenseRecord:${expenseRecord.status}`;
        }
        if (payableRecord) {
            return `PayableRecord:${payableRecord.status}`;
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
        expenseRecord: ExpenseRecord | null,
        payableRecord: PayableRecord | null,
        rateVersion: InternalCostRateVersion | null
    ): string | null {
        if (paymentRecord) {
            return this.toIsoDate(paymentRecord.paymentDate);
        }
        if (invoiceRecord) {
            return this.toIsoDate(invoiceRecord.invoiceDate);
        }
        if (expenseRecord) {
            return this.toIsoDate(expenseRecord.expenseDate);
        }
        if (payableRecord) {
            return this.toIsoDate(payableRecord.expectedPaymentDate);
        }
        if (record.laborPeriodStart || record.laborPeriodEnd) {
            return `${this.toNullableDate(record.laborPeriodStart) ?? '-'} ~ ${this.toNullableDate(record.laborPeriodEnd) ?? '-'}`;
        }
        if (rateVersion) {
            return `${this.toIsoDate(rateVersion.effectiveFrom)} ~ ${this.toNullableDate(rateVersion.effectiveTo) ?? 'open'}`;
        }
        return null;
    }

    private buildMeasurementBasisSummary(record: ProjectActualCostRecord, paymentRecord: PaymentRecord | null, invoiceRecord: InvoiceRecord | null, expenseRecord: ExpenseRecord | null, payableRecord: PayableRecord | null): string | null {
        if (paymentRecord) {
            return `${this.formatAmount(this.toNumber(paymentRecord.amountExcludingTax))} ${record.currency} ex-tax @ ${this.toIsoDate(paymentRecord.paymentDate)}`;
        }
        if (invoiceRecord) {
            return `${this.formatAmount(this.toNumber(invoiceRecord.invoiceAmount))} ${record.currency} @ ${this.toIsoDate(invoiceRecord.invoiceDate)}`;
        }
        if (expenseRecord) {
            return `${this.formatAmount(this.toNumber(expenseRecord.amountIncludingTax))} ${record.currency} @ ${this.toIsoDate(expenseRecord.expenseDate)}`;
        }
        if (payableRecord) {
            return `${this.formatAmount(this.toNumber(payableRecord.amountExcludingTax))} ${record.currency} ex-tax @ ${this.toIsoDate(payableRecord.expectedPaymentDate)}`;
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

    private buildExpenseAllowedActions(record: ExpenseRecord, hasCurrentCostMapping: boolean): string[] {
        if (hasCurrentCostMapping) {
            return [];
        }
        if (record.status === ExpenseRecordStatusValue.Recorded) {
            return ['update', 'confirm', 'void'];
        }
        if (record.status === ExpenseRecordStatusValue.Confirmed) {
            return ['void'];
        }
        return [];
    }

    private resolveSignalEvaluationInput(
        evaluation: OperatingSignalEvaluationResult,
        dataMaturity: DataMaturityEvaluationResult,
        reviewRecord: OperatingSignalReviewRecord | null
    ): {
        dataMaturityLevel: string;
        costActionRecommendation: OperatingSignalEvaluationView['costActionRecommendation'];
        currentActionLevel: OperatingSignalEvaluationView['currentActionLevel'];
        referencedBaselineVersion: string;
        referencedSnapshotVersion: string;
    } {
        return {
            dataMaturityLevel: reviewRecord?.resolvedDataMaturityLevel ?? dataMaturity.dataMaturityLevel,
            costActionRecommendation: (reviewRecord?.resolvedCostActionRecommendation ?? dataMaturity.costActionRecommendation) as OperatingSignalEvaluationView['costActionRecommendation'],
            currentActionLevel: (reviewRecord?.resolvedCurrentActionLevel ?? evaluation.currentActionLevel) as OperatingSignalEvaluationView['currentActionLevel'],
            referencedBaselineVersion: reviewRecord?.referencedBaselineVersion ?? evaluation.referencedBaselineVersion,
            referencedSnapshotVersion: reviewRecord?.referencedSnapshotVersion ?? evaluation.referencedSnapshotVersion
        };
    }

    private resolveReviewedCurrentActionLevel(
        evaluation: OperatingSignalEvaluationResult,
        dataMaturity: DataMaturityEvaluationResult,
        resolvedDataMaturityLevel: string,
        costActionRecommendation: ReviewOperatingSignalEvaluationResult['costActionRecommendation']
    ): ReviewOperatingSignalEvaluationResult['currentActionLevel'] {
        const candidates = [
            costActionRecommendation,
            this.mapDataMaturityLevelToActionLevel(resolvedDataMaturityLevel),
            this.mapRiskLevelToActionLevel(evaluation.riskLevel),
            this.normalizeActionLevel(evaluation.formulaBoundaryAction),
            this.normalizeActionLevel(evaluation.currentActionLevel),
            this.normalizeActionLevel(dataMaturity.costActionRecommendation)
        ];

        return this.resolveHighestActionLevel(candidates);
    }

    private buildOperatingSignalReviewSummary(reviewRecord: OperatingSignalReviewRecord | null): string | null {
        if (!reviewRecord) {
            return null;
        }

        const segments = [reviewRecord.reviewDecision, reviewRecord.resolvedDataMaturityLevel ?? null, reviewRecord.resolvedCostActionRecommendation ?? null, reviewRecord.reviewComment ?? null].filter((value): value is string =>
            Boolean(value && value.trim().length > 0)
        );

        return segments.length === 0 ? null : segments.join(' | ');
    }

    private assertGateBindingReviewable(binding: OperatingSignalToCommissionGateBinding): void {
        if (binding.bindingAction === 'PROMPT') {
            throw new ConflictException(`OperatingSignalToCommissionGateBinding ${binding.id} does not require gate review`);
        }
    }

    private assertCommissionGateReviewPayload(input: ReviewCommissionGateBindingRequest): void {
        const decision = input.gateReviewDecision.trim().toUpperCase();
        if ((input.bindingAction === 'BLOCK' || decision.includes('BLOCK')) && !input.blockingReasonCode) {
            throw new UnprocessableEntityException('blockingReasonCode is required when the gate review result is BLOCK');
        }
    }

    private assertApprovalSummarySnapshot(summarySnapshot: ApprovalSummarySnapshot | null, summaryPackageKey: string, summarySnapshotId: string): asserts summarySnapshot is ApprovalSummarySnapshot {
        if (!summarySnapshot) {
            throw new NotFoundException(`ApprovalSummarySnapshot ${summarySnapshotId} not found`);
        }
        if (summarySnapshot.status !== 'active') {
            throw new ConflictException(`ApprovalSummarySnapshot ${summarySnapshotId} is not active`);
        }
        if (summarySnapshot.summaryPackageKey !== summaryPackageKey) {
            throw new ConflictException(`ApprovalSummarySnapshot ${summarySnapshotId} does not match summaryPackageKey ${summaryPackageKey}`);
        }
    }

    private buildCommissionGateNextActionSummary(bindingAction: ReviewCommissionGateBindingRequest['bindingAction'], gateReviewDecision: string, blockingReasonCode: string | null, fallbackSummary: string | null): string | null {
        if (bindingAction === 'BLOCK') {
            return blockingReasonCode ? `BLOCK: ${blockingReasonCode}` : (fallbackSummary ?? `BLOCK: ${gateReviewDecision}`);
        }

        if (bindingAction === 'REVIEW') {
            return fallbackSummary ?? `REVIEW: ${gateReviewDecision}`;
        }

        return fallbackSummary ?? `PROMPT: ${gateReviewDecision}`;
    }

    private selectLatestCommissionGateReview(reviewRecords: CommissionGateReviewRecord[]): CommissionGateReviewRecord | null {
        if (reviewRecords.length === 0) {
            return null;
        }

        return reviewRecords.find((record) => record.status === 'active') ?? reviewRecords[0];
    }

    private async getCurrentProjectOperatingSignalContext(projectId: string): Promise<{
        snapshot: ProjectOperatingSnapshot;
        dataMaturity: DataMaturityEvaluationResult;
        evaluation: OperatingSignalEvaluationResult;
        activeSignalReview: OperatingSignalReviewRecord | null;
        resolvedSignalInput: {
            dataMaturityLevel: string;
            costActionRecommendation: OperatingSignalEvaluationView['costActionRecommendation'];
            currentActionLevel: OperatingSignalEvaluationView['currentActionLevel'];
            referencedBaselineVersion: string;
            referencedSnapshotVersion: string;
        };
    }> {
        const snapshot = await this.projectOperatingSnapshotRepository.findLatestActiveByProject(projectId);
        if (!snapshot) {
            throw new NotFoundException(`No active ProjectOperatingSnapshot found for project ${projectId}`);
        }

        const [dataMaturity, evaluation] = await Promise.all([
            this.dataMaturityEvaluationResultRepository.findActiveByProjectAndSnapshot(projectId, snapshot.id),
            this.operatingSignalEvaluationResultRepository.findActiveByProjectAndSnapshot(projectId, snapshot.id)
        ]);

        if (!dataMaturity) {
            throw new NotFoundException(`No active DataMaturityEvaluationResult found for project ${projectId} snapshot ${snapshot.id}`);
        }
        if (!evaluation) {
            throw new NotFoundException(`No active OperatingSignalEvaluationResult found for project ${projectId} snapshot ${snapshot.id}`);
        }

        const activeSignalReview = await this.operatingSignalReviewRecordRepository.findActiveBySignalEvaluationId(evaluation.id);

        return {
            snapshot,
            dataMaturity,
            evaluation,
            activeSignalReview,
            resolvedSignalInput: this.resolveSignalEvaluationInput(evaluation, dataMaturity, activeSignalReview)
        };
    }

    private buildOperatingSignalAllowedActions(reviewRequired: boolean, currentActionLevel: string): string[] {
        if (reviewRequired || this.getActionSeverity(currentActionLevel) >= this.getActionSeverity('REVIEW')) {
            return ['reviewOperatingSignalEvaluation'];
        }
        return [];
    }

    private buildCommissionGateAllowedActions(
        bindingAction: string,
        taxImpactSummary: string | null,
        dataMaturityLevel: string | null,
        costActionRecommendation: string | null,
        referencedBaselineVersion: string | null,
        referencedSnapshotVersion: string | null
    ): string[] {
        const hasStablePackage = Boolean(taxImpactSummary && dataMaturityLevel && costActionRecommendation && referencedBaselineVersion && referencedSnapshotVersion);

        if (!hasStablePackage) {
            return ['reviewCommissionGateBinding'];
        }

        if (this.getActionSeverity(bindingAction) >= this.getActionSeverity('REVIEW')) {
            return ['reviewCommissionGateBinding'];
        }

        return [];
    }

    private selectMostSevereBinding(bindings: OperatingSignalToCommissionGateBinding[]): OperatingSignalToCommissionGateBinding {
        const [selectedBinding] = [...bindings].sort((left, right) => {
            const severityDiff = this.getActionSeverity(right.bindingAction) - this.getActionSeverity(left.bindingAction);
            if (severityDiff !== 0) {
                return severityDiff;
            }

            return this.toDate(right.generatedAt).getTime() - this.toDate(left.generatedAt).getTime();
        });
        if (!selectedBinding) {
            throw new NotFoundException('No active OperatingSignalToCommissionGateBinding available for selection');
        }

        return selectedBinding;
    }

    private projectOperatingFinanceFields<TKey extends string>(
        projectId: string,
        user: SensitiveProjectionUser,
        requestContext: SensitiveFieldProjectionRequestContext,
        fields: readonly { key: TKey; rawValue: string | null }[]
    ): Promise<Record<TKey, SensitiveStringFieldProjection>> {
        return this.sensitiveFieldProjectionService.projectStringFields({
            fieldPackageKey: 'operating-finance',
            fields,
            user,
            targetType: 'Project',
            targetId: projectId,
            requestContext
        });
    }

    private combineSummaries(summaries: Array<string | null>): string | null {
        const unique = [...new Set(summaries.filter((value): value is string => Boolean(value && value.trim().length > 0)))];
        return unique.length === 0 ? null : unique.join('；');
    }

    private mapDataMaturityLevelToActionLevel(value: string | null | undefined): OperatingSignalEvaluationView['currentActionLevel'] | null {
        const normalized = value?.trim();
        if (!normalized) {
            return null;
        }

        if (normalized === '数据不足' || normalized.toUpperCase() === 'INSUFFICIENT') {
            return 'REVIEW';
        }

        if (normalized === '初步可看' || normalized.toUpperCase() === 'PRELIMINARY') {
            return 'PROMPT';
        }

        return this.normalizeActionLevel(normalized);
    }

    private mapRiskLevelToActionLevel(value: string | null | undefined): OperatingSignalEvaluationView['currentActionLevel'] | null {
        const normalized = value?.trim();
        if (!normalized) {
            return null;
        }

        if (normalized === '风险' || normalized.toUpperCase() === 'RISK') {
            return 'BLOCK';
        }

        if (normalized === '关注' || normalized.toUpperCase() === 'ATTENTION') {
            return 'REVIEW';
        }

        return this.normalizeActionLevel(normalized);
    }

    private normalizeActionLevel(value: string | null | undefined): OperatingSignalEvaluationView['currentActionLevel'] | null {
        const normalized = value?.trim().toUpperCase();
        if (normalized === 'PROMPT' || normalized === 'REVIEW' || normalized === 'BLOCK') {
            return normalized;
        }
        return null;
    }

    private resolveHighestActionLevel(candidates: Array<OperatingSignalEvaluationView['currentActionLevel'] | null>): OperatingSignalEvaluationView['currentActionLevel'] {
        return candidates.reduce<OperatingSignalEvaluationView['currentActionLevel']>((current, candidate) => (this.getActionSeverity(candidate) > this.getActionSeverity(current) ? (candidate ?? current) : current), 'PROMPT');
    }

    private getActionSeverity(value: string | null | undefined): number {
        switch (this.normalizeActionLevel(value)) {
            case 'BLOCK':
                return 3;
            case 'REVIEW':
                return 2;
            case 'PROMPT':
                return 1;
            default:
                return 0;
        }
    }

    private async assertValidHandoverRebaselineReference(projectId: string, baselineSelectionSource: string, handoverRebaselineRecordId: string | null): Promise<string | null> {
        if (baselineSelectionSource === 'original') {
            if (handoverRebaselineRecordId) {
                throw new UnprocessableEntityException('handoverRebaselineRecordId must be null when baselineSelectionSource is original');
            }
            return null;
        }

        if (baselineSelectionSource !== 'handover_rebaseline') {
            return handoverRebaselineRecordId;
        }

        if (!handoverRebaselineRecordId) {
            throw new UnprocessableEntityException('handoverRebaselineRecordId is required when baselineSelectionSource is handover_rebaseline');
        }

        const record = await this.contractHandoverRebaselineRecordRepository.findById(handoverRebaselineRecordId);
        if (!record) {
            throw new NotFoundException(`ContractHandoverRebaselineRecord ${handoverRebaselineRecordId} not found`);
        }
        if (record.projectId !== projectId) {
            throw new ConflictException(`ContractHandoverRebaselineRecord ${handoverRebaselineRecordId} does not belong to project ${projectId}`);
        }
        if (record.status !== 'effective') {
            throw new ConflictException(`ContractHandoverRebaselineRecord ${handoverRebaselineRecordId} is not effective`);
        }

        return record.id;
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

    private assertNullableDateRange(start: string | null, end: string | null, startField: string, endField: string): void {
        if (!start || !end) {
            return;
        }
        const parsedStart = this.parseDateOnly(start, startField);
        const parsedEnd = this.parseDateOnly(end, endField);
        this.assertDateRange(parsedStart, parsedEnd, startField, endField);
    }

    private dayBefore(date: string): string {
        const result = this.toDate(date);
        result.setUTCDate(result.getUTCDate() - 1);
        const normalized = toBusinessDateOnly(result);
        if (!normalized) {
            throw new RangeError('Date value is required');
        }
        return normalized;
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

    private parseDecimal(value: string | number, fieldName: string): number {
        const parsed = this.toNumber(value);
        if (!Number.isFinite(parsed)) {
            throw new UnprocessableEntityException(`${fieldName} must be a valid number`);
        }
        return parsed;
    }

    private parseNullableRatio(value: string | null, fieldName: string): string | null {
        if (value === null || value === '') {
            return null;
        }
        const parsed = this.parseNonNegativeDecimal(value, fieldName);
        if (parsed > 1) {
            throw new UnprocessableEntityException(`${fieldName} must be between 0 and 1`);
        }
        return this.formatRate(parsed);
    }

    private buildSourceCostScopeKey(sourceCostRecordIds: string[]): string {
        const hash = createHash('sha256').update(sourceCostRecordIds.join('|')).digest('hex');
        return `cost-scope:${hash}`;
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
        const normalized = toBusinessDateOnly(value);
        if (!normalized) {
            throw new RangeError('Date value is required');
        }
        return normalized;
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

    private formatRate(value: number): string {
        return value.toFixed(6);
    }

    private appendComment(value: string, comment: string | null | undefined): string {
        const suffix = comment?.trim();
        return suffix ? `${value}: ${suffix}` : value;
    }
}
