import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { PomsCsrfTokenStore } from '@poms/admin-data-access/lib/poms-api/poms-csrf-token.store';
import { pomsCsrfInterceptor } from '@poms/admin-data-access/lib/poms-api/poms-csrf.interceptor';

describe('pomsCsrfInterceptor', () => {
    let http: HttpClient;
    let httpMock: HttpTestingController;
    let csrfTokenStore: PomsCsrfTokenStore;

    beforeEach(() => {
        TestBed.configureTestingModule({
            providers: [provideHttpClient(withInterceptors([pomsCsrfInterceptor])), provideHttpClientTesting(), PomsCsrfTokenStore]
        });

        http = TestBed.inject(HttpClient);
        httpMock = TestBed.inject(HttpTestingController);
        csrfTokenStore = TestBed.inject(PomsCsrfTokenStore);
    });

    afterEach(() => {
        httpMock.verify();
        clearCookie('poms_csrf');
    });

    it('adds the CSRF header for unsafe requests from the token store', () => {
        csrfTokenStore.setToken('store-csrf-token');

        http.post('/api/platform/users', { displayName: '用户' }).subscribe();

        const request = httpMock.expectOne('/api/platform/users');
        expect(request.request.headers.get('X-CSRF-Token')).toBe('store-csrf-token');
        request.flush({});
    });

    it('falls back to the readable CSRF cookie when the in-memory token is empty', () => {
        document.cookie = 'poms_csrf=cookie-csrf-token';

        http.patch('/api/auth/profile', { displayName: '用户' }).subscribe();

        const request = httpMock.expectOne('/api/auth/profile');
        expect(request.request.headers.get('X-CSRF-Token')).toBe('cookie-csrf-token');
        request.flush({});
    });

    it('does not attach CSRF header to safe requests', () => {
        csrfTokenStore.setToken('store-csrf-token');

        http.get('/api/auth/session').subscribe();

        const request = httpMock.expectOne('/api/auth/session');
        expect(request.request.headers.has('X-CSRF-Token')).toBe(false);
        request.flush({});
    });

    it('does not override an explicit CSRF header', () => {
        csrfTokenStore.setToken('store-csrf-token');

        http.post('/api/auth/session:logout', {}, { headers: { 'X-CSRF-Token': 'explicit-csrf-token' } }).subscribe();

        const request = httpMock.expectOne('/api/auth/session:logout');
        expect(request.request.headers.get('X-CSRF-Token')).toBe('explicit-csrf-token');
        request.flush({});
    });
});

function clearCookie(name: string): void {
    document.cookie = `${name}=; Max-Age=0; path=/`;
}
