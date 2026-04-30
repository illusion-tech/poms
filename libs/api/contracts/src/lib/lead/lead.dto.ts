import {
    AssignLeadOwnerRequestSchema,
    ClaimLeadOwnerRequestSchema,
    CloseLeadRequestSchema,
    ConvertLeadToProjectRequestSchema,
    CreateLeadSourceRequestSchema,
    CreateLeadRequestSchema,
    LeadDetailViewSchema,
    LeadListQuerySchema,
    LeadListSchema,
    LeadOwnerAssignmentResultSchema,
    LeadSourceListQuerySchema,
    LeadSourceListSchema,
    LeadSourceSummarySchema,
    LeadSummarySchema,
    QualifyLeadRequestSchema,
    UpdateLeadSourceRequestSchema,
    UpdateLeadRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class LeadDto extends createZodDto(LeadSummarySchema) {}

export class LeadListDto extends createZodDto(LeadListSchema) {}

export class LeadDetailViewDto extends createZodDto(LeadDetailViewSchema) {}

export class LeadListQueryDto extends createZodDto(LeadListQuerySchema) {}

export class LeadSourceDto extends createZodDto(LeadSourceSummarySchema) {}

export class LeadSourceListDto extends createZodDto(LeadSourceListSchema) {}

export class LeadSourceListQueryDto extends createZodDto(LeadSourceListQuerySchema) {}

export class CreateLeadSourceRequestDto extends createZodDto(CreateLeadSourceRequestSchema) {}

export class UpdateLeadSourceRequestDto extends createZodDto(UpdateLeadSourceRequestSchema) {}

export class CreateLeadRequestDto extends createZodDto(CreateLeadRequestSchema) {}

export class UpdateLeadRequestDto extends createZodDto(UpdateLeadRequestSchema) {}

export class ClaimLeadOwnerRequestDto extends createZodDto(ClaimLeadOwnerRequestSchema) {}

export class AssignLeadOwnerRequestDto extends createZodDto(AssignLeadOwnerRequestSchema) {}

export class LeadOwnerAssignmentResultDto extends createZodDto(LeadOwnerAssignmentResultSchema) {}

export class QualifyLeadRequestDto extends createZodDto(QualifyLeadRequestSchema) {}

export class CloseLeadRequestDto extends createZodDto(CloseLeadRequestSchema) {}

export class ConvertLeadToProjectRequestDto extends createZodDto(ConvertLeadToProjectRequestSchema) {}
