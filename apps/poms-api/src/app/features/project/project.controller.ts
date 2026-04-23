import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    AcceptanceRecordDto,
    AcceptanceRecordListDto,
    CreateAcceptanceRecordRequestDto,
    CreateProjectRequestDto,
    ProjectDto,
    ProjectDetailViewDto,
    ProjectListDto,
    ProjectListQueryDto,
    ProjectTimelineViewDto,
    ProjectWorkspaceGuidanceViewDto,
    UpdateProjectBasicInfoRequestDto
} from '@poms/api-contracts';
import type {
    AcceptanceRecordSummary,
    ProjectDetailView,
    ProjectListQuery,
    ProjectListView,
    ProjectSummary,
    ProjectTimelineView,
    ProjectWorkspaceGuidanceView,
    UserPayload
} from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { AcceptanceRecord } from './acceptance-record.entity';
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

    @Get(':projectId/workspace-guidance')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目工作区引导' })
    @ApiOkResponse({ type: ProjectWorkspaceGuidanceViewDto })
    async getWorkspaceGuidance(
        @Param('projectId') projectId: string,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectWorkspaceGuidanceView> {
        return this.projectQueryService.getProjectWorkspaceGuidance(projectId, req.user);
    }

    @Get(':projectId/timeline')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目生命周期里程碑' })
    @ApiOkResponse({ type: ProjectTimelineViewDto })
    async getTimeline(@Param('projectId') projectId: string): Promise<ProjectTimelineView> {
        return this.projectQueryService.getProjectTimeline(projectId);
    }

    @Get(':projectId/acceptance-records')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目验收确认记录' })
    @ApiOkResponse({ type: AcceptanceRecordListDto })
    async listAcceptanceRecords(@Param('projectId') projectId: string): Promise<AcceptanceRecordSummary[]> {
        return this.projectQueryService.listAcceptanceRecords(projectId);
    }

    @Get(':id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按 ID 获取项目详情' })
    @ApiOkResponse({ type: ProjectDetailViewDto })
    async getById(@Param('id') id: string, @Request() req: { user: UserPayload }): Promise<ProjectDetailView> {
        return this.projectQueryService.getProjectDetail(id, req.user);
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

    @Post(':projectId/acceptance-records')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目验收确认记录' })
    @ApiCreatedResponse({ type: AcceptanceRecordDto })
    async createAcceptanceRecord(
        @Param('projectId') projectId: string,
        @Body() body: CreateAcceptanceRecordRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<AcceptanceRecordSummary> {
        const record = await this.projectService.createAcceptanceRecord(projectId, {
            acceptanceType: body.acceptanceType,
            acceptanceResult: body.acceptanceResult,
            scopeSummary: body.scopeSummary,
            evidenceSummary: body.evidenceSummary,
            comment: body.comment
        }, req.user.sub);

        return mapAcceptanceRecordToSummary(record);
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

function mapAcceptanceRecordToSummary(record: AcceptanceRecord): AcceptanceRecordSummary {
    return {
        id: record.id,
        projectId: record.projectId,
        acceptanceType: record.acceptanceType,
        acceptanceResult: record.acceptanceResult,
        status: record.status,
        scopeSummary: record.scopeSummary,
        evidenceSummary: record.evidenceSummary,
        comment: record.comment ?? null,
        confirmationRecordId: record.confirmationRecordId ?? null,
        confirmedAt: record.confirmedAt.toISOString(),
        confirmedBy: record.confirmedBy ?? null,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null,
        rowVersion: record.rowVersion
    };
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
