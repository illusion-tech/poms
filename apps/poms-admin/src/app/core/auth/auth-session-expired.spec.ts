import { HttpErrorResponse } from '@angular/common/http';
import { readAuthSessionExpiredReason, resolveAuthSessionNotice } from './auth-session-expired';

describe('auth session expired helpers', () => {
    it('recognizes structured session expired auth errors', () => {
        const error = new HttpErrorResponse({
            status: 401,
            error: {
                code: 'session_expired'
            }
        });

        expect(readAuthSessionExpiredReason(error)).toBe('session_expired');
        expect(resolveAuthSessionNotice('session_expired')).toBe('登录已过期，请重新登录后继续。');
    });

    it('does not treat invalid credentials or permission denied as session expired', () => {
        expect(
            readAuthSessionExpiredReason(
                new HttpErrorResponse({
                    status: 401,
                    error: {
                        code: 'invalid_credentials'
                    }
                })
            )
        ).toBeNull();
        expect(
            readAuthSessionExpiredReason(
                new HttpErrorResponse({
                    status: 403,
                    error: {
                        code: 'permission_denied'
                    }
                })
            )
        ).toBeNull();
        expect(resolveAuthSessionNotice('invalid_credentials')).toBeNull();
    });
});
