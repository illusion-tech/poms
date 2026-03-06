import type { PermissionKey, UserPayload } from '@poms/shared-contracts';
import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { IS_AUTHENTICATED_KEY } from '../decorators/authenticated.decorator';
import { PERMISSIONS_KEY } from '../decorators/has-permissions.decorator';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';

@Injectable()
export class PermissionsGuard implements CanActivate {
    readonly #reflector: Reflector;

    constructor(reflector: Reflector) {
        this.#reflector = reflector;
    }

    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.#reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [context.getHandler(), context.getClass()]);
        if (isPublic) return true;

        const isAuthenticated = this.#reflector.getAllAndOverride<boolean>(IS_AUTHENTICATED_KEY, [context.getHandler(), context.getClass()]);

        const requiredPermissions = this.#reflector.getAllAndOverride<PermissionKey[]>(PERMISSIONS_KEY, [context.getHandler(), context.getClass()]);

        // 默认拒绝策略：非 @Public() 的路由必须显式声明 @Authenticated() 或 @HasPermissions()
        if (!isAuthenticated && (!requiredPermissions || requiredPermissions.length === 0)) {
            throw new ForbiddenException('Route must be decorated with @Authenticated() or @HasPermissions()');
        }

        // 仅需登录，无需特定权限
        if (isAuthenticated && (!requiredPermissions || requiredPermissions.length === 0)) {
            return true;
        }

        const request = context.switchToHttp().getRequest<{ user?: UserPayload }>();
        const userPermissions = request.user?.permissions ?? [];

        const hasAll = requiredPermissions.every((p) => userPermissions.includes(p));
        if (hasAll) return true;

        throw new ForbiddenException('Insufficient permissions');
    }
}
