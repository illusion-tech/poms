import {
    ActivateOperatingBaselinePackageRequestSchema,
    ConfirmExpenseRecordRequestSchema,
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
    RegisterExpenseCostRecordRequestSchema,
    RegisterInvoiceCostRecordRequestSchema,
    PublishInternalCostRateVersionRequestSchema,
    RegisterPaymentFactCostRecordRequestSchema,
    RegisterProcurementCostRecordRequestSchema,
    RegisterLaborCostRecordRequestSchema,
    ReplaceLaborCostRecordRequestSchema,
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

export class ProjectActualCostRecordSummaryDto extends createZodDto(ProjectActualCostRecordSummarySchema) {}

export class ProjectActualCostRecordListViewDto extends createZodDto(ProjectActualCostRecordListViewSchema) {}

export class ProjectActualCostRecordDetailViewDto extends createZodDto(ProjectActualCostRecordDetailViewSchema) {}

export class RegisterPaymentFactCostRecordRequestDto extends createZodDto(RegisterPaymentFactCostRecordRequestSchema) {}

export class RegisterInvoiceCostRecordRequestDto extends createZodDto(RegisterInvoiceCostRecordRequestSchema) {}

export class RegisterExpenseCostRecordRequestDto extends createZodDto(RegisterExpenseCostRecordRequestSchema) {}

export class RegisterProcurementCostRecordRequestDto extends createZodDto(RegisterProcurementCostRecordRequestSchema) {}

export class RegisterLaborCostRecordRequestDto extends createZodDto(RegisterLaborCostRecordRequestSchema) {}

export class ReplaceLaborCostRecordRequestDto extends createZodDto(ReplaceLaborCostRecordRequestSchema) {}
