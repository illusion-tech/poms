import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
    let controller: AuthController;
    let jwtService: {
        sign: jest.Mock;
    };
    let platformService: {
        verifyCredentials: jest.Mock;
        isKnownPlatformUsername: jest.Mock;
        getSanitizedUserProfile: jest.Mock;
        updateCurrentUserProfile: jest.Mock;
        resolveActiveAuthUser: jest.Mock;
    };
    let identityProviderService: {
        listEnabledLoginProviders: jest.Mock;
        authorizeExternalLogin: jest.Mock;
        handleExternalLoginCallback: jest.Mock;
        consumeExternalLoginSession: jest.Mock;
    };
    let runtimeAuditService: {
        recordSecurityEvent: jest.Mock;
    };

    beforeEach(() => {
        jwtService = {
            sign: jest.fn().mockReturnValue('signed-token')
        };
        platformService = {
            verifyCredentials: jest.fn(),
            isKnownPlatformUsername: jest.fn(),
            getSanitizedUserProfile: jest.fn(),
            updateCurrentUserProfile: jest.fn(),
            resolveActiveAuthUser: jest.fn()
        };
        identityProviderService = {
            listEnabledLoginProviders: jest.fn(),
            authorizeExternalLogin: jest.fn(),
            handleExternalLoginCallback: jest.fn(),
            consumeExternalLoginSession: jest.fn()
        };
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };

        controller = new AuthController(jwtService as never, platformService as never, runtimeAuditService as never, identityProviderService as never);
    });

    it('records a security event when a known platform username fails login', async () => {
        platformService.verifyCredentials.mockResolvedValue(null);
        platformService.isKnownPlatformUsername.mockResolvedValue(true);

        await expect(
            controller.login(
                { username: 'admin', password: 'wrong-password' },
                {
                    method: 'POST',
                    originalUrl: '/auth/login',
                    ip: '127.0.0.1',
                    headers: {
                        'user-agent': 'jest',
                        'x-request-id': 'req-login-failed'
                    }
                }
            )
        ).rejects.toThrow(UnauthorizedException);

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'auth.login.failed',
                principal: 'admin',
                requestId: 'req-login-failed',
                path: '/auth/login',
                method: 'POST',
                result: 'failed',
                details: { reason: 'invalid_credentials' }
            })
        );
    });

    it('does not record a failure event when login succeeds', async () => {
        platformService.verifyCredentials.mockResolvedValue({
            userId: '00000000-0000-4000-8000-000000000001',
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        const result = await controller.login(
            { username: 'admin', password: 'correct-password' },
            {
                method: 'POST',
                originalUrl: '/auth/login',
                headers: {}
            }
        );

        expect(result).toEqual({ accessToken: 'signed-token' });
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('delegates external login provider listing and authorization', async () => {
        identityProviderService.listEnabledLoginProviders.mockResolvedValue([
            {
                id: '91000000-0000-4000-8000-000000000001',
                provider: 'feishu',
                tenantId: null,
                displayName: '飞书',
                loginScopes: ['openid']
            }
        ]);
        identityProviderService.authorizeExternalLogin.mockResolvedValue({
            authorizeUrl: 'https://accounts.feishu.cn/open-apis/authen/v1/authorize?state=test',
            stateExpiresAt: '2026-05-07T00:10:00.000Z'
        });

        await expect(controller.listEnabledLoginProviders()).resolves.toHaveLength(1);
        await expect(controller.authorizeExternalLogin('91000000-0000-4000-8000-000000000001')).resolves.toMatchObject({
            authorizeUrl: expect.stringContaining('accounts.feishu.cn')
        });
    });

    it('handles external login callback and exchanges the one-time ticket for a POMS JWT', async () => {
        identityProviderService.handleExternalLoginCallback.mockResolvedValue({
            ticket: 'ticket-value',
            expiresAt: '2026-05-07T00:02:00.000Z',
            provider: 'feishu',
            identityProviderConfigId: '91000000-0000-4000-8000-000000000001',
            pomsUserId: '00000000-0000-4000-8000-000000000001'
        });
        identityProviderService.consumeExternalLoginSession.mockResolvedValue({
            pomsUserId: '00000000-0000-4000-8000-000000000001',
            externalIdentityId: '92000000-0000-4000-8000-000000000001',
            identityProviderConfigId: '91000000-0000-4000-8000-000000000001'
        });
        platformService.resolveActiveAuthUser.mockResolvedValue({
            userId: '00000000-0000-4000-8000-000000000001',
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        await expect(controller.handleExternalLoginCallback({ code: 'auth-code', state: 'state' })).resolves.toMatchObject({ ticket: 'ticket-value' });
        await expect(controller.createExternalLoginSession({ ticket: 'ticket-value' })).resolves.toEqual({ accessToken: 'signed-token' });

        expect(identityProviderService.handleExternalLoginCallback).toHaveBeenCalledWith({
            code: 'auth-code',
            state: 'state',
            error: undefined,
            error_description: undefined
        });
        expect(identityProviderService.consumeExternalLoginSession).toHaveBeenCalledWith('ticket-value');
        expect(jwtService.sign).toHaveBeenCalledWith({
            sub: '00000000-0000-4000-8000-000000000001',
            username: 'admin',
            permissions: ['platform:users:manage']
        });
    });

    it('delegates current-user profile update to PlatformService using JWT subject', async () => {
        platformService.updateCurrentUserProfile.mockResolvedValue({
            id: '00000000-0000-4000-8000-000000000001',
            username: 'viewer',
            displayName: '新的查看者',
            roles: ['项目查看者'],
            permissions: ['project:read'],
            email: 'viewer.updated@example.com',
            avatarUrl: null,
            isActive: true,
            lastLoginAt: null,
            emailVerified: false,
            phoneVerified: false,
            phone: '13800138000',
            orgUnits: []
        });

        const result = await controller.updateProfile(
            {
                displayName: '新的查看者',
                email: 'viewer.updated@example.com',
                phone: '13800138000'
            },
            {
                user: {
                    sub: '00000000-0000-4000-8000-000000000001',
                    username: 'viewer',
                    permissions: ['project:read']
                }
            }
        );

        expect(platformService.updateCurrentUserProfile).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', {
            displayName: '新的查看者',
            email: 'viewer.updated@example.com',
            phone: '13800138000'
        });
        expect(result.displayName).toBe('新的查看者');
        expect(result.emailVerified).toBe(false);
    });
});
