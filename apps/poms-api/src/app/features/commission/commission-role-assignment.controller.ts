import { RustR4GhiNativeProtocolGuard } from "../../core/rust-r4ghi-native-protocol.guard";
import { UseGuards } from "@nestjs/common";
import { ApiBody } from "@nestjs/swagger";
import { ZodValidationPipe } from "@poms/vendor-nestjs-zod";
import { FreezeCommissionRoleAssignmentRequestSchema, type FreezeCommissionRoleAssignmentRequest } from "../../core/rust-r4ghi-frozen-native-reference";
import type { CommissionRoleAssignmentDetailView, FreezeCommissionRoleAssignmentResult, UserPayload } from "../../core/rust-r4ghi-frozen-native-reference";
import { CommissionRoleAssignmentDetailViewDto, FreezeCommissionRoleAssignmentRequestDto, FreezeCommissionRoleAssignmentResultDto } from '@poms/api-contracts';
import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CommissionService } from './commission.service';

@ApiTags('Commission Role Assignments')
@ApiCookieAuth('pomsSession')
@Controller('commission-role-assignments')
export class CommissionRoleAssignmentController {
    constructor(@Inject(CommissionService) private readonly commissionService: CommissionService) {}

    @Get(':id')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '获取提成角色冻结详情视图' })
    @ApiOkResponse({ type: CommissionRoleAssignmentDetailViewDto })
    getRoleAssignmentDetail(@Param('id') id: string): Promise<CommissionRoleAssignmentDetailView> {
        return this.commissionService.getRoleAssignmentDetail(id);
    }

    @UseGuards(RustR4GhiNativeProtocolGuard)
    @ApiBody({ type: FreezeCommissionRoleAssignmentRequestDto })
    @Post(':id\\:freeze')
    @HasPermissions('commission:assignments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '冻结提成角色分配并绑定移交收口链' })
    @ApiOkResponse({ type: FreezeCommissionRoleAssignmentResultDto })
    freezeRoleAssignment(@Param('id') id: string, @Request() req: { user: UserPayload }, @Body(new ZodValidationPipe(FreezeCommissionRoleAssignmentRequestSchema)) body: FreezeCommissionRoleAssignmentRequest): Promise<FreezeCommissionRoleAssignmentResult> {
        return this.commissionService.freezeCommissionRoleAssignment(id, req.user.sub, body);
    }
}
