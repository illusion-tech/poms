import type { CommissionCalculationSummary, CommissionPayoutSummary, CommissionRoleAssignmentSummary, CommissionRuleVersionSummary } from '@poms/shared-contracts';
import {
    ApproveCommissionPayoutRequestDto,
    CommissionCalculationListDto,
    CommissionCalculationSummaryDto,
    CommissionPayoutListDto,
    CommissionPayoutSummaryDto,
    CommissionRoleAssignmentSummaryDto,
    CommissionRuleVersionListDto,
    CommissionRuleVersionSummaryDto,
    ConfirmCommissionCalculationRequestDto,
    CreateCommissionCalculationRequestDto,
    CreateCommissionPayoutRequestDto,
    CreateCommissionRoleAssignmentRequestDto,
    CreateCommissionRuleVersionRequestDto,
    RegisterCommissionPayoutRequestDto,
    SubmitCommissionPayoutApprovalRequestDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { CommissionService } from './commission.service';

@ApiTags('Commission')
@ApiBearerAuth()
@Controller('commission')
export class CommissionController {
    constructor(private readonly commissionService: CommissionService) {}

    // ── Rule Versions ─────────────────────────────────────────────────────────

    @Get('rule-versions')
    @HasPermissions('commission:rule-versions:manage')
    @ApiOperation({ summary: '获取提成规则版本列表' })
    @ApiOkResponse({ type: CommissionRuleVersionListDto })
    listRuleVersions(): Promise<CommissionRuleVersionSummary[]> {
        return this.commissionService.listRuleVersions();
    }

    @Post('rule-versions')
    @HasPermissions('commission:rule-versions:manage')
    @ApiOperation({ summary: '创建提成规则版本（草稿）' })
    @ApiOkResponse({ type: CommissionRuleVersionSummaryDto })
    createRuleVersion(@Body() body: CreateCommissionRuleVersionRequestDto): Promise<CommissionRuleVersionSummary> {
        return this.commissionService.createRuleVersion(body);
    }

    @Post('rule-versions/:id/activate')
    @HasPermissions('commission:rule-versions:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '激活提成规则版本（草稿→激活）' })
    @ApiOkResponse({ type: CommissionRuleVersionSummaryDto })
    activateRuleVersion(@Param('id') id: string): Promise<CommissionRuleVersionSummary> {
        return this.commissionService.activateRuleVersion(id);
    }

    @Post('rule-versions/:id/stop')
    @HasPermissions('commission:rule-versions:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '停用提成规则版本（激活→停用）' })
    @ApiOkResponse({ type: CommissionRuleVersionSummaryDto })
    stopRuleVersion(@Param('id') id: string): Promise<CommissionRuleVersionSummary> {
        return this.commissionService.stopRuleVersion(id);
    }

    // ── Role Assignments ──────────────────────────────────────────────────────

    @Get('projects/:projectId/role-assignment')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '获取项目当前提成角色分配' })
    @ApiOkResponse({ type: CommissionRoleAssignmentSummaryDto })
    getCurrentRoleAssignment(@Param('projectId') projectId: string): Promise<CommissionRoleAssignmentSummary | null> {
        return this.commissionService.getCurrentRoleAssignment(projectId);
    }

    @Post('projects/:projectId/role-assignment')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '新建项目提成角色分配（新版本）' })
    @ApiOkResponse({ type: CommissionRoleAssignmentSummaryDto })
    createRoleAssignment(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionRoleAssignmentRequestDto
    ): Promise<CommissionRoleAssignmentSummary> {
        return this.commissionService.createRoleAssignment(projectId, body);
    }

    @Post('projects/:projectId/role-assignment/:id/freeze')
    @HasPermissions('commission:assignments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '冻结项目提成角色分配（草稿→冻结）' })
    @ApiOkResponse({ type: CommissionRoleAssignmentSummaryDto })
    freezeRoleAssignment(
        @Param('projectId') projectId: string,
        @Param('id') id: string
    ): Promise<CommissionRoleAssignmentSummary> {
        return this.commissionService.freezeRoleAssignment(projectId, id);
    }

    // ── Calculations ────────────────────────────────────────────────────────

    @Get('projects/:projectId/calculations')
    @HasPermissions('commission:calculations:manage')
    @ApiOperation({ summary: '获取项目提成计算结果列表' })
    @ApiOkResponse({ type: CommissionCalculationListDto })
    listCalculations(@Param('projectId') projectId: string): Promise<CommissionCalculationSummary[]> {
        return this.commissionService.listCalculations(projectId);
    }

    @Post('projects/:projectId/calculations/trigger')
    @HasPermissions('commission:calculations:manage')
    @ApiOperation({ summary: '触发项目提成计算' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    triggerCalculation(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionCalculationRequestDto
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.triggerCalculation(projectId, body);
    }

    @Post('projects/:projectId/calculations/:id/effective')
    @HasPermissions('commission:calculations:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认提成计算结果生效' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    confirmCalculation(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() body: ConfirmCommissionCalculationRequestDto
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.confirmCalculation(projectId, id, body);
    }

    // ── Payouts ─────────────────────────────────────────────────────────────

    @Get('projects/:projectId/payouts')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '获取项目提成发放记录列表' })
    @ApiOkResponse({ type: CommissionPayoutListDto })
    listPayouts(@Param('projectId') projectId: string): Promise<CommissionPayoutSummary[]> {
        return this.commissionService.listPayouts(projectId);
    }

    @Post('projects/:projectId/payouts')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '创建项目提成发放草稿' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    createPayout(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionPayoutRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.createPayout(projectId, body);
    }

    @Post('projects/:projectId/payouts/:id/submit-approval')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '提交提成发放审批' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    submitPayoutApproval(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() body: SubmitCommissionPayoutApprovalRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.submitPayoutApproval(projectId, id, body);
    }

    @Post('projects/:projectId/payouts/:id/approve')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '批准提成发放' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    approvePayout(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() body: ApproveCommissionPayoutRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.approvePayout(projectId, id, body);
    }

    @Post('projects/:projectId/payouts/:id/register-payout')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '登记提成业务发放' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    registerPayout(
        @Param('projectId') projectId: string,
        @Param('id') id: string,
        @Body() body: RegisterCommissionPayoutRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.registerPayout(projectId, id, body);
    }
}
