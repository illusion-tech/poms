import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { PomsCsrfTokenStore } from './poms-csrf-token.store';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const CSRF_COOKIE_NAME = 'poms_csrf';
const CSRF_HEADER_NAME = 'X-CSRF-Token';

export const pomsCsrfInterceptor: HttpInterceptorFn = (request, next) => {
    if (SAFE_METHODS.has(request.method.toUpperCase()) || request.headers.has(CSRF_HEADER_NAME)) {
        return next(request);
    }

    const csrfToken = inject(PomsCsrfTokenStore).token ?? readCookie(CSRF_COOKIE_NAME);
    if (!csrfToken) {
        return next(request);
    }

    return next(
        request.clone({
            setHeaders: {
                [CSRF_HEADER_NAME]: csrfToken
            }
        })
    );
};

function readCookie(name: string): string | null {
    if (typeof document === 'undefined') {
        return null;
    }

    const prefix = `${name}=`;
    const pair = document.cookie
        .split(';')
        .map((part) => part.trim())
        .find((part) => part.startsWith(prefix));
    if (!pair) {
        return null;
    }

    return decodeURIComponent(pair.slice(prefix.length));
}
