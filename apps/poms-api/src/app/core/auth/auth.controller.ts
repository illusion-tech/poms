import type { EnabledLoginProviderList, ExternalLoginAuthorizeResult, ExternalLoginCallbackQuery, ExternalLoginCallbackResult, UserPayload } from '@poms/shared-contracts';
import { CreateExternalLoginSessionRequestDto, EnabledLoginProviderListDto, ExternalLoginAuthorizeResultDto, ExternalLoginCallbackQueryDto, ExternalLoginCallbackResultDto, LoginRequestDto, LoginResponseDto, SanitizedUserWithOrgUnitsDto, UpdateCurrentUserProfileRequestDto } from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Param, Patch, Post, Query, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RuntimeAuditService } from '../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../runtime-audit/runtime-audit-request.utils';
import { findDevUserByCredentials, findDevUserById } from '../platform/dev-platform.fixtures';
import { Authenticated } from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';
import { PlatformService } from '../../features/platform/platform.service';
import { IdentityProviderService } from '../../features/identity-provider/identity-provider.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly jwtService: JwtService,
        private readonly platformService: PlatformService,
        private readonly runtimeAuditService: RuntimeAuditService,
        private readonly identityProviderService: IdentityProviderService
    ) {}

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '登录并获取 JWT' })
    @ApiOkResponse({ type: LoginResponseDto })
    async login(@Body() dto: LoginRequestDto, @Request() req: RuntimeAuditRequestLike): Promise<LoginResponseDto> {
        const platformUser = await this.platformService.verifyCredentials(dto.username, dto.password);
        if (platformUser) {
            const payload: UserPayload = {
                sub: platformUser.userId,
                username: platformUser.username,
                permissions: platformUser.permissions
            };
            return { accessToken: this.jwtService.sign(payload) };
        }

        const isKnownPlatformUsername = await this.platformService.isKnownPlatformUsername(dto.username);
        if (isKnownPlatformUsername) {
            await this.#recordLoginFailure(dto.username, req, 'invalid_credentials');
            throw new UnauthorizedException('用户名或密码错误');
        }

        // fixture fallback for dev/transition period
        const fixtureUser = findDevUserByCredentials(dto.username, dto.password);
        if (fixtureUser) {
            const payload: UserPayload = {
                sub: fixtureUser.id,
                username: fixtureUser.username,
                permissions: fixtureUser.permissions
            };
            return { accessToken: this.jwtService.sign(payload) };
        }

        await this.#recordLoginFailure(dto.username, req, 'invalid_credentials');
        throw new UnauthorizedException('用户名或密码错误');
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
    @ApiOperation({ summary: '使用外部登录一次性票据交换 POMS JWT' })
    @ApiOkResponse({ type: LoginResponseDto })
    async createExternalLoginSession(@Body() body: CreateExternalLoginSessionRequestDto): Promise<LoginResponseDto> {
        const session = await this.identityProviderService.consumeExternalLoginSession(body.ticket);
        const platformUser = await this.platformService.resolveActiveAuthUser(session.pomsUserId);
        if (!platformUser) {
            throw new UnauthorizedException('Bound POMS user is inactive or missing.');
        }

        const payload: UserPayload = {
            sub: platformUser.userId,
            username: platformUser.username,
            permissions: platformUser.permissions
        };
        return { accessToken: this.jwtService.sign(payload) };
    }

    @Get('profile')
    @Authenticated()
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取当前登录用户信息' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    async getProfile(@Request() req: { user: UserPayload }): Promise<SanitizedUserWithOrgUnitsDto> {
        const { sub, username, permissions } = req.user;
        const user = findDevUserById(sub);
        const fallbackProfile: SanitizedUserWithOrgUnitsDto = {
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

    @Patch('profile')
    @Authenticated()
    @ApiBearerAuth()
    @ApiOperation({ summary: '更新当前登录用户基础资料' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    async updateProfile(
        @Body() body: UpdateCurrentUserProfileRequestDto,
        @Request() req: { user: UserPayload }
    ): Promise<SanitizedUserWithOrgUnitsDto> {
        return this.platformService.updateCurrentUserProfile(req.user.sub, body);
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
