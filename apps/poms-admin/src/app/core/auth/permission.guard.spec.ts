import { HttpClient } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import type { PermissionKey } from '@poms/shared-contracts';
import { AuthStore } from '@poms/admin-data-access';
import type { SanitizedUserWithOrgUnits } from '@poms/shared-contracts';
import { of } from 'rxjs';
import { permissionGuard } from './permission.guard';

function createUser(permissions: PermissionKey[]): SanitizedUserWithOrgUnits {
    return {
        id: '00000000-0000-4000-8000-000000000001',
        username: 'viewer',
        displayName: 'Viewer',
        roles: ['只读角色'],
        permissions,
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

describe('permissionGuard', () => {
    let currentUser: ReturnType<typeof signal<SanitizedUserWithOrgUnits | null>>;
    let initialize: jest.Mock<Promise<void>, []>;
    let authStoreMock: Pick<AuthStore, 'currentUser' | 'isAuthenticated' | 'initialize' | 'hasAnyPermission'>;
    let httpClientMock: { post: jest.Mock };
    let router: Router;

    async function runGuard(
        requiredPermissions: PermissionKey[],
        url = '/platform/users',
        requiredPermissionsMode: 'any' | 'all' = 'any'
    ): Promise<boolean | UrlTree> {
        return TestBed.runInInjectionContext(() =>
            permissionGuard(
                { data: { requiredPermissions, requiredPermissionsMode } } as never,
                { url } as never
            )
        );
    }

    beforeEach(() => {
        currentUser = signal<SanitizedUserWithOrgUnits | null>(null);
        initialize = jest.fn(async () => undefined);
        authStoreMock = {
            currentUser,
            isAuthenticated: computed(() => currentUser() !== null),
            initialize,
            hasAnyPermission: (requiredPermissions: readonly PermissionKey[]) => {
                const permissions = currentUser()?.permissions ?? [];
                return requiredPermissions.some((permission) => permissions.includes(permission));
            }
        };
        httpClientMock = {
            post: jest.fn(() => of(null))
        };

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                },
                {
                    provide: HttpClient,
                    useValue: httpClientMock
                }
            ]
        });

        router = TestBed.inject(Router);
    });

    it('redirects unauthenticated users to the login page', async () => {
        const result = await runGuard(['platform:users:manage']);

        expect(result instanceof UrlTree).toBe(true);
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Fplatform%2Fusers');
        expect(initialize).toHaveBeenCalledTimes(1);
        expect(httpClientMock.post).not.toHaveBeenCalled();
    });

    it('allows access when the current user has the required permission', async () => {
        currentUser.set(createUser(['platform:users:manage']));

        const result = await runGuard(['platform:users:manage']);

        expect(result).toBe(true);
        expect(initialize).not.toHaveBeenCalled();
    });

    it('redirects authenticated users without the required permission to the access page', async () => {
        currentUser.set(createUser(['project:read']));

        const result = await runGuard(['platform:users:manage']);

        expect(result instanceof UrlTree).toBe(true);
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/access?returnUrl=%2Fplatform%2Fusers');
        expect(httpClientMock.post).toHaveBeenCalledWith('/api/security-events:recordRouteDenied', {
            path: '/platform/users',
            returnUrl: '/platform/users',
            requiredPermissions: ['platform:users:manage']
        });
    });

    it('reloads auth context before permission checks when local user state is empty', async () => {
        initialize.mockImplementation(async () => {
            currentUser.set(createUser(['platform:roles:manage']));
        });

        const result = await runGuard(['platform:roles:manage'], '/platform/roles');

        expect(result).toBe(true);
        expect(initialize).toHaveBeenCalledTimes(1);
    });

    it('requires every declared permission when the route uses all mode', async () => {
        currentUser.set(createUser(['project:read']));

        const result = await runGuard(['project:read', 'contract:finance:manage'], '/projects/1/workspace/operating-overview', 'all');

        expect(result instanceof UrlTree).toBe(true);
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/access?returnUrl=%2Fprojects%2F1%2Fworkspace%2Foperating-overview');
    });
});
