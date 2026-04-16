import type {
    ArbitrateCommissionFreezeDisputeResult,
    CommissionFreezeDisputeDetailView,
    SubmitCommissionFreezeDisputeResult,
    UserPayload
} from '@poms/shared-contracts';
import {
    ArbitrateCommissionFreezeDisputeRequestDto,
    ArbitrateCommissionFreezeDisputeResultDto,
    CommissionFreezeDisputeDetailViewDto,
    SubmitCommissionFreezeDisputeRequestDto,
    SubmitCommissionFreezeDisputeResultDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CommissionService } from './commission.service';

@ApiTags('Commission Freeze Disputes')
@ApiBearerAuth()
@Controller('commission-freeze-disputes')
export class CommissionFreezeDisputeController {
    constructor(private readonly commissionService: CommissionService) {}

    @Post()
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '提交提成冻结后争议' })
    @ApiOkResponse({ type: SubmitCommissionFreezeDisputeResultDto })
    submitCommissionFreezeDispute(
        @Request() req: { user: UserPayload },
        @Body() body: SubmitCommissionFreezeDisputeRequestDto
    ): Promise<SubmitCommissionFreezeDisputeResult> {
        return this.commissionService.submitCommissionFreezeDispute(req.user.sub, body);
    }

    @Get(':id')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '获取提成冻结争议详情' })
    @ApiOkResponse({ type: CommissionFreezeDisputeDetailViewDto })
    getCommissionFreezeDispute(@Param('id') id: string): Promise<CommissionFreezeDisputeDetailView> {
        return this.commissionService.getCommissionFreezeDispute(id);
    }

    @Post(':id\\:arbitrate')
    @HasPermissions('commission:assignments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '仲裁提成冻结争议并生成受控变更链' })
    @ApiOkResponse({ type: ArbitrateCommissionFreezeDisputeResultDto })
    arbitrateCommissionFreezeDispute(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ArbitrateCommissionFreezeDisputeRequestDto
    ): Promise<ArbitrateCommissionFreezeDisputeResult> {
        return this.commissionService.arbitrateCommissionFreezeDispute(id, req.user.sub, body);
    }
}
