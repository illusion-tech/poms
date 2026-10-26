// Deliberately absent from main.ts and the production build graph. This entry
// exercises the original injector/interceptors, never a mock HTTP backend.
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { PomsCsrfTokenStore } from '@poms/admin-data-access/lib/poms-api/poms-csrf-token.store';
import { firstValueFrom } from 'rxjs';
import { appConfig } from './app.config';
import { AppComponent } from './app.component';
import { AUTH_SESSION_EXPIRED_REASON_VALUES } from './app/core/auth/auth-session-expired';

const destinations = Object.freeze({ dashboard: '/dashboard', attachments: '/attachments', platformUsers: '/platform/users', externalOrgSync: '/platform/external-org-sync' });
const safeCodes = new Set<string>([...AUTH_SESSION_EXPIRED_REASON_VALUES, 'csrf_failed']);

bootstrapApplication(AppComponent, appConfig)
    .then((application) => {
        const http = application.injector.get(HttpClient);
        const auth = application.injector.get(AuthStore);
        const csrf = application.injector.get(PomsCsrfTokenStore);
        const router = application.injector.get(Router);
        const bridge = Object.freeze({
            snapshot: () => ({
                authenticated: auth.isAuthenticated(),
                username: auth.currentUser()?.username ?? null,
                permissions: [...(auth.currentUser()?.permissions ?? [])],
                navigationCount: auth.navigationTree().length,
                todoCount: auth.myTodos().length,
                csrfInMemory: csrf.token !== null
            }),
            async logout(variant: 'normal' | 'wrong-csrf' = 'normal') {
                if (variant !== 'normal' && variant !== 'wrong-csrf') throw new Error('Invalid fixed stage request');
                try {
                    const response = await firstValueFrom(
                        http.post<{ revoked?: boolean }>('/api/auth/session:logout', {}, { observe: 'response', withCredentials: true, ...(variant === 'wrong-csrf' ? { headers: { 'X-CSRF-Token': 'r1e-fixed-invalid-csrf' } } : {}) })
                    );
                    return { status: response.status, code: null, revoked: response.body?.revoked === true };
                } catch (error: unknown) {
                    if (!(error instanceof HttpErrorResponse)) return { status: 0, code: null, revoked: false };
                    const body = error.error as { code?: unknown } | null;
                    const code = typeof body?.code === 'string' && safeCodes.has(body.code) ? body.code : null;
                    return { status: error.status, code, revoked: false };
                }
            },
            navigate(destination: keyof typeof destinations) {
                if (!Object.hasOwn(destinations, destination)) throw new Error('Invalid fixed stage destination');
                return router.navigateByUrl(destinations[destination]);
            }
        });
        Object.defineProperty(globalThis, '__POMS_R1E_STAGE__', { value: bridge, writable: false, configurable: false });
    })
    .catch(() => console.error('R1E stage bootstrap failed'));
