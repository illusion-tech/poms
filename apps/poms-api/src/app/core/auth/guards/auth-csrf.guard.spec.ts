import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { AuthSessionCookieService } from '../auth-session-cookie.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { AuthCsrfGuard } from './auth-csrf.guard';

describe('AuthCsrfGuard', () => {
    let authSessionService: {
        verifyCsrfToken: jest.Mock;
    };
    let runtimeAuditService: {
        recordSecurityEvent: jest.Mock;
    };
    let reflector: {
        getAllAndOverride: jest.Mock;
    };
    let guard: AuthCsrfGuard;

    beforeEach(() => {
        authSessionService = {
            verifyCsrfToken: jest.fn().mockReturnValue(true)
        };
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };
        reflector = {
            getAllAndOverride: jest.fn().mockReturnValue(false)
        };
        guard = new AuthCsrfGuard(reflector as never, authSessionService as never, new AuthSessionCookieService(), runtimeAuditService as never);
    });

    it('allows safe methods without a CSRF token', async () => {
        await expect(guard.canActivate(createContext({ method: 'GET', headers: {} }))).resolves.toBe(true);

        expect(authSessionService.verifyCsrfToken).not.toHaveBeenCalled();
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('allows public unsafe requests with matching double-submit tokens', async () => {
        reflector.getAllAndOverride.mockImplementation((key: string) => key === IS_PUBLIC_KEY);

        await expect(
            guard.canActivate(
                createContext({
                    method: 'POST',
                    originalUrl: '/auth/sessions',
                    headers: {
                        cookie: 'poms_csrf=csrf-token',
                        'x-csrf-token': 'csrf-token'
                    }
                })
            )
        ).resolves.toBe(true);

        expect(authSessionService.verifyCsrfToken).not.toHaveBeenCalled();
    });

    it('allows protected unsafe requests when the token matches the current session hash', async () => {
        const session = { id: 'session-1' };
        await expect(
            guard.canActivate(
                createContext({
                    method: 'PATCH',
                    originalUrl: '/auth/profile',
                    headers: {
                        cookie: 'poms_csrf=csrf-token',
                        'x-csrf-token': 'csrf-token'
                    },
                    authSession: session,
                    user: {
                        sub: '00000000-0000-4000-8000-000000000001',
                        username: 'admin'
                    }
                })
            )
        ).resolves.toBe(true);

        expect(authSessionService.verifyCsrfToken).toHaveBeenCalledWith(session, 'csrf-token');
    });

    it('rejects missing CSRF headers with a structured error and security event', async () => {
        const request = {
            method: 'POST',
            originalUrl: '/customers',
            ip: '127.0.0.1',
            headers: {
                cookie: 'poms_csrf=csrf-token',
                'user-agent': 'jest',
                'x-request-id': 'req-csrf-missing'
            },
            authSession: { id: 'session-1' },
            user: {
                sub: '00000000-0000-4000-8000-000000000001',
                username: 'admin'
            }
        };

        await expect(guard.canActivate(createContext(request))).rejects.toMatchObject<ForbiddenException>({
            response: {
                code: 'csrf_failed',
                message: 'CSRF token validation failed'
            }
        });

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'auth.csrf.failed',
                actorId: '00000000-0000-4000-8000-000000000001',
                principal: 'admin',
                requestId: 'req-csrf-missing',
                path: '/customers',
                method: 'POST',
                result: 'blocked',
                details: {
                    reason: 'missing_header'
                }
            })
        );
    });

    it('rejects mismatched double-submit tokens before session hash validation', async () => {
        await expect(
            guard.canActivate(
                createContext({
                    method: 'DELETE',
                    originalUrl: '/attachments/attachment-1/links/link-1',
                    headers: {
                        cookie: 'poms_csrf=cookie-token',
                        'x-csrf-token': 'header-token'
                    },
                    authSession: { id: 'session-1' }
                })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(authSessionService.verifyCsrfToken).not.toHaveBeenCalled();
        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                details: {
                    reason: 'mismatch'
                }
            })
        );
    });

    it('rejects session-bound CSRF token hash mismatch', async () => {
        authSessionService.verifyCsrfToken.mockReturnValue(false);

        await expect(
            guard.canActivate(
                createContext({
                    method: 'PUT',
                    originalUrl: '/platform/users/user-1/roles',
                    headers: {
                        cookie: 'poms_csrf=csrf-token',
                        'x-csrf-token': 'csrf-token'
                    },
                    authSession: { id: 'session-1' }
                })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                details: {
                    reason: 'invalid_token'
                }
            })
        );
    });
});

function createContext(request: object): ExecutionContext {
    return {
        getHandler: () => undefined,
        getClass: () => undefined,
        switchToHttp: () => ({
            getRequest: () => request
        })
    } as ExecutionContext;
}
