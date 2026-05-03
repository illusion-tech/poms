import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    AssignLeadOwnerRequestDto,
    ClaimLeadOwnerRequestDto,
    CloseLeadRequestDto,
    ConvertLeadToProjectRequestDto,
    CreateLeadRequestDto,
    LeadDetailViewDto,
    LeadDto,
    LeadListDto,
    LeadListQueryDto,
    LeadOwnerAssignmentResultDto,
    ProjectDto,
    QualifyLeadRequestDto,
    UpdateLeadRequestDto
} from '@poms/api-contracts';
import type { LeadDetailView, LeadListQuery, LeadListView, LeadOwnerAssignmentResult, LeadSummary, ProjectSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { mapLeadToSummary } from './lead.mapper';
import { LeadQueryService } from './lead-query.service';
import { LeadService } from './lead.service';
import { Project } from '../project/project.entity';

@ApiTags('lead')
@ApiBearerAuth()
@Controller('leads')
export class LeadController {
    constructor(
        private readonly leadQueryService: LeadQueryService,
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
        @Request() req: { user: UserPayload }
    ): Promise<LeadSummary> {
        const lead = await this.leadService.updateLead(id, {
            leadName: body.leadName,
            customerId: body.customerId,
            sourceId: body.sourceId,
            demandDescription: body.demandDescription,
            budgetStatus: body.budgetStatus,
            estimatedAmount: body.estimatedAmount,
            urgency: body.urgency,
            expectedDecisionDate: body.expectedDecisionDate
        }, req.user.sub);

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
