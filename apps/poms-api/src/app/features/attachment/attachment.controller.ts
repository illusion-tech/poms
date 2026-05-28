import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, StreamableFile } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import {
    AttachmentDto,
    AttachmentListDto,
    AttachmentListQueryDto,
    AttachmentVersionListDto,
    ClearAttachmentFinalRequestDto,
    CreateAttachmentLinkRequestDto,
    MarkAttachmentFinalRequestDto,
    UpdateAttachmentRequestDto,
    VoidAttachmentRequestDto
} from '@poms/api-contracts';
import type { AttachmentSummary, AttachmentVersionSummary, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { AttachmentService } from './attachment.service';

@ApiTags('Attachment')
@ApiCookieAuth('pomsSession')
@Controller('attachments')
export class AttachmentController {
    constructor(private readonly attachmentService: AttachmentService) {}

    @Get()
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '按业务对象获取附件列表' })
    @ApiOkResponse({ type: AttachmentListDto })
    list(@Query() query: AttachmentListQueryDto, @Request() req: { user: UserPayload }): Promise<AttachmentSummary[]> {
        return this.attachmentService.listAttachments(
            {
                targetType: query.targetType,
                targetId: query.targetId,
                category: query.category,
                status: query.status
            },
            req.user
        );
    }

    @Get(':id')
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '获取附件元数据' })
    @ApiOkResponse({ type: AttachmentDto })
    get(@Param('id') id: string, @Request() req: { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.getAttachment(id, req.user);
    }

    @Get(':id/preview')
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @Header('Cache-Control', 'private, no-store')
    @ApiOperation({ summary: '预览附件' })
    async preview(@Param('id') id: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<StreamableFile> {
        const { attachment, stream } = await this.attachmentService.openAttachmentPreview(id, req.user, getRequestId(req));
        const encodedName = encodeURIComponent(attachment.originalName);
        return new StreamableFile(stream, {
            type: attachment.mimeType,
            disposition: `inline; filename*=UTF-8''${encodedName}`
        });
    }

    @Get(':id/thumbnail')
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @Header('Cache-Control', 'private, no-store')
    @ApiOperation({ summary: '获取附件缩略图' })
    async thumbnail(@Param('id') id: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<StreamableFile> {
        const { attachment, stream } = await this.attachmentService.openAttachmentThumbnail(id, req.user, getRequestId(req));
        const encodedName = encodeURIComponent(attachment.originalName);
        return new StreamableFile(stream, {
            type: attachment.mimeType,
            disposition: `inline; filename*=UTF-8''${encodedName}`
        });
    }

    @Get(':id/download')
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @Header('Cache-Control', 'private, no-store')
    @ApiOperation({ summary: '下载附件' })
    async download(@Param('id') id: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<StreamableFile> {
        const { attachment, stream } = await this.attachmentService.openAttachmentDownload(id, req.user, getRequestId(req));
        const encodedName = encodeURIComponent(attachment.originalName);
        return new StreamableFile(stream, {
            type: attachment.mimeType,
            disposition: `attachment; filename*=UTF-8''${encodedName}`
        });
    }

    @Get(':id/versions')
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '获取附件版本历史' })
    @ApiOkResponse({ type: AttachmentVersionListDto })
    versions(@Param('id') id: string, @Request() req: { user: UserPayload }): Promise<AttachmentVersionSummary[]> {
        return this.attachmentService.listAttachmentVersions(id, req.user);
    }

    @Patch(':id')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '更新附件元数据' })
    @ApiOkResponse({ type: AttachmentDto })
    update(@Param('id') id: string, @Body() body: UpdateAttachmentRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.updateAttachment(id, body, req.user, getRequestId(req));
    }

    @Post(':id\\:void')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '作废附件' })
    @ApiOkResponse({ type: AttachmentDto })
    void(@Param('id') id: string, @Body() body: VoidAttachmentRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.voidAttachment(id, body, req.user, getRequestId(req));
    }

    @Post(':id\\:mark-final')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '标记附件最终版' })
    @ApiOkResponse({ type: AttachmentDto })
    markFinal(@Param('id') id: string, @Body() body: MarkAttachmentFinalRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.markAttachmentFinal(id, body, req.user, getRequestId(req));
    }

    @Post(':id\\:clear-final')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '撤销附件最终版标记' })
    @ApiOkResponse({ type: AttachmentDto })
    clearFinal(@Param('id') id: string, @Body() body: ClearAttachmentFinalRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.clearAttachmentFinal(id, body, req.user, getRequestId(req));
    }

    @Post(':id/links')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '新增附件业务对象关联' })
    @ApiOkResponse({ type: AttachmentDto })
    link(@Param('id') id: string, @Body() body: CreateAttachmentLinkRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.linkAttachment(id, body, req.user, getRequestId(req));
    }

    @Delete(':id/links/:linkId')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '取消附件业务对象关联' })
    @ApiOkResponse({ type: AttachmentDto })
    unlink(@Param('id') id: string, @Param('linkId') linkId: string, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<AttachmentSummary> {
        return this.attachmentService.unlinkAttachment(id, linkId, req.user, getRequestId(req));
    }
}
