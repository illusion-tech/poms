import { IdentityProviderOAuthAuthorizeResultDto, IdentityProviderOAuthCallbackQueryDto, IdentityProviderOAuthGrantDto } from '@poms/api-contracts';
import type { IdentityProviderOAuthAuthorizeResult, IdentityProviderOAuthCallbackQuery, IdentityProviderOAuthGrantSummary, UserPayload } from '@poms/shared-contracts';
import { Controller, Get, Inject, Param, ParseUUIDPipe, Query, Request, Res } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { HasPermissions } from '../../core/auth/decorators/has-permissions.decorator';
import { Public } from '../../core/auth/decorators/public.decorator';
import { IdentityProviderService } from './identity-provider.service';

type OAuthCallbackRequest = { headers?: Record<string, string | string[] | undefined> };
type OAuthCallbackResponse = { redirect(url: string): void };

@ApiTags('Identity Provider OAuth Grant')
@Controller('platform')
export class IdentityProviderOAuthGrantController {
    constructor(@Inject(IdentityProviderService) private readonly identityProviderService: IdentityProviderService) {}

    @Get('identity-provider-oauth-grants/:identityProviderId\\:authorize')
    @ApiCookieAuth('pomsSession')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '生成当前管理员的外部身份提供商搜索授权 URL' })
    @ApiOkResponse({ type: IdentityProviderOAuthAuthorizeResultDto })
    authorizeCurrentAdminProviderGrant(
        @Param('identityProviderId', new ParseUUIDPipe()) identityProviderId: string,
        @Request() req: { user: UserPayload }
    ): Promise<IdentityProviderOAuthAuthorizeResult> {
        return this.identityProviderService.authorizeCurrentAdminProviderGrant(identityProviderId, req.user.sub);
    }

    @Get('identity-provider-oauth-grants/:identityProviderId')
    @ApiCookieAuth('pomsSession')
    @HasPermissions('platform:users:manage')
    @ApiOperation({ summary: '获取当前管理员的外部身份提供商搜索授权状态' })
    @ApiOkResponse({ type: IdentityProviderOAuthGrantDto })
    getCurrentAdminProviderGrant(
        @Param('identityProviderId', new ParseUUIDPipe()) identityProviderId: string,
        @Request() req: { user: UserPayload }
    ): Promise<IdentityProviderOAuthGrantSummary> {
        return this.identityProviderService.getCurrentAdminProviderGrant(identityProviderId, req.user.sub);
    }

    @Get('identity-provider-oauth-grants\\:callback')
    @Public()
    @ApiOperation({ summary: '处理外部身份提供商搜索授权 callback' })
    @ApiOkResponse({ type: IdentityProviderOAuthGrantDto })
    async handleCurrentAdminProviderGrantCallback(
        @Query() query: IdentityProviderOAuthCallbackQueryDto,
        @Request() req?: OAuthCallbackRequest,
        @Res({ passthrough: true }) res?: OAuthCallbackResponse
    ): Promise<IdentityProviderOAuthGrantSummary | void> {
        const callbackQuery: IdentityProviderOAuthCallbackQuery = {
            code: query.code,
            state: query.state,
            error: query.error,
            error_description: query.error_description
        };
        const summary = await this.identityProviderService.handleCurrentAdminProviderGrantCallback(callbackQuery);
        if (this.shouldRedirectBrowserCallback(req) && res) {
            res.redirect(this.oauthGrantRedirectUrl(summary));
            return;
        }
        return summary;
    }

    private shouldRedirectBrowserCallback(req?: OAuthCallbackRequest): boolean {
        const accept = this.firstHeader(req, 'accept').toLowerCase();
        return accept.includes('text/html') && !accept.includes('application/json');
    }

    private firstHeader(req: OAuthCallbackRequest | undefined, key: string): string {
        const headers = req?.headers ?? {};
        const value = headers[key] ?? headers[key.toLowerCase()];
        if (Array.isArray(value)) return value[0] ?? '';
        return value ?? '';
    }

    private oauthGrantRedirectUrl(summary: IdentityProviderOAuthGrantSummary): string {
        const params = new URLSearchParams({
            identityProviderGrant: 'success',
            provider: summary.provider,
            identityProviderConfigId: summary.identityProviderConfigId
        });
        return `/platform/users?${params.toString()}`;
    }
}
