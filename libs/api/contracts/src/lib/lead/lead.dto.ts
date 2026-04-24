import {
    CloseLeadRequestSchema,
    ConvertLeadToProjectRequestSchema,
    CreateLeadRequestSchema,
    LeadDetailViewSchema,
    LeadListQuerySchema,
    LeadListSchema,
    LeadSummarySchema,
    QualifyLeadRequestSchema,
    UpdateLeadRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class LeadDto extends createZodDto(LeadSummarySchema) {}

export class LeadListDto extends createZodDto(LeadListSchema) {}

export class LeadDetailViewDto extends createZodDto(LeadDetailViewSchema) {}

export class LeadListQueryDto extends createZodDto(LeadListQuerySchema) {}

export class CreateLeadRequestDto extends createZodDto(CreateLeadRequestSchema) {}

export class UpdateLeadRequestDto extends createZodDto(UpdateLeadRequestSchema) {}

export class QualifyLeadRequestDto extends createZodDto(QualifyLeadRequestSchema) {}

export class CloseLeadRequestDto extends createZodDto(CloseLeadRequestSchema) {}

export class ConvertLeadToProjectRequestDto extends createZodDto(ConvertLeadToProjectRequestSchema) {}
