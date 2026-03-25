import {
    ApproveCommissionPayoutRequestSchema,
    CommissionCalculationSummarySchema,
    CommissionPayoutSummarySchema,
    CommissionRoleAssignmentSummarySchema,
    CommissionRuleVersionSummarySchema,
    ConfirmCommissionCalculationRequestSchema,
    CreateCommissionCalculationRequestSchema,
    CreateCommissionPayoutRequestSchema,
    CreateCommissionRoleAssignmentRequestSchema,
    CreateCommissionRuleVersionRequestSchema,
    RegisterCommissionPayoutRequestSchema,
    SubmitCommissionPayoutApprovalRequestSchema
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

export class SubmitCommissionPayoutApprovalRequestDto extends createZodDto(SubmitCommissionPayoutApprovalRequestSchema) {}

export class ApproveCommissionPayoutRequestDto extends createZodDto(ApproveCommissionPayoutRequestSchema) {}

export class RegisterCommissionPayoutRequestDto extends createZodDto(RegisterCommissionPayoutRequestSchema) {}
