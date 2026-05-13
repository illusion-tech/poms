import { AuthSessionCookieService } from './auth-session-cookie.service';

describe('AuthSessionCookieService', () => {
    let service: AuthSessionCookieService;

    beforeEach(() => {
        service = new AuthSessionCookieService();
    });

    it('creates HttpOnly session cookie headers with scoped path and expiry', () => {
        const header = service.createSessionCookieHeader('session-token', new Date('2026-05-13T02:00:00.000Z'), {
            now: new Date('2026-05-13T01:00:00.000Z'),
            path: '/api',
            secure: false
        });

        expect(header).toContain('poms_session=session-token');
        expect(header).toContain('Max-Age=3600');
        expect(header).toContain('Expires=Wed, 13 May 2026 02:00:00 GMT');
        expect(header).toContain('Path=/api');
        expect(header).toContain('SameSite=Lax');
        expect(header).toContain('HttpOnly');
        expect(header).not.toContain('Secure');
    });

    it('creates readable CSRF cookie headers without HttpOnly', () => {
        const header = service.createCsrfCookieHeader('csrf-token', new Date('2026-05-13T02:00:00.000Z'), {
            now: new Date('2026-05-13T01:00:00.000Z'),
            secure: true
        });

        expect(header).toContain('poms_csrf=csrf-token');
        expect(header).toContain('Secure');
        expect(header).not.toContain('HttpOnly');
    });

    it('clears both session and CSRF cookies', () => {
        expect(service.createClearSessionCookieHeader({ secure: false })).toContain('poms_session=; Max-Age=0');
        expect(service.createClearSessionCookieHeader({ secure: false })).toContain('HttpOnly');
        expect(service.createClearCsrfCookieHeader({ secure: false })).toContain('poms_csrf=; Max-Age=0');
        expect(service.createClearCsrfCookieHeader({ secure: false })).not.toContain('HttpOnly');
    });

    it('parses session and CSRF tokens from Cookie headers', () => {
        const cookieHeader = 'theme=light; poms_session=session%20token; poms_csrf=csrf-token';

        expect(service.getSessionTokenFromCookieHeader(cookieHeader)).toBe('session token');
        expect(service.getCsrfTokenFromCookieHeader(cookieHeader)).toBe('csrf-token');
        expect(service.getSessionTokenFromCookieHeader('theme=light')).toBeNull();
    });
});
