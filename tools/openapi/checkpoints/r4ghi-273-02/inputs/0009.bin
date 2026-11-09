import type {
    AuthSessionLogoutResult,
    CsrfTokenView,
    CurrentAuthSessionView,
    EnabledLoginProviderList,
    ExternalLoginAuthorizeResult,
    ExternalLoginCallbackQuery,
    ExternalLoginCallbackResult,
    SanitizedUserWithOrgUnits,
    UserPayload
} from '@poms/shared-contracts';
import {
    AuthSessionLogoutResultDto,
    CreateExternalLoginSessionRequestDto,
    CreatePasswordAuthSessionRequestDto,
    CsrfTokenViewDto,
    CurrentAuthSessionViewDto,
    EnabledLoginProviderListDto,
    ExternalLoginAuthorizeResultDto,
    ExternalLoginCallbackQueryDto,
    ExternalLoginCallbackResultDto,
    LogoutAuthSessionRequestDto,
    SanitizedUserWithOrgUnitsDto,
    UpdateCurrentUserProfileRequestDto
} from '@poms/api-contracts';
import { Inject, Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, Res, UnauthorizedException } from '@nestjs/common';
import { ApiCookieAuth, ApiOkResponse, ApiOperation, ApiSecurity, ApiTags } from '@nestjs/swagger';
import { RuntimeAuditService } from '../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../runtime-audit/runtime-audit-request.utils';
import { findDevUserById } from '../platform/dev-platform.fixtures';
import { Authenticated } from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';
import { PlatformService } from '../../features/platform/platform.service';
import { IdentityProviderService } from '../../features/identity-provider/identity-provider.service';
import { AuthSessionCookieService } from './auth-session-cookie.service';
import type { AuthSession } from './auth-session.entity';
import { AuthSessionAuthenticationError, AuthSessionErrorCodeValue, AuthSessionService, type AuthSessionErrorCode } from './auth-session.service';

type SessionRequest = RuntimeAuditRequestLike & {
    user?: UserPayload;
    headers?: Record<string, string | string[] | undefined>;
};

type HeaderResponse = {
    setHeader(name: string, value: string | string[]): void;
};

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        @Inject(PlatformService) private readonly platformService: PlatformService,
        @Inject(RuntimeAuditService) private readonly runtimeAuditService: RuntimeAuditService,
        @Inject(IdentityProviderService) private readonly identityProviderService: IdentityProviderService,
        @Inject(AuthSessionService) private readonly authSessionService: AuthSessionService,
        @Inject(AuthSessionCookieService) private readonly authSessionCookieService: AuthSessionCookieService
    ) {}

    @Post('sessions')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiSecurity('pomsCsrf')
    @ApiOperation({ summary: '创建账号密码认证会话' })
    @ApiOkResponse({ type: CurrentAuthSessionViewDto })
    async createPasswordAuthSession(@Body() dto: CreatePasswordAuthSessionRequestDto, @Request() req: RuntimeAuditRequestLike, @Res({ passthrough: true }) res: HeaderResponse): Promise<CurrentAuthSessionView> {
        const platformUser = await this.platformService.verifyCredentials(dto.username, dto.password);
        if (platformUser) {
            return this.#createSessionResponse(platformUser.userId, req, res, {
                sub: platformUser.userId,
                username: platformUser.username,
                permissions: platformUser.permissions
            });
        }

        await this.#recordLoginFailure(dto.username, req, 'invalid_credentials');
        throw invalidCredentials();
    }

    @Get('session')
    @Public()
    @ApiOperation({ summary: '获取当前认证会话' })
    @ApiOkResponse({ type: CurrentAuthSessionViewDto })
    async getCurrentAuthSession(@Request() req: SessionRequest, @Res({ passthrough: true }) res: HeaderResponse): Promise<CurrentAuthSessionView> {
        const sessionToken = this.authSessionCookieService.getSessionTokenFromCookieHeader(req.headers?.['cookie']);
        if (!sessionToken) {
            return this.#unauthenticatedSessionView();
        }

        try {
            const resolved = await this.authSessionService.resolveSessionToken(sessionToken, this.#requestInfo(req));
            return this.#toCurrentSessionView(resolved.session, resolved.user);
        } catch (error) {
            if (error instanceof AuthSessionAuthenticationError) {
                this.#clearAuthCookies(res);
                throw createUnauthorized(error.code);
            }

            throw error;
        }
    }

    @Get('csrf-token')
    @Public()
    @ApiOperation({ summary: '获取 CSRF token' })
    @ApiOkResponse({ type: CsrfTokenViewDto })
    async getCsrfToken(@Request() req: RuntimeAuditRequestLike, @Res({ passthrough: true }) res: HeaderResponse): Promise<CsrfTokenView> {
        const sessionToken = this.authSessionCookieService.getSessionTokenFromCookieHeader(req.headers?.['cookie']);
        try {
            const result = await this.authSessionService.refreshCsrfToken(sessionToken, this.#requestInfo(req));
            res.setHeader('Set-Cookie', this.authSessionCookieService.createCsrfCookieHeader(result.csrfToken, result.expiresAt));
            return {
                token: result.csrfToken,
                cookieName: this.authSessionCookieService.csrfCookieName,
                headerName: this.authSessionCookieService.csrfHeaderName,
                expiresAt: result.expiresAt.toISOString()
            };
        } catch (error) {
            if (error instanceof AuthSessionAuthenticationError) {
                this.#clearAuthCookies(res);
                throw createUnauthorized(error.code);
            }

            throw error;
        }
    }

    @Post('session\\:logout')
    @Authenticated()
    @HttpCode(HttpStatus.OK)
    @ApiCookieAuth('pomsSession')
    @ApiSecurity('pomsCsrf')
    @ApiOperation({ summary: '登出当前认证会话' })
    @ApiOkResponse({ type: AuthSessionLogoutResultDto })
    async logoutCurrentAuthSession(@Body() _body: LogoutAuthSessionRequestDto, @Request() req: SessionRequest, @Res({ passthrough: true }) res: HeaderResponse): Promise<AuthSessionLogoutResult> {
        const sessionToken = this.authSessionCookieService.getSessionTokenFromCookieHeader(req.headers?.['cookie']);
        const revoked = sessionToken ? await this.authSessionService.revokeSessionToken(sessionToken) : false;
        this.#clearAuthCookies(res);
        return {
            authenticated: false,
            resultStatus: 'logged-out',
            revoked
        };
    }

    @Get('identity-providers')
    @Public()
    @ApiOperation({ summary: '获取可用于登录的外部身份提供商列表' })
    @ApiOkResponse({ type: EnabledLoginProviderListDto })
    listEnabledLoginProviders(): Promise<EnabledLoginProviderList> {
        return this.identityProviderService.listEnabledLoginProviders();
    }

    @Get('identity-providers/:id\\:authorize')
    @Public()
    @ApiOperation({ summary: '生成外部身份提供商登录授权 URL' })
    @ApiOkResponse({ type: ExternalLoginAuthorizeResultDto })
    authorizeExternalLogin(@Param('id') id: string): Promise<ExternalLoginAuthorizeResult> {
        return this.identityProviderService.authorizeExternalLogin(id);
    }

    @Get('identity-providers\\:callback')
    @Public()
    @ApiOperation({ summary: '处理外部身份提供商登录 callback' })
    @ApiOkResponse({ type: ExternalLoginCallbackResultDto })
    handleExternalLoginCallback(@Query() query: ExternalLoginCallbackQueryDto): Promise<ExternalLoginCallbackResult> {
        const callbackQuery: ExternalLoginCallbackQuery = {
            code: query.code,
            state: query.state,
            error: query.error,
            error_description: query.error_description
        };
        return this.identityProviderService.handleExternalLoginCallback(callbackQuery);
    }

    @Post('external-login-sessions')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiSecurity('pomsCsrf')
    @ApiOperation({ summary: '使用外部登录一次性票据创建认证会话' })
    @ApiOkResponse({ type: CurrentAuthSessionViewDto })
    async createExternalLoginSession(@Body() body: CreateExternalLoginSessionRequestDto, @Request() req: RuntimeAuditRequestLike, @Res({ passthrough: true }) res: HeaderResponse): Promise<CurrentAuthSessionView> {
        const session = await this.identityProviderService.consumeExternalLoginSession(body.ticket);
        const platformUser = await this.platformService.resolveActiveAuthUser(session.pomsUserId);
        if (!platformUser) {
            throw createUnauthorized(AuthSessionErrorCodeValue.AccountDisabled);
        }

        return this.#createSessionResponse(platformUser.userId, req, res, {
            sub: platformUser.userId,
            username: platformUser.username,
            permissions: platformUser.permissions
        });
    }

    @Get('profile')
    @Authenticated()
    @ApiCookieAuth('pomsSession')
    @ApiOperation({ summary: '获取当前登录用户信息' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    async getProfile(@Request() req: { user: UserPayload }): Promise<SanitizedUserWithOrgUnitsDto> {
        return this.#getUserProfile(req.user);
    }

    @Patch('profile')
    @Authenticated()
    @ApiCookieAuth('pomsSession')
    @ApiSecurity('pomsCsrf')
    @ApiOperation({ summary: '更新当前登录用户基础资料' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    async updateProfile(@Body() body: UpdateCurrentUserProfileRequestDto, @Request() req: { user: UserPayload }): Promise<SanitizedUserWithOrgUnitsDto> {
        return this.platformService.updateCurrentUserProfile(req.user.sub, body);
    }

    async #createSessionResponse(userId: string, request: RuntimeAuditRequestLike, response: HeaderResponse, userPayload: UserPayload): Promise<CurrentAuthSessionView> {
        const created = await this.authSessionService.createSession(userId, this.#requestInfo(request));
        response.setHeader('Set-Cookie', [
            this.authSessionCookieService.createSessionCookieHeader(created.sessionToken, created.session.absoluteExpiresAt),
            this.authSessionCookieService.createCsrfCookieHeader(created.csrfToken, created.session.absoluteExpiresAt)
        ]);
        return this.#toCurrentSessionView(created.session, userPayload);
    }

    async #toCurrentSessionView(session: AuthSession, userPayload: UserPayload): Promise<CurrentAuthSessionView> {
        const user = await this.#getUserProfile(userPayload);
        return {
            authenticated: true,
            status: 'active',
            user,
            permissions: userPayload.permissions,
            expiresAt: minDate(session.idleExpiresAt, session.absoluteExpiresAt).toISOString(),
            csrf: this.#csrfHint()
        };
    }

    async #getUserProfile(userPayload: UserPayload): Promise<SanitizedUserWithOrgUnits> {
        const { sub, username, permissions } = userPayload;
        const user = findDevUserById(sub);
        const fallbackProfile: SanitizedUserWithOrgUnits = {
            id: sub,
            username,
            displayName: user?.displayName ?? username,
            roles: user?.roles ?? [],
            permissions,
            email: null,
            avatarUrl: null,
            isActive: true,
            lastLoginAt: null,
            emailVerified: false,
            phoneVerified: false,
            phone: null,
            orgUnits: user?.orgUnits ?? []
        };

        const platformProfile = await this.platformService.getSanitizedUserProfile(sub, { username, permissions });
        return platformProfile ?? fallbackProfile;
    }

    #unauthenticatedSessionView(): CurrentAuthSessionView {
        return {
            authenticated: false,
            status: null,
            user: null,
            permissions: [],
            expiresAt: null,
            csrf: this.#csrfHint()
        };
    }

    #csrfHint(): CurrentAuthSessionView['csrf'] {
        return {
            cookieName: this.authSessionCookieService.csrfCookieName,
            headerName: this.authSessionCookieService.csrfHeaderName
        };
    }

    #clearAuthCookies(response: HeaderResponse): void {
        response.setHeader('Set-Cookie', [this.authSessionCookieService.createClearSessionCookieHeader(), this.authSessionCookieService.createClearCsrfCookieHeader()]);
    }

    #requestInfo(request: RuntimeAuditRequestLike): { ip?: string | null; userAgent?: string | null } {
        return {
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request)
        };
    }

    async #recordLoginFailure(username: string, request: RuntimeAuditRequestLike, reason: string): Promise<void> {
        await this.runtimeAuditService.recordSecurityEvent({
            eventType: 'auth.login.failed',
            severity: 'warning',
            principal: username,
            requestId: getRequestId(request),
            path: getRequestPath(request),
            method: getRequestMethod(request),
            result: 'failed',
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            details: {
                reason
            }
        });
    }
}

function invalidCredentials(): UnauthorizedException {
    return new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code: 'invalid_credentials',
        message: '用户名或密码错误'
    });
}

function createUnauthorized(code: AuthSessionErrorCode): UnauthorizedException {
    return new UnauthorizedException({
        statusCode: HttpStatus.UNAUTHORIZED,
        code,
        message: 'Authentication required'
    });
}

function minDate(left: Date, right: Date): Date {
    return left.getTime() <= right.getTime() ? left : right;
}
