import {
    AssignLeadOwnerRequestSchema,
    ApproveLeadScoreOverrideRequestSchema,
    ClaimLeadOwnerRequestSchema,
    CloseLeadRequestSchema,
    ConvertLeadToProjectRequestSchema,
    CreateLeadRequestSchema,
    LeadDetailViewSchema,
    LeadListQuerySchema,
    LeadListResponseSchema,
    LeadOwnerAssignmentResultSchema,
    LeadScoreHistoryViewSchema,
    LeadScoreOverrideSummarySchema,
    LeadSummarySchema,
    QualifyLeadRequestSchema,
    RejectLeadScoreOverrideRequestSchema,
    RevokeLeadScoreOverrideRequestSchema,
    SubmitLeadScoreOverrideRequestSchema,
    UpdateLeadRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class LeadDto extends createZodDto(LeadSummarySchema) {}

export class LeadListResponseDto extends createZodDto(LeadListResponseSchema) {}

export class LeadDetailViewDto extends createZodDto(LeadDetailViewSchema) {}

export class LeadListQueryDto extends createZodDto(LeadListQuerySchema) {}

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
