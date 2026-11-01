// Test build entry only. The original production entry/config is unchanged.
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { bootstrapApplication } from '@angular/platform-browser';
import { Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { PomsCsrfTokenStore } from '@poms/admin-data-access/lib/poms-api/poms-csrf-token.store';
import { firstValueFrom } from 'rxjs';
import { appConfig } from '../../apps/poms-admin/src/app.config';
import { AppComponent } from '../../apps/poms-admin/src/app.component';
import { AUTH_SESSION_EXPIRED_REASON_VALUES } from '../../apps/poms-admin/src/app/core/auth/auth-session-expired';

const destinations = Object.freeze({ dashboard: '/dashboard', settings: '/platform/system-settings', users: '/platform/users', attachments: '/attachments' });
const safeCodes = new Set<string>([...AUTH_SESSION_EXPIRED_REASON_VALUES, 'csrf_failed']);
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

bootstrapApplication(AppComponent, appConfig)
    .then(async (application) => {
        if (!['localhost', '127.0.0.1', '[::1]'].includes(window.location.hostname) || window.location.port !== '10080') throw new Error('R2M loopback UI origin required');
        if (Object.hasOwn(window, '__pomsR2MAcceptance')) throw new Error('R2M bridge already exists');
        const http = application.injector.get(HttpClient);
        const auth = application.injector.get(AuthStore);
        const csrf = application.injector.get(PomsCsrfTokenStore);
        const router = application.injector.get(Router);
        const { ApprovalApi } = await import('../../libs/shared/api-client/api/approval.service');
        const approval = application.injector.get(ApprovalApi);
        const status = async (run: () => Promise<{ status: number }>) => {
            try { return { status: (await run()).status, code: null }; }
            catch (error: unknown) {
                if (!(error instanceof HttpErrorResponse)) return { status: 0, code: null };
                const code = (error.error as { code?: unknown } | null)?.code;
                return { status: error.status, code: typeof code === 'string' && safeCodes.has(code) ? code : null };
            }
        };
        const bridge = Object.freeze({
            version: 1 as const,
            snapshot: () => ({ authenticated: auth.isAuthenticated(), navigationCount: auth.navigationTree().length, todoCount: auth.myTodos().length, csrfInMemory: csrf.token !== null, permissions: [...(auth.currentUser()?.permissions ?? [])] }),
            wrongCsrfLogout: () => status(() => firstValueFrom(http.post('/api/auth/session:logout', {}, { observe: 'response', withCredentials: true, headers: { 'X-CSRF-Token': 'r2m-fixed-invalid-csrf' } }))),
            fixedLogout: () => status(() => firstValueFrom(http.post('/api/auth/session:logout', {}, { observe: 'response', withCredentials: true }))),
            fixedPlatformUsersRead: () => status(() => firstValueFrom(http.get('/api/platform/users', { observe: 'response', withCredentials: true }))),
            getApprovalRecord: (id: string) => { if (!uuid.test(id)) throw new Error('Canonical owned approval UUID required'); return firstValueFrom(approval.approvalControllerGetApprovalRecord({ id })); },
            approvalIdForTarget: (id: string) => { if (!uuid.test(id)) throw new Error('Canonical owned target UUID required'); const found = auth.myTodos().filter((todo) => todo.targetObjectId === id && todo.sourceType === 'approval-record' && ['open', 'processing'].includes(todo.status)); if (found.length !== 1) throw new Error('Exactly one actual target Todo required'); return found[0].sourceId; },
            navigate: (destination: keyof typeof destinations) => { if (!Object.hasOwn(destinations, destination)) throw new Error('Unknown fixed R2M destination'); return router.navigateByUrl(destinations[destination]); }
        });
        Object.defineProperty(window, '__pomsR2MAcceptance', { value: bridge, configurable: false, writable: false, enumerable: false });
    })
    .catch(() => console.error('R2M test application bootstrap failed'));

declare global {
    interface Window {
        readonly __pomsR2MAcceptance?: Readonly<{
            version: 1;
            snapshot(): { authenticated: boolean; navigationCount: number; todoCount: number; csrfInMemory: boolean; permissions: string[] };
            wrongCsrfLogout(): Promise<{ status: number; code: string | null }>;
            fixedLogout(): Promise<{ status: number; code: string | null }>;
            fixedPlatformUsersRead(): Promise<{ status: number; code: string | null }>;
            getApprovalRecord(id: string): Promise<unknown>;
            approvalIdForTarget(id: string): string;
            navigate(destination: keyof typeof destinations): Promise<boolean>;
        }>;
    }
}
