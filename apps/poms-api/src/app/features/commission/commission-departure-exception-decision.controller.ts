import type {
    CommissionDepartureExceptionDecisionSummary,
    UserPayload
} from '@poms/shared-contracts';
import {
    CommissionDepartureExceptionDecisionSummaryDto,
    CreateCommissionDepartureExceptionDecisionRequestDto
} from '@poms/api-contracts';
import { Body, Controller, Param, Post, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CommissionService } from './commission.service';

@ApiTags('Commission Departure Exception Decisions')
@ApiCookieAuth('pomsSession')
@Controller('projects/:projectId/commission-departure-exception-decisions')
export class CommissionDepartureExceptionDecisionController {
    constructor(private readonly commissionService: CommissionService) {}

    @Post()
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '创建项目离职 / 特例结论并形成当前有效版本' })
    @ApiCreatedResponse({ type: CommissionDepartureExceptionDecisionSummaryDto })
    createDepartureExceptionDecision(
        @Param('projectId') projectId: string,
        @Request() req: { user: UserPayload },
        @Body() body: CreateCommissionDepartureExceptionDecisionRequestDto
    ): Promise<CommissionDepartureExceptionDecisionSummary> {
        return this.commissionService.createDepartureExceptionDecision(projectId, req.user.sub, body);
    }
}
