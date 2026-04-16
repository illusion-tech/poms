import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    ConfirmProjectHandoverRequestDto,
    ConfirmProjectHandoverResultDto,
    ContractHandoverSummaryViewDto,
    ProjectHandoverDetailViewDto,
    RebaselineContractHandoverRequestDto,
    RebaselineContractHandoverResultDto
} from '@poms/api-contracts';
import type {
    ConfirmProjectHandoverResult,
    ContractHandoverSummaryView,
    ProjectHandoverDetailView,
    RebaselineContractHandoverResult,
    UserPayload
} from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ProjectHandoverCommandService } from './project-handover-command.service';
import { ProjectHandoverQueryService } from './project-handover-query.service';

@ApiTags('Project Handover')
@ApiBearerAuth()
@Controller()
export class ProjectHandoverController {
    constructor(
        private readonly projectHandoverQueryService: ProjectHandoverQueryService,
        private readonly projectHandoverCommandService: ProjectHandoverCommandService
    ) {}

    @Get('projects/:projectId/contract-handover')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目合同承接摘要' })
    @ApiOkResponse({ type: ContractHandoverSummaryViewDto })
    getContractHandoverSummary(@Param('projectId') projectId: string): Promise<ContractHandoverSummaryView> {
        return this.projectHandoverQueryService.getContractHandoverSummary(projectId);
    }

    @Get('projects/:projectId/project-handover')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目最新移交详情' })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    getProjectHandoverDetailByProject(@Param('projectId') projectId: string): Promise<ProjectHandoverDetailView> {
        return this.projectHandoverQueryService.getProjectHandoverDetailByProjectId(projectId);
    }

    @Get('project-handovers/:handoverId')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取指定移交详情' })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    getProjectHandoverDetailByHandover(@Param('handoverId') handoverId: string): Promise<ProjectHandoverDetailView> {
        return this.projectHandoverQueryService.getProjectHandoverDetailByHandoverId(handoverId);
    }

    @Post('project-handovers/:handoverId\\:confirm')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '确认项目移交' })
    @ApiOkResponse({ type: ConfirmProjectHandoverResultDto })
    confirmProjectHandover(
        @Param('handoverId') handoverId: string,
        @Request() req: { user: UserPayload },
        @Body() body: ConfirmProjectHandoverRequestDto
    ): Promise<ConfirmProjectHandoverResult> {
        return this.projectHandoverCommandService.confirmProjectHandover(handoverId, req.user.sub, body);
    }

    @Post('contract-handover-rebaselines')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '发起合同移交前再基线化' })
    @ApiOkResponse({ type: RebaselineContractHandoverResultDto })
    rebaselineContractHandover(
        @Request() req: { user: UserPayload },
        @Body() body: RebaselineContractHandoverRequestDto
    ): Promise<RebaselineContractHandoverResult> {
        return this.projectHandoverCommandService.rebaselineContractHandover(req.user.sub, body);
    }
}
