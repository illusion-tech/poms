import type { AuditLogListQuery, AuditLogSummary, SecurityEventListQuery, SecurityEventSummary, UserPayload } from '@poms/shared-contracts';
import { AuditLogListDto, AuditLogListQueryDto, RecordRouteDeniedSecurityEventRequestDto, SecurityEventListDto, SecurityEventListQueryDto } from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from '../auth/decorators/authenticated.decorator';
import { HasPermissions } from '../auth/decorators/has-permissions.decorator';
import { getRequestId, getRequestIp, getRequestUserAgent, type RuntimeAuditRequestLike } from './runtime-audit-request.utils';
import { RuntimeAuditService } from './runtime-audit.service';

@ApiTags('RuntimeAudit')
@ApiBearerAuth()
@Controller()
export class RuntimeAuditController {
    constructor(private readonly runtimeAuditService: RuntimeAuditService) {}

    @Get('audit-logs')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '查询统一运行时审计日志' })
    @ApiOkResponse({ type: AuditLogListDto })
    async listAuditLogs(@Query() query: AuditLogListQueryDto): Promise<AuditLogSummary[]> {
        const listQuery: AuditLogListQuery = {
            from: query.from,
            to: query.to,
            eventType: query.eventType,
            targetType: query.targetType,
            targetId: query.targetId,
            operatorId: query.operatorId,
            result: query.result,
            limit: query.limit
        };

        return this.runtimeAuditService.listAuditLogs(listQuery);
    }

    @Get('security-events')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '查询结构化安全事件' })
    @ApiOkResponse({ type: SecurityEventListDto })
    async listSecurityEvents(@Query() query: SecurityEventListQueryDto): Promise<SecurityEventSummary[]> {
        const listQuery: SecurityEventListQuery = {
            from: query.from,
            to: query.to,
            eventType: query.eventType,
            actorId: query.actorId,
            principal: query.principal,
            path: query.path,
            permissionKey: query.permissionKey,
            result: query.result,
            limit: query.limit
        };

        return this.runtimeAuditService.listSecurityEvents(listQuery);
    }

    @Post('security-events/route-denied')
    @Authenticated()
    @HttpCode(HttpStatus.ACCEPTED)
    @ApiOperation({ summary: '记录前端权限路由守卫拒绝事件' })
    async recordRouteDeniedEvent(
        @Body() body: RecordRouteDeniedSecurityEventRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<void> {
        await this.runtimeAuditService.recordSecurityEvent({
            eventType: 'authz.route.denied',
            severity: 'warning',
            actorId: req.user.sub,
            principal: req.user.username,
            requestId: getRequestId(req),
            path: body.path,
            method: 'ROUTE',
            permissionKey: body.requiredPermissions[0] ?? null,
            result: 'blocked',
            ip: getRequestIp(req),
            userAgent: getRequestUserAgent(req),
            details: {
                requiredPermissions: body.requiredPermissions,
                returnUrl: body.returnUrl ?? null
            }
        });
    }
}
