import {
    AttachmentStorageProviderConfigDto,
    AttachmentStorageProviderConfigListDto,
    AttachmentStorageProviderConfigListQueryDto,
    AttachmentStorageProviderConnectionTestResultDto,
    CreateAttachmentStorageProviderConfigRequestDto,
    SetDefaultAttachmentStorageProviderRequestDto,
    TestAttachmentStorageProviderConnectionRequestDto,
    UpdateAttachmentStorageProviderConfigRequestDto
} from '@poms/api-contracts';
import type { AttachmentStorageProviderConfigDetail, AttachmentStorageProviderConfigList, AttachmentStorageProviderConfigListQuery, AttachmentStorageProviderConnectionTestResult, UserPayload } from '@poms/shared-contracts';
import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { AttachmentStorageProviderService } from './attachment-storage-provider.service';

@ApiTags('Attachment Storage Provider')
@ApiCookieAuth('pomsSession')
@Controller('platform/attachment-storage-providers')
export class AttachmentStorageProviderController {
    constructor(@Inject(AttachmentStorageProviderService) private readonly storageProviderService: AttachmentStorageProviderService) {}

    @Get()
    @HasPermissions('platform:attachment-storage-providers:manage')
    @ApiOperation({ summary: '获取附件存储提供商配置列表' })
    @ApiOkResponse({ type: AttachmentStorageProviderConfigListDto })
    listAttachmentStorageProviderConfigs(@Query() query: AttachmentStorageProviderConfigListQueryDto): Promise<AttachmentStorageProviderConfigList> {
        const listQuery: AttachmentStorageProviderConfigListQuery = {
            providerType: query.providerType,
            status: query.status,
            enabled: query.enabled
        };
        return this.storageProviderService.listAttachmentStorageProviderConfigs(listQuery);
    }

    @Post()
    @HasPermissions('platform:attachment-storage-providers:manage')
    @ApiOperation({ summary: '创建附件存储提供商配置' })
    @ApiCreatedResponse({ type: AttachmentStorageProviderConfigDto })
    createAttachmentStorageProviderConfig(@Body() body: CreateAttachmentStorageProviderConfigRequestDto, @Request() req: { user: UserPayload }): Promise<AttachmentStorageProviderConfigDetail> {
        return this.storageProviderService.createAttachmentStorageProviderConfig(body, req.user.sub);
    }

    @Get(':id')
    @HasPermissions('platform:attachment-storage-providers:manage')
    @ApiOperation({ summary: '获取附件存储提供商配置详情' })
    @ApiOkResponse({ type: AttachmentStorageProviderConfigDto })
    getAttachmentStorageProviderConfig(@Param('id') id: string): Promise<AttachmentStorageProviderConfigDetail> {
        return this.storageProviderService.getAttachmentStorageProviderConfig(id);
    }

    @Patch(':id')
    @HasPermissions('platform:attachment-storage-providers:manage')
    @ApiOperation({ summary: '更新附件存储提供商配置' })
    @ApiOkResponse({ type: AttachmentStorageProviderConfigDto })
    updateAttachmentStorageProviderConfig(@Param('id') id: string, @Body() body: UpdateAttachmentStorageProviderConfigRequestDto, @Request() req: { user: UserPayload }): Promise<AttachmentStorageProviderConfigDetail> {
        return this.storageProviderService.updateAttachmentStorageProviderConfig(id, body, req.user.sub);
    }

    @Post(':id\\:testConnection')
    @HasPermissions('platform:attachment-storage-providers:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '测试附件存储提供商配置完整性' })
    @ApiOkResponse({ type: AttachmentStorageProviderConnectionTestResultDto })
    testAttachmentStorageProviderConnection(@Param('id') id: string, @Body() body: TestAttachmentStorageProviderConnectionRequestDto): Promise<AttachmentStorageProviderConnectionTestResult> {
        return this.storageProviderService.testAttachmentStorageProviderConnection(id, body);
    }

    @Post(':id\\:set-default')
    @HasPermissions('platform:attachment-storage-providers:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '设为默认附件存储提供商' })
    @ApiOkResponse({ type: AttachmentStorageProviderConfigDto })
    setDefaultAttachmentStorageProvider(@Param('id') id: string, @Body() body: SetDefaultAttachmentStorageProviderRequestDto, @Request() req: { user: UserPayload }): Promise<AttachmentStorageProviderConfigDetail> {
        return this.storageProviderService.setDefaultAttachmentStorageProvider(id, body, req.user.sub);
    }
}
