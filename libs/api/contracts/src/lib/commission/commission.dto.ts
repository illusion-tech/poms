import {
    ArbitrateCommissionFreezeDisputeRequestSchema,
    ArbitrateCommissionFreezeDisputeResultSchema,
    ApproveCommissionPayoutRequestSchema,
    CommissionAdjustmentSummarySchema,
    CommissionCalculationSummarySchema,
    CommissionDepartureExceptionDecisionSummarySchema,
    CommissionFinalSettlementViewSchema,
    CommissionFreezeChangeRequestDetailViewSchema,
    CommissionFreezeDisputeDetailViewSchema,
    CommissionRoleAssignmentDetailViewSchema,
    CommissionPayoutSummarySchema,
    CommissionRoleAssignmentSummarySchema,
    CommissionRuleExplanationViewSchema,
    CommissionRuleVersionSummarySchema,
    ConfirmCommissionCalculationRequestSchema,
    CreateCommissionDepartureExceptionDecisionRequestSchema,
    CreateCommissionAdjustmentRequestSchema,
    CreateCommissionCalculationRequestSchema,
    CreateCommissionPayoutRequestSchema,
    CreateCommissionRoleAssignmentRequestSchema,
    CreateCommissionRuleVersionRequestSchema,
    ExecuteCommissionAdjustmentRequestSchema,
    FreezeCommissionRoleAssignmentRequestSchema,
    FreezeCommissionRoleAssignmentResultSchema,
    RecalculateCommissionRequestSchema,
    RegisterNonRetentionCommissionPayoutRequestSchema,
    RegisterRetentionCommissionPayoutRequestSchema,
    SubmitCommissionFreezeDisputeRequestSchema,
    SubmitCommissionFreezeDisputeResultSchema,
    SubmitCommissionAdjustmentApprovalRequestSchema,
    SubmitNonRetentionCommissionPayoutApprovalRequestSchema,
    SubmitRetentionCommissionPayoutApprovalRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class CommissionRuleVersionSummaryDto extends createZodDto(CommissionRuleVersionSummarySchema) {}

export class CommissionRuleVersionListDto extends createZodDto(
    z.array(CommissionRuleVersionSummarySchema).meta({ id: 'CommissionRuleVersionList' })
) {}

export class CreateCommissionRuleVersionRequestDto extends createZodDto(CreateCommissionRuleVersionRequestSchema) {}

export class CommissionRoleAssignmentSummaryDto extends createZodDto(CommissionRoleAssignmentSummarySchema) {}

export class CreateCommissionRoleAssignmentRequestDto extends createZodDto(CreateCommissionRoleAssignmentRequestSchema) {}

export class FreezeCommissionRoleAssignmentRequestDto extends createZodDto(FreezeCommissionRoleAssignmentRequestSchema) {}

export class FreezeCommissionRoleAssignmentResultDto extends createZodDto(FreezeCommissionRoleAssignmentResultSchema) {}

export class CommissionRoleAssignmentDetailViewDto extends createZodDto(CommissionRoleAssignmentDetailViewSchema) {}

export class CommissionFinalSettlementViewDto extends createZodDto(CommissionFinalSettlementViewSchema) {}

export class CommissionRuleExplanationViewDto extends createZodDto(CommissionRuleExplanationViewSchema) {}

export class CommissionDepartureExceptionDecisionSummaryDto extends createZodDto(
    CommissionDepartureExceptionDecisionSummarySchema
) {}

export class CreateCommissionDepartureExceptionDecisionRequestDto extends createZodDto(
    CreateCommissionDepartureExceptionDecisionRequestSchema
) {}

export class SubmitCommissionFreezeDisputeRequestDto extends createZodDto(SubmitCommissionFreezeDisputeRequestSchema) {}

export class SubmitCommissionFreezeDisputeResultDto extends createZodDto(SubmitCommissionFreezeDisputeResultSchema) {}

export class CommissionFreezeDisputeDetailViewDto extends createZodDto(CommissionFreezeDisputeDetailViewSchema) {}

export class ArbitrateCommissionFreezeDisputeRequestDto extends createZodDto(ArbitrateCommissionFreezeDisputeRequestSchema) {}

export class ArbitrateCommissionFreezeDisputeResultDto extends createZodDto(ArbitrateCommissionFreezeDisputeResultSchema) {}

export class CommissionFreezeChangeRequestDetailViewDto extends createZodDto(CommissionFreezeChangeRequestDetailViewSchema) {}

export class CommissionCalculationSummaryDto extends createZodDto(CommissionCalculationSummarySchema) {}

export class CommissionCalculationListDto extends createZodDto(
    z.array(CommissionCalculationSummarySchema).meta({ id: 'CommissionCalculationList' })
) {}

export class CreateCommissionCalculationRequestDto extends createZodDto(CreateCommissionCalculationRequestSchema) {}

export class ConfirmCommissionCalculationRequestDto extends createZodDto(ConfirmCommissionCalculationRequestSchema) {}

export class CommissionPayoutSummaryDto extends createZodDto(CommissionPayoutSummarySchema) {}

export class CommissionPayoutListDto extends createZodDto(
    z.array(CommissionPayoutSummarySchema).meta({ id: 'CommissionPayoutList' })
) {}

export class CreateCommissionPayoutRequestDto extends createZodDto(CreateCommissionPayoutRequestSchema) {}

export class SubmitRetentionCommissionPayoutApprovalRequestDto extends createZodDto(
    SubmitRetentionCommissionPayoutApprovalRequestSchema
) {}

export class SubmitNonRetentionCommissionPayoutApprovalRequestDto extends createZodDto(
    SubmitNonRetentionCommissionPayoutApprovalRequestSchema
) {}

export class ApproveCommissionPayoutRequestDto extends createZodDto(ApproveCommissionPayoutRequestSchema) {}

export class RegisterRetentionCommissionPayoutRequestDto extends createZodDto(RegisterRetentionCommissionPayoutRequestSchema) {}

export class RegisterNonRetentionCommissionPayoutRequestDto extends createZodDto(RegisterNonRetentionCommissionPayoutRequestSchema) {}

export class CommissionAdjustmentSummaryDto extends createZodDto(CommissionAdjustmentSummarySchema) {}

export class CommissionAdjustmentListDto extends createZodDto(
    z.array(CommissionAdjustmentSummarySchema).meta({ id: 'CommissionAdjustmentList' })
) {}

export class CreateCommissionAdjustmentRequestDto extends createZodDto(CreateCommissionAdjustmentRequestSchema) {}

export class SubmitCommissionAdjustmentApprovalRequestDto extends createZodDto(SubmitCommissionAdjustmentApprovalRequestSchema) {}

export class ExecuteCommissionAdjustmentRequestDto extends createZodDto(ExecuteCommissionAdjustmentRequestSchema) {}

export class RecalculateCommissionRequestDto extends createZodDto(RecalculateCommissionRequestSchema) {}
