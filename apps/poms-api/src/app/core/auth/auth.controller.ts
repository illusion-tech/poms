import type { UserPayload } from '@poms/shared-contracts';
import { LoginRequestDto, LoginResponseDto, SanitizedUserWithOrgUnitsDto } from '@poms/api-contracts';
import { Body, Controller, Get, Post, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { findDevUserByCredentials, findDevUserById } from '../platform/dev-platform.fixtures';
import { Authenticated } from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly jwtService: JwtService) {}

    @Post('login')
    @Public()
    @ApiOperation({ summary: '登录并获取 JWT' })
    @ApiOkResponse({ type: LoginResponseDto })
    login(@Body() dto: LoginRequestDto): LoginResponseDto {
        const user = findDevUserByCredentials(dto.username, dto.password);
        if (!user) throw new UnauthorizedException('用户名或密码错误');

        const payload: UserPayload = {
            sub: user.id,
            username: user.username,
            permissions: user.permissions,
        };
        return { accessToken: this.jwtService.sign(payload) };
    }

    @Get('profile')
    @Authenticated()
    @ApiBearerAuth()
    @ApiOperation({ summary: '获取当前登录用户信息' })
    @ApiOkResponse({ type: SanitizedUserWithOrgUnitsDto })
    getProfile(@Request() req: { user: UserPayload }): SanitizedUserWithOrgUnitsDto {
        const { sub, username, permissions } = req.user;
        const user = findDevUserById(sub);
        return {
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
            orgUnits: user?.orgUnits ?? [],
        };
    }
}
