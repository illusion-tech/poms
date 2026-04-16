import type {
    CommissionRoleAssignmentDetailView,
    FreezeCommissionRoleAssignmentResult,
    UserPayload
} from '@poms/shared-contracts';
import {
    CommissionRoleAssignmentDetailViewDto,
    FreezeCommissionRoleAssignmentRequestDto,
    FreezeCommissionRoleAssignmentResultDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CommissionService } from './commission.service';

@ApiTags('Commission Role Assignments')
@ApiBearerAuth()
@Controller('commission-role-assignments')
export class CommissionRoleAssignmentController {
    constructor(private readonly commissionService: CommissionService) {}

    @Get(':id')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '获取提成角色冻结详情视图' })
    @ApiOkResponse({ type: CommissionRoleAssignmentDetailViewDto })
    getRoleAssignmentDetail(@Param('id') id: string): Promise<CommissionRoleAssignmentDetailView> {
        return this.commissionService.getRoleAssignmentDetail(id);
    }

    @Post(':id\\:freeze')
    @HasPermissions('commission:assignments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '冻结提成角色分配并绑定移交收口链' })
    @ApiOkResponse({ type: FreezeCommissionRoleAssignmentResultDto })
    freezeRoleAssignment(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: FreezeCommissionRoleAssignmentRequestDto
    ): Promise<FreezeCommissionRoleAssignmentResult> {
        return this.commissionService.freezeCommissionRoleAssignment(id, req.user.sub, body);
    }
}
