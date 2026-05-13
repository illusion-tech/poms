import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    AssignLeadOwnerRequestDto,
    ApproveLeadScoreOverrideRequestDto,
    ClaimLeadOwnerRequestDto,
    CloseLeadRequestDto,
    ConvertLeadToProjectRequestDto,
    CreateLeadRequestDto,
    LeadDetailViewDto,
    LeadDto,
    LeadListDto,
    LeadListQueryDto,
    LeadOwnerAssignmentResultDto,
    LeadScoreHistoryViewDto,
    LeadScoreOverrideDto,
    ProjectDto,
    QualifyLeadRequestDto,
    RejectLeadScoreOverrideRequestDto,
    RevokeLeadScoreOverrideRequestDto,
    SubmitLeadScoreOverrideRequestDto,
    UpdateLeadRequestDto
} from '@poms/api-contracts';
import type { LeadDetailView, LeadListQuery, LeadListView, LeadOwnerAssignmentResult, LeadScoreHistoryView, LeadScoreOverrideSummary, LeadSummary, ProjectSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { mapLeadToSummary } from './lead.mapper';
import { LeadQueryService } from './lead-query.service';
import { LeadScoreService } from './lead-score.service';
import { LeadService } from './lead.service';
import { Project } from '../project/project.entity';

@ApiTags('lead')
@ApiCookieAuth('pomsSession')
@Controller('leads')
export class LeadController {
    constructor(
        private readonly leadQueryService: LeadQueryService,
        private readonly leadScoreService: LeadScoreService,
        private readonly leadService: LeadService
    ) {}

    @Get()
    @HasPermissions('lead:read')
    @ApiOperation({ summary: '获取线索列表' })
    @ApiOkResponse({ type: LeadListDto })
    async list(@Query() query: LeadListQueryDto, @Request() req: { user: UserPayload }): Promise<LeadListView[]> {
        const listQuery: LeadListQuery = {
            status: query.status,
            sourceId: query.sourceId,
            budgetStatus: query.budgetStatus,
            urgency: query.urgency,
            rating: query.rating,
            ownerOrgId: query.ownerOrgId,
            ownerUserId: query.ownerUserId,
            ownershipScope: query.ownershipScope,
            keyword: query.keyword
        };

        return this.leadQueryService.listLeads(listQuery, req.user);
    }

    @Get(':id')
    @HasPermissions('lead:read')
    @ApiOperation({ summary: '获取线索详情' })
    @ApiOkResponse({ type: LeadDetailViewDto })
    getById(@Param('id') id: string, @Request() req: { user: UserPayload }): Promise<LeadDetailView> {
        return this.leadQueryService.getLead(id, req.user);
    }

    @Get(':id/score-history')
    @HasPermissions('lead:read')
    @ApiOperation({ summary: '获取线索评分历史与人工覆盖状态' })
    @ApiOkResponse({ type: LeadScoreHistoryViewDto })
    getScoreHistory(@Param('id') id: string): Promise<LeadScoreHistoryView> {
        return this.leadScoreService.getLeadScoreHistory(id);
    }

    @Post()
    @HasPermissions('lead:write')
    @ApiOperation({ summary: '登记线索' })
    @ApiCreatedResponse({ type: LeadDto })
    async create(
        @Body() body: CreateLeadRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadSummary> {
        const lead = await this.leadService.createLead({
            leadName: body.leadName,
            customerId: body.customerId,
            sourceId: body.sourceId,
            demandDescription: body.demandDescription,
            budgetStatus: body.budgetStatus,
            estimatedAmount: body.estimatedAmount,
            urgency: body.urgency,
            expectedDecisionDate: body.expectedDecisionDate,
            ownerOrgId: body.ownerOrgId,
            ownerUserId: body.ownerUserId
        }, req.user.sub);

        return mapLeadToSummary(lead);
    }

    @Post(':id/score-overrides')
    @HasPermissions('lead:write')
    @ApiOperation({ summary: '提交线索评分人工覆盖申请' })
    @ApiCreatedResponse({ type: LeadScoreOverrideDto })
    submitScoreOverride(
        @Param('id') id: string,
        @Body() body: SubmitLeadScoreOverrideRequestDto,
        @Request() req: { user: UserPayload } & RuntimeAuditRequestLike
    ): Promise<LeadScoreOverrideSummary> {
        return this.leadScoreService.submitLeadScoreOverride(
            id,
            {
                score: body.score,
                reason: body.reason,
                expectedLeadRowVersion: body.expectedLeadRowVersion
            },
            req.user.sub,
            getRequestId(req)
        );
    }

    @Post(':id\\:claim')
    @HasPermissions('lead:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '申领公共池线索' })
    @ApiOkResponse({ type: LeadOwnerAssignmentResultDto })
    claimOwner(
        @Param('id') id: string,
        @Body() body: ClaimLeadOwnerRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadOwnerAssignmentResult> {
        return this.leadService.claimLeadOwner(id, {
            expectedVersion: body.expectedVersion
        }, req.user.sub);
    }

    @Post(':id\\:assignOwner')
    @HasPermissions('lead:assign')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '分配或改派线索销售主责' })
    @ApiOkResponse({ type: LeadOwnerAssignmentResultDto })
    assignOwner(
        @Param('id') id: string,
        @Body() body: AssignLeadOwnerRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadOwnerAssignmentResult> {
        return this.leadService.assignLeadOwner(id, {
            ownerUserId: body.ownerUserId,
            ownerOrgId: body.ownerOrgId,
            reason: body.reason,
            expectedVersion: body.expectedVersion
        }, req.user.sub);
    }

    @Patch(':id')
    @HasPermissions('lead:write')
    @ApiOperation({ summary: '更新线索基础信息' })
    @ApiOkResponse({ type: LeadDto })
    async update(
        @Param('id') id: string,
        @Body() body: UpdateLeadRequestDto,
        @Request() req: { user: UserPayload } & RuntimeAuditRequestLike
    ): Promise<LeadSummary> {
        const lead = await this.leadService.updateLead(id, {
            leadName: body.leadName,
            customerId: body.customerId,
            sourceId: body.sourceId,
            demandDescription: body.demandDescription,
            budgetStatus: body.budgetStatus,
            estimatedAmount: body.estimatedAmount,
            urgency: body.urgency,
            expectedDecisionDate: body.expectedDecisionDate,
            expectedVersion: body.expectedVersion
        }, req.user.sub, getRequestId(req));

        return mapLeadToSummary(lead);
    }

    @Post(':id\\:qualify')
    @HasPermissions('lead:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认线索有效' })
    @ApiOkResponse({ type: LeadDto })
    async qualify(
        @Param('id') id: string,
        @Body() body: QualifyLeadRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadSummary> {
        const lead = await this.leadService.qualifyLead(id, {
            qualificationSummary: body.qualificationSummary
        }, req.user.sub);

        return mapLeadToSummary(lead);
    }

    @Post(':id\\:close')
    @HasPermissions('lead:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '关闭线索' })
    @ApiOkResponse({ type: LeadDto })
    async close(
        @Param('id') id: string,
        @Body() body: CloseLeadRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadSummary> {
        const lead = await this.leadService.closeLead(id, {
            closedReason: body.closedReason
        }, req.user.sub);

        return mapLeadToSummary(lead);
    }

    @Post(':id\\:convertToProject')
    @HasPermissions('lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '将有效线索转为项目' })
    @ApiOkResponse({ type: ProjectDto })
    async convertToProject(
        @Param('id') id: string,
        @Body() body: ConvertLeadToProjectRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ProjectSummary> {
        const project = await this.leadService.convertToProject(id, {
            projectName: body.projectName,
            customerProjectNo: body.customerProjectNo,
            plannedSignAt: body.plannedSignAt ? new Date(body.plannedSignAt) : null
        }, req.user.sub);

        return mapProjectToSummary(project);
    }
}

@ApiTags('lead')
@ApiCookieAuth('pomsSession')
@Controller('lead-score-overrides')
export class LeadScoreOverrideController {
    constructor(private readonly leadScoreService: LeadScoreService) {}

    @Post(':id\\:approve')
    @HasPermissions('lead:score:override')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '批准线索评分人工覆盖' })
    @ApiOkResponse({ type: LeadScoreOverrideDto })
    approve(
        @Param('id') id: string,
        @Body() body: ApproveLeadScoreOverrideRequestDto,
        @Request() req: { user: UserPayload } & RuntimeAuditRequestLike
    ): Promise<LeadScoreOverrideSummary> {
        return this.leadScoreService.approveLeadScoreOverride(
            id,
            {
                expectedOverrideRowVersion: body.expectedOverrideRowVersion,
                note: body.note
            },
            req.user.sub,
            getRequestId(req)
        );
    }

    @Post(':id\\:reject')
    @HasPermissions('lead:score:override')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '驳回线索评分人工覆盖' })
    @ApiOkResponse({ type: LeadScoreOverrideDto })
    reject(
        @Param('id') id: string,
        @Body() body: RejectLeadScoreOverrideRequestDto,
        @Request() req: { user: UserPayload } & RuntimeAuditRequestLike
    ): Promise<LeadScoreOverrideSummary> {
        return this.leadScoreService.rejectLeadScoreOverride(
            id,
            {
                reason: body.reason,
                expectedOverrideRowVersion: body.expectedOverrideRowVersion
            },
            req.user.sub,
            getRequestId(req)
        );
    }

    @Post(':id\\:revoke')
    @HasPermissions('lead:score:override')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '撤销线索评分人工覆盖' })
    @ApiOkResponse({ type: LeadScoreOverrideDto })
    revoke(
        @Param('id') id: string,
        @Body() body: RevokeLeadScoreOverrideRequestDto,
        @Request() req: { user: UserPayload } & RuntimeAuditRequestLike
    ): Promise<LeadScoreOverrideSummary> {
        return this.leadScoreService.revokeLeadScoreOverride(
            id,
            {
                reason: body.reason,
                expectedOverrideRowVersion: body.expectedOverrideRowVersion
            },
            req.user.sub,
            getRequestId(req)
        );
    }
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
