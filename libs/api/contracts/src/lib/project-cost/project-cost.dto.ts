import {
    ConfirmExpenseRecordRequestSchema,
    CreateExpenseRecordRequestSchema,
    ExpenseRecordDetailViewSchema,
    ExpenseRecordListSchema,
    ExpenseRecordSummarySchema,
    InternalCostRateVersionSummarySchema,
    ProjectActualCostRecordDetailViewSchema,
    ProjectActualCostRecordListViewSchema,
    ProjectActualCostRecordSummarySchema,
    RegisterExpenseCostRecordRequestSchema,
    RegisterInvoiceCostRecordRequestSchema,
    PublishInternalCostRateVersionRequestSchema,
    RegisterPaymentFactCostRecordRequestSchema,
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

export class ProjectActualCostRecordSummaryDto extends createZodDto(ProjectActualCostRecordSummarySchema) {}

export class ProjectActualCostRecordListViewDto extends createZodDto(ProjectActualCostRecordListViewSchema) {}

export class ProjectActualCostRecordDetailViewDto extends createZodDto(ProjectActualCostRecordDetailViewSchema) {}

export class RegisterPaymentFactCostRecordRequestDto extends createZodDto(RegisterPaymentFactCostRecordRequestSchema) {}

export class RegisterInvoiceCostRecordRequestDto extends createZodDto(RegisterInvoiceCostRecordRequestSchema) {}

export class RegisterExpenseCostRecordRequestDto extends createZodDto(RegisterExpenseCostRecordRequestSchema) {}

export class RegisterLaborCostRecordRequestDto extends createZodDto(RegisterLaborCostRecordRequestSchema) {}

export class ReplaceLaborCostRecordRequestDto extends createZodDto(ReplaceLaborCostRecordRequestSchema) {}
