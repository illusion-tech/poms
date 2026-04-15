import {
    ActivateContractRequestSchema,
    CommercialDiffReviewResultSchema,
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
    ReadinessInitializationResultSchema,
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

export class CreateCommercialReleaseBaselineRequestDto extends createZodDto(CreateCommercialReleaseBaselineRequestSchema) {}

export class CreateContractReadinessPackageRequestDto extends createZodDto(CreateContractReadinessPackageRequestSchema) {}

export class ReviewCommercialReleaseBaselineDiffRequestDto extends createZodDto(ReviewCommercialReleaseBaselineDiffRequestSchema) {}

export class InitializeContractSnapshotFromReadinessPackageRequestDto extends createZodDto(InitializeContractSnapshotFromReadinessPackageRequestSchema) {}

export class InitializeReceivablePlanFromReadinessPackageRequestDto extends createZodDto(InitializeReceivablePlanFromReadinessPackageRequestSchema) {}

export class CommercialDiffReviewResultDto extends createZodDto(CommercialDiffReviewResultSchema) {}

export class ReadinessInitializationResultDto extends createZodDto(ReadinessInitializationResultSchema) {}
