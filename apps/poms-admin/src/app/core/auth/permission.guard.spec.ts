import { computed, signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router, UrlTree } from '@angular/router';
import type { PermissionKey } from '@poms/shared-contracts';
import { AuthStore } from '@poms/admin-data-access';
import type { SanitizedUserWithOrgUnits } from '@poms/shared-api-client';
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
    let token: ReturnType<typeof signal<string | null>>;
    let initialize: jest.Mock<Promise<void>, []>;
    let authStoreMock: Pick<AuthStore, 'currentUser' | 'isAuthenticated' | 'initialize' | 'hasAnyPermission'>;
    let router: Router;

    async function runGuard(requiredPermissions: PermissionKey[], url = '/platform/users'): Promise<boolean | UrlTree> {
        return TestBed.runInInjectionContext(() =>
            permissionGuard(
                { data: { requiredPermissions } } as never,
                { url } as never
            )
        );
    }

    beforeEach(() => {
        currentUser = signal<SanitizedUserWithOrgUnits | null>(null);
        token = signal<string | null>(null);
        initialize = jest.fn(async () => undefined);
        authStoreMock = {
            currentUser,
            isAuthenticated: computed(() => token() !== null),
            initialize,
            hasAnyPermission: (requiredPermissions: readonly PermissionKey[]) => {
                const permissions = currentUser()?.permissions ?? [];
                return requiredPermissions.some((permission) => permissions.includes(permission));
            }
        };

        TestBed.configureTestingModule({
            providers: [
                provideRouter([]),
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                }
            ]
        });

        router = TestBed.inject(Router);
    });

    it('redirects unauthenticated users to the login page', async () => {
        const result = await runGuard(['platform:users:manage']);

        expect(result instanceof UrlTree).toBe(true);
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/login?returnUrl=%2Fplatform%2Fusers');
        expect(initialize).not.toHaveBeenCalled();
    });

    it('allows access when the current user has the required permission', async () => {
        token.set('jwt-token');
        currentUser.set(createUser(['platform:users:manage']));

        const result = await runGuard(['platform:users:manage']);

        expect(result).toBe(true);
        expect(initialize).not.toHaveBeenCalled();
    });

    it('redirects authenticated users without the required permission to the access page', async () => {
        token.set('jwt-token');
        currentUser.set(createUser(['project:read']));

        const result = await runGuard(['platform:users:manage']);

        expect(result instanceof UrlTree).toBe(true);
        expect(router.serializeUrl(result as UrlTree)).toBe('/auth/access?returnUrl=%2Fplatform%2Fusers');
    });

    it('reloads auth context before permission checks when only a token is present', async () => {
        token.set('jwt-token');
        initialize.mockImplementation(async () => {
            currentUser.set(createUser(['platform:roles:manage']));
        });

        const result = await runGuard(['platform:roles:manage'], '/platform/roles');

        expect(result).toBe(true);
        expect(initialize).toHaveBeenCalledTimes(1);
    });
});
