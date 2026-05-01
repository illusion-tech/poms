import { Body, Controller, Delete, Get, Header, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, StreamableFile, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentDto, AttachmentListDto, AttachmentListQueryDto, CreateAttachmentLinkRequestDto, UpdateAttachmentRequestDto, VoidAttachmentRequestDto } from '@poms/api-contracts';
import { ATTACHMENT_TARGET_TYPES } from '@poms/shared-contracts';
import type { AttachmentSummary, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { AttachmentService, type UploadedAttachmentFile, type UploadAttachmentMetadata } from './attachment.service';

const ATTACHMENT_UPLOAD_LIMIT_BYTES = 50 * 1024 * 1024;

@ApiTags('Attachment')
@ApiBearerAuth()
@Controller('attachments')
export class AttachmentController {
    constructor(private readonly attachmentService: AttachmentService) {}

    @Post()
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @UseInterceptors(FileInterceptor('file', { limits: { fileSize: ATTACHMENT_UPLOAD_LIMIT_BYTES } }))
    @ApiConsumes('multipart/form-data')
    @ApiOperation({ summary: '上传附件并关联业务对象' })
    @ApiBody({
        schema: {
            type: 'object',
            required: ['file', 'targetType', 'targetId', 'category'],
            properties: {
                file: { type: 'string', format: 'binary' },
                targetType: { type: 'string', enum: [...ATTACHMENT_TARGET_TYPES] },
                targetId: { type: 'string', format: 'uuid' },
                category: { type: 'string' },
                securityLevel: { type: 'string' },
                relationType: { type: 'string' },
                displayName: { type: 'string' },
                description: { type: 'string', nullable: true }
            }
        }
    })
    @ApiCreatedResponse({ type: AttachmentDto })
    upload(
        @UploadedFile() file: UploadedAttachmentFile | undefined,
        @Body() body: UploadAttachmentMetadata,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentSummary> {
        return this.attachmentService.uploadAttachment(file, body, req.user, getRequestId(req));
    }

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

    @Patch(':id')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '更新附件元数据' })
    @ApiOkResponse({ type: AttachmentDto })
    update(
        @Param('id') id: string,
        @Body() body: UpdateAttachmentRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentSummary> {
        return this.attachmentService.updateAttachment(id, body, req.user, getRequestId(req));
    }

    @Post(':id\\:void')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '作废附件' })
    @ApiOkResponse({ type: AttachmentDto })
    void(
        @Param('id') id: string,
        @Body() body: VoidAttachmentRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentSummary> {
        return this.attachmentService.voidAttachment(id, body, req.user, getRequestId(req));
    }

    @Post(':id/links')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '新增附件业务对象关联' })
    @ApiOkResponse({ type: AttachmentDto })
    link(
        @Param('id') id: string,
        @Body() body: CreateAttachmentLinkRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentSummary> {
        return this.attachmentService.linkAttachment(id, body, req.user, getRequestId(req));
    }

    @Delete(':id/links/:linkId')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '取消附件业务对象关联' })
    @ApiOkResponse({ type: AttachmentDto })
    unlink(
        @Param('id') id: string,
        @Param('linkId') linkId: string,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentSummary> {
        return this.attachmentService.unlinkAttachment(id, linkId, req.user, getRequestId(req));
    }
}
