import type { PermissionKey, UserPayload } from '@poms/shared-contracts';
import { Inject, CanActivate, ExecutionContext, ForbiddenException, HttpStatus, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RuntimeAuditService } from '../../runtime-audit/runtime-audit.service';
import { getRequestId, getRequestIp, getRequestMethod, getRequestPath, getRequestUserAgent, type RuntimeAuditRequestLike } from '../../runtime-audit/runtime-audit-request.utils';
import { IS_AUTHENTICATED_KEY } from '../decorators/authenticated.decorator';
import { ANY_PERMISSIONS_KEY } from '../decorators/has-any-permissions.decorator';
import { PERMISSIONS_KEY } from '../decorators/has-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    readonly #reflector: Reflector;
    readonly #runtimeAuditService: RuntimeAuditService;

    constructor(@Inject(Reflector) reflector: Reflector, @Inject(RuntimeAuditService) runtimeAuditService: RuntimeAuditService) {
        this.#reflector = reflector;
        this.#runtimeAuditService = runtimeAuditService;
    }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const isPublic = this.#reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic) return true;

        const isAuthenticated = this.#reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED_KEY, [context.getHandler(), context.getClass()]);

        const requiredPermissions = this.#reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
        const requiredAnyPermissions = this.#reflector.getAllAndOverride<PermissionKey[]>(ANY_PERMISSIONS_KEY, [context.getHandler(), context.getClass()]) ?? [];
        const hasPermissionRequirement = requiredPermissions.length > 0 || requiredAnyPermissions.length > 0;

        // 默认拒绝策略：非 @Public() 的路由必须显式声明 @Authenticated() 或 @HasPermissions()
        if (!isAuthenticated && !hasPermissionRequirement) {
            throw new ForbiddenException('Route must be decorated with @Authenticated() or @HasPermissions()');
        }

        // 仅需登录，无需特定权限
        if (isAuthenticated && !hasPermissionRequirement) {
            return true;
        }

        const request = context.switchToHttp().getRequest<RuntimeAuditRequestLike & { user?: UserPayload }>();
        const userPermissions = request.user?.permissions ?? [];

        const hasAll = requiredPermissions.length === 0 || requiredPermissions.every((p) => userPermissions.includes(p));
        const hasAny = requiredAnyPermissions.length === 0 || requiredAnyPermissions.some((p) => userPermissions.includes(p));
        if (hasAll && hasAny) return true;

        await this.#runtimeAuditService.recordSecurityEvent({
            eventType: 'authz.permission.denied',
            severity: 'warning',
            actorId: request.user?.sub ?? null,
            principal: request.user?.username ?? null,
            requestId: getRequestId(request),
            path: getRequestPath(request),
            method: getRequestMethod(request),
            permissionKey: requiredPermissions[0] ?? requiredAnyPermissions[0] ?? null,
            result: 'blocked',
            ip: getRequestIp(request),
            userAgent: getRequestUserAgent(request),
            details: requiredAnyPermissions.length
                ? {
                      requiredPermissions,
                      requiredAnyPermissions,
                      userPermissions
                  }
                : {
                      requiredPermissions,
                      userPermissions
                  }
        });
        throw new ForbiddenException({
            statusCode: HttpStatus.FORBIDDEN,
            code: 'permission_denied',
            message: 'Insufficient permissions'
        });
    }
}
