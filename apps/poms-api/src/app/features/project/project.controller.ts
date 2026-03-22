import type { ProjectSummary } from '@poms/shared-contracts';
import { CreateProjectRequestDto, ProjectDto, ProjectListDto } from '@poms/api-contracts';
import {
    Body,
    Controller,
    Get,
    NotFoundException,
    Param,
    Post
} from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiCreatedResponse,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { Project } from './project.entity';
import { ProjectService } from './project.service';

@ApiTags('Project')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
    constructor(private readonly projectService: ProjectService) {}

    @Get()
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目列表' })
    @ApiOkResponse({ type: ProjectListDto })
    async list(): Promise<ProjectSummary[]> {
        const projects = await this.projectService.findAll();

        return projects.map(mapProjectToSummary);
    }

    @Get(':id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按 ID 获取项目详情' })
    @ApiOkResponse({ type: ProjectDto })
    async getById(@Param('id') id: string): Promise<ProjectSummary> {
        const project = await this.projectService.findById(id);
        if (!project) {
            throw new NotFoundException(`Project ${id} not found`);
        }

        return mapProjectToSummary(project);
    }

    @Post()
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目基础台账' })
    @ApiCreatedResponse({ type: ProjectDto })
    async create(@Body() body: CreateProjectRequestDto): Promise<ProjectSummary> {
        const project = await this.projectService.createAndSave({
            projectCode: body.projectCode,
            projectName: body.projectName,
            customerId: body.customerId ?? null,
            status: body.status,
            currentStage: body.currentStage,
            ownerOrgId: body.ownerOrgId ?? null,
            ownerUserId: body.ownerUserId ?? null,
            plannedSignAt: body.plannedSignAt ? new Date(body.plannedSignAt) : null,
            createdBy: body.createdBy ?? null,
            updatedBy: body.updatedBy ?? null
        });

        return mapProjectToSummary(project);
    }
}

function mapProjectToSummary(project: Project): ProjectSummary {
    return {
        id: project.id,
        projectCode: project.projectCode,
        projectName: project.projectName,
        customerId: project.customerId ?? null,
        status: project.status,
        currentStage: project.currentStage,
        ownerOrgId: project.ownerOrgId ?? null,
        ownerUserId: project.ownerUserId ?? null,
        plannedSignAt: project.plannedSignAt?.toISOString() ?? null,
        closedAt: project.closedAt?.toISOString() ?? null,
        closedReason: project.closedReason ?? null,
        rowVersion: project.rowVersion,
        createdAt: project.createdAt.toISOString(),
        createdBy: project.createdBy ?? null,
        updatedAt: project.updatedAt.toISOString(),
        updatedBy: project.updatedBy ?? null
    };
}
