import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractHandoverSummaryViewDto, ProjectHandoverDetailViewDto } from '@poms/api-contracts';
import type { ContractHandoverSummaryView, ProjectHandoverDetailView } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ProjectHandoverQueryService } from './project-handover-query.service';

@ApiTags('Project Handover')
@ApiBearerAuth()
@Controller()
export class ProjectHandoverController {
    constructor(private readonly projectHandoverQueryService: ProjectHandoverQueryService) {}

    @Get('projects/:projectId/contract-handover-summary')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目合同承接摘要' })
    @ApiOkResponse({ type: ContractHandoverSummaryViewDto })
    getContractHandoverSummary(@Param('projectId') projectId: string): Promise<ContractHandoverSummaryView> {
        return this.projectHandoverQueryService.getContractHandoverSummary(projectId);
    }

    @Get('projects/:projectId/project-handover-detail')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目最新移交详情' })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    getProjectHandoverDetailByProject(@Param('projectId') projectId: string): Promise<ProjectHandoverDetailView> {
        return this.projectHandoverQueryService.getProjectHandoverDetailByProjectId(projectId);
    }

    @Get('project-handovers/:handoverId/detail')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取指定移交详情' })
    @ApiOkResponse({ type: ProjectHandoverDetailViewDto })
    getProjectHandoverDetailByHandover(@Param('handoverId') handoverId: string): Promise<ProjectHandoverDetailView> {
        return this.projectHandoverQueryService.getProjectHandoverDetailByHandoverId(handoverId);
    }
}
