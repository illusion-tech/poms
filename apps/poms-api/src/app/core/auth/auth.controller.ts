import type { UserPayload } from '@poms/shared-contracts';
import { LoginRequestDto, LoginResponseDto, SanitizedUserWithOrgUnitsDto } from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { RuntimeAuditService } from '../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../runtime-audit/runtime-audit-request.utils';
import { findDevUserByCredentials, findDevUserById } from '../platform/dev-platform.fixtures';
import { Authenticated } from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';
import { PlatformService } from '../../features/platform/platform.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly jwtService: JwtService,
        private readonly platformService: PlatformService,
        private readonly runtimeAuditService: RuntimeAuditService
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
