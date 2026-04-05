import {
    InternalCostRateVersionSummarySchema,
    ProjectActualCostRecordDetailViewSchema,
    ProjectActualCostRecordSummarySchema,
    PublishInternalCostRateVersionRequestSchema,
    RegisterLaborCostRecordRequestSchema,
    ReplaceLaborCostRecordRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class InternalCostRateVersionSummaryDto extends createZodDto(InternalCostRateVersionSummarySchema) {}

export class PublishInternalCostRateVersionRequestDto extends createZodDto(PublishInternalCostRateVersionRequestSchema) {}

export class ProjectActualCostRecordSummaryDto extends createZodDto(ProjectActualCostRecordSummarySchema) {}

export class ProjectActualCostRecordDetailViewDto extends createZodDto(ProjectActualCostRecordDetailViewSchema) {}

export class RegisterLaborCostRecordRequestDto extends createZodDto(RegisterLaborCostRecordRequestSchema) {}

export class ReplaceLaborCostRecordRequestDto extends createZodDto(ReplaceLaborCostRecordRequestSchema) {}
