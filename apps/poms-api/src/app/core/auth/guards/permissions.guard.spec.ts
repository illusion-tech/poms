import { ForbiddenException, type ExecutionContext, type Type } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ANY_PERMISSIONS_KEY } from '../decorators/has-any-permissions.decorator';
import { PERMISSIONS_KEY } from '../decorators/has-permissions.decorator';
import { PermissionsGuard } from './permissions.guard';

describe('PermissionsGuard', () => {
    let guard: PermissionsGuard;
    let runtimeAuditService: {
        recordSecurityEvent: jest.Mock;
    };

    beforeEach(() => {
        runtimeAuditService = {
            recordSecurityEvent: jest.fn().mockResolvedValue(undefined)
        };
        guard = new PermissionsGuard(new Reflector(), runtimeAuditService as never);
    });

    it('records a security event when required permissions are missing', async () => {
        const handler = () => undefined;
        const controllerClass = class TestController {};
        Reflect.defineMetadata(PERMISSIONS_KEY, ['platform:roles:manage'], handler);

        await expect(
            guard.canActivate(
                createContext(handler, controllerClass, {
                    method: 'GET',
                    originalUrl: '/platform/roles',
                    ip: '127.0.0.1',
                    headers: {
                        'user-agent': 'jest',
                        'x-request-id': 'req-permission-denied'
                    },
                    user: {
                        sub: '00000000-0000-4000-8000-000000000001',
                        username: 'viewer',
                        permissions: ['project:read']
                    }
                })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'authz.permission.denied',
                actorId: '00000000-0000-4000-8000-000000000001',
                principal: 'viewer',
                requestId: 'req-permission-denied',
                path: '/platform/roles',
                method: 'GET',
                permissionKey: 'platform:roles:manage',
                result: 'blocked',
                details: {
                    requiredPermissions: ['platform:roles:manage'],
                    userPermissions: ['project:read']
                }
            })
        );
    });

    it('allows the request when the user has every required permission', async () => {
        const handler = () => undefined;
        const controllerClass = class TestController {};
        Reflect.defineMetadata(PERMISSIONS_KEY, ['platform:roles:manage'], handler);

        const allowed = await guard.canActivate(
            createContext(handler, controllerClass, {
                method: 'GET',
                originalUrl: '/platform/roles',
                headers: {},
                user: {
                    sub: '00000000-0000-4000-8000-000000000001',
                    username: 'admin',
                    permissions: ['platform:roles:manage']
                }
            })
        );

        expect(allowed).toBe(true);
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('allows the request when the user has one accepted permission', async () => {
        const handler = () => undefined;
        const controllerClass = class TestController {};
        Reflect.defineMetadata(ANY_PERMISSIONS_KEY, ['lead:write', 'project:write'], handler);

        const allowed = await guard.canActivate(
            createContext(handler, controllerClass, {
                method: 'GET',
                originalUrl: '/platform/owner-reference',
                headers: {},
                user: {
                    sub: '00000000-0000-4000-8000-000000000001',
                    username: 'sales',
                    permissions: ['lead:write']
                }
            })
        );

        expect(allowed).toBe(true);
        expect(runtimeAuditService.recordSecurityEvent).not.toHaveBeenCalled();
    });

    it('records a security event when none of the accepted permissions are present', async () => {
        const handler = () => undefined;
        const controllerClass = class TestController {};
        Reflect.defineMetadata(ANY_PERMISSIONS_KEY, ['lead:write', 'project:write'], handler);

        await expect(
            guard.canActivate(
                createContext(handler, controllerClass, {
                    method: 'GET',
                    originalUrl: '/platform/owner-reference',
                    headers: {},
                    user: {
                        sub: '00000000-0000-4000-8000-000000000001',
                        username: 'viewer',
                        permissions: ['project:read']
                    }
                })
            )
        ).rejects.toThrow(ForbiddenException);

        expect(runtimeAuditService.recordSecurityEvent).toHaveBeenCalledWith(
            expect.objectContaining({
                permissionKey: 'lead:write',
                details: {
                    requiredPermissions: [],
                    requiredAnyPermissions: ['lead:write', 'project:write'],
                    userPermissions: ['project:read']
                }
            })
        );
    });
});

function createContext(handler: (...args: never[]) => unknown, controllerClass: Type<unknown>, request: object): ExecutionContext {
    return {
        getHandler: () => handler,
        getClass: () => controllerClass,
        switchToHttp: () => ({
            getRequest: () => request
        })
    } as ExecutionContext;
}
