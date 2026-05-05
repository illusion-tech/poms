import {
    AssignLeadOwnerRequestSchema,
    ApproveLeadScoreOverrideRequestSchema,
    ClaimLeadOwnerRequestSchema,
    CloseLeadRequestSchema,
    ConvertLeadToProjectRequestSchema,
    CreateLeadSourceRequestSchema,
    CreateLeadRequestSchema,
    LeadDetailViewSchema,
    LeadListQuerySchema,
    LeadListSchema,
    LeadOwnerAssignmentResultSchema,
    LeadScoreHistoryViewSchema,
    LeadScoreOverrideSummarySchema,
    LeadSourceListQuerySchema,
    LeadSourceListSchema,
    LeadSourceSummarySchema,
    LeadSummarySchema,
    QualifyLeadRequestSchema,
    RejectLeadScoreOverrideRequestSchema,
    RevokeLeadScoreOverrideRequestSchema,
    SubmitLeadScoreOverrideRequestSchema,
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

export class LeadScoreHistoryViewDto extends createZodDto(LeadScoreHistoryViewSchema) {}

export class LeadScoreOverrideDto extends createZodDto(LeadScoreOverrideSummarySchema) {}

export class SubmitLeadScoreOverrideRequestDto extends createZodDto(SubmitLeadScoreOverrideRequestSchema) {}

export class ApproveLeadScoreOverrideRequestDto extends createZodDto(ApproveLeadScoreOverrideRequestSchema) {}

export class RejectLeadScoreOverrideRequestDto extends createZodDto(RejectLeadScoreOverrideRequestSchema) {}

export class RevokeLeadScoreOverrideRequestDto extends createZodDto(RevokeLeadScoreOverrideRequestSchema) {}

export class QualifyLeadRequestDto extends createZodDto(QualifyLeadRequestSchema) {}

export class CloseLeadRequestDto extends createZodDto(CloseLeadRequestSchema) {}

export class ConvertLeadToProjectRequestDto extends createZodDto(ConvertLeadToProjectRequestSchema) {}
