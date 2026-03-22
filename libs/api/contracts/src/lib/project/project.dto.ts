import {
    CreateProjectRequestSchema,
    ProjectListSchema,
    ProjectSummarySchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ProjectDto extends createZodDto(ProjectSummarySchema) {}

export class ProjectListDto extends createZodDto(ProjectListSchema) {}

export class CreateProjectRequestDto extends createZodDto(CreateProjectRequestSchema) {}
