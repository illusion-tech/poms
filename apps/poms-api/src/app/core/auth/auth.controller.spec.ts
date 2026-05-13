import { UnauthorizedException } from '@nestjs/common';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
    let controller: AuthController;
    let platformService: {
        verifyCredentials: jest.Mock;
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
    let authSessionService: {
        createSession: jest.Mock;
        resolveSessionToken: jest.Mock;
        revokeSessionToken: jest.Mock;
    };
    let authSessionCookieService: {
        createSessionCookieHeader: jest.Mock;
        createCsrfCookieHeader: jest.Mock;
        createClearSessionCookieHeader: jest.Mock;
        createClearCsrfCookieHeader: jest.Mock;
        getSessionTokenFromCookieHeader: jest.Mock;
        csrfCookieName: string;
        csrfHeaderName: string;
    };

    beforeEach(() => {
        platformService = {
            verifyCredentials: jest.fn(),
            getSanitizedUserProfile: jest.fn().mockResolvedValue(userProfile()),
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
        authSessionService = {
            createSession: jest.fn().mockResolvedValue(createdSession()),
            resolveSessionToken: jest.fn(),
            revokeSessionToken: jest.fn()
        };
        authSessionCookieService = {
            createSessionCookieHeader: jest.fn().mockReturnValue('poms_session=session-token; HttpOnly'),
            createCsrfCookieHeader: jest.fn().mockReturnValue('poms_csrf=csrf-token'),
            createClearSessionCookieHeader: jest.fn().mockReturnValue('poms_session=; Max-Age=0; HttpOnly'),
            createClearCsrfCookieHeader: jest.fn().mockReturnValue('poms_csrf=; Max-Age=0'),
            getSessionTokenFromCookieHeader: jest.fn(),
            csrfCookieName: 'poms_csrf',
            csrfHeaderName: 'X-CSRF-Token'
        };

        controller = new AuthController(platformService as never, runtimeAuditService as never, identityProviderService as never, authSessionService as never, authSessionCookieService as never);
    });

    it('records a security event when password session creation fails', async () => {
        platformService.verifyCredentials.mockResolvedValue(null);

        await expect(
            controller.createPasswordAuthSession(
                { username: 'admin', password: 'wrong-password' },
                {
                    method: 'POST',
                    originalUrl: '/auth/sessions',
                    ip: '127.0.0.1',
                    headers: {
                        'user-agent': 'jest',
                        'x-request-id': 'req-login-failed'
                    }
                },
                responseMock()
            )
        ).rejects.toThrow(UnauthorizedException);

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'auth.login.failed',
                principal: 'admin',
                requestId: 'req-login-failed',
                path: '/auth/sessions',
                method: 'POST',
                result: 'failed',
                details: { reason: 'invalid_credentials' }
            })
        );
    });

    it('creates a password auth session and sets session cookies', async () => {
        platformService.verifyCredentials.mockResolvedValue({
            userId: '00000000-0000-4000-8000-000000000001',
            username: 'admin',
            permissions: ['platform:users:manage']
        });
        const response = responseMock();

        const result = await controller.createPasswordAuthSession(
            { username: 'admin', password: 'correct-password' },
            {
                method: 'POST',
                originalUrl: '/auth/sessions',
                headers: {}
            },
            response
        );

        expect(result).toMatchObject({
            authenticated: true,
            status: 'active',
            user: expect.objectContaining({ username: 'admin' }),
            permissions: ['platform:users:manage'],
            csrf: {
                cookieName: 'poms_csrf',
                headerName: 'X-CSRF-Token'
            }
        });
        expect(authSessionService.createSession).toHaveBeenCalledWith('00000000-0000-4000-8000-000000000001', {
            ip: null,
            userAgent: null
        });
        expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', ['poms_session=session-token; HttpOnly', 'poms_csrf=csrf-token']);
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('returns unauthenticated current session when cookie is missing', async () => {
        authSessionCookieService.getSessionTokenFromCookieHeader.mockReturnValue(null);

        await expect(controller.getCurrentAuthSession({ headers: {} }, responseMock())).resolves.toEqual({
            authenticated: false,
            status: null,
            user: null,
            permissions: [],
            expiresAt: null,
            csrf: {
                cookieName: 'poms_csrf',
                headerName: 'X-CSRF-Token'
            }
        });
    });

    it('resolves the current session from cookie', async () => {
        authSessionCookieService.getSessionTokenFromCookieHeader.mockReturnValue('raw-session-token');
        authSessionService.resolveSessionToken.mockResolvedValue({
            session: createdSession().session,
            user: {
                sub: '00000000-0000-4000-8000-000000000001',
                username: 'admin',
                permissions: ['platform:users:manage']
            }
        });

        const result = await controller.getCurrentAuthSession(
            {
                headers: {
                    cookie: 'poms_session=raw-session-token'
                }
            },
            responseMock()
        );

        expect(authSessionService.resolveSessionToken).toHaveBeenCalledWith('raw-session-token', {
            ip: null,
            userAgent: null
        });
        expect(result.authenticated).toBe(true);
        expect(result.expiresAt).toBe('2026-05-13T01:15:00.000Z');
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

    it('handles external login callback and exchanges the one-time ticket for a session cookie', async () => {
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
        const response = responseMock();

        await expect(controller.handleExternalLoginCallback({ code: 'auth-code', state: 'state' })).resolves.toMatchObject({ ticket: 'ticket-value' });
        await expect(controller.createExternalLoginSession({ ticket: 'ticket-value' }, { headers: {} }, response)).resolves.toMatchObject({
            authenticated: true,
            user: expect.objectContaining({ username: 'admin' })
        });

        expect(identityProviderService.handleExternalLoginCallback).toHaveBeenCalledWith({
            code: 'auth-code',
            state: 'state',
            error: undefined,
            error_description: undefined
        });
        expect(identityProviderService.consumeExternalLoginSession).toHaveBeenCalledWith('ticket-value');
        expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', ['poms_session=session-token; HttpOnly', 'poms_csrf=csrf-token']);
    });

    it('logs out current auth session and clears cookies', async () => {
        authSessionCookieService.getSessionTokenFromCookieHeader.mockReturnValue('raw-session-token');
        authSessionService.revokeSessionToken.mockResolvedValue(true);
        const response = responseMock();

        await expect(
            controller.logoutCurrentAuthSession(
                {},
                {
                    headers: {
                        cookie: 'poms_session=raw-session-token'
                    }
                },
                response
            )
        ).resolves.toEqual({
            authenticated: false,
            resultStatus: 'logged-out',
            revoked: true
        });

        expect(authSessionService.revokeSessionToken).toHaveBeenCalledWith('raw-session-token');
        expect(response.setHeader).toHaveBeenCalledWith('Set-Cookie', ['poms_session=; Max-Age=0; HttpOnly', 'poms_csrf=; Max-Age=0']);
    });

    it('delegates current-user profile update to PlatformService using session subject', async () => {
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

function createdSession() {
    return {
        session: {
            id: 'session-id',
            userId: '00000000-0000-4000-8000-000000000001',
            idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
            absoluteExpiresAt: new Date('2026-05-13T08:00:00.000Z')
        },
        sessionToken: 'raw-session-token',
        csrfToken: 'raw-csrf-token'
    };
}

function userProfile() {
    return {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'admin',
        displayName: '平台管理员',
        roles: ['平台管理员'],
        permissions: ['platform:users:manage'],
        email: null,
        avatarUrl: null,
        isActive: true,
        lastLoginAt: null,
        emailVerified: false,
        phoneVerified: false,
        phone: null,
        orgUnits: []
    };
}

function responseMock(): { setHeader: jest.Mock } {
    return {
        setHeader: jest.fn()
    };
}
