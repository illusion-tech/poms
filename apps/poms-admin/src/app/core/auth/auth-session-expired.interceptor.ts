import { Location } from '@angular/common';
import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access/lib/auth/auth.store';
import { catchError, throwError } from 'rxjs';
import { sanitizeAuthReturnUrl } from './auth-return-url';
import { readAuthSessionExpiredReason } from './auth-session-expired';

export const authSessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
    const router = inject(Router);
    const location = inject(Location);
    const authStore = inject(AuthStore);

    return next(request).pipe(
        catchError((error: unknown) => {
            const reason = readAuthSessionExpiredReason(error);
            if (reason !== null && error instanceof HttpErrorResponse) {
                authStore.clearSessionState();
                // Before the first navigation finishes Router.url is still
                // '/'. Preserve the browser's requested local path instead.
                const currentUrl = sanitizeAuthReturnUrl(router.navigated ? router.url : location.path(true));
                if (!currentUrl.startsWith('/auth/')) {
                    void router.navigate(['/auth/login'], {
                        queryParams: {
                            returnUrl: currentUrl,
                            reason
                        },
                        replaceUrl: true
                    });
                }
            }

            return throwError(() => error);
        })
    );
};
