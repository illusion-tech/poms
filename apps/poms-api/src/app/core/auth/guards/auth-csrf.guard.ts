import type { UserPayload } from '@poms/shared-contracts';
import { CanActivate, ExecutionContext, ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RuntimeAuditService } from '../../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../../runtime-audit/runtime-audit-request.utils';
import type { AuthSession } from '../auth-session.entity';
import { AuthSessionCookieService } from '../auth-session-cookie.service';
import { AuthSessionService } from '../auth-session.service';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

const UNSAFE_METHODS = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

type CsrfGuardRequest = RuntimeAuditRequestLike & {
    authSession?: AuthSession;
    user?: UserPayload;
};

type CsrfFailureReason = 'missing_header' | 'missing_cookie' | 'mismatch' | 'session_not_resolved' | 'invalid_token';

@Injectable()
export class AuthCsrfGuard implements CanActivate {
    constructor(
        private readonly reflector: Reflector,
        private readonly authSessionService: AuthSessionService,
        private readonly authSessionCookieService: AuthSessionCookieService,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest<CsrfGuardRequest>();
        const method = (getRequestMethod(request) ?? '').toUpperCase();
        if (!UNSAFE_METHODS.has(method)) {
            return true;
        }

        const headerToken = this.#getCsrfHeaderValue(request);
        const cookieToken = this.authSessionCookieService.getCsrfTokenFromCookieHeader(request.headers?.['cookie']);
        const baseFailure = this.#validateDoubleSubmit(headerToken, cookieToken);
        if (baseFailure) {
            await this.#reject(baseFailure, request);
        }
        const csrfToken = headerToken as string;

        const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic) {
            return true;
        }

        const session = request.authSession;
        if (!session) {
            await this.#reject('session_not_resolved', request);
        }
        const resolvedSession = session as AuthSession;

        if (!this.authSessionService.verifyCsrfToken(resolvedSession, csrfToken)) {
            await this.#reject('invalid_token', request);
        }

        return true;
    }

    #validateDoubleSubmit(headerToken: string | null, cookieToken: string | null): CsrfFailureReason | null {
        if (!headerToken) {
            return 'missing_header';
        }

        if (!cookieToken) {
            return 'missing_cookie';
        }

        return headerToken === cookieToken ? null : 'mismatch';
    }

    #getCsrfHeaderValue(request: CsrfGuardRequest): string | null {
        const targetHeader = this.authSessionCookieService.csrfHeaderName.toLowerCase();
        const value = Object.entries(request.headers ?? {}).find(([name]) => name.toLowerCase() === targetHeader)?.[1];
        const rawValue = Array.isArray(value) ? value[0] : value;
        return typeof rawValue === 'string' && rawValue.trim() ? rawValue.trim() : null;
    }

    async #reject(reason: CsrfFailureReason, request: CsrfGuardRequest): Promise<never> {
        await this.runtimeAuditService.recordSecurityEvent({
            eventType: 'auth.csrf.failed',
            severity: 'warning',
            actorId: request.user?.sub ?? null,
            principal: request.user?.username ?? null,
            requestId: getRequestId(request),
            path: getRequestPath(request),
            method: getRequestMethod(request),
            result: 'blocked',
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            details: {
                reason
            }
        });
        throw new ForbiddenException({
            statusCode: HttpStatus.FORBIDDEN,
            code: 'csrf_failed',
            message: 'CSRF token validation failed'
        });
    }
}
