import type {
    CommissionAdjustmentSummary,
    CommissionCalculationSummary,
    CommissionPayoutSummary,
    CommissionRoleAssignmentSummary,
    CommissionRuleVersionSummary,
    UserPayload
} from '@poms/shared-contracts';
import {
    ApproveCommissionPayoutRequestDto,
    CommissionAdjustmentListDto,
    CommissionAdjustmentSummaryDto,
    CommissionCalculationListDto,
    CommissionCalculationSummaryDto,
    CommissionPayoutListDto,
    CommissionPayoutSummaryDto,
    CommissionRoleAssignmentSummaryDto,
    CommissionRuleVersionListDto,
    CommissionRuleVersionSummaryDto,
    ConfirmCommissionCalculationRequestDto,
    CreateCommissionAdjustmentRequestDto,
    CreateCommissionCalculationRequestDto,
    CreateCommissionPayoutRequestDto,
    CreateCommissionRoleAssignmentRequestDto,
    CreateCommissionRuleVersionRequestDto,
    ExecuteCommissionAdjustmentRequestDto,
    RecalculateCommissionRequestDto,
    RegisterCommissionPayoutRequestDto,
    SubmitCommissionAdjustmentApprovalRequestDto,
    SubmitCommissionPayoutApprovalRequestDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ApprovalService } from '../approval/approval.service';
import { CommissionService } from './commission.service';

@ApiTags('Commission')
@ApiBearerAuth()
@Controller()
export class CommissionController {
    constructor(
        private readonly commissionService: CommissionService,
        private readonly approvalService: ApprovalService
    ) {}

    // ── Rule Versions ─────────────────────────────────────────────────────────

    @Get('commission-rule-versions')
    @HasPermissions('commission:rule-versions:manage')
    @ApiOperation({ summary: '获取提成规则版本列表' })
    @ApiOkResponse({ type: CommissionRuleVersionListDto })
    listRuleVersions(): Promise<CommissionRuleVersionSummary[]> {
        return this.commissionService.listRuleVersions();
    }

    @Post('commission-rule-versions')
    @HasPermissions('commission:rule-versions:manage')
    @ApiOperation({ summary: '创建提成规则版本（草稿）' })
    @ApiOkResponse({ type: CommissionRuleVersionSummaryDto })
    createRuleVersion(@Body() body: CreateCommissionRuleVersionRequestDto): Promise<CommissionRuleVersionSummary> {
        return this.commissionService.createRuleVersion(body);
    }

    @Post('commission-rule-versions/:id\\:activate')
    @HasPermissions('commission:rule-versions:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '激活提成规则版本（草稿→激活）' })
    @ApiOkResponse({ type: CommissionRuleVersionSummaryDto })
    activateRuleVersion(@Param('id') id: string): Promise<CommissionRuleVersionSummary> {
        return this.commissionService.activateRuleVersion(id);
    }

    @Post('commission-rule-versions/:id\\:stop')
    @HasPermissions('commission:rule-versions:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '停用提成规则版本（激活→停用）' })
    @ApiOkResponse({ type: CommissionRuleVersionSummaryDto })
    stopRuleVersion(@Param('id') id: string): Promise<CommissionRuleVersionSummary> {
        return this.commissionService.stopRuleVersion(id);
    }

    // ── Role Assignments ──────────────────────────────────────────────────────

    @Get('projects/:projectId/commission-role-assignment')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '获取项目当前提成角色分配' })
    @ApiOkResponse({ type: CommissionRoleAssignmentSummaryDto })
    getCurrentRoleAssignment(@Param('projectId') projectId: string): Promise<CommissionRoleAssignmentSummary | null> {
        return this.commissionService.getCurrentRoleAssignment(projectId);
    }

    @Post('projects/:projectId/commission-role-assignments')
    @HasPermissions('commission:assignments:manage')
    @ApiOperation({ summary: '新建项目提成角色分配（新版本）' })
    @ApiOkResponse({ type: CommissionRoleAssignmentSummaryDto })
    createRoleAssignment(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionRoleAssignmentRequestDto
    ): Promise<CommissionRoleAssignmentSummary> {
        return this.commissionService.createRoleAssignment(projectId, body);
    }

    // ── Calculations ────────────────────────────────────────────────────────

    @Get('projects/:projectId/commission-calculations')
    @HasPermissions('commission:calculations:manage')
    @ApiOperation({ summary: '获取项目提成计算结果列表' })
    @ApiOkResponse({ type: CommissionCalculationListDto })
    listCalculations(@Param('projectId') projectId: string): Promise<CommissionCalculationSummary[]> {
        return this.commissionService.listCalculations(projectId);
    }

    @Post('projects/:projectId/commission-calculations')
    @HasPermissions('commission:calculations:manage')
    @ApiOperation({ summary: '触发项目提成计算' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    createCalculation(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionCalculationRequestDto
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.createCalculation(projectId, body);
    }

    @Post('commission-calculations/:id\\:approve')
    @HasPermissions('commission:calculations:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认提成计算结果生效' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    approveCalculation(
        @Param('id') id: string,
        @Body() body: ConfirmCommissionCalculationRequestDto
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.approveCalculation(id, body);
    }

    @Post('commission-calculations/:id\\:recalculate')
    @HasPermissions('commission:calculations:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '触发提成重算并生成新版本' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    recalculateCalculation(
        @Param('id') id: string,
        @Body() body: RecalculateCommissionRequestDto
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.recalculateCalculation(id, body);
    }

    // ── Payouts ─────────────────────────────────────────────────────────────

    @Get('projects/:projectId/commission-payouts')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '获取项目提成发放记录列表' })
    @ApiOkResponse({ type: CommissionPayoutListDto })
    listPayouts(@Param('projectId') projectId: string): Promise<CommissionPayoutSummary[]> {
        return this.commissionService.listPayouts(projectId);
    }

    @Post('projects/:projectId/commission-payouts')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '创建项目提成发放草稿' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    createPayout(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionPayoutRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.createPayout(projectId, body);
    }

    @Post('commission-payouts/:id\\:submitApproval')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '提交提成发放审批' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    submitPayoutApproval(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: SubmitCommissionPayoutApprovalRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.approvalService.submitCommissionPayoutApproval(id, req.user.sub, body).then(async () => {
            return this.commissionService.getPayoutById(id);
        });
    }

    @Post('commission-payouts/:id\\:approve')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '批准提成发放' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    approvePayout(
        @Param('id') id: string,
        @Body() body: ApproveCommissionPayoutRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.approvePayout(id, body);
    }

    @Post('commission-payouts/:id\\:registerPayout')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '登记提成业务发放' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    registerPayout(
        @Param('id') id: string,
        @Body() body: RegisterCommissionPayoutRequestDto
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.registerPayout(id, body);
    }

    // ── Adjustments ────────────────────────────────────────────────────────

    @Get('projects/:projectId/commission-adjustments')
    @HasPermissions('commission:adjustments:manage')
    @ApiOperation({ summary: '获取项目提成调整列表' })
    @ApiOkResponse({ type: CommissionAdjustmentListDto })
    listAdjustments(@Param('projectId') projectId: string): Promise<CommissionAdjustmentSummary[]> {
        return this.commissionService.listAdjustments(projectId);
    }

    @Post('projects/:projectId/commission-adjustments')
    @HasPermissions('commission:adjustments:manage')
    @ApiOperation({ summary: '创建项目提成调整草稿' })
    @ApiOkResponse({ type: CommissionAdjustmentSummaryDto })
    createAdjustment(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionAdjustmentRequestDto
    ): Promise<CommissionAdjustmentSummary> {
        return this.commissionService.createAdjustment(projectId, body);
    }

    @Post('commission-adjustments/:id\\:submitApproval')
    @HasPermissions('commission:adjustments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '提交提成调整审批' })
    @ApiOkResponse({ type: CommissionAdjustmentSummaryDto })
    submitAdjustmentApproval(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: SubmitCommissionAdjustmentApprovalRequestDto
    ): Promise<CommissionAdjustmentSummary> {
        return this.approvalService.submitCommissionAdjustmentApproval(id, req.user.sub, body).then(async () => {
            return this.commissionService.getAdjustmentById(id);
        });
    }

    @Post('commission-adjustments/:id\\:execute')
    @HasPermissions('commission:adjustments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '执行已批准的提成调整' })
    @ApiOkResponse({ type: CommissionAdjustmentSummaryDto })
    executeAdjustment(
        @Param('id') id: string,
        @Body() body: ExecuteCommissionAdjustmentRequestDto
    ): Promise<CommissionAdjustmentSummary> {
        return this.commissionService.executeAdjustment(id, body);
    }
}
