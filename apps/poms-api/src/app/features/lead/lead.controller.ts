import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CloseLeadRequestDto,
    CreateLeadRequestDto,
    LeadDetailViewDto,
    LeadDto,
    LeadListDto,
    LeadListQueryDto,
    QualifyLeadRequestDto,
    UpdateLeadRequestDto
} from '@poms/api-contracts';
import type { LeadDetailView, LeadListQuery, LeadListView, LeadSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { mapLeadToSummary } from './lead.mapper';
import { LeadQueryService } from './lead-query.service';
import { LeadService } from './lead.service';

@ApiTags('Lead')
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
    async list(@Query() query: LeadListQueryDto): Promise<LeadListView[]> {
        const listQuery: LeadListQuery = {
            status: query.status,
            ownerOrgId: query.ownerOrgId,
            keyword: query.keyword
        };

        return this.leadQueryService.listLeads(listQuery);
    }

    @Get(':id')
    @HasPermissions('lead:read')
    @ApiOperation({ summary: '获取线索详情' })
    @ApiOkResponse({ type: LeadDetailViewDto })
    getById(@Param('id') id: string): Promise<LeadDetailView> {
        return this.leadQueryService.getLead(id);
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
            leadCode: body.leadCode,
            leadName: body.leadName,
            customerName: body.customerName,
            sourceChannel: body.sourceChannel,
            ownerOrgId: body.ownerOrgId,
            ownerUserId: body.ownerUserId
        }, req.user.sub);

        return mapLeadToSummary(lead);
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
            customerName: body.customerName,
            sourceChannel: body.sourceChannel,
            ownerOrgId: body.ownerOrgId,
            ownerUserId: body.ownerUserId
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
}
