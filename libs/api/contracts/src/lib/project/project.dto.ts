import {
    AcceptanceRecordListSchema,
    AcceptanceRecordSummarySchema,
    CreateAcceptanceRecordRequestSchema,
    CreateProjectBidCommercialProcessRequestSchema,
    CreateProjectArchiveRecordRequestSchema,
    CreateProjectCompletionRecordRequestSchema,
    CreateProjectPricingMarginReviewRequestSchema,
    CreateProjectRequestSchema,
    CreateProjectTechnicalCostPackageRequestSchema,
    ProjectArchiveRecordListSchema,
    ProjectArchiveRecordSummarySchema,
    ProjectBidCommercialProcessListSchema,
    ProjectBidCommercialProcessSummarySchema,
    ProjectBidCommercialWorkspaceViewSchema,
    ProjectCompletionRecordListSchema,
    ProjectCompletionRecordSummarySchema,
    ProjectDetailViewSchema,
    ProjectListQuerySchema,
    ProjectListSchema,
    ProjectPricingMarginReviewListSchema,
    ProjectPricingMarginReviewSummarySchema,
    ProjectPricingMarginWorkspaceViewSchema,
    ProjectSummarySchema,
    ProjectTechnicalCostPackageListSchema,
    ProjectTechnicalCostPackageSummarySchema,
    ProjectTechnicalCostWorkspaceViewSchema,
    ProjectTimelineViewSchema,
    ProjectWorkspaceGuidanceViewSchema,
    UpdateProjectBasicInfoRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class AcceptanceRecordDto extends createZodDto(AcceptanceRecordSummarySchema) {}

export class AcceptanceRecordListDto extends createZodDto(AcceptanceRecordListSchema) {}

export class CreateAcceptanceRecordRequestDto extends createZodDto(CreateAcceptanceRecordRequestSchema) {}

export class ProjectArchiveRecordDto extends createZodDto(ProjectArchiveRecordSummarySchema) {}

export class ProjectArchiveRecordListDto extends createZodDto(ProjectArchiveRecordListSchema) {}

export class CreateProjectArchiveRecordRequestDto extends createZodDto(CreateProjectArchiveRecordRequestSchema) {}

export class ProjectBidCommercialProcessDto extends createZodDto(ProjectBidCommercialProcessSummarySchema) {}

export class ProjectBidCommercialProcessListDto extends createZodDto(ProjectBidCommercialProcessListSchema) {}

export class ProjectBidCommercialWorkspaceViewDto extends createZodDto(ProjectBidCommercialWorkspaceViewSchema) {}

export class CreateProjectBidCommercialProcessRequestDto extends createZodDto(CreateProjectBidCommercialProcessRequestSchema) {}

export class ProjectPricingMarginReviewDto extends createZodDto(ProjectPricingMarginReviewSummarySchema) {}

export class ProjectPricingMarginReviewListDto extends createZodDto(ProjectPricingMarginReviewListSchema) {}

export class ProjectPricingMarginWorkspaceViewDto extends createZodDto(ProjectPricingMarginWorkspaceViewSchema) {}

export class CreateProjectPricingMarginReviewRequestDto extends createZodDto(CreateProjectPricingMarginReviewRequestSchema) {}

export class ProjectCompletionRecordDto extends createZodDto(ProjectCompletionRecordSummarySchema) {}

export class ProjectCompletionRecordListDto extends createZodDto(ProjectCompletionRecordListSchema) {}

export class CreateProjectCompletionRecordRequestDto extends createZodDto(CreateProjectCompletionRecordRequestSchema) {}

export class ProjectTechnicalCostPackageDto extends createZodDto(ProjectTechnicalCostPackageSummarySchema) {}

export class ProjectTechnicalCostPackageListDto extends createZodDto(ProjectTechnicalCostPackageListSchema) {}

export class ProjectTechnicalCostWorkspaceViewDto extends createZodDto(ProjectTechnicalCostWorkspaceViewSchema) {}

export class CreateProjectTechnicalCostPackageRequestDto extends createZodDto(CreateProjectTechnicalCostPackageRequestSchema) {}

export class ProjectDto extends createZodDto(ProjectSummarySchema) {}

export class ProjectDetailViewDto extends createZodDto(ProjectDetailViewSchema) {}

export class ProjectWorkspaceGuidanceViewDto extends createZodDto(ProjectWorkspaceGuidanceViewSchema) {}

export class ProjectTimelineViewDto extends createZodDto(ProjectTimelineViewSchema) {}

export class ProjectListDto extends createZodDto(ProjectListSchema) {}

export class ProjectListQueryDto extends createZodDto(ProjectListQuerySchema) {}

export class CreateProjectRequestDto extends createZodDto(CreateProjectRequestSchema) {}

export class UpdateProjectBasicInfoRequestDto extends createZodDto(UpdateProjectBasicInfoRequestSchema) {}
