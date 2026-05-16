import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { authSessionExpiredInterceptor } from './auth-session-expired.interceptor';

describe('authSessionExpiredInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let routerMock: { url: string; navigate: jest.Mock };
    let authStoreMock: { clearSessionState: jest.Mock };

    beforeEach(() => {
        routerMock = {
            url: '/customers?keyword=abc',
            navigate: jest.fn()
        };
        authStoreMock = {
            clearSessionState: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authSessionExpiredInterceptor])),
                provideHttpClientTesting(),
                {
                    provide: Router,
                    useValue: routerMock
                },
                {
                    provide: AuthStore,
                    useValue: authStoreMock
                }
            ]
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
    });

    afterEach(() => {
        httpMock.verify();
    });

    it('clears local session and redirects to login with safe returnUrl on session_expired', () => {
        http.get('/api/customers').subscribe({ error: () => undefined });

        const request = httpMock.expectOne('/api/customers');
        request.flush({ code: 'session_expired', message: 'Session expired.' }, { status: 401, statusText: 'Unauthorized' });

        expect(authStoreMock.clearSessionState).toHaveBeenCalledTimes(1);
        expect(routerMock.navigate).toHaveBeenCalledWith(['/auth/login'], {
            queryParams: {
                returnUrl: '/customers?keyword=abc',
                reason: 'session_expired'
            },
            replaceUrl: true
        });
    });

    it('does not redirect for invalid credentials or permission denied', () => {
        http.post('/api/auth/sessions', {}).subscribe({ error: () => undefined });
        httpMock.expectOne('/api/auth/sessions').flush({ code: 'invalid_credentials' }, { status: 401, statusText: 'Unauthorized' });

        http.get('/api/platform/users').subscribe({ error: () => undefined });
        httpMock.expectOne('/api/platform/users').flush({ code: 'permission_denied' }, { status: 403, statusText: 'Forbidden' });

        expect(authStoreMock.clearSessionState).not.toHaveBeenCalled();
        expect(routerMock.navigate).not.toHaveBeenCalled();
    });

    it('avoids redirect loops while already on auth routes', () => {
        routerMock.url = '/auth/login?returnUrl=%2Fcustomers';

        http.get('/api/auth/session').subscribe({ error: () => undefined });
        httpMock.expectOne('/api/auth/session').flush({ code: 'session_missing' }, { status: 401, statusText: 'Unauthorized' });

        expect(authStoreMock.clearSessionState).toHaveBeenCalledTimes(1);
        expect(routerMock.navigate).not.toHaveBeenCalled();
    });
});
