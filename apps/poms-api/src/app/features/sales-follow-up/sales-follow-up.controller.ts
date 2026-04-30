import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CreateSalesFollowUpRecordRequestDto,
    ReplaceSalesFollowUpRecordRequestDto,
    SalesFollowUpRecordDto,
    SalesFollowUpRecordListDto,
    SalesFollowUpRecordListQueryDto,
    VoidSalesFollowUpRecordRequestDto
} from '@poms/api-contracts';
import type { SalesFollowUpRecordListQuery, SalesFollowUpRecordSummary, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
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
            projectId: query.projectId,
            lifecycleScope: query.lifecycleScope
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

    @Post(':id\\:replace')
    @HttpCode(HttpStatus.OK)
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '替代销售跟进记录' })
    @ApiOkResponse({ type: SalesFollowUpRecordDto })
    replace(
        @Param('id') id: string,
        @Body() body: ReplaceSalesFollowUpRecordRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<SalesFollowUpRecordSummary> {
        return this.salesFollowUpService.replaceSalesFollowUpRecord(
            id,
            {
                followUpType: body.followUpType,
                occurredAt: body.occurredAt,
                summary: body.summary,
                detail: body.detail,
                outcome: body.outcome,
                nextFollowUpAt: body.nextFollowUpAt,
                ownerOrgId: body.ownerOrgId,
                ownerUserId: body.ownerUserId,
                replacementReason: body.replacementReason,
                expectedVersion: body.expectedVersion
            },
            req.user.sub,
            getRequestId(req)
        );
    }

    @Post(':id\\:void')
    @HttpCode(HttpStatus.OK)
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '作废销售跟进记录' })
    @ApiOkResponse({ type: SalesFollowUpRecordDto })
    void(
        @Param('id') id: string,
        @Body() body: VoidSalesFollowUpRecordRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<SalesFollowUpRecordSummary> {
        return this.salesFollowUpService.voidSalesFollowUpRecord(
            id,
            {
                reason: body.reason,
                comment: body.comment,
                expectedVersion: body.expectedVersion
            },
            req.user.sub,
            getRequestId(req)
        );
    }
}
