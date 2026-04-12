import {
    InternalCostRateVersionSummarySchema,
    ProjectActualCostRecordDetailViewSchema,
    ProjectActualCostRecordListViewSchema,
    ProjectActualCostRecordSummarySchema,
    RegisterInvoiceCostRecordRequestSchema,
    PublishInternalCostRateVersionRequestSchema,
    RegisterPaymentFactCostRecordRequestSchema,
    RegisterLaborCostRecordRequestSchema,
    ReplaceLaborCostRecordRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class InternalCostRateVersionSummaryDto extends createZodDto(InternalCostRateVersionSummarySchema) {}

export class PublishInternalCostRateVersionRequestDto extends createZodDto(PublishInternalCostRateVersionRequestSchema) {}

export class ProjectActualCostRecordSummaryDto extends createZodDto(ProjectActualCostRecordSummarySchema) {}

export class ProjectActualCostRecordListViewDto extends createZodDto(ProjectActualCostRecordListViewSchema) {}

export class ProjectActualCostRecordDetailViewDto extends createZodDto(ProjectActualCostRecordDetailViewSchema) {}

export class RegisterPaymentFactCostRecordRequestDto extends createZodDto(RegisterPaymentFactCostRecordRequestSchema) {}

export class RegisterInvoiceCostRecordRequestDto extends createZodDto(RegisterInvoiceCostRecordRequestSchema) {}

export class RegisterLaborCostRecordRequestDto extends createZodDto(RegisterLaborCostRecordRequestSchema) {}

export class ReplaceLaborCostRecordRequestDto extends createZodDto(ReplaceLaborCostRecordRequestSchema) {}
