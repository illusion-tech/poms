import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CreateProjectRequestDto,
    ProjectDto,
    ProjectListDto,
    ProjectListQueryDto,
    UpdateProjectBasicInfoRequestDto
} from '@poms/api-contracts';
import type { ProjectListQuery, ProjectListView, ProjectSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { Project } from './project.entity';
import { ProjectQueryService } from './project-query.service';
import { ProjectService } from './project.service';

@ApiTags('Project')
@ApiBearerAuth()
@Controller('projects')
export class ProjectController {
    constructor(
        private readonly projectQueryService: ProjectQueryService,
        private readonly projectService: ProjectService
    ) {}

    @Get()
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目列表' })
    @ApiOkResponse({ type: ProjectListDto })
    async list(@Query() query: ProjectListQueryDto): Promise<ProjectListView[]> {
        const listQuery: ProjectListQuery = {
            status: query.status,
            currentStage: query.currentStage,
            ownerOrgId: query.ownerOrgId,
            keyword: query.keyword
        };

        return this.projectQueryService.listProjects(listQuery);
    }

    @Get('code/:projectCode')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按项目编码获取项目详情' })
    @ApiOkResponse({ type: ProjectDto })
    async getByCode(@Param('projectCode') projectCode: string): Promise<ProjectSummary> {
        const project = await this.projectService.findByCode(projectCode);
        if (!project) {
            throw new NotFoundException(`Project code ${projectCode} not found`);
        }

        return mapProjectToSummary(project);
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
    async create(
        @Body() body: CreateProjectRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectSummary> {
        const project = await this.projectService.createAndSave({
            projectCode: body.projectCode,
            projectName: body.projectName,
            customerName: body.customerName,
            currentStage: body.currentStage,
            plannedSignAt: body.plannedSignAt ? new Date(body.plannedSignAt) : null
        }, req.user.sub);

        return mapProjectToSummary(project);
    }

    @Patch(':id')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '更新项目基础信息' })
    @ApiOkResponse({ type: ProjectDto })
    async updateBasicInfo(
        @Param('id') id: string,
        @Body() body: UpdateProjectBasicInfoRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectSummary> {
        let plannedSignAt: Date | null | undefined;
        if (body.plannedSignAt === undefined) {
            plannedSignAt = undefined;
        } else if (body.plannedSignAt === null) {
            plannedSignAt = null;
        } else {
            plannedSignAt = new Date(body.plannedSignAt);
        }

        const project = await this.projectService.updateBasicInfo(id, {
            projectName: body.projectName,
            customerName: body.customerName,
            plannedSignAt
        }, req.user.sub);

        return mapProjectToSummary(project);
    }
}

function mapProjectToSummary(project: Project): ProjectSummary {
    return {
        id: project.id,
        projectCode: project.projectCode,
        projectName: project.projectName,
        customerId: project.customerId ?? null,
        customerName: project.customerName ?? null,
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
