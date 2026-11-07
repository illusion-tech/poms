import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    CommercialDiffReviewResultDto,
    CommercialReleaseBaselineDto,
    ContractDiffReviewHistoryViewDto,
    ContractReadinessDetailDto,
    ContractSelectionQueryDto,
    CreateCommercialReleaseBaselineRequestDto,
    CreateContractReadinessPackageRequestDto,
    InitializeContractSnapshotFromReadinessPackageRequestDto,
    InitializeReceivablePlanFromReadinessPackageRequestDto,
    ReadinessInitializationResultDto,
    ReviewCommercialReleaseBaselineDiffRequestDto
} from '@poms/api-contracts';
import type { CommercialDiffReviewResult, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ContractReadinessService } from './contract-readiness.service';
import type {
    LegacyCommercialReleaseBaselineSummary as CommercialReleaseBaselineSummary,
    LegacyContractDiffReviewHistoryView as ContractDiffReviewHistoryView,
    LegacyContractReadinessDetail as ContractReadinessDetail,
    LegacyReadinessInitializationResult as ReadinessInitializationResult,
    LegacyCreateCommercialReleaseBaselineRequest,
    LegacyCreateContractReadinessPackageRequest,
    LegacyReviewCommercialReleaseBaselineDiffRequest
} from './contract-readiness.legacy-types';

// Swagger/DTO metadata freezes the new authoritative contract. The Native
// implementation remains explicitly legacy reference and does not fabricate
// any newly required preparation/plan identity to mimic the Rust producer.

@ApiTags('ContractReadiness')
@ApiCookieAuth('pomsSession')
@Controller()
export class ContractReadinessController {
    constructor(@Inject(ContractReadinessService) private readonly contractReadinessService: ContractReadinessService) {}

    @Post('commercial-release-baselines')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建商业放行基线与当前差异结果' })
    @ApiCreatedResponse({ type: CommercialReleaseBaselineDto })
    createCommercialReleaseBaseline(@Body() body: CreateCommercialReleaseBaselineRequestDto): Promise<CommercialReleaseBaselineSummary> {
        return this.contractReadinessService.createCommercialReleaseBaseline(body as unknown as LegacyCreateCommercialReleaseBaselineRequest);
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
    getDiffHistory(@Param('id') id: string, @Query() query: ContractSelectionQueryDto): Promise<ContractDiffReviewHistoryView> {
        return this.contractReadinessService.findDiffHistoryByBaselineId(id, query);
    }

    @Post('commercial-release-baselines/:id\\:reviewDiff')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '复核商业放行差异结果' })
    @ApiOkResponse({ type: CommercialDiffReviewResultDto })
    reviewDiff(@Param('id') id: string, @Request() req: { user: UserPayload }, @Body() body: ReviewCommercialReleaseBaselineDiffRequestDto): Promise<CommercialDiffReviewResult> {
        return this.contractReadinessService.reviewCommercialReleaseBaselineDiff(id, req.user.sub, body as unknown as LegacyReviewCommercialReleaseBaselineDiffRequest);
    }

    @Post('contract-readiness-packages')
    @HasPermissions('project:write')
    @ApiOperation({ summary: '创建签约就绪承接包' })
    @ApiCreatedResponse({ type: ContractReadinessDetailDto })
    createContractReadinessPackage(@Body() body: CreateContractReadinessPackageRequestDto): Promise<ContractReadinessDetail> {
        return this.contractReadinessService.createContractReadinessPackage(body as unknown as LegacyCreateContractReadinessPackageRequest);
    }

    @Get('contract-readiness-packages/:id')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取签约就绪承接详情' })
    @ApiOkResponse({ type: ContractReadinessDetailDto })
    getContractReadinessPackage(@Param('id') id: string): Promise<ContractReadinessDetail> {
        return this.contractReadinessService.findContractReadinessById(id);
    }

    @Get('projects/:projectId/contract-readiness')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目当前签约就绪承接包' })
    @ApiOkResponse({ type: ContractReadinessDetailDto })
    getCurrentContractReadiness(@Param('projectId') projectId: string, @Query() query: ContractSelectionQueryDto): Promise<ContractReadinessDetail> {
        return this.contractReadinessService.findCurrentContractReadinessByProjectId(projectId, query);
    }

    @Post('contract-readiness-packages/:id\\:initializeContractSnapshot')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '基于承接包初始化合同条款快照引用' })
    @ApiOkResponse({ type: ReadinessInitializationResultDto })
    initializeContractSnapshot(@Param('id') id: string, @Request() req: { user: UserPayload }, @Body() body: InitializeContractSnapshotFromReadinessPackageRequestDto): Promise<ReadinessInitializationResult> {
        return this.contractReadinessService.initializeContractSnapshot(id, req.user.sub, body.expectedVersion);
    }

    @Post('contract-readiness-packages/:id\\:initializeReceivablePlan')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '基于承接包初始化应收计划引用' })
    @ApiOkResponse({ type: ReadinessInitializationResultDto })
    initializeReceivablePlan(@Param('id') id: string, @Request() req: { user: UserPayload }, @Body() body: InitializeReceivablePlanFromReadinessPackageRequestDto): Promise<ReadinessInitializationResult> {
        return this.contractReadinessService.initializeReceivablePlan(id, req.user.sub, body.expectedVersion);
    }
}
