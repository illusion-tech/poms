import {
    CreateProjectRequestSchema,
    ProjectDetailViewSchema,
    ProjectListQuerySchema,
    ProjectListSchema,
    ProjectSummarySchema,
    ProjectWorkspaceGuidanceViewSchema,
    UpdateProjectBasicInfoRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ProjectDto extends createZodDto(ProjectSummarySchema) {}

export class ProjectDetailViewDto extends createZodDto(ProjectDetailViewSchema) {}

export class ProjectWorkspaceGuidanceViewDto extends createZodDto(ProjectWorkspaceGuidanceViewSchema) {}

export class ProjectListDto extends createZodDto(ProjectListSchema) {}

export class ProjectListQueryDto extends createZodDto(ProjectListQuerySchema) {}

export class CreateProjectRequestDto extends createZodDto(CreateProjectRequestSchema) {}

export class UpdateProjectBasicInfoRequestDto extends createZodDto(UpdateProjectBasicInfoRequestSchema) {}
