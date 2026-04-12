import { Body, Controller, Get, Param, Post, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ProjectActualCostRecordDetailViewDto,
    ProjectActualCostRecordListViewDto,
    PublishInternalCostRateVersionRequestDto,
    RegisterLaborCostRecordRequestDto,
    RegisterPaymentFactCostRecordRequestDto,
    ReplaceLaborCostRecordRequestDto
} from '@poms/api-contracts';
import type {
    CommandResult,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordListView
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
