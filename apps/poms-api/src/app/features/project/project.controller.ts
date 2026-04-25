import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    AcceptanceRecordDto,
    AcceptanceRecordListDto,
    CreateAcceptanceRecordRequestDto,
    CreateProjectBidCommercialProcessRequestDto,
    CreateProjectArchiveRecordRequestDto,
    CreateProjectCompletionRecordRequestDto,
    CreateProjectPricingMarginReviewRequestDto,
    CreateProjectRequestDto,
    CreateProjectTechnicalCostPackageRequestDto,
    ReplaceProjectArchiveRecordRequestDto,
    ProjectArchiveRecordDto,
    ProjectArchiveRecordListDto,
    ProjectBidCommercialProcessDto,
    ProjectBidCommercialProcessListDto,
    ProjectBidCommercialWorkspaceViewDto,
    ProjectCompletionRecordDto,
    ProjectCompletionRecordListDto,
    ProjectDto,
    ProjectDetailViewDto,
    ProjectListDto,
    ProjectListQueryDto,
    ProjectPricingMarginReviewDto,
    ProjectPricingMarginReviewListDto,
    ProjectPricingMarginWorkspaceViewDto,
    ProjectTechnicalCostPackageDto,
    ProjectTechnicalCostPackageListDto,
    ProjectTechnicalCostWorkspaceViewDto,
    ProjectTimelineViewDto,
    ProjectWorkspaceGuidanceViewDto,
    UpdateProjectBasicInfoRequestDto,
    VoidProjectArchiveRecordRequestDto
} from '@poms/api-contracts';
import type {
    AcceptanceRecordSummary,
    ProjectArchiveRecordSummary,
    ProjectBidCommercialProcessList,
    ProjectBidCommercialProcessSummary,
    ProjectBidCommercialWorkspaceView,
    ProjectCompletionRecordSummary,
    ProjectDetailView,
    ProjectListQuery,
    ProjectListView,
    ProjectPricingMarginReviewList,
    ProjectPricingMarginReviewSummary,
    ProjectPricingMarginWorkspaceView,
    ProjectSummary,
    ProjectTechnicalCostPackageList,
    ProjectTechnicalCostPackageSummary,
    ProjectTechnicalCostWorkspaceView,
    ProjectTimelineView,
    ProjectWorkspaceGuidanceView,
    UserPayload
} from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { AcceptanceRecord } from './acceptance-record.entity';
import { ProjectArchiveRecord } from './project-archive-record.entity';
import { ProjectBidCommercialProcess } from './project-bid-commercial-process.entity';
import { ProjectCompletionRecord } from './project-completion-record.entity';
import { ProjectPricingMarginReview } from './project-pricing-margin-review.entity';
import { ProjectTechnicalCostPackage } from './project-technical-cost-package.entity';
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

    @Get('code/:projectNo')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '按项目编码获取项目详情' })
    @ApiOkResponse({ type: ProjectDto })
    async getByCode(@Param('projectNo') projectNo: string): Promise<ProjectSummary> {
        const project = await this.projectService.findByNo(projectNo);
        if (!project) {
            throw new NotFoundException(`Project no ${projectNo} not found`);
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

    @Get(':projectId/completion-records')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目完成确认记录' })
    @ApiOkResponse({ type: ProjectCompletionRecordListDto })
    async listProjectCompletionRecords(@Param('projectId') projectId: string): Promise<ProjectCompletionRecordSummary[]> {
        return this.projectQueryService.listProjectCompletionRecords(projectId);
    }

    @Get(':projectId/archive-records')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目归档记录' })
    @ApiOkResponse({ type: ProjectArchiveRecordListDto })
    async listProjectArchiveRecords(@Param('projectId') projectId: string): Promise<ProjectArchiveRecordSummary[]> {
        return this.projectQueryService.listProjectArchiveRecords(projectId);
    }

    @Get(':projectId/bid-commercial-processes')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目签约前招投标与商务竞标过程列表' })
    @ApiOkResponse({ type: ProjectBidCommercialProcessListDto })
    async listProjectBidCommercialProcesses(@Param('projectId') projectId: string): Promise<ProjectBidCommercialProcessList> {
        return this.projectQueryService.listProjectBidCommercialProcesses(projectId);
    }

    @Get(':projectId/bid-commercial-workspace')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目签约前招投标与商务竞标工作区' })
    @ApiOkResponse({ type: ProjectBidCommercialWorkspaceViewDto })
    async getProjectBidCommercialWorkspace(
        @Param('projectId') projectId: string,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectBidCommercialWorkspaceView> {
        return this.projectQueryService.getProjectBidCommercialWorkspace(projectId, req.user);
    }

    @Get(':projectId/pricing-margin-reviews')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目签约前报价与毛利评审列表' })
    @ApiOkResponse({ type: ProjectPricingMarginReviewListDto })
    async listProjectPricingMarginReviews(@Param('projectId') projectId: string): Promise<ProjectPricingMarginReviewList> {
        return this.projectQueryService.listProjectPricingMarginReviews(projectId);
    }

    @Get(':projectId/pricing-margin-workspace')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目签约前报价与毛利评审工作区' })
    @ApiOkResponse({ type: ProjectPricingMarginWorkspaceViewDto })
    async getProjectPricingMarginWorkspace(
        @Param('projectId') projectId: string,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectPricingMarginWorkspaceView> {
        return this.projectQueryService.getProjectPricingMarginWorkspace(projectId, req.user);
    }

    @Get(':projectId/technical-cost-packages')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目签约前技术与成本版本包列表' })
    @ApiOkResponse({ type: ProjectTechnicalCostPackageListDto })
    async listProjectTechnicalCostPackages(@Param('projectId') projectId: string): Promise<ProjectTechnicalCostPackageList> {
        return this.projectQueryService.listProjectTechnicalCostPackages(projectId);
    }

    @Get(':projectId/technical-cost-workspace')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目签约前技术与成本工作区' })
    @ApiOkResponse({ type: ProjectTechnicalCostWorkspaceViewDto })
    async getProjectTechnicalCostWorkspace(
        @Param('projectId') projectId: string,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectTechnicalCostWorkspaceView> {
        return this.projectQueryService.getProjectTechnicalCostWorkspace(projectId, req.user);
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
            projectName: body.projectName,
            customerName: body.customerName,
            customerProjectNo: body.customerProjectNo,
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

    @Post(':projectId/completion-records')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目完成确认记录' })
    @ApiCreatedResponse({ type: ProjectCompletionRecordDto })
    async createProjectCompletionRecord(
        @Param('projectId') projectId: string,
        @Body() body: CreateProjectCompletionRecordRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectCompletionRecordSummary> {
        const record = await this.projectService.createProjectCompletionRecord(projectId, {
            acceptanceRecordId: body.acceptanceRecordId,
            completionResult: body.completionResult,
            completedAt: new Date(body.completedAt),
            completionSummary: body.completionSummary,
            evidenceSummary: body.evidenceSummary
        }, req.user.sub);

        return mapProjectCompletionRecordToSummary(record);
    }

    @Post(':projectId/archive-records')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目归档记录' })
    @ApiCreatedResponse({ type: ProjectArchiveRecordDto })
    async createProjectArchiveRecord(
        @Param('projectId') projectId: string,
        @Body() body: CreateProjectArchiveRecordRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectArchiveRecordSummary> {
        const record = await this.projectService.createProjectArchiveRecord(projectId, {
            archivedAt: new Date(body.archivedAt),
            archiveSummary: body.archiveSummary,
            evidenceSummary: body.evidenceSummary
        }, req.user.sub);

        return mapProjectArchiveRecordToSummary(record);
    }

    @Post(':projectId/bid-commercial-processes')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目签约前招投标与商务竞标过程版本' })
    @ApiCreatedResponse({ type: ProjectBidCommercialProcessDto })
    async createProjectBidCommercialProcess(
        @Param('projectId') projectId: string,
        @Body() body: CreateProjectBidCommercialProcessRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectBidCommercialProcessSummary> {
        const record = await this.projectService.createProjectBidCommercialProcess(projectId, body, req.user.sub);

        return mapProjectBidCommercialProcessToSummary(record);
    }

    @Post(':projectId/pricing-margin-reviews')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目签约前报价与毛利评审版本' })
    @ApiCreatedResponse({ type: ProjectPricingMarginReviewDto })
    async createProjectPricingMarginReview(
        @Param('projectId') projectId: string,
        @Body() body: CreateProjectPricingMarginReviewRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectPricingMarginReviewSummary> {
        const record = await this.projectService.createProjectPricingMarginReview(projectId, body, req.user.sub);

        return mapProjectPricingMarginReviewToSummary(record);
    }

    @Post(':projectId/technical-cost-packages')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建项目签约前技术与成本版本包' })
    @ApiCreatedResponse({ type: ProjectTechnicalCostPackageDto })
    async createProjectTechnicalCostPackage(
        @Param('projectId') projectId: string,
        @Body() body: CreateProjectTechnicalCostPackageRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectTechnicalCostPackageSummary> {
        const record = await this.projectService.createProjectTechnicalCostPackage(projectId, body, req.user.sub);

        return mapProjectTechnicalCostPackageToSummary(record);
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
            customerProjectNo: body.customerProjectNo,
            plannedSignAt
        }, req.user.sub);

        return mapProjectToSummary(project);
    }
}

@ApiTags('Project')
@ApiBearerAuth()
@Controller('project-archive-records')
export class ProjectArchiveRecordController {
    constructor(private readonly projectService: ProjectService) {}

    @Post(':id\\:replace')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '替代项目归档记录' })
    @ApiOkResponse({ type: ProjectArchiveRecordDto })
    async replaceProjectArchiveRecord(
        @Param('id') id: string,
        @Body() body: ReplaceProjectArchiveRecordRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectArchiveRecordSummary> {
        const record = await this.projectService.replaceProjectArchiveRecord(id, {
            archivedAt: new Date(body.archivedAt),
            archiveSummary: body.archiveSummary,
            evidenceSummary: body.evidenceSummary,
            replacementReason: body.replacementReason,
            expectedVersion: body.expectedVersion
        }, req.user.sub);

        return mapProjectArchiveRecordToSummary(record);
    }

    @Post(':id\\:void')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '撤销项目归档记录' })
    @ApiOkResponse({ type: ProjectArchiveRecordDto })
    async voidProjectArchiveRecord(
        @Param('id') id: string,
        @Body() body: VoidProjectArchiveRecordRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectArchiveRecordSummary> {
        const record = await this.projectService.voidProjectArchiveRecord(id, {
            reason: body.reason,
            comment: body.comment,
            expectedVersion: body.expectedVersion
        }, req.user.sub);

        return mapProjectArchiveRecordToSummary(record);
    }
}

function mapProjectBidCommercialProcessToSummary(record: ProjectBidCommercialProcess): ProjectBidCommercialProcessSummary {
    return {
        id: record.id,
        projectId: record.projectId,
        version: record.version,
        isCurrent: record.isCurrent,
        supersedesId: record.supersedesId ?? null,
        status: record.status,
        bidMode: record.bidMode,
        currentStage: record.currentStage,
        decision: record.decision,
        resultStatus: record.resultStatus,
        processSummary: record.processSummary,
        decisionSummary: record.decisionSummary ?? null,
        resultSummary: record.resultSummary ?? null,
        tenderNo: record.tenderNo ?? null,
        bidPackageNo: record.bidPackageNo ?? null,
        ownerRole: record.ownerRole ?? null,
        blockerCount: record.blockerCount,
        effectiveAt: record.effectiveAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null,
        rowVersion: record.rowVersion
    };
}

function mapProjectPricingMarginReviewToSummary(record: ProjectPricingMarginReview): ProjectPricingMarginReviewSummary {
    return {
        id: record.id,
        projectId: record.projectId,
        version: record.version,
        isCurrent: record.isCurrent,
        supersedesId: record.supersedesId ?? null,
        status: record.status,
        technicalCostPackageId: record.technicalCostPackageId,
        bidCommercialProcessId: record.bidCommercialProcessId ?? null,
        commercialReleaseBaselineId: record.commercialReleaseBaselineId ?? null,
        pricingPath: record.pricingPath,
        quoteVersion: record.quoteVersion,
        currencyCode: record.currencyCode,
        quoteAmountTaxInclusive: toDecimalString(record.quoteAmountTaxInclusive),
        quoteAmountTaxExclusive: toDecimalString(record.quoteAmountTaxExclusive),
        taxRate: toDecimalString(record.taxRate),
        taxConditionSummary: record.taxConditionSummary,
        paymentTermsSummary: record.paymentTermsSummary,
        grossMarginRate: toNullableDecimalString(record.grossMarginRate),
        grossMarginBand: record.grossMarginBand,
        grossMarginSummary: record.grossMarginSummary,
        decision: record.decision,
        decisionSummary: record.decisionSummary,
        approvalScenarioKey: record.approvalScenarioKey ?? null,
        summaryPackageKey: record.summaryPackageKey ?? null,
        summarySnapshotId: record.summarySnapshotId ?? null,
        projectionLevel: record.projectionLevel ?? null,
        exportPolicy: record.exportPolicy ?? null,
        readyForContracting: record.readyForContracting,
        ownerRole: record.ownerRole ?? null,
        blockerCount: record.blockerCount,
        effectiveAt: record.effectiveAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null,
        rowVersion: record.rowVersion
    };
}

function mapProjectTechnicalCostPackageToSummary(record: ProjectTechnicalCostPackage): ProjectTechnicalCostPackageSummary {
    return {
        id: record.id,
        projectId: record.projectId,
        version: record.version,
        isCurrent: record.isCurrent,
        supersedesId: record.supersedesId ?? null,
        status: record.status,
        technicalFeasibilityDecision: record.technicalFeasibilityDecision,
        technicalConclusionSummary: record.technicalConclusionSummary,
        allowNextStage: record.allowNextStage,
        currencyCode: record.currencyCode,
        totalEstimatedAmountExcludingTax: toDecimalString(record.totalEstimatedAmountExcludingTax),
        totalTaxCostAmount: toDecimalString(record.totalTaxCostAmount),
        totalEstimatedAmountIncludingTax: toDecimalString(record.totalEstimatedAmountIncludingTax),
        taxAssumptionSummary: record.taxAssumptionSummary,
        taxReviewStatus: record.taxReviewStatus,
        highestRiskLevel: record.highestRiskLevel ?? null,
        blockerCount: record.blockerCount,
        effectiveAt: record.effectiveAt.toISOString(),
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null,
        rowVersion: record.rowVersion
    };
}

function mapProjectArchiveRecordToSummary(record: ProjectArchiveRecord): ProjectArchiveRecordSummary {
    return {
        id: record.id,
        projectId: record.projectId,
        archiveAnchorStage: record.archiveAnchorStage,
        archiveAnchorSourceType: record.archiveAnchorSourceType,
        archiveAnchorSourceId: record.archiveAnchorSourceId,
        status: record.status,
        archivedAt: record.archivedAt.toISOString(),
        archivedBy: record.archivedBy ?? null,
        archivedByName: null,
        archiveSummary: record.archiveSummary,
        evidenceSummary: record.evidenceSummary,
        supersedesArchiveRecordId: record.supersedesArchiveRecordId ?? null,
        replacementReason: record.replacementReason ?? null,
        voidedAt: record.voidedAt?.toISOString() ?? null,
        voidedBy: record.voidedBy ?? null,
        voidedByName: null,
        voidReason: record.voidReason ?? null,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null,
        rowVersion: record.rowVersion
    };
}

function mapProjectCompletionRecordToSummary(record: ProjectCompletionRecord): ProjectCompletionRecordSummary {
    return {
        id: record.id,
        projectId: record.projectId,
        acceptanceRecordId: record.acceptanceRecordId,
        completionResult: record.completionResult,
        status: record.status,
        completedAt: record.completedAt.toISOString(),
        completedBy: record.completedBy ?? null,
        completedByName: null,
        completionSummary: record.completionSummary,
        evidenceSummary: record.evidenceSummary,
        createdAt: record.createdAt.toISOString(),
        createdBy: record.createdBy ?? null,
        updatedAt: record.updatedAt.toISOString(),
        updatedBy: record.updatedBy ?? null,
        rowVersion: record.rowVersion
    };
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
        projectNo: project.projectNo,
        projectName: project.projectName,
        sourceLeadId: project.sourceLeadId ?? null,
        customerId: project.customerId ?? null,
        customerName: project.customerName ?? null,
        customerProjectNo: project.customerProjectNo ?? null,
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

function toDecimalString(value: string | number): string {
    return typeof value === 'string' ? value : String(value);
}

function toNullableDecimalString(value: string | number | null | undefined): string | null {
    if (value == null) {
        return null;
    }

    return toDecimalString(value);
}
