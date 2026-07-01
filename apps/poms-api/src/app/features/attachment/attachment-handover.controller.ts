import { Inject, Body, Controller, Get, Header, HttpCode, HttpStatus, Param, Post, Request, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentDownloadPackageSummaryDto, CreateProjectHandoverAttachmentDownloadPackageRequestDto, ProjectHandoverAttachmentChecklistViewDto, RefreshProjectHandoverAttachmentChecklistRequestDto } from '@poms/api-contracts';
import type { AttachmentDownloadPackageSummary, ProjectHandoverAttachmentChecklistView, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { AttachmentService } from './attachment.service';

@ApiTags('Attachment Handover')
@ApiCookieAuth('pomsSession')
@Controller()
export class AttachmentHandoverController {
    constructor(@Inject(AttachmentService) private readonly attachmentService: AttachmentService) {}

    @Get('project-handovers/:handoverId/attachment-checklist')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取项目移交附件清单' })
    @ApiOkResponse({ type: ProjectHandoverAttachmentChecklistViewDto })
    getChecklist(@Param('handoverId') handoverId: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ProjectHandoverAttachmentChecklistView> {
        return this.attachmentService.getProjectHandoverAttachmentChecklist(handoverId, req.user, getRequestId(req));
    }

    @Post('project-handovers/:handoverId/attachment-checklist\\:refresh')
    @HasPermissions('project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '刷新项目移交附件清单' })
    @ApiOkResponse({ type: ProjectHandoverAttachmentChecklistViewDto })
    refreshChecklist(@Param('handoverId') handoverId: string, @Body() body: RefreshProjectHandoverAttachmentChecklistRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<ProjectHandoverAttachmentChecklistView> {
        return this.attachmentService.refreshProjectHandoverAttachmentChecklist(handoverId, body, req.user, getRequestId(req));
    }

    @Post('project-handovers/:handoverId/attachment-download-packages')
    @HasPermissions('project:read')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '创建项目移交附件批量下载包' })
    @ApiOkResponse({ type: AttachmentDownloadPackageSummaryDto })
    createDownloadPackage(@Param('handoverId') handoverId: string, @Body() body: CreateProjectHandoverAttachmentDownloadPackageRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentDownloadPackageSummary> {
        return this.attachmentService.createProjectHandoverAttachmentDownloadPackage(handoverId, body, req.user, getRequestId(req));
    }

    @Get('attachment-download-packages/:packageId')
    @HasPermissions('project:read')
    @ApiOperation({ summary: '获取附件下载包状态' })
    @ApiOkResponse({ type: AttachmentDownloadPackageSummaryDto })
    getDownloadPackage(@Param('packageId') packageId: string, @Request() req: { user: UserPayload }): Promise<AttachmentDownloadPackageSummary> {
        return this.attachmentService.getAttachmentDownloadPackage(packageId, req.user);
    }

    @Get('attachment-download-packages/:packageId/download')
    @HasPermissions('project:read')
    @Header('Cache-Control', 'private, no-store')
    @ApiOperation({ summary: '下载附件批量包' })
    async downloadPackage(@Param('packageId') packageId: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<StreamableFile> {
        const { downloadPackage, stream } = await this.attachmentService.openAttachmentDownloadPackage(packageId, req.user, getRequestId(req));
        const encodedName = encodeURIComponent(downloadPackage.fileName ?? `${downloadPackage.id}.zip`);
        return new StreamableFile(stream, {
            type: 'application/zip',
            disposition: `attachment; filename*=UTF-8''${encodedName}`
        });
    }
}
