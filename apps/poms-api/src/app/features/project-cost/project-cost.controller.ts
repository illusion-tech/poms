import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ActivateOperatingBaselinePackageRequestDto,
    ConfirmExpenseRecordRequestDto,
    CreateOperatingRestatementRequestDto,
    CreateExpenseRecordRequestDto,
    CreatePeriodClosingSnapshotRequestDto,
    CreateProjectOperatingSnapshotRequestDto,
    ExpenseRecordDetailViewDto,
    ExpenseRecordListDto,
    ExpenseRecordDto,
    OperatingBaselinePackageSummaryDto,
    OperatingRestatementListViewDto,
    OperatingRestatementSummaryDto,
    PeriodClosingSnapshotSummaryDto,
    ProjectActualCostRecordDetailViewDto,
    ProjectActualCostRecordListViewDto,
    ProjectOperatingSnapshotSummaryDto,
    PublishInternalCostRateVersionRequestDto,
    RegisterExpenseCostRecordRequestDto,
    RegisterInvoiceCostRecordRequestDto,
    RegisterLaborCostRecordRequestDto,
    RegisterPaymentFactCostRecordRequestDto,
    RegisterProcurementCostRecordRequestDto,
    ReplaceLaborCostRecordRequestDto,
    UpdateExpenseRecordRequestDto,
    VoidExpenseRecordRequestDto
} from '@poms/api-contracts';
import type {
    CommandResult,
    ExpenseRecordDetailView,
    ExpenseRecordList,
    ExpenseRecordSummary,
    OperatingBaselinePackageSummary,
    OperatingRestatementListView,
    OperatingRestatementSummary,
    PeriodClosingSnapshotSummary,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordListView,
    ProjectOperatingSnapshotSummary
} from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ProjectCostService } from './project-cost.service';

interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
    };
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

    @Post('project-cost/publish-internal-cost-rate-version')
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

    @Post('project-actual-cost-records/register-payment-fact')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记付款事实到统一实际成本记录' })
    @ApiCreatedResponse({ description: 'The command result' })
    async registerPaymentFactCostRecord(
        @Body() body: RegisterPaymentFactCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.registerPaymentFactCostRecord(body, userId);
    }

    @Post('project-actual-cost-records/register-invoice')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记成本发票到统一实际成本记录' })
    @ApiCreatedResponse({ description: 'The command result' })
    async registerInvoiceCostRecord(
        @Body() body: RegisterInvoiceCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.registerInvoiceCostRecord(body, userId);
    }

    @Post('project-actual-cost-records/register-expense')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记费用事实到统一实际成本记录' })
    @ApiCreatedResponse({ description: 'The command result' })
    async registerExpenseCostRecord(
        @Body() body: RegisterExpenseCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.registerExpenseCostRecord(body, userId);
    }

    @Post('project-actual-cost-records/register-procurement')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '登记采购承诺事实到统一实际成本记录' })
    @ApiCreatedResponse({ description: 'The command result' })
    async registerProcurementCostRecord(
        @Body() body: RegisterProcurementCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.registerProcurementCostRecord(body, userId);
    }

    @Post('project-cost/activate-operating-baseline-package')
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

    @Get('projects/:projectId/operating-baseline-package/current')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '获取当前项目经营基线包' })
    @ApiOkResponse({ type: OperatingBaselinePackageSummaryDto })
    async getCurrentOperatingBaselinePackage(@Param('projectId') projectId: string): Promise<OperatingBaselinePackageSummary> {
        return this.projectCostService.getCurrentOperatingBaselinePackage(projectId);
    }

    @Post('project-cost/create-project-operating-snapshot')
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

    @Post('project-cost/create-period-closing-snapshot')
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

    @Post('project-cost/create-operating-restatement')
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
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.createExpenseRecord(projectId, body, userId);
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

    @Post('expense-records/:id/confirm')
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

    @Post('expense-records/:id/void')
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

    @Post('project-cost/register-labor-cost-record')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '归集人力成本记录' })
    @ApiCreatedResponse({ description: 'The command result' })
    async registerLaborCostRecord(
        @Body() body: RegisterLaborCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.registerLaborCostRecord(body, userId);
    }

    @Post('project-cost/replace-labor-cost-record')
    @HasPermissions('contract:finance:manage')
    @ApiOperation({ summary: '替代/重算人力成本记录候选' })
    @ApiCreatedResponse({ description: 'The command result' })
    async replaceLaborCostRecord(
        @Body() body: ReplaceLaborCostRecordRequestDto,
        @Request() req: AuthenticatedRequest
    ): Promise<CommandResult> {
        const userId = req.user?.sub ?? 'system';
        return this.projectCostService.replaceLaborCostRecord(body, userId);
    }
}
