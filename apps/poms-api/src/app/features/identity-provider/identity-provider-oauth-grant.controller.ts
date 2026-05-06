import { IdentityProviderOAuthAuthorizeResultDto, IdentityProviderOAuthCallbackQueryDto, IdentityProviderOAuthGrantDto } from '@poms/api-contracts';
import type { IdentityProviderOAuthAuthorizeResult, IdentityProviderOAuthCallbackQuery, IdentityProviderOAuthGrantSummary, UserPayload } from '@poms/shared-contracts';
import { Controller, Get, Param, Query, Request } from '@nestjs/common';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';
import { IdentityProviderService } from './identity-provider.service';

@ApiTags('Identity Provider OAuth Grant')
@Controller('platform')
export class IdentityProviderOAuthGrantController {
    constructor(private readonly identityProviderService: IdentityProviderService) {}

    @Get('identity-provider-oauth-grants/:identityProviderId')
    @ApiBearerAuth()
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '获取当前管理员的外部身份提供商搜索授权状态' })
    @ApiOkResponse({ type: IdentityProviderOAuthGrantDto })
    getCurrentAdminProviderGrant(@Param('identityProviderId') identityProviderId: string, @Request() req: { user: UserPayload }): Promise<IdentityProviderOAuthGrantSummary> {
        return this.identityProviderService.getCurrentAdminProviderGrant(identityProviderId, req.user.sub);
    }

    @Get('identity-provider-oauth-grants/:identityProviderId\\:authorize')
    @ApiBearerAuth()
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '生成当前管理员的外部身份提供商搜索授权 URL' })
    @ApiOkResponse({ type: IdentityProviderOAuthAuthorizeResultDto })
    authorizeCurrentAdminProviderGrant(@Param('identityProviderId') identityProviderId: string, @Request() req: { user: UserPayload }): Promise<IdentityProviderOAuthAuthorizeResult> {
        return this.identityProviderService.authorizeCurrentAdminProviderGrant(identityProviderId, req.user.sub);
    }

    @Get('identity-provider-oauth-grants\\:callback')
    @Public()
    @ApiOperation({ summary: '处理外部身份提供商搜索授权 callback' })
    @ApiOkResponse({ type: IdentityProviderOAuthGrantDto })
    handleCurrentAdminProviderGrantCallback(@Query() query: IdentityProviderOAuthCallbackQueryDto): Promise<IdentityProviderOAuthGrantSummary> {
        const callbackQuery: IdentityProviderOAuthCallbackQuery = {
            code: query.code,
            state: query.state,
            error: query.error,
            error_description: query.error_description
        };
        return this.identityProviderService.handleCurrentAdminProviderGrantCallback(callbackQuery);
    }
}
