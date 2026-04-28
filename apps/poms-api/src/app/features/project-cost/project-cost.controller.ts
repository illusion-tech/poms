import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import {
    ApiBearerAuth,
    ApiBody,
    ApiCreatedResponse,
    ApiExtraModels,
    ApiOkResponse,
    ApiOperation,
    ApiTags
} from '@nestjs/swagger';
import {
    ActivateOperatingBaselinePackageRequestDto,
    AccountingTaxTreatmentListViewDto,
    AccountingTaxTreatmentSnapshotSummaryDto,
    BusinessAccountingFeedbackViewDto,
    CommissionGateBindingHistoryViewDto,
    ConfirmAccountingTaxTreatmentRequestDto,
    ConfirmCostStageAttributionRequestDto,
    ConfirmExpenseRecordRequestDto,
    ConfirmSharedCostAllocationBasisRequestDto,
    CostStageAttributionHistoryViewDto,
    CostStageAttributionSnapshotSummaryDto,
    CreateExpenseProjectActualCostRecordRequestDto,
    CreateOperatingRestatementRequestDto,
    CreateExpenseRecordRequestDto,
    CreateInvoiceProjectActualCostRecordRequestDto,
    CreateLaborProjectActualCostRecordRequestDto,
    CreatePaymentFactProjectActualCostRecordRequestDto,
    CreateProcurementProjectActualCostRecordRequestDto,
    CreatePeriodClosingSnapshotRequestDto,
    CreateProjectOperatingSnapshotRequestDto,
    ExpenseRecordDetailViewDto,
    ExpenseRecordListDto,
    ExpenseRecordDto,
    OperatingBaselinePackageSummaryDto,
    OperatingSignalEvaluationViewDto,
    OperatingRestatementListViewDto,
    OperatingRestatementSummaryDto,
    PeriodClosingSnapshotSummaryDto,
    ProjectActualCostRecordDetailViewDto,
    ProjectActualCostRecordListViewDto,
    ProjectBusinessOutcomeOverviewViewDto,
    ProjectOperatingSnapshotSummaryDto,
    ProjectUnifiedAccountingViewDto,
    ProjectVarianceRiskExplanationViewDto,
    PublishInternalCostRateVersionRequestDto,
    ReviewCommissionGateBindingRequestDto,
    ReviewCommissionGateBindingResultDto,
    ReviewOperatingSignalEvaluationRequestDto,
    ReviewOperatingSignalEvaluationResultDto,
    ReclassifyCostStageAttributionRequestDto,
    ReplaceAccountingTaxTreatmentRequestDto,
    ReplaceSharedCostAllocationResultRequestDto,
    ReplaceLaborCostRecordRequestDto,
    SharedCostAllocationBasisSummaryDto,
    SharedCostAllocationResultListViewDto,
    UpdateExpenseRecordRequestDto,
    VoidExpenseRecordRequestDto
} from '@poms/api-contracts';
import {
    CreateProjectActualCostRecordRequestSchema
} from '@poms/shared-contracts';
import type {
    AccountingTaxTreatmentListView,
    AccountingTaxTreatmentSnapshotSummary,
    BusinessAccountingFeedbackView,
    CommissionGateBindingHistoryView,
    CommandResult,
    CreateProjectActualCostRecordRequest,
    CostStageAttributionHistoryView,
    CostStageAttributionSnapshotSummary,
    ExpenseRecordDetailView,
    ExpenseRecordList,
    ExpenseRecordSummary,
    OperatingBaselinePackageSummary,
    OperatingSignalEvaluationView,
    OperatingRestatementListView,
    OperatingRestatementSummary,
    PeriodClosingSnapshotSummary,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordListView,
    ProjectBusinessOutcomeOverviewView,
    ProjectOperatingSnapshotSummary,
    ProjectUnifiedAccountingView,
    ProjectVarianceRiskExplanationView,
    ReviewCommissionGateBindingResult,
    ReviewOperatingSignalEvaluationResult,
    SharedCostAllocationBasisSummary,
    SharedCostAllocationResultListView,
    UserPayload
} from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import type { RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { buildSensitiveFieldProjectionRequestContext } from '../../core/sensitive-field-projection/sensitive-field-projection-request-context';
import { ZodValidationPipe } from 'nestjs-zod';
import { ProjectCostService } from './project-cost.service';

interface AuthenticatedRequest extends RuntimeAuditRequestLike {
    user?: UserPayload;
}

interface ProjectActualCostRecordListQuery {
    costType?: string;
    recordStatus?: string;
    sourceType?: string;
}

@ApiTags('Project Cost')
@ApiBearerAuth()
@Controller()
export class ProjectCostController {
    constructor(private readonly projectCostService: ProjectCostService) {}

    @Post('internal-cost-rate-versions')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '发布内部成本率版本' })
    @ApiCreatedResponse({ description: 'The command result' })
    async publishInternalCostRateVersion(
        @Body() body: PublishInternalCostRateVersionRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.publishInternalCostRateVersion(body, userId);
    }

    @Post('projects/:projectId/actual-cost-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建项目统一实际成本记录' })
    @ApiExtraModels(
        CreatePaymentFactProjectActualCostRecordRequestDto,
        CreateInvoiceProjectActualCostRecordRequestDto,
        CreateExpenseProjectActualCostRecordRequestDto,
        CreateProcurementProjectActualCostRecordRequestDto,
        CreateLaborProjectActualCostRecordRequestDto
    )
    @ApiBody({
        schema: {
            title: 'CreateProjectActualCostRecordRequest',
            oneOf: [
                { $ref: '#/components/schemas/CreatePaymentFactProjectActualCostRecordRequest' },
                { $ref: '#/components/schemas/CreateInvoiceProjectActualCostRecordRequest' },
                { $ref: '#/components/schemas/CreateExpenseProjectActualCostRecordRequest' },
                { $ref: '#/components/schemas/CreateProcurementProjectActualCostRecordRequest' },
                { $ref: '#/components/schemas/CreateLaborProjectActualCostRecordRequest' }
            ],
            discriminator: {
                propertyName: 'costType',
                mapping: {
                    PAYMENT_FACT: '#/components/schemas/CreatePaymentFactProjectActualCostRecordRequest',
                    INVOICE: '#/components/schemas/CreateInvoiceProjectActualCostRecordRequest',
                    EXPENSE: '#/components/schemas/CreateExpenseProjectActualCostRecordRequest',
                    PROCUREMENT: '#/components/schemas/CreateProcurementProjectActualCostRecordRequest',
                    LABOR: '#/components/schemas/CreateLaborProjectActualCostRecordRequest'
                }
            }
        }
    })
    @ApiCreatedResponse({ description: 'The command result' })
    async createProjectActualCostRecord(
        @Param('projectId') projectId: string,
        @Body(new ZodValidationPipe(CreateProjectActualCostRecordRequestSchema)) body: CreateProjectActualCostRecordRequest,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.createProjectActualCostRecord(projectId, body, userId);
    }

    @Post('operating-baseline-packages')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '生效项目经营基线包' })
    @ApiCreatedResponse({ description: 'The command result' })
    async activateOperatingBaselinePackage(
        @Body() body: ActivateOperatingBaselinePackageRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.activateOperatingBaselinePackage(body, userId);
    }

    @Get('projects/:projectId/operating-baseline-package')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取当前项目经营基线包' })
    @ApiOkResponse({ type: OperatingBaselinePackageSummaryDto })
    async getCurrentOperatingBaselinePackage(@Param('projectId') projectId: string): Promise<OperatingBaselinePackageSummary> {
        return this.projectCostService.getCurrentOperatingBaselinePackage(projectId);
    }

    @Post('project-operating-snapshots')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建项目经营快照' })
    @ApiCreatedResponse({ description: 'The command result' })
    async createProjectOperatingSnapshot(
        @Body() body: CreateProjectOperatingSnapshotRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.createProjectOperatingSnapshot(body, userId);
    }

    @Get('project-operating-snapshots/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目经营快照' })
    @ApiOkResponse({ type: ProjectOperatingSnapshotSummaryDto })
    async getProjectOperatingSnapshot(@Param('id') id: string): Promise<ProjectOperatingSnapshotSummary> {
        return this.projectCostService.getProjectOperatingSnapshot(id);
    }

    @Post('period-closing-snapshots')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建期末冻结经营快照' })
    @ApiCreatedResponse({ description: 'The command result' })
    async createPeriodClosingSnapshot(
        @Body() body: CreatePeriodClosingSnapshotRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.createPeriodClosingSnapshot(body, userId);
    }

    @Get('period-closing-snapshots/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取期末冻结经营快照' })
    @ApiOkResponse({ type: PeriodClosingSnapshotSummaryDto })
    async getPeriodClosingSnapshot(@Param('id') id: string): Promise<PeriodClosingSnapshotSummary> {
        return this.projectCostService.getPeriodClosingSnapshot(id);
    }

    @Post('operating-restatements')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建经营快照重述记录' })
    @ApiCreatedResponse({ description: 'The command result' })
    async createOperatingRestatement(
        @Body() body: CreateOperatingRestatementRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.createOperatingRestatement(body, userId);
    }

    @Get('projects/:projectId/operating-restatements')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目经营重述记录列表' })
    @ApiOkResponse({ type: OperatingRestatementListViewDto })
    async listOperatingRestatements(@Param('projectId') projectId: string): Promise<OperatingRestatementListView> {
        return this.projectCostService.listOperatingRestatements(projectId);
    }

    @Get('operating-restatements/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取经营重述记录详情' })
    @ApiOkResponse({ type: OperatingRestatementSummaryDto })
    async getOperatingRestatement(@Param('id') id: string): Promise<OperatingRestatementSummary> {
        return this.projectCostService.getOperatingRestatement(id);
    }

    @Post('shared-cost-allocation-bases')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建共享成本分摊依据与项目分摊结果' })
    @ApiCreatedResponse({ description: 'The command result' })
    async confirmSharedCostAllocationBasis(
        @Body() body: ConfirmSharedCostAllocationBasisRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.confirmSharedCostAllocationBasis(body, userId);
    }

    @Get('shared-cost-allocation-bases/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取共享成本分摊依据详情' })
    @ApiOkResponse({ type: SharedCostAllocationBasisSummaryDto })
    async getSharedCostAllocationBasis(@Param('id') id: string): Promise<SharedCostAllocationBasisSummary> {
        return this.projectCostService.getSharedCostAllocationBasis(id);
    }

    @Get('shared-cost-allocation-bases/:id/results')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取共享成本分摊结果列表' })
    @ApiOkResponse({ type: SharedCostAllocationResultListViewDto })
    async listSharedCostAllocationResults(@Param('id') id: string): Promise<SharedCostAllocationResultListView> {
        return this.projectCostService.listSharedCostAllocationResults(id);
    }

    @Post('shared-cost-allocation-results/:id\\:replace')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '替代共享成本分摊结果' })
    @ApiCreatedResponse({ description: 'The command result' })
    async replaceSharedCostAllocationResult(
        @Param('id') supersededAllocationResultId: string,
        @Body() body: ReplaceSharedCostAllocationResultRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.replaceSharedCostAllocationResult(supersededAllocationResultId, body, userId);
    }

    @Post('project-actual-cost-records/:id/stage-attributions')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建成本阶段归属快照' })
    @ApiCreatedResponse({ description: 'The command result' })
    async confirmCostStageAttribution(
        @Param('id') costRecordId: string,
        @Body() body: ConfirmCostStageAttributionRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.confirmCostStageAttribution(costRecordId, body, userId);
    }

    @Post('cost-stage-attributions/:id\\:reclassify')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '重分类成本阶段归属快照' })
    @ApiCreatedResponse({ description: 'The command result' })
    async reclassifyCostStageAttribution(
        @Param('id') supersededAttributionId: string,
        @Body() body: ReclassifyCostStageAttributionRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.reclassifyCostStageAttribution(supersededAttributionId, body, userId);
    }

    @Get('project-actual-cost-records/:costRecordId/stage-attributions')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取成本阶段归属历史' })
    @ApiOkResponse({ type: CostStageAttributionHistoryViewDto })
    async listCostStageAttributions(@Param('costRecordId') costRecordId: string): Promise<CostStageAttributionHistoryView> {
        return this.projectCostService.listCostStageAttributions(costRecordId);
    }

    @Get('cost-stage-attributions/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取成本阶段归属快照详情' })
    @ApiOkResponse({ type: CostStageAttributionSnapshotSummaryDto })
    async getCostStageAttribution(@Param('id') id: string): Promise<CostStageAttributionSnapshotSummary> {
        return this.projectCostService.getCostStageAttribution(id);
    }

    @Post('projects/:projectId/accounting-tax-treatments')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建项目税务处理快照' })
    @ApiCreatedResponse({ description: 'The command result' })
    async confirmAccountingTaxTreatment(
        @Param('projectId') projectId: string,
        @Body() body: ConfirmAccountingTaxTreatmentRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.confirmAccountingTaxTreatment(projectId, body, userId);
    }

    @Post('accounting-tax-treatments/:id\\:replace')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '替代项目税务处理快照' })
    @ApiCreatedResponse({ description: 'The command result' })
    async replaceAccountingTaxTreatment(
        @Param('id') supersededTaxTreatmentSnapshotId: string,
        @Body() body: ReplaceAccountingTaxTreatmentRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.replaceAccountingTaxTreatment(supersededTaxTreatmentSnapshotId, body, userId);
    }

    @Get('projects/:projectId/accounting-tax-treatments')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目税务处理快照列表' })
    @ApiOkResponse({ type: AccountingTaxTreatmentListViewDto })
    async listAccountingTaxTreatments(@Param('projectId') projectId: string): Promise<AccountingTaxTreatmentListView> {
        return this.projectCostService.listAccountingTaxTreatments(projectId);
    }

    @Get('accounting-tax-treatments/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取税务处理快照详情' })
    @ApiOkResponse({ type: AccountingTaxTreatmentSnapshotSummaryDto })
    async getAccountingTaxTreatment(@Param('id') id: string): Promise<AccountingTaxTreatmentSnapshotSummary> {
        return this.projectCostService.getAccountingTaxTreatment(id);
    }

    @Post('operating-signal-evaluations/:id\\:review')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '人工复核经营信号评价结果' })
    @ApiOkResponse({ type: ReviewOperatingSignalEvaluationResultDto })
    async reviewOperatingSignalEvaluation(
        @Param('id') id: string,
        @Body() body: ReviewOperatingSignalEvaluationRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<ReviewOperatingSignalEvaluationResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.reviewOperatingSignalEvaluation(id, body, userId);
    }

    @Get('operating-signal-evaluations/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取经营信号评价详情' })
    @ApiOkResponse({ type: OperatingSignalEvaluationViewDto })
    async getOperatingSignalEvaluation(@Param('id') id: string): Promise<OperatingSignalEvaluationView> {
        return this.projectCostService.getOperatingSignalEvaluation(id);
    }

    @Post('commission-gate-bindings/:id\\:review')
    @HasPermissions('contract:finance:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '人工复核经营反馈 gate 绑定结果' })
    @ApiOkResponse({ type: ReviewCommissionGateBindingResultDto })
    async reviewCommissionGateBinding(
        @Param('id') id: string,
        @Body() body: ReviewCommissionGateBindingRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<ReviewCommissionGateBindingResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.reviewCommissionGateBinding(id, body, userId);
    }

    @Get('commission-gate-bindings/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取经营反馈 gate 绑定详情' })
    @ApiOkResponse({ type: CommissionGateBindingHistoryViewDto })
    async getCommissionGateBinding(@Param('id') id: string): Promise<CommissionGateBindingHistoryView> {
        return this.projectCostService.getCommissionGateBinding(id);
    }

    @Get('projects/:projectId/business-outcome-overview')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目经营结果总览' })
    @ApiOkResponse({ type: ProjectBusinessOutcomeOverviewViewDto })
    async getProjectBusinessOutcomeOverview(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<ProjectBusinessOutcomeOverviewView> {
        return this.projectCostService.getProjectBusinessOutcomeOverview(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/business-outcome-overview`)
        );
    }

    @Get('projects/:projectId/unified-accounting')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目统一核算视图' })
    @ApiOkResponse({ type: ProjectUnifiedAccountingViewDto })
    async getProjectUnifiedAccounting(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<ProjectUnifiedAccountingView> {
        return this.projectCostService.getProjectUnifiedAccounting(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/unified-accounting`)
        );
    }

    @Get('projects/:projectId/variance-risk-explanation')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目偏差与风险解释' })
    @ApiOkResponse({ type: ProjectVarianceRiskExplanationViewDto })
    async getProjectVarianceRiskExplanation(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<ProjectVarianceRiskExplanationView> {
        return this.projectCostService.getProjectVarianceRiskExplanation(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/variance-risk-explanation`)
        );
    }

    @Get('projects/:projectId/business-accounting-feedback')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目经营核算反哺视图' })
    @ApiOkResponse({ type: BusinessAccountingFeedbackViewDto })
    async getBusinessAccountingFeedback(
        @Param('projectId') projectId: string,
        @Request() req: AuthenticatedRequest
    ): Promise<BusinessAccountingFeedbackView> {
        return this.projectCostService.getBusinessAccountingFeedback(
            projectId,
            req.user ?? null,
            buildSensitiveFieldProjectionRequestContext(req, `/projects/${projectId}/business-accounting-feedback`)
        );
    }

    @Get('projects/:projectId/expense-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目费用记录列表' })
    @ApiOkResponse({ type: ExpenseRecordListDto })
    async listExpenseRecords(@Param('projectId') projectId: string): Promise<ExpenseRecordList> {
        return this.projectCostService.listExpenseRecords(projectId);
    }

    @Get('expense-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取费用记录详情' })
    @ApiOkResponse({ type: ExpenseRecordDetailViewDto })
    async getExpenseRecordDetail(@Param('id') id: string): Promise<ExpenseRecordDetailView> {
        return this.projectCostService.getExpenseRecordDetail(id);
    }

    @Post('projects/:projectId/expense-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '创建费用记录' })
    @ApiCreatedResponse({ type: ExpenseRecordDto })
    async createExpenseRecord(
        @Param('projectId') projectId: string,
        @Body() body: CreateExpenseRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<ExpenseRecordSummary> {
        void req;
        return this.projectCostService.createExpenseRecord(projectId, body);
    }

    @Patch('expense-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '更新费用记录' })
    @ApiOkResponse({ type: ExpenseRecordDto })
    async updateExpenseRecord(
        @Param('id') id: string,
        @Body() body: UpdateExpenseRecordRequestDto
    ): Promise<ExpenseRecordSummary> {
        return this.projectCostService.updateExpenseRecord(id, body);
    }

    @Post('expense-records/:id\\:confirm')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '确认费用记录' })
    @ApiOkResponse({ type: ExpenseRecordDto })
    @HttpCode(HttpStatus.OK)
    async confirmExpenseRecord(
        @Param('id') id: string,
        @Body() body: ConfirmExpenseRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<ExpenseRecordSummary> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.confirmExpenseRecord(id, userId, body);
    }

    @Post('expense-records/:id\\:void')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '作废费用记录' })
    @ApiOkResponse({ type: ExpenseRecordDto })
    @HttpCode(HttpStatus.OK)
    async voidExpenseRecord(
        @Param('id') id: string,
        @Body() body: VoidExpenseRecordRequestDto
    ): Promise<ExpenseRecordSummary> {
        return this.projectCostService.voidExpenseRecord(id, body);
    }

    @Get('projects/:projectId/actual-cost-records')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目实际成本记录列表' })
    @ApiOkResponse({ type: ProjectActualCostRecordListViewDto })
    async listProjectActualCostRecords(
        @Param('projectId') projectId: string,
        @Query() query: ProjectActualCostRecordListQuery
    ): Promise<ProjectActualCostRecordListView> {
        return this.projectCostService.listProjectActualCostRecords(projectId, query);
    }

    @Get('project-actual-cost-records/:id')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取项目实际成本记录详情' })
    @ApiOkResponse({ type: ProjectActualCostRecordDetailViewDto })
    async getProjectActualCostRecordDetail(@Param('id') id: string): Promise<ProjectActualCostRecordDetailView> {
        return this.projectCostService.getProjectActualCostRecordDetail(id);
    }

    @Post('project-actual-cost-records/:id\\:replace')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '替代/重算人力成本记录候选' })
    @ApiCreatedResponse({ description: 'The command result' })
    async replaceLaborCostRecord(
        @Param('id') id: string,
        @Body() body: ReplaceLaborCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.replaceLaborCostRecord(id, body, userId);
    }
}
