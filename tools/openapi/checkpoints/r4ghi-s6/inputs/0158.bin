import {
    CreateIdentityProviderConfigRequestDto,
    ExternalUserSearchQueryDto,
    ExternalUserSearchResultDto,
    IdentityProviderConfigDto,
    IdentityProviderConfigListDto,
    IdentityProviderConfigListQueryDto,
    IdentityProviderConnectionTestResultDto,
    TestIdentityProviderConnectionRequestDto,
    UpdateIdentityProviderConfigRequestDto
} from '@poms/api-contracts';
import type { ExternalUserSearchQuery, ExternalUserSearchResult, IdentityProviderConfigDetail, IdentityProviderConfigList, IdentityProviderConfigListQuery, IdentityProviderConnectionTestResult, UserPayload } from '@poms/shared-contracts';
import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request } from '@nestjs/common';
import { ApiCookieAuth, ApiCreatedResponse, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { IdentityProviderService } from './identity-provider.service';

@ApiTags('Identity Provider')
@ApiCookieAuth('pomsSession')
@Controller('platform/identity-providers')
export class IdentityProviderController {
    constructor(@Inject(IdentityProviderService) private readonly identityProviderService: IdentityProviderService) {}

    @Get()
    @HasPermissions('platform:identity-providers:manage')
    @ApiOperation({ summary: '获取外部身份提供商配置列表' })
    @ApiOkResponse({ type: IdentityProviderConfigListDto })
    listIdentityProviderConfigs(@Query() query: IdentityProviderConfigListQueryDto): Promise<IdentityProviderConfigList> {
        const listQuery: IdentityProviderConfigListQuery = {
            provider: query.provider,
            status: query.status
        };
        return this.identityProviderService.listIdentityProviderConfigs(listQuery);
    }

    @Post()
    @HasPermissions('platform:identity-providers:manage')
    @ApiOperation({ summary: '创建外部身份提供商配置' })
    @ApiCreatedResponse({ type: IdentityProviderConfigDto })
    createIdentityProviderConfig(@Body() body: CreateIdentityProviderConfigRequestDto, @Request() req: { user: UserPayload }): Promise<IdentityProviderConfigDetail> {
        return this.identityProviderService.createIdentityProviderConfig(body, req.user.sub);
    }

    @Get(':id')
    @HasPermissions('platform:identity-providers:manage')
    @ApiOperation({ summary: '获取外部身份提供商配置详情' })
    @ApiOkResponse({ type: IdentityProviderConfigDto })
    getIdentityProviderConfig(@Param('id') id: string): Promise<IdentityProviderConfigDetail> {
        return this.identityProviderService.getIdentityProviderConfig(id);
    }

    @Patch(':id')
    @HasPermissions('platform:identity-providers:manage')
    @ApiOperation({ summary: '更新外部身份提供商配置' })
    @ApiOkResponse({ type: IdentityProviderConfigDto })
    updateIdentityProviderConfig(@Param('id') id: string, @Body() body: UpdateIdentityProviderConfigRequestDto, @Request() req: { user: UserPayload }): Promise<IdentityProviderConfigDetail> {
        return this.identityProviderService.updateIdentityProviderConfig(id, body, req.user.sub);
    }

    @Post(':id\\:testConnection')
    @HasPermissions('platform:identity-providers:manage')
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '测试外部身份提供商配置完整性' })
    @ApiOkResponse({ type: IdentityProviderConnectionTestResultDto })
    testIdentityProviderConnection(@Param('id') id: string, @Body() body: TestIdentityProviderConnectionRequestDto): Promise<IdentityProviderConnectionTestResult> {
        return this.identityProviderService.testIdentityProviderConnection(id, body);
    }

    @Get(':id/external-users')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '按姓名模糊搜索外部身份提供商用户' })
    @ApiOkResponse({ type: ExternalUserSearchResultDto })
    searchExternalUsers(@Param('id') id: string, @Query() query: ExternalUserSearchQueryDto, @Request() req: { user: UserPayload }): Promise<ExternalUserSearchResult> {
        const searchQuery: ExternalUserSearchQuery = {
            q: query.q,
            limit: query.limit
        };
        return this.identityProviderService.searchExternalUsers(id, searchQuery, req.user.sub);
    }
}
