import { Body, Controller, Get, HttpCode, HttpStatus, Param, Post, Put, Req, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import type { IncomingMessage } from 'node:http';
import {
    AbortAttachmentUploadSessionRequestDto,
    AttachmentDto,
    AttachmentUploadSessionDto,
    AttachmentUploadTargetDto,
    AttachmentUploadTargetResultDto,
    CompleteAttachmentUploadSessionRequestDto,
    CreateAttachmentUploadSessionRequestDto,
    CreateAttachmentUploadTargetRequestDto
} from '@poms/api-contracts';
import type { AttachmentSummary, AttachmentUploadSessionSummary, AttachmentUploadTarget, AttachmentUploadTargetResult, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { AttachmentService } from './attachment.service';

@ApiTags('AttachmentUploadSession')
@ApiBearerAuth()
@Controller('attachment-upload-sessions')
export class AttachmentUploadSessionController {
    constructor(private readonly attachmentService: AttachmentService) {}

    @Post()
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @ApiOperation({ summary: '创建附件上传会话' })
    @ApiCreatedResponse({ type: AttachmentUploadSessionDto })
    create(
        @Body() body: CreateAttachmentUploadSessionRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentUploadSessionSummary> {
        return this.attachmentService.createAttachmentUploadSession(body, req.user, getRequestId(req));
    }

    @Get(':id')
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '获取附件上传会话' })
    @ApiOkResponse({ type: AttachmentUploadSessionDto })
    get(@Param('id') id: string, @Request() req: { user: UserPayload }): Promise<AttachmentUploadSessionSummary> {
        return this.attachmentService.getAttachmentUploadSession(id, req.user);
    }

    @Post(':id/upload-targets')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '创建附件上传目标' })
    @ApiOkResponse({ type: AttachmentUploadTargetDto })
    createUploadTarget(
        @Param('id') id: string,
        @Body() body: CreateAttachmentUploadTargetRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<AttachmentUploadTarget> {
        return this.attachmentService.createAttachmentUploadTarget(id, body, req.user);
    }

    @Put(':id/object')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiConsumes('application/octet-stream')
    @ApiBody({ schema: { type: 'string', format: 'binary' } })
    @ApiOperation({ summary: '通过 POMS 后端代理上传附件对象' })
    @ApiOkResponse({ type: AttachmentUploadTargetResultDto })
    async proxyUploadObject(
        @Param('id') id: string,
        @Req() req: IncomingMessage & { user: UserPayload }
    ): Promise<AttachmentUploadTargetResult> {
        const body = await this.readRequestBody(req);
        return this.attachmentService.proxyUploadAttachmentObject(id, body, req.user);
    }

    @Post(':id\\:complete')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '完成附件上传会话并创建附件记录' })
    @ApiOkResponse({ type: AttachmentDto })
    complete(
        @Param('id') id: string,
        @Body() body: CompleteAttachmentUploadSessionRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentSummary> {
        return this.attachmentService.completeAttachmentUploadSession(id, body, req.user, getRequestId(req));
    }

    @Post(':id\\:abort')
    @HasAnyPermissions('customer:write', 'lead:write', 'project:write')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '中止附件上传会话' })
    @ApiOkResponse({ type: AttachmentUploadSessionDto })
    abort(
        @Param('id') id: string,
        @Body() body: AbortAttachmentUploadSessionRequestDto,
        @Request() req: RuntimeAuditRequestLike & { user: UserPayload }
    ): Promise<AttachmentUploadSessionSummary> {
        return this.attachmentService.abortAttachmentUploadSession(id, body, req.user, getRequestId(req));
    }

    private async readRequestBody(req: IncomingMessage): Promise<Buffer> {
        const chunks: Buffer[] = [];
        for await (const chunk of req) {
            chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
        }

        return Buffer.concat(chunks);
    }
}
