import type { CommissionFreezeChangeRequestDetailView } from '@poms/shared-contracts';
import { CommissionFreezeChangeRequestDetailViewDto } from '@poms/api-contracts';
import { Inject, Controller, Get, Param } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CommissionService } from './commission.service';

@ApiTags('Commission Freeze Change Requests')
@ApiCookieAuth('pomsSession')
@Controller('commission-freeze-change-requests')
export class CommissionFreezeChangeRequestController {
    constructor(@Inject(CommissionService) private readonly commissionService: CommissionService) {}

    @Get(':id')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '获取提成冻结受控变更详情' })
    @ApiOkResponse({ type: CommissionFreezeChangeRequestDetailViewDto })
    getCommissionFreezeChangeRequest(@Param('id') id: string): Promise<CommissionFreezeChangeRequestDetailView> {
        return this.commissionService.getCommissionFreezeChangeRequest(id);
    }
}
