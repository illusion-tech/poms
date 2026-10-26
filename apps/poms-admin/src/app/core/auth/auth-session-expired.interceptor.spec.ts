import { APP_BASE_HREF, Location, LocationStrategy, PathLocationStrategy, PlatformLocation } from '@angular/common';
import { MockPlatformLocation } from '@angular/common/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { NavigationEnd, provideRouter, Router, RouterOutlet } from '@angular/router';
import { AuthStore } from '@poms/admin-data-access';
import { providePomsApiClient } from '@poms/admin-data-access/lib/poms-api/provide-poms-api-client';
import { filter, firstValueFrom, take } from 'rxjs';
import { authGuard } from './auth.guard';
import { authSessionExpiredInterceptor } from './auth-session-expired.interceptor';

describe('authSessionExpiredInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let routerMock: { url: string; navigated: boolean; navigate: jest.Mock };
    let authStoreMock: { clearSessionState: jest.Mock };

    beforeEach(() => {
        routerMock = {
            url: '/customers?keyword=abc',
            navigated: true,
            navigate: jest.fn()
        };
        authStoreMock = {
            clearSessionState: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                provideHttpClient(withInterceptors([authSessionExpiredInterceptor])),
                provideHttpClientTesting(),
                { provide: Location, useValue: { path: () => '/' } },
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

@Component({ standalone: true, template: '<p>Controlled route</p>' })
class SessionRoutePage {}

@Component({ standalone: true, imports: [RouterOutlet], template: '<router-outlet />' })
class SessionRouteHost {}

describe('auth session expiry during real Router/Location startup', () => {
    function configure(startPath: string) {
        TestBed.configureTestingModule({
            imports: [SessionRouteHost],
            providers: [
                // Only the browser URL storage is controlled. Router,
                // Location, AuthStore, authGuard and HTTP interceptors are real.
                { provide: PlatformLocation, useFactory: () => new MockPlatformLocation({ startUrl: `http://localhost${startPath}` }) },
                { provide: APP_BASE_HREF, useValue: '/' },
                { provide: LocationStrategy, useClass: PathLocationStrategy },
                Location,
                provideRouter([
                    { path: 'customers', component: SessionRoutePage, canActivate: [authGuard] },
                    { path: 'completed', component: SessionRoutePage },
                    { path: 'auth/login', component: SessionRoutePage }
                ]),
                providePomsApiClient({ basePath: '', interceptors: [authSessionExpiredInterceptor] }),
                provideHttpClientTesting()
            ]
        });
        const fixture = TestBed.createComponent(SessionRouteHost);
        fixture.detectChanges();
        return { fixture, router: TestBed.inject(Router), location: TestBed.inject(Location), store: TestBed.inject(AuthStore), http: TestBed.inject(HttpClient), requests: TestBed.inject(HttpTestingController) };
    }

    afterEach(() => TestBed.inject(HttpTestingController).verify());

    it('retains query and fragment when initializer and initial authGuard session requests both fail', async () => {
        const requested = '/customers?keyword=abc#details';
        const { fixture, router, location, store, requests } = configure(requested);
        expect(router.navigated).toBe(false);
        expect(router.url).toBe('/');
        expect(location.path(true)).toBe(requested);
        const settled = firstValueFrom(
            router.events.pipe(
                filter((event) => event instanceof NavigationEnd),
                take(1)
            )
        );
        const initializing = store.initialize();
        const initialNavigation = router.navigateByUrl(requested);
        const pending = requests.match('/api/auth/session');
        for (let attempt = 0; attempt < 30 && pending.length < 2; attempt++) {
            await Promise.resolve();
            pending.push(...requests.match('/api/auth/session'));
        }
        expect(pending).toHaveLength(2);
        for (const request of pending) request.flush({ statusCode: 401, code: 'session_expired', message: 'Authentication required' }, { status: 401, statusText: 'Unauthorized' });
        await Promise.all([initializing, initialNavigation, settled]);
        await fixture.whenStable();
        expect(router.parseUrl(router.url).queryParams).toEqual({ returnUrl: requested, reason: 'session_expired' });
        expect(router.parseUrl(router.url).root.children['primary']?.segments.map((segment) => segment.path)).toEqual(['auth', 'login']);
        expect(store.isAuthenticated()).toBe(false);
    });

    it('does not overwrite an initial login URL when its retained invalid Cookie produces a session 401', async () => {
        const requested = '/auth/login?returnUrl=%2Fcustomers%3Fkeyword%3Dabc%23details&reason=session_expired';
        const { router, location, store, requests } = configure(requested);
        const navigate = jest.spyOn(router, 'navigate');
        const initializing = store.initialize();
        requests.expectOne('/api/auth/session').flush({ statusCode: 401, code: 'session_expired' }, { status: 401, statusText: 'Unauthorized' });
        await initializing;
        expect(router.navigated).toBe(false);
        expect(location.path(true)).toBe(requested);
        expect(navigate).not.toHaveBeenCalled();
        expect(store.isAuthenticated()).toBe(false);
    });

    it('keeps the completed Router URL authoritative after navigation', async () => {
        const { fixture, router, location, http, requests } = configure('/');
        const requested = '/completed?view=one#details';
        await router.navigateByUrl(requested);
        expect(router.navigated).toBe(true);
        location.go('/unrelated?browser=changed#ignored');
        const settled = firstValueFrom(
            router.events.pipe(
                filter((event) => event instanceof NavigationEnd),
                take(1)
            )
        );
        http.get('/api/protected').subscribe({ error: () => undefined });
        requests.expectOne('/api/protected').flush({ statusCode: 401, code: 'session_revoked' }, { status: 401, statusText: 'Unauthorized' });
        await settled;
        await fixture.whenStable();
        expect(router.parseUrl(router.url).queryParams).toEqual({ returnUrl: requested, reason: 'session_revoked' });
    });
});
