import { Inject, Body, Controller, Get, Param, Patch, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { SystemSettingDto, SystemSettingListDto, UpdateSystemSettingRequestDto } from '@poms/api-contracts';
import type { SystemSettingList, SystemSettingSummary, UserPayload } from '@poms/shared-contracts';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { getRequestId, type RuntimeAuditRequestLike } from '../../core/runtime-audit/runtime-audit-request.utils';
import { SystemSettingService } from './system-setting.service';

@ApiTags('System Setting')
@ApiCookieAuth('pomsSession')
@Controller('platform/system-settings')
export class SystemSettingController {
    constructor(@Inject(SystemSettingService) private readonly systemSettingService: SystemSettingService) {}

    @Get()
    @HasPermissions('platform:system-settings:manage')
    @ApiOperation({ summary: '获取系统设置列表' })
    @ApiOkResponse({ type: SystemSettingListDto })
    listSystemSettings(): Promise<SystemSettingList> {
        return this.systemSettingService.listSystemSettings();
    }

    @Get(':key')
    @HasPermissions('platform:system-settings:manage')
    @ApiOperation({ summary: '获取单个系统设置' })
    @ApiOkResponse({ type: SystemSettingDto })
    getSystemSetting(@Param('key') key: string): Promise<SystemSettingSummary> {
        return this.systemSettingService.getSystemSetting(key);
    }

    @Patch(':key')
    @HasPermissions('platform:system-settings:manage')
    @ApiOperation({ summary: '更新单个系统设置' })
    @ApiOkResponse({ type: SystemSettingDto })
    updateSystemSetting(@Param('key') key: string, @Body() body: UpdateSystemSettingRequestDto, @Request() req: RuntimeAuditRequestLike & { user: UserPayload }): Promise<SystemSettingSummary> {
        return this.systemSettingService.updateSystemSetting(key, body, req.user.sub, getRequestId(req));
    }
}
