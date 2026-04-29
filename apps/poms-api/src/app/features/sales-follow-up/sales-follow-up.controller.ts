import { Body, Controller, Get, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CreateSalesFollowUpRecordRequestDto,
    SalesFollowUpRecordDto,
    SalesFollowUpRecordListDto,
    SalesFollowUpRecordListQueryDto
} from '@poms/api-contracts';
import type { SalesFollowUpRecordListQuery, SalesFollowUpRecordSummary, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { SalesFollowUpService } from './sales-follow-up.service';

@ApiTags('SalesFollowUp')
@ApiBearerAuth()
@Controller('sales-follow-up-records')
export class SalesFollowUpController {
    constructor(private readonly salesFollowUpService: SalesFollowUpService) {}

    @Get()
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '获取销售跟进记录列表' })
    @ApiOkResponse({ type: SalesFollowUpRecordListDto })
    list(@Query() query: SalesFollowUpRecordListQueryDto): Promise<SalesFollowUpRecordSummary[]> {
        const listQuery: SalesFollowUpRecordListQuery = {
            customerId: query.customerId,
            leadId: query.leadId,
            projectId: query.projectId
        };

        return this.salesFollowUpService.listSalesFollowUpRecords(listQuery);
    }

    @Post()
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '登记销售跟进记录' })
    @ApiCreatedResponse({ type: SalesFollowUpRecordDto })
    create(
        @Body() body: CreateSalesFollowUpRecordRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<SalesFollowUpRecordSummary> {
        return this.salesFollowUpService.createSalesFollowUpRecord(
            {
                customerId: body.customerId,
                leadId: body.leadId,
                projectId: body.projectId,
                followUpType: body.followUpType,
                occurredAt: body.occurredAt,
                summary: body.summary,
                detail: body.detail,
                outcome: body.outcome,
                nextFollowUpAt: body.nextFollowUpAt,
                ownerOrgId: body.ownerOrgId,
                ownerUserId: body.ownerUserId
            },
            req.user.sub
        );
    }
}
