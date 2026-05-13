import type {
    CommissionAdjustmentSummary,
    CommissionCalculationSummary,
    CommissionFinalSettlementView,
    CommissionPayoutSummary,
    CommissionRoleAssignmentSummary,
    RegisterCommissionPayoutRequest,
    CommissionRuleExplanationView,
    CommissionRuleVersionSummary,
    SubmitCommissionPayoutApprovalRequest,
    UserPayload
} from '@poms/shared-contracts';
import {
    RegisterCommissionPayoutRequestSchema,
    SubmitCommissionPayoutApprovalRequestSchema
} from '@poms/shared-contracts';
import {
    ApproveCommissionPayoutRequestDto,
    CommissionAdjustmentListDto,
    CommissionAdjustmentSummaryDto,
    CommissionCalculationListDto,
    CommissionCalculationSummaryDto,
    CommissionFinalSettlementViewDto,
    CommissionPayoutListDto,
    CommissionPayoutSummaryDto,
    CommissionRoleAssignmentSummaryDto,
    CommissionRuleExplanationViewDto,
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
    RegisterNonRetentionCommissionPayoutRequestDto,
    RegisterRetentionCommissionPayoutRequestDto,
    SubmitCommissionAdjustmentApprovalRequestDto,
    SubmitNonRetentionCommissionPayoutApprovalRequestDto,
    SubmitRetentionCommissionPayoutApprovalRequestDto
} from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiBody, ApiExtraModels, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ZodValidationPipe } from 'nestjs-zod';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import type { RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { buildSensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection-request-context';
import { ApprovalService } from '../approval/approval.service';
import { CommissionService } from './commission.service';

interface AuthenticatedRequest extends RuntimeAuditRequestLike {
    user?: UserPayload;
}

@ApiTags('Commission')
@ApiCookieAuth('pomsSession')
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

    @Get('projects/:projectId/commission-final-settlement')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '获取项目最终结算与质保金结算视图' })
    @ApiOkResponse({ type: CommissionFinalSettlementViewDto })
    getCommissionFinalSettlement(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionFinalSettlementView> {
        return this.commissionService.getCommissionFinalSettlement(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-final-settlement`)
        );
    }

    @Get('projects/:projectId/commission-rule-explanation')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '获取项目统一提成规则解释视图' })
    @ApiOkResponse({ type: CommissionRuleExplanationViewDto })
    getCommissionRuleExplanation(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionRuleExplanationView> {
        return this.commissionService.getCommissionRuleExplanation(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-rule-explanation`)
        );
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
    listCalculations(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionCalculationSummary[]> {
        return this.commissionService.listCalculations(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-calculations`)
        );
    }

    @Post('projects/:projectId/commission-calculations')
    @HasPermissions('commission:calculations:manage')
    @ApiOperation({ summary: '触发项目提成计算' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    createCalculation(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionCalculationRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.createCalculation(
            projectId,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-calculations`)
        );
    }

    @Post('commission-calculations/:id\\:approve')
    @HasPermissions('commission:calculations:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认提成计算结果生效' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    approveCalculation(
        @Param('id') id: string,
        @Body() body: ConfirmCommissionCalculationRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.approveCalculation(
            id,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/commission-calculations/${id}:approve`)
        );
    }

    @Post('commission-calculations/:id\\:recalculate')
    @HasPermissions('commission:calculations:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '触发提成重算并生成新版本' })
    @ApiOkResponse({ type: CommissionCalculationSummaryDto })
    recalculateCalculation(
        @Param('id') id: string,
        @Body() body: RecalculateCommissionRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionCalculationSummary> {
        return this.commissionService.recalculateCalculation(
            id,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/commission-calculations/${id}:recalculate`)
        );
    }

    // ── Payouts ─────────────────────────────────────────────────────────────

    @Get('projects/:projectId/commission-payouts')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '获取项目提成发放记录列表' })
    @ApiOkResponse({ type: CommissionPayoutListDto })
    listPayouts(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionPayoutSummary[]> {
        return this.commissionService.listPayouts(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-payouts`)
        );
    }

    @Post('projects/:projectId/commission-payouts')
    @HasPermissions('commission:payouts:manage')
    @ApiOperation({ summary: '创建项目提成发放草稿' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    createPayout(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionPayoutRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.createPayout(
            projectId,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-payouts`)
        );
    }

    @Post('commission-payouts/:id\\:submitApproval')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '提交提成发放审批' })
    @ApiExtraModels(
        SubmitRetentionCommissionPayoutApprovalRequestDto,
        SubmitNonRetentionCommissionPayoutApprovalRequestDto
    )
    @ApiBody({
        schema: {
            title: 'SubmitCommissionPayoutApprovalRequest',
            oneOf: [
                { $ref: '#/components/schemas/SubmitRetentionCommissionPayoutApprovalRequest' },
                { $ref: '#/components/schemas/SubmitNonRetentionCommissionPayoutApprovalRequest' }
            ],
            discriminator: {
                propertyName: 'payoutStage',
                mapping: {
                    retention: '#/components/schemas/SubmitRetentionCommissionPayoutApprovalRequest',
                    first: '#/components/schemas/SubmitNonRetentionCommissionPayoutApprovalRequest',
                    second: '#/components/schemas/SubmitNonRetentionCommissionPayoutApprovalRequest',
                    final: '#/components/schemas/SubmitNonRetentionCommissionPayoutApprovalRequest'
                }
            }
        }
    })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    submitPayoutApproval(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
        @Body(new ZodValidationPipe(SubmitCommissionPayoutApprovalRequestSchema)) body: SubmitCommissionPayoutApprovalRequest
    ): Promise<CommissionPayoutSummary> {
        return this.approvalService.submitCommissionPayoutApproval(id, req.user?.sub ?? 'system', body).then(async () => {
            return this.commissionService.getPayoutById(
                id,
                req.user ?? null,
                buildSensitiveFieldProjectionRequestContext(req, `/commission-payouts/${id}:submitApproval`)
            );
        });
    }

    @Post('commission-payouts/:id\\:approve')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '批准提成发放' })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    approvePayout(
        @Param('id') id: string,
        @Body() body: ApproveCommissionPayoutRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.approvePayout(
            id,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/commission-payouts/${id}:approve`)
        );
    }

    @Post('commission-payouts/:id\\:registerPayout')
    @HasPermissions('commission:payouts:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '登记提成业务发放' })
    @ApiExtraModels(RegisterRetentionCommissionPayoutRequestDto, RegisterNonRetentionCommissionPayoutRequestDto)
    @ApiBody({
        schema: {
            title: 'RegisterCommissionPayoutRequest',
            oneOf: [
                { $ref: '#/components/schemas/RegisterRetentionCommissionPayoutRequest' },
                { $ref: '#/components/schemas/RegisterNonRetentionCommissionPayoutRequest' }
            ],
            discriminator: {
                propertyName: 'payoutStage',
                mapping: {
                    retention: '#/components/schemas/RegisterRetentionCommissionPayoutRequest',
                    first: '#/components/schemas/RegisterNonRetentionCommissionPayoutRequest',
                    second: '#/components/schemas/RegisterNonRetentionCommissionPayoutRequest',
                    final: '#/components/schemas/RegisterNonRetentionCommissionPayoutRequest'
                }
            }
        }
    })
    @ApiOkResponse({ type: CommissionPayoutSummaryDto })
    registerPayout(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
        @Body(new ZodValidationPipe(RegisterCommissionPayoutRequestSchema)) body: RegisterCommissionPayoutRequest
    ): Promise<CommissionPayoutSummary> {
        return this.commissionService.registerPayout(
            id,
            body,
            req.user?.sub ?? 'system',
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/commission-payouts/${id}:registerPayout`)
        );
    }

    // ── Adjustments ────────────────────────────────────────────────────────

    @Get('projects/:projectId/commission-adjustments')
    @HasPermissions('commission:adjustments:manage')
    @ApiOperation({ summary: '获取项目提成调整列表' })
    @ApiOkResponse({ type: CommissionAdjustmentListDto })
    listAdjustments(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionAdjustmentSummary[]> {
        return this.commissionService.listAdjustments(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-adjustments`)
        );
    }

    @Post('projects/:projectId/commission-adjustments')
    @HasPermissions('commission:adjustments:manage')
    @ApiOperation({ summary: '创建项目提成调整草稿' })
    @ApiOkResponse({ type: CommissionAdjustmentSummaryDto })
    createAdjustment(
        @Param('projectId') projectId: string,
        @Body() body: CreateCommissionAdjustmentRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionAdjustmentSummary> {
        return this.commissionService.createAdjustment(
            projectId,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/commission-adjustments`)
        );
    }

    @Post('commission-adjustments/:id\\:submitApproval')
    @HasPermissions('commission:adjustments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '提交提成调整审批' })
    @ApiOkResponse({ type: CommissionAdjustmentSummaryDto })
    submitAdjustmentApproval(
        @Param('id') id: string,
        @Request() req: AuthenticatedRequest,
        @Body() body: SubmitCommissionAdjustmentApprovalRequestDto
    ): Promise<CommissionAdjustmentSummary> {
        return this.approvalService.submitCommissionAdjustmentApproval(id, req.user?.sub ?? 'system', body).then(async () => {
            return this.commissionService.getAdjustmentById(
                id,
                req.user ?? null,
                buildSensitiveFieldProjectionRequestContext(req, `/commission-adjustments/${id}:submitApproval`)
            );
        });
    }

    @Post('commission-adjustments/:id\\:execute')
    @HasPermissions('commission:adjustments:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '执行已批准的提成调整' })
    @ApiOkResponse({ type: CommissionAdjustmentSummaryDto })
    executeAdjustment(
        @Param('id') id: string,
        @Body() body: ExecuteCommissionAdjustmentRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommissionAdjustmentSummary> {
        return this.commissionService.executeAdjustment(
            id,
            body,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/commission-adjustments/${id}:execute`)
        );
    }
}
