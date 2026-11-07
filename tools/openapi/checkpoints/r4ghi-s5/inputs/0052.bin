import { Inject, Controller, Get, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { AttachmentCenterRecordListDto } from '@poms/api-contracts';
import type { AttachmentCenterRecord, UserPayload } from '@poms/shared-contracts';
import { HasAnyPermissions } from '../../core/auth/decorators/has-any-permissions.decorator';
import { AttachmentService } from './attachment.service';

@ApiTags('Attachment')
@ApiCookieAuth('pomsSession')
@Controller('attachment-center-records')
export class AttachmentCenterRecordController {
    constructor(@Inject(AttachmentService) private readonly attachmentService: AttachmentService) {}

    @Get()
    @HasAnyPermissions('customer:read', 'lead:read', 'project:read')
    @ApiOperation({ summary: '获取附件中心聚合记录列表' })
    @ApiOkResponse({ type: AttachmentCenterRecordListDto })
    list(@Request() req: { user: UserPayload }): Promise<AttachmentCenterRecord[]> {
        return this.attachmentService.listAttachmentCenterRecords(req.user);
    }
}
