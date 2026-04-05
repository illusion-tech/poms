import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CommercialDiffReviewResultDto,
    CommercialReleaseBaselineDto,
    ContractDiffReviewHistoryViewDto,
    ContractReadinessDetailDto,
    CreateCommercialReleaseBaselineRequestDto,
    CreateContractReadinessPackageRequestDto,
    InitializeContractSnapshotFromReadinessPackageRequestDto,
    InitializeReceivablePlanFromReadinessPackageRequestDto,
    ReadinessInitializationResultDto,
    ReviewCommercialReleaseBaselineDiffRequestDto
} from '@poms/api-contracts';
import type {
    CommercialDiffReviewResult,
    CommercialReleaseBaselineSummary,
    ContractDiffReviewHistoryView,
    ContractReadinessDetail,
    ReadinessInitializationResult,
    UserPayload
} from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ContractReadinessService } from './contract-readiness.service';

@ApiTags('ContractReadiness')
@ApiBearerAuth()
@Controller()
export class ContractReadinessController {
    constructor(private readonly contractReadinessService: ContractReadinessService) {}

    @Post('commercial-release-baselines')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建商业放行基线与当前差异结果' })
    @ApiCreatedResponse({ type: CommercialReleaseBaselineDto })
    createCommercialReleaseBaseline(
        @Body() body: CreateCommercialReleaseBaselineRequestDto
    ): Promise<CommercialReleaseBaselineSummary> {
        return this.contractReadinessService.createCommercialReleaseBaseline(body);
    }

    @Get('commercial-release-baselines/:id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取商业放行基线详情' })
    @ApiOkResponse({ type: CommercialReleaseBaselineDto })
    getCommercialReleaseBaseline(@Param('id') id: string): Promise<CommercialReleaseBaselineSummary> {
        return this.contractReadinessService.findCommercialReleaseBaselineById(id);
    }

    @Get('commercial-release-baselines/:id/diff-history')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取商业放行差异复核历史' })
    @ApiOkResponse({ type: ContractDiffReviewHistoryViewDto })
    getDiffHistory(@Param('id') id: string): Promise<ContractDiffReviewHistoryView> {
        return this.contractReadinessService.findDiffHistoryByBaselineId(id);
    }

    @Post('commercial-release-baselines/:id/review-diff')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '复核商业放行差异结果' })
    @ApiOkResponse({ type: CommercialDiffReviewResultDto })
    reviewDiff(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: ReviewCommercialReleaseBaselineDiffRequestDto
    ): Promise<CommercialDiffReviewResult> {
        return this.contractReadinessService.reviewCommercialReleaseBaselineDiff(id, req.user.sub, body);
    }

    @Post('contract-readiness-packages')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建签约就绪承接包' })
    @ApiCreatedResponse({ type: ContractReadinessDetailDto })
    createContractReadinessPackage(@Body() body: CreateContractReadinessPackageRequestDto): Promise<ContractReadinessDetail> {
        return this.contractReadinessService.createContractReadinessPackage(body);
    }

    @Get('contract-readiness-packages/:id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取签约就绪承接详情' })
    @ApiOkResponse({ type: ContractReadinessDetailDto })
    getContractReadinessPackage(@Param('id') id: string): Promise<ContractReadinessDetail> {
        return this.contractReadinessService.findContractReadinessById(id);
    }

    @Get('projects/:projectId/contract-readiness/current')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目当前签约就绪承接包' })
    @ApiOkResponse({ type: ContractReadinessDetailDto })
    getCurrentContractReadiness(@Param('projectId') projectId: string): Promise<ContractReadinessDetail> {
        return this.contractReadinessService.findCurrentContractReadinessByProjectId(projectId);
    }

    @Post('contract-readiness-packages/:id/initialize-contract-snapshot')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '基于承接包初始化合同条款快照引用' })
    @ApiOkResponse({ type: ReadinessInitializationResultDto })
    initializeContractSnapshot(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: InitializeContractSnapshotFromReadinessPackageRequestDto
    ): Promise<ReadinessInitializationResult> {
        return this.contractReadinessService.initializeContractSnapshot(id, req.user.sub, body.expectedVersion);
    }

    @Post('contract-readiness-packages/:id/initialize-receivable-plan')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '基于承接包初始化应收计划引用' })
    @ApiOkResponse({ type: ReadinessInitializationResultDto })
    initializeReceivablePlan(
        @Param('id') id: string,
        @Request() req: { user: UserPayload },
        @Body() body: InitializeReceivablePlanFromReadinessPackageRequestDto
    ): Promise<ReadinessInitializationResult> {
        return this.contractReadinessService.initializeReceivablePlan(id, req.user.sub, body.expectedVersion);
    }
}
