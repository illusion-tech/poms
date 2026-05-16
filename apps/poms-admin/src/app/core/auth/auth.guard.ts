import { inject } from '@angular/core';
import { type CanActivateFn, Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access/lib/auth/auth.store';

export const authGuard: CanActivateFn = async (_, state) => {
    const authStore = inject(AuthStore);
    const router = inject(Router);
    if (!authStore.isAuthenticated()) {
        await authStore.initialize();
    }

    if (authStore.isAuthenticated()) return true;
    return router.createUrlTree(['/auth/login'], {
        queryParams: { returnUrl: state.url }
    });
};
