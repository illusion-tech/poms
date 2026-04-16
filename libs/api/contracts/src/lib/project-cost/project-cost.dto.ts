import {
    ActivateOperatingBaselinePackageRequestSchema,
    AccountingTaxTreatmentListViewSchema,
    AccountingTaxTreatmentSnapshotSummarySchema,
    ConfirmExpenseRecordRequestSchema,
    ConfirmAccountingTaxTreatmentRequestSchema,
    ConfirmCostStageAttributionRequestSchema,
    ConfirmSharedCostAllocationBasisRequestSchema,
    CostStageAttributionHistoryViewSchema,
    CostStageAttributionSnapshotSummarySchema,
    CreateProjectActualCostRecordRequestSchema,
    CreateExpenseRecordRequestSchema,
    CreateOperatingRestatementRequestSchema,
    CreatePeriodClosingSnapshotRequestSchema,
    CreateProjectOperatingSnapshotRequestSchema,
    ExpenseRecordDetailViewSchema,
    ExpenseRecordListSchema,
    ExpenseRecordSummarySchema,
    InternalCostRateVersionSummarySchema,
    OperatingBaselinePackageSummarySchema,
    OperatingRestatementListViewSchema,
    OperatingRestatementSummarySchema,
    PeriodClosingSnapshotSummarySchema,
    ProjectActualCostRecordDetailViewSchema,
    ProjectActualCostRecordListViewSchema,
    ProjectActualCostRecordSummarySchema,
    ProjectOperatingSnapshotSummarySchema,
    ReclassifyCostStageAttributionRequestSchema,
    PublishInternalCostRateVersionRequestSchema,
    ReplaceSharedCostAllocationResultRequestSchema,
    ReplaceLaborCostRecordRequestSchema,
    SharedCostAllocationBasisSummarySchema,
    SharedCostAllocationResultListViewSchema,
    SharedCostAllocationResultSummarySchema,
    UpdateExpenseRecordRequestSchema,
    VoidExpenseRecordRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ExpenseRecordDto extends createZodDto(ExpenseRecordSummarySchema) {}

export class ExpenseRecordListDto extends createZodDto(ExpenseRecordListSchema) {}

export class ExpenseRecordDetailViewDto extends createZodDto(ExpenseRecordDetailViewSchema) {}

export class CreateExpenseRecordRequestDto extends createZodDto(CreateExpenseRecordRequestSchema) {}

export class UpdateExpenseRecordRequestDto extends createZodDto(UpdateExpenseRecordRequestSchema) {}

export class ConfirmExpenseRecordRequestDto extends createZodDto(ConfirmExpenseRecordRequestSchema) {}

export class VoidExpenseRecordRequestDto extends createZodDto(VoidExpenseRecordRequestSchema) {}

export class InternalCostRateVersionSummaryDto extends createZodDto(InternalCostRateVersionSummarySchema) {}

export class PublishInternalCostRateVersionRequestDto extends createZodDto(PublishInternalCostRateVersionRequestSchema) {}

export class OperatingBaselinePackageSummaryDto extends createZodDto(OperatingBaselinePackageSummarySchema) {}

export class ActivateOperatingBaselinePackageRequestDto extends createZodDto(ActivateOperatingBaselinePackageRequestSchema) {}

export class PeriodClosingSnapshotSummaryDto extends createZodDto(PeriodClosingSnapshotSummarySchema) {}

export class ProjectOperatingSnapshotSummaryDto extends createZodDto(ProjectOperatingSnapshotSummarySchema) {}

export class CreateProjectOperatingSnapshotRequestDto extends createZodDto(CreateProjectOperatingSnapshotRequestSchema) {}

export class CreatePeriodClosingSnapshotRequestDto extends createZodDto(CreatePeriodClosingSnapshotRequestSchema) {}

export class OperatingRestatementSummaryDto extends createZodDto(OperatingRestatementSummarySchema) {}

export class OperatingRestatementListViewDto extends createZodDto(OperatingRestatementListViewSchema) {}

export class CreateOperatingRestatementRequestDto extends createZodDto(CreateOperatingRestatementRequestSchema) {}

export class ConfirmSharedCostAllocationBasisRequestDto extends createZodDto(ConfirmSharedCostAllocationBasisRequestSchema) {}

export class ReplaceSharedCostAllocationResultRequestDto extends createZodDto(ReplaceSharedCostAllocationResultRequestSchema) {}

export class SharedCostAllocationBasisSummaryDto extends createZodDto(SharedCostAllocationBasisSummarySchema) {}

export class SharedCostAllocationResultSummaryDto extends createZodDto(SharedCostAllocationResultSummarySchema) {}

export class SharedCostAllocationResultListViewDto extends createZodDto(SharedCostAllocationResultListViewSchema) {}

export class ConfirmCostStageAttributionRequestDto extends createZodDto(ConfirmCostStageAttributionRequestSchema) {}

export class ReclassifyCostStageAttributionRequestDto extends createZodDto(ReclassifyCostStageAttributionRequestSchema) {}

export class CostStageAttributionSnapshotSummaryDto extends createZodDto(CostStageAttributionSnapshotSummarySchema) {}

export class CostStageAttributionHistoryViewDto extends createZodDto(CostStageAttributionHistoryViewSchema) {}

export class ConfirmAccountingTaxTreatmentRequestDto extends createZodDto(ConfirmAccountingTaxTreatmentRequestSchema) {}

export class AccountingTaxTreatmentSnapshotSummaryDto extends createZodDto(AccountingTaxTreatmentSnapshotSummarySchema) {}

export class AccountingTaxTreatmentListViewDto extends createZodDto(AccountingTaxTreatmentListViewSchema) {}

export class ProjectActualCostRecordSummaryDto extends createZodDto(ProjectActualCostRecordSummarySchema) {}

export class ProjectActualCostRecordListViewDto extends createZodDto(ProjectActualCostRecordListViewSchema) {}

export class ProjectActualCostRecordDetailViewDto extends createZodDto(ProjectActualCostRecordDetailViewSchema) {}

export class CreateProjectActualCostRecordRequestDto extends createZodDto(CreateProjectActualCostRecordRequestSchema) {}

export class ReplaceLaborCostRecordRequestDto extends createZodDto(ReplaceLaborCostRecordRequestSchema) {}
