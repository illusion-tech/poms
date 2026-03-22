import {
    CreateProjectRequestSchema,
    ProjectListQuerySchema,
    ProjectListSchema,
    ProjectSummarySchema,
    UpdateProjectBasicInfoRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ProjectDto extends createZodDto(ProjectSummarySchema) {}

export class ProjectListDto extends createZodDto(ProjectListSchema) {}

export class ProjectListQueryDto extends createZodDto(ProjectListQuerySchema) {}

export class CreateProjectRequestDto extends createZodDto(CreateProjectRequestSchema) {}

export class UpdateProjectBasicInfoRequestDto extends createZodDto(UpdateProjectBasicInfoRequestSchema) {}
