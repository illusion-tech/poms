import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { POMS_AUTH_TOKEN_PROVIDER } from './poms-api.tokens';

export const pomsAuthInterceptor: HttpInterceptorFn = (req, next) => {
    const tokenProvider = inject(POMS_AUTH_TOKEN_PROVIDER, { optional: true });
    const token = tokenProvider?.();

    if (!token) {
        return next(req);
    }

    return next(
        req.clone({
            setHeaders: {
                Authorization: `Bearer ${token}`
            }
        })
    );
};

