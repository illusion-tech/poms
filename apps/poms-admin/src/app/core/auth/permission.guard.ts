import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { PermissionKey } from '@poms/shared-contracts';
import { AuthStore } from '@poms/admin-data-access/lib/auth/auth.store';
import { type CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

type RequiredPermissionsMode = 'any' | 'all';

function readRequiredPermissions(raw: unknown): PermissionKey[] {
    if (!Array.isArray(raw)) return [];
    return raw as PermissionKey[];
}

function readRequiredPermissionsMode(raw: unknown): RequiredPermissionsMode {
    return raw === 'all' ? 'all' : 'any';
}

function hasRequiredPermissions(
    currentPermissions: readonly PermissionKey[],
    requiredPermissions: readonly PermissionKey[],
    mode: RequiredPermissionsMode
): boolean {
    if (requiredPermissions.length === 0) {
        return true;
    }

    if (mode === 'all') {
        return requiredPermissions.every((permission) => currentPermissions.includes(permission));
    }

    return requiredPermissions.some((permission) => currentPermissions.includes(permission));
}

export const permissionGuard: CanActivateFn = async (route, state) => {
    const authStore = inject(AuthStore);
    const http = inject(HttpClient);
    const router = inject(Router);
    const requiredPermissions = readRequiredPermissions(route.data?.['requiredPermissions']);
    const permissionMode = readRequiredPermissionsMode(route.data?.['requiredPermissionsMode']);

    if (requiredPermissions.length === 0) return true;

    if (!authStore.currentUser()) {
        await authStore.initialize();
    }

    if (!authStore.isAuthenticated()) {
        return router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
        });
    }

    const currentPermissions = authStore.currentUser()?.permissions ?? [];

    if (hasRequiredPermissions(currentPermissions, requiredPermissions, permissionMode)) {
        return true;
    }

    void firstValueFrom(
        http
            .post('/api/security-events:recordRouteDenied', {
                path: state.url,
                returnUrl: state.url,
                requiredPermissions
            })
            .pipe(catchError(() => of(null)))
    );

    return router.createUrlTree(['/auth/access'], {
        queryParams: { returnUrl: state.url }
    });
};
