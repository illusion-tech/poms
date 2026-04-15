import { Controller, Get, Param } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { ContractHandoverSummaryViewDto } from '@poms/api-contracts';
import type { ContractHandoverSummaryView } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ProjectHandoverQueryService } from './project-handover-query.service';

@ApiTags('Project Handover')
@ApiBearerAuth()
@Controller('projects')
export class ProjectHandoverController {
    constructor(private readonly projectHandoverQueryService: ProjectHandoverQueryService) {}

    @Get(':projectId/contract-handover-summary')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目合同承接摘要' })
    @ApiOkResponse({ type: ContractHandoverSummaryViewDto })
    getContractHandoverSummary(@Param('projectId') projectId: string): Promise<ContractHandoverSummaryView> {
        return this.projectHandoverQueryService.getContractHandoverSummary(projectId);
    }
}
