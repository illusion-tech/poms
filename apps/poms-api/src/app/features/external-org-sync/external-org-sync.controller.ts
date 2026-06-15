import {
    ActivateExternalOrgSourceRequestDto,
    ArchiveExternalOrgSourceRequestDto,
    ApplyOrgSyncRunRequestDto,
    CreateExternalOrgSourceRequestDto,
    CreateOrgSyncRunRequestDto,
    ExternalDepartmentMappingListDto,
    ExternalDepartmentMappingListQueryDto,
    ExternalOrgSourceDto,
    ExternalOrgSourceListDto,
    ExternalOrgSourceListQueryDto,
    OrgSyncDiffItemListDto,
    OrgSyncDiffItemListQueryDto,
    OrgSyncRunDto,
    PauseExternalOrgSourceRequestDto,
    ReplaceExternalDepartmentMappingsRequestDto,
    UpdateExternalOrgSourceRequestDto
} from '@poms/api-contracts';
import type {
    ExternalDepartmentMappingList,
    ExternalOrgSourceDetail,
    ExternalOrgSourceList,
    OrgSyncDiffItemList,
    OrgSyncRunDetail,
    UserPayload
} from '@poms/shared-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Put, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { ExternalOrgSyncService } from './external-org-sync.service';

@ApiTags('External Org Sync')
@ApiCookieAuth('pomsSession')
@Controller('platform')
export class ExternalOrgSyncController {
    constructor(private readonly externalOrgSyncService: ExternalOrgSyncService) {}

    @Get('external-org-sources')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '获取外部组织同步源列表' })
    @ApiOkResponse({ type: ExternalOrgSourceListDto })
    listExternalOrgSources(@Query() query: ExternalOrgSourceListQueryDto): Promise<ExternalOrgSourceList> {
        return this.externalOrgSyncService.listExternalOrgSources({
            provider: query.provider,
            status: query.status
        });
    }

    @Post('external-org-sources')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '创建外部组织同步源' })
    @ApiCreatedResponse({ type: ExternalOrgSourceDto })
    createExternalOrgSource(@Body() body: CreateExternalOrgSourceRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalOrgSourceDetail> {
        return this.externalOrgSyncService.createExternalOrgSource(body, req.user.sub);
    }

    @Get('external-org-sources/:id')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '获取外部组织同步源详情' })
    @ApiOkResponse({ type: ExternalOrgSourceDto })
    getExternalOrgSource(@Param('id') id: string): Promise<ExternalOrgSourceDetail> {
        return this.externalOrgSyncService.getExternalOrgSource(id);
    }

    @Patch('external-org-sources/:id')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '更新外部组织同步源' })
    @ApiOkResponse({ type: ExternalOrgSourceDto })
    updateExternalOrgSource(@Param('id') id: string, @Body() body: UpdateExternalOrgSourceRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalOrgSourceDetail> {
        return this.externalOrgSyncService.updateExternalOrgSource(id, body, req.user.sub);
    }

    @Post('external-org-sources/:id\\:activate')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '启用外部组织同步源' })
    @ApiOkResponse({ type: ExternalOrgSourceDto })
    activateExternalOrgSource(@Param('id') id: string, @Body() body: ActivateExternalOrgSourceRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalOrgSourceDetail> {
        return this.externalOrgSyncService.activateExternalOrgSource(id, body, req.user.sub);
    }

    @Post('external-org-sources/:id\\:pause')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '暂停外部组织同步源' })
    @ApiOkResponse({ type: ExternalOrgSourceDto })
    pauseExternalOrgSource(@Param('id') id: string, @Body() body: PauseExternalOrgSourceRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalOrgSourceDetail> {
        return this.externalOrgSyncService.pauseExternalOrgSource(id, body, req.user.sub);
    }

    @Post('external-org-sources/:id\\:archive')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '归档外部组织同步源' })
    @ApiOkResponse({ type: ExternalOrgSourceDto })
    archiveExternalOrgSource(@Param('id') id: string, @Body() body: ArchiveExternalOrgSourceRequestDto, @Request() req: { user: UserPayload }): Promise<ExternalOrgSourceDetail> {
        return this.externalOrgSyncService.archiveExternalOrgSource(id, body, req.user.sub);
    }

    @Get('external-org-sources/:sourceId/department-mappings')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '获取外部部门映射列表' })
    @ApiOkResponse({ type: ExternalDepartmentMappingListDto })
    listExternalDepartmentMappings(@Param('sourceId') sourceId: string, @Query() query: ExternalDepartmentMappingListQueryDto): Promise<ExternalDepartmentMappingList> {
        return this.externalOrgSyncService.listExternalDepartmentMappings(sourceId, {
            status: query.status,
            externalDepartmentId: query.externalDepartmentId,
            orgUnitId: query.orgUnitId
        });
    }

    @Put('external-org-sources/:sourceId/department-mappings')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '替换外部部门映射' })
    @ApiOkResponse({ type: ExternalDepartmentMappingListDto })
    replaceExternalDepartmentMappings(
        @Param('sourceId') sourceId: string,
        @Body() body: ReplaceExternalDepartmentMappingsRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<ExternalDepartmentMappingList> {
        return this.externalOrgSyncService.replaceExternalDepartmentMappings(sourceId, body, req.user.sub);
    }

    @Post('external-org-sources/:sourceId/org-sync-runs')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '创建组织同步预览运行' })
    @ApiCreatedResponse({ type: OrgSyncRunDto })
    createOrgSyncRun(@Param('sourceId') sourceId: string, @Body() body: CreateOrgSyncRunRequestDto, @Request() req: { user: UserPayload }): Promise<OrgSyncRunDetail> {
        return this.externalOrgSyncService.createOrgSyncRun(sourceId, body, req.user.sub);
    }

    @Get('org-sync-runs/:id')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '获取组织同步运行详情' })
    @ApiOkResponse({ type: OrgSyncRunDto })
    getOrgSyncRun(@Param('id') id: string): Promise<OrgSyncRunDetail> {
        return this.externalOrgSyncService.getOrgSyncRun(id);
    }

    @Get('org-sync-runs/:id/diff-items')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @ApiOperation({ summary: '获取组织同步差异项列表' })
    @ApiOkResponse({ type: OrgSyncDiffItemListDto })
    listOrgSyncDiffItems(@Param('id') id: string, @Query() query: OrgSyncDiffItemListQueryDto): Promise<OrgSyncDiffItemList> {
        return this.externalOrgSyncService.listOrgSyncDiffItems(id, {
            action: query.action,
            status: query.status
        });
    }

    @Post('org-sync-runs/:id\\:apply')
    @HasPermissions('platform:org-units:manage', 'platform:org-sync:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '应用组织同步运行' })
    @ApiOkResponse({ type: OrgSyncRunDto })
    applyOrgSyncRun(@Param('id') id: string, @Body() body: ApplyOrgSyncRunRequestDto, @Request() req: { user: UserPayload }): Promise<OrgSyncRunDetail> {
        return this.externalOrgSyncService.applyOrgSyncRun(id, body, req.user.sub);
    }
}
