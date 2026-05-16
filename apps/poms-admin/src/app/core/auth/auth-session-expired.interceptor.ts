import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access/lib/auth/auth.store';
import { catchError, throwError } from 'rxjs';
import { sanitizeAuthReturnUrl } from './auth-return-url';
import { readAuthSessionExpiredReason } from './auth-session-expired';

export const authSessionExpiredInterceptor: HttpInterceptorFn = (request, next) => {
    const router = inject(Router);
    const authStore = inject(AuthStore);

    return next(request).pipe(
        catchError((error: unknown) => {
            const reason = readAuthSessionExpiredReason(error);
            if (reason !== null && error instanceof HttpErrorResponse) {
                authStore.clearSessionState();
                const currentUrl = sanitizeAuthReturnUrl(router.url);
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
