import { Body, Controller, Get, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CreateLeadSourceRequestDto,
    LeadSourceDto,
    LeadSourceListDto,
    LeadSourceListQueryDto,
    UpdateLeadSourceRequestDto
} from '@poms/api-contracts';
import type { LeadSourceListQuery, LeadSourceSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { mapLeadSourceToSummary } from './lead.mapper';
import { LeadQueryService } from './lead-query.service';
import { LeadService } from './lead.service';

@ApiTags('LeadSource')
@ApiBearerAuth()
@Controller('lead-sources')
export class LeadSourceController {
    constructor(
        private readonly leadQueryService: LeadQueryService,
        private readonly leadService: LeadService
    ) {}

    @Get()
    @HasPermissions('lead:read')
    @ApiOperation({ summary: '获取线索来源列表' })
    @ApiOkResponse({ type: LeadSourceListDto })
    list(@Query() query: LeadSourceListQueryDto): Promise<LeadSourceSummary[]> {
        const listQuery: LeadSourceListQuery = {
            status: query.status,
            keyword: query.keyword
        };

        return this.leadQueryService.listLeadSources(listQuery);
    }

    @Post()
    @HasPermissions('lead:source:manage')
    @ApiOperation({ summary: '创建线索来源' })
    @ApiCreatedResponse({ type: LeadSourceDto })
    async create(
        @Body() body: CreateLeadSourceRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadSourceSummary> {
        const source = await this.leadService.createLeadSource(
            {
                code: body.code,
                name: body.name,
                description: body.description,
                sortOrder: body.sortOrder
            },
            req.user.sub
        );

        return mapLeadSourceToSummary(source);
    }

    @Patch(':id')
    @HasPermissions('lead:source:manage')
    @ApiOperation({ summary: '更新线索来源' })
    @ApiOkResponse({ type: LeadSourceDto })
    async update(
        @Param('id') id: string,
        @Body() body: UpdateLeadSourceRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<LeadSourceSummary> {
        const source = await this.leadService.updateLeadSource(
            id,
            {
                name: body.name,
                description: body.description,
                status: body.status,
                sortOrder: body.sortOrder
            },
            req.user.sub
        );

        const usageCount = await this.leadQueryService.countLeadSourceUsage(source.id);
        return mapLeadSourceToSummary(source, usageCount);
    }
}
