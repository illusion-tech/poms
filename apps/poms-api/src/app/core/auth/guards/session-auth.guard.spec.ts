import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { AuthSessionCookieService } from '../auth-session-cookie.service';
import { AuthSessionAuthenticationError, AuthSessionErrorCodeValue } from '../auth-session.service';
import { SessionAuthGuard } from './session-auth.guard';

describe('SessionAuthGuard', () => {
    let authSessionService: {
        resolveSessionToken: jest.Mock;
    };
    let runtimeAuditService: {
        recordSecurityEvent: jest.Mock;
    };
    let guard: SessionAuthGuard;

    beforeEach(() => {
        authSessionService = {
            resolveSessionToken: jest.fn()
        };
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };
        guard = new SessionAuthGuard(
            {
                getAllAndOverride: jest.fn().mockReturnValue(false)
            } as never,
            authSessionService as never,
            new AuthSessionCookieService(),
            runtimeAuditService as never
        );
    });

    it('resolves a session cookie and writes the current user to the request', async () => {
        const request = {
            method: 'GET',
            originalUrl: '/customers',
            ip: '127.0.0.1',
            headers: {
                cookie: 'poms_session=session-token',
                'user-agent': 'jest'
            }
        };
        authSessionService.resolveSessionToken.mockResolvedValue({
            session: { id: 'session-1' },
            user: {
                sub: '00000000-0000-4000-8000-000000000001',
                username: 'admin',
                permissions: ['customer:read']
            }
        });

        await expect(guard.canActivate(createContext(request))).resolves.toBe(true);

        expect(authSessionService.resolveSessionToken).toHaveBeenCalledWith('session-token', {
            ip: '127.0.0.1',
            userAgent: 'jest'
        });
        expect(request).toMatchObject({
            authSessionId: 'session-1',
            authSession: { id: 'session-1' },
            user: {
                username: 'admin',
                permissions: ['customer:read']
            }
        });
    });

    it('throws a structured unauthorized error when the session cookie is missing', async () => {
        await expect(guard.canActivate(createContext({ headers: {} }))).rejects.toMatchObject<UnauthorizedException>({
            response: {
                code: AuthSessionErrorCodeValue.SessionMissing,
                message: 'Authentication required'
            }
        });
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('records a security event when the session is expired', async () => {
        authSessionService.resolveSessionToken.mockRejectedValue(new AuthSessionAuthenticationError(AuthSessionErrorCodeValue.SessionExpired));
        const request = {
            method: 'GET',
            originalUrl: '/customers',
            ip: '127.0.0.1',
            headers: {
                cookie: 'poms_session=expired-token',
                'user-agent': 'jest',
                'x-request-id': 'req-session-expired'
            }
        };

        await expect(guard.canActivate(createContext(request))).rejects.toMatchObject<UnauthorizedException>({
            response: {
                code: AuthSessionErrorCodeValue.SessionExpired,
                message: 'Authentication required'
            }
        });

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'auth.session.invalid',
                requestId: 'req-session-expired',
                path: '/customers',
                method: 'GET',
                result: 'expired',
                details: {
                    reason: AuthSessionErrorCodeValue.SessionExpired
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
