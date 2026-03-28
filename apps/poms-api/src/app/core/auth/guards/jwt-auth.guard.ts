import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { RuntimeAuditService } from '../../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../../runtime-audit/runtime-audit-request.utils';

@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
    readonly #reflector: Reflector;
    readonly #runtimeAuditService: RuntimeAuditService;

    constructor(reflector: Reflector, runtimeAuditService: RuntimeAuditService) {
        super();
        this.#reflector = reflector;
        this.#runtimeAuditService = runtimeAuditService;
    }

    override canActivate(context: ExecutionContext) {
        const isPublic = this.#reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic) return true;
        return super.canActivate(context);
    }

    override handleRequest<TUser = unknown>(err: unknown, user: unknown, info: unknown, context: ExecutionContext): TUser {
        if (err || !user) {
            this.#recordTokenFailure(info, context);
            throw err ?? new UnauthorizedException('Authentication required');
        }
        return user as TUser;
    }

    #recordTokenFailure(info: unknown, context: ExecutionContext): void {
        const request = context.switchToHttp().getRequest<RuntimeAuditRequestLike & { headers?: Record<string, string | string[] | undefined> }>();
        const authorization = request.headers?.['authorization'];
        if (!authorization) {
            return;
        }

        const tokenFailure = getTokenFailureInfo(info);
        if (!tokenFailure) {
            return;
        }

        void this.#runtimeAuditService.recordSecurityEvent({
            eventType: 'auth.token.invalid',
            severity: 'warning',
            requestId: getRequestId(request),
            path: getRequestPath(request),
            method: getRequestMethod(request),
            result: tokenFailure.result,
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            details: {
                reason: tokenFailure.reason
            }
        });
    }
}

function getTokenFailureInfo(info: unknown): { reason: string; result: 'failed' | 'expired' } | null {
    if (!info || typeof info !== 'object') {
        return null;
    }

    const maybeError = info as { message?: string; name?: string };
    if (maybeError.name === 'TokenExpiredError') {
        return { reason: 'token_expired', result: 'expired' };
    }

    if (maybeError.name === 'JsonWebTokenError' || maybeError.name === 'NotBeforeError') {
        return {
            reason: maybeError.message ?? maybeError.name.toLowerCase(),
            result: 'failed'
        };
    }

    return null;
}
