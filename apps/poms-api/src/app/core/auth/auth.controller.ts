import type { UserPayload } from '@poms/shared-contracts';
import { LoginRequestDto, LoginResponseDto, SanitizedUserWithOrgUnitsDto } from '@poms/api-contracts';
import { Body, Controller, Get, HttpCode, HttpStatus, Post, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { findDevUserByCredentials, findDevUserById } from '../platform/dev-platform.fixtures';
import { Authenticated } from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';
import { PlatformService } from '../../features/platform/platform.service';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(
        private readonly jwtService: JwtService,
        private readonly platformService: PlatformService
    ) {}

    @Post('login')
    @Public()
    @HttpCode(HttpStatus.OK)
    @ApiOperation({ summary: '登录并获取 JWT' })
    @ApiOkResponse({ type: LoginResponseDto })
    async login(@Body() dto: LoginRequestDto): Promise<LoginResponseDto> {
        const platformUser = await this.platformService.verifyCredentials(dto.username, dto.password);
        if (platformUser) {
            const payload: UserPayload = {
                sub: platformUser.userId,
                username: platformUser.username,
                permissions: platformUser.permissions
            };
            return { accessToken: this.jwtService.sign(payload) };
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
}
