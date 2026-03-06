import type { PermissionKey, UserPayload } from '@poms/shared-contracts';
import { LoginRequestDto, LoginResponseDto, SanitizedUserWithOrgUnitsDto } from '@poms/api-contracts';
import { Body, Controller, Get, Post, Request, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiBearerAuth, ApiOkResponse, ApiOperation, ApiTags } from '@nestjs/swagger';
import { Authenticated } from './decorators/authenticated.decorator';
import { Public } from './decorators/public.decorator';

/**
 * 开发期硬编码用户表，接入数据库后替换为真实查询。
 * 密码此处明文仅供本地联调，生产环境必须走 bcrypt 哈希比对。
 */
const DEV_USERS: Array<{
    id: string;
    username: string;
    password: string;
    displayName: string;
    permissions: PermissionKey[];
}> = [
    {
        id: '00000000-0000-0000-0000-000000000001',
        username: 'admin',
        password: 'admin123',
        displayName: '超级管理员',
        permissions: [
            'platform:users:manage',
            'platform:roles:manage',
            'platform:navigation:manage',
            'platform:org-units:manage',
            'project:read',
            'project:write',
            'project:delete',
            'nav:dashboard:view',
            'nav:platform:view',
            'nav:projects:view',
            'nav:profile:view',
        ],
    },
    {
        id: '00000000-0000-0000-0000-000000000002',
        username: 'viewer',
        password: 'viewer123',
        displayName: '只读用户',
        permissions: ['project:read', 'nav:dashboard:view', 'nav:projects:view', 'nav:profile:view'],
    },
];

@ApiTags('Auth')
@Controller('auth')
export class AuthController {
    constructor(private readonly jwtService: JwtService) {}

    @Post('login')
    @Public()
    @ApiOperation({ summary: '登录并获取 JWT' })
    @ApiOkResponse({ type: LoginResponseDto })
    login(@Body() dto: LoginRequestDto): LoginResponseDto {
        const user = DEV_USERS.find(
            (u) => u.username === dto.username && u.password === dto.password,
        );
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
        const user = DEV_USERS.find((u) => u.id === sub);
        return {
            id: sub,
            username,
            displayName: user?.displayName ?? username,
            roles: [],
            permissions,
            email: null,
            avatarUrl: null,
            isActive: true,
            lastLoginAt: null,
            emailVerified: false,
            phoneVerified: false,
            phone: null,
            orgUnits: [],
        };
    }
}
