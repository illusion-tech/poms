import { HttpClient } from '@angular/common/http';
import { inject } from '@angular/core';
import type { PermissionKey } from '@poms/shared-contracts';
import { AuthStore } from '@poms/admin-data-access';
import { type CanActivateFn, Router } from '@angular/router';
import { catchError, firstValueFrom, of } from 'rxjs';

function readRequiredPermissions(raw: unknown): PermissionKey[] {
    if (!Array.isArray(raw)) return [];
    return raw as PermissionKey[];
}

export const permissionGuard: CanActivateFn = async (route, state) => {
    const authStore = inject(AuthStore);
    const http = inject(HttpClient);
    const router = inject(Router);
    const requiredPermissions = readRequiredPermissions(route.data?.['requiredPermissions']);

    if (requiredPermissions.length === 0) return true;

    if (!authStore.isAuthenticated()) {
        return router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
        });
    }

    if (!authStore.currentUser()) {
        await authStore.initialize();
    }

    if (!authStore.isAuthenticated()) {
        return router.createUrlTree(['/auth/login'], {
            queryParams: { returnUrl: state.url }
        });
    }

    if (authStore.hasAnyPermission(requiredPermissions)) {
        return true;
    }

    void firstValueFrom(
        http
            .post('/api/security-events/route-denied', {
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
