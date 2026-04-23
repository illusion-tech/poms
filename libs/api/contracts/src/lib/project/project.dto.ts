import {
    AcceptanceRecordListSchema,
    AcceptanceRecordSummarySchema,
    CreateAcceptanceRecordRequestSchema,
    CreateProjectCompletionRecordRequestSchema,
    CreateProjectRequestSchema,
    ProjectCompletionRecordListSchema,
    ProjectCompletionRecordSummarySchema,
    ProjectDetailViewSchema,
    ProjectListQuerySchema,
    ProjectListSchema,
    ProjectSummarySchema,
    ProjectTimelineViewSchema,
    ProjectWorkspaceGuidanceViewSchema,
    UpdateProjectBasicInfoRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class AcceptanceRecordDto extends createZodDto(AcceptanceRecordSummarySchema) {}

export class AcceptanceRecordListDto extends createZodDto(AcceptanceRecordListSchema) {}

export class CreateAcceptanceRecordRequestDto extends createZodDto(CreateAcceptanceRecordRequestSchema) {}

export class ProjectCompletionRecordDto extends createZodDto(ProjectCompletionRecordSummarySchema) {}

export class ProjectCompletionRecordListDto extends createZodDto(ProjectCompletionRecordListSchema) {}

export class CreateProjectCompletionRecordRequestDto extends createZodDto(CreateProjectCompletionRecordRequestSchema) {}

export class ProjectDto extends createZodDto(ProjectSummarySchema) {}

export class ProjectDetailViewDto extends createZodDto(ProjectDetailViewSchema) {}

export class ProjectWorkspaceGuidanceViewDto extends createZodDto(ProjectWorkspaceGuidanceViewSchema) {}

export class ProjectTimelineViewDto extends createZodDto(ProjectTimelineViewSchema) {}

export class ProjectListDto extends createZodDto(ProjectListSchema) {}

export class ProjectListQueryDto extends createZodDto(ProjectListQuerySchema) {}

export class CreateProjectRequestDto extends createZodDto(CreateProjectRequestSchema) {}

export class UpdateProjectBasicInfoRequestDto extends createZodDto(UpdateProjectBasicInfoRequestSchema) {}
