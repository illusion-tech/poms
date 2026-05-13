import type { UserPayload } from '@poms/shared-contracts';
import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RuntimeAuditService } from '../../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../../runtime-audit/runtime-audit-request.utils';
import { AuthSessionCookieService } from '../auth-session-cookie.service';
import { AuthSessionAuthenticationError, AuthSessionErrorCodeValue, AuthSessionService, type AuthSessionErrorCode } from '../auth-session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

type SessionAuthRequest = RuntimeAuditRequestLike & {
    user?: UserPayload;
    authSessionId?: string;
};

@Injectable()
export class SessionAuthGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authSessionService: AuthSessionService,
        private readonly authSessionCookieService: AuthSessionCookieService,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic) return true;

        const request = context.switchToHttp().getRequest<SessionAuthRequest>();
        const sessionToken = this.authSessionCookieService.getSessionTokenFromCookieHeader(request.headers?.['cookie']);
        if (!sessionToken) {
            throw createUnauthorized(AuthSessionErrorCodeValue.SessionMissing);
        }

        try {
            const resolved = await this.authSessionService.resolveSessionToken(sessionToken, {
                ip: getRequestIp(request),
                userAgent: getRequestUserAgent(request)
            });
            request.user = resolved.user;
            request.authSessionId = resolved.session.id;
            return true;
        } catch (error) {
            if (error instanceof AuthSessionAuthenticationError) {
                await this.#recordSessionFailure(error.code, request);
                throw createUnauthorized(error.code);
            }

            throw error;
        }
    }

    async #recordSessionFailure(code: AuthSessionErrorCode, request: RuntimeAuditRequestLike): Promise<void> {
        await this.runtimeAuditService.recordSecurityEvent({
            eventType: 'auth.session.invalid',
            severity: code === AuthSessionErrorCodeValue.AccountDisabled ? 'high' : 'warning',
            requestId: getRequestId(request),
            path: getRequestPath(request),
            method: getRequestMethod(request),
            result: code === AuthSessionErrorCodeValue.SessionExpired ? 'expired' : 'failed',
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            details: {
                reason: code
            }
        });
    }
}

function createUnauthorized(code: AuthSessionErrorCode): UnauthorizedException {
    return new UnauthorizedException({
        code,
        message: 'Authentication required'
    });
}
