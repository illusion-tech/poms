import {
    ActivateContractRequestSchema,
    CommercialDiffReviewResultSchema,
    ConfirmProjectHandoverRequestSchema,
    ConfirmProjectHandoverResultSchema,
    CommercialReleaseBaselineSummarySchema,
    ContractDiffReviewHistoryViewSchema,
    ContractHandoverSummaryViewSchema,
    ContractReadinessDetailSchema,
    ContractListQuerySchema,
    ContractListSchema,
    ContractSummarySchema,
    CreateCommercialReleaseBaselineRequestSchema,
    CreateContractRequestSchema,
    CreateContractReadinessPackageRequestSchema,
    InitializeContractSnapshotFromReadinessPackageRequestSchema,
    InitializeReceivablePlanFromReadinessPackageRequestSchema,
    ProjectHandoverDetailViewSchema,
    ReadinessInitializationResultSchema,
    RebaselineContractHandoverRequestSchema,
    RebaselineContractHandoverResultSchema,
    ReviewCommercialReleaseBaselineDiffRequestSchema,
    UpdateContractBasicInfoRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ContractDto extends createZodDto(ContractSummarySchema) {}

export class ContractListDto extends createZodDto(ContractListSchema) {}

export class ContractListQueryDto extends createZodDto(ContractListQuerySchema) {}

export class CreateContractRequestDto extends createZodDto(CreateContractRequestSchema) {}

export class UpdateContractBasicInfoRequestDto extends createZodDto(UpdateContractBasicInfoRequestSchema) {}

export class ActivateContractRequestDto extends createZodDto(ActivateContractRequestSchema) {}

export class CommercialReleaseBaselineDto extends createZodDto(CommercialReleaseBaselineSummarySchema) {}

export class ContractReadinessDetailDto extends createZodDto(ContractReadinessDetailSchema) {}

export class ContractDiffReviewHistoryViewDto extends createZodDto(ContractDiffReviewHistoryViewSchema) {}

export class ContractHandoverSummaryViewDto extends createZodDto(ContractHandoverSummaryViewSchema) {}

export class ProjectHandoverDetailViewDto extends createZodDto(ProjectHandoverDetailViewSchema) {}

export class ConfirmProjectHandoverRequestDto extends createZodDto(ConfirmProjectHandoverRequestSchema) {}

export class ConfirmProjectHandoverResultDto extends createZodDto(ConfirmProjectHandoverResultSchema) {}

export class RebaselineContractHandoverRequestDto extends createZodDto(RebaselineContractHandoverRequestSchema) {}

export class RebaselineContractHandoverResultDto extends createZodDto(RebaselineContractHandoverResultSchema) {}

export class CreateCommercialReleaseBaselineRequestDto extends createZodDto(CreateCommercialReleaseBaselineRequestSchema) {}

export class CreateContractReadinessPackageRequestDto extends createZodDto(CreateContractReadinessPackageRequestSchema) {}

export class ReviewCommercialReleaseBaselineDiffRequestDto extends createZodDto(ReviewCommercialReleaseBaselineDiffRequestSchema) {}

export class InitializeContractSnapshotFromReadinessPackageRequestDto extends createZodDto(InitializeContractSnapshotFromReadinessPackageRequestSchema) {}

export class InitializeReceivablePlanFromReadinessPackageRequestDto extends createZodDto(InitializeReceivablePlanFromReadinessPackageRequestSchema) {}

export class CommercialDiffReviewResultDto extends createZodDto(CommercialDiffReviewResultSchema) {}

export class ReadinessInitializationResultDto extends createZodDto(ReadinessInitializationResultSchema) {}
