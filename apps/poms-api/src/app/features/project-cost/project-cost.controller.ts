import { Body, Controller, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ProjectCostService } from './project-cost.service';
import {
    PublishInternalCostRateVersionRequestDto,
    RegisterLaborCostRecordRequestDto,
    ReplaceLaborCostRecordRequestDto
} from '@poms/api-contracts';
import type { CommandResult } from '@poms/shared-contracts';

interface AuthenticatedRequest extends Request {
    user?: {
        sub: string;
    };
}

@ApiTags('Project Cost')
@ApiBearerAuth()
@Controller('project-cost')
export class ProjectCostController {
    constructor(private readonly projectCostService: ProjectCostService) {}

    @Post('publish-internal-cost-rate-version')
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

    @Post('register-labor-cost-record')
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

    @Post('replace-labor-cost-record')
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
