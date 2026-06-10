import { AuthSessionStatusValue, AuthSessionRevokedReasonValue } from './auth-session.entity';
import { AuthSessionAuthenticationError, AuthSessionErrorCodeValue, AuthSessionService, hashToken } from './auth-session.service';

describe('AuthSessionService', () => {
    let repository: {
        createSession: jest.Mock;
        findByTokenHash: jest.Mock;
        saveAll: jest.Mock;
        touchLastSeenIfDue: jest.Mock;
        revokeActiveSessionsForUser: jest.Mock;
    };
    let platformService: {
        resolveActiveAuthUser: jest.Mock;
    };
    let service: AuthSessionService;

    beforeEach(() => {
        repository = {
            createSession: jest.fn((input) => ({ id: 'session-1', rowVersion: 1, ...input })),
            findByTokenHash: jest.fn(),
            saveAll: jest.fn().mockResolvedValue(undefined),
            touchLastSeenIfDue: jest.fn().mockResolvedValue(null),
            revokeActiveSessionsForUser: jest.fn().mockResolvedValue(2)
        };
        platformService = {
            resolveActiveAuthUser: jest.fn()
        };
        service = new AuthSessionService(repository as never, platformService as never);
    });

    it('creates an opaque session and persists only token hashes', async () => {
        const now = new Date('2026-05-13T01:00:00.000Z');

        const result = await service.createSession(
            '00000000-0000-4000-8000-000000000001',
            { ip: '127.0.0.1', userAgent: 'jest' },
            { now, idleTimeoutSeconds: 900, absoluteTimeoutSeconds: 28800 }
        );

        expect(result.sessionToken).toHaveLength(43);
        expect(result.csrfToken).toHaveLength(43);
        expect(repository.createSession).toHaveBeenCalledWith(
            expect.objectContaining({
                userId: '00000000-0000-4000-8000-000000000001',
                tokenHash: hashToken(result.sessionToken),
                csrfTokenHash: hashToken(result.csrfToken),
                status: AuthSessionStatusValue.Active,
                idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
                absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z'),
                createdIp: '127.0.0.1',
                lastIp: '127.0.0.1',
                createdUserAgent: 'jest'
            })
        );
        expect(repository.createSession.mock.calls[0][0].tokenHash).not.toBe(result.sessionToken);
        expect(repository.saveAll).toHaveBeenCalledWith([result.session]);
    });

    it('resolves an active session through current platform user facts and refreshes idle expiry after throttle', async () => {
        const token = 'session-token';
        const session = createSession({
            tokenHash: hashToken(token),
            lastSeenAt: new Date('2026-05-13T01:00:00.000Z'),
            idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
            absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z')
        });
        repository.findByTokenHash.mockResolvedValue(session);
        repository.touchLastSeenIfDue.mockResolvedValue({
            lastSeenAt: new Date('2026-05-13T01:10:01.000Z'),
            lastIp: '10.0.0.2',
            idleExpiresAt: new Date('2026-05-13T01:25:01.000Z'),
            rowVersion: 2,
            updatedAt: new Date('2026-05-13T01:10:01.000Z')
        });
        platformService.resolveActiveAuthUser.mockResolvedValue({
            userId: session.userId,
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        const result = await service.resolveSessionToken(
            token,
            { ip: '10.0.0.2', userAgent: 'jest' },
            {
                now: new Date('2026-05-13T01:10:01.000Z'),
                idleTimeoutSeconds: 900,
                absoluteTimeoutSeconds: 28800,
                lastSeenThrottleSeconds: 60
            }
        );

        expect(repository.findByTokenHash).toHaveBeenCalledWith(hashToken(token));
        expect(repository.touchLastSeenIfDue).toHaveBeenCalledWith({
            sessionId: session.id,
            now: new Date('2026-05-13T01:10:01.000Z'),
            ip: '10.0.0.2',
            idleTimeoutSeconds: 900,
            lastSeenThrottleSeconds: 60
        });
        expect(result.user).toEqual({
            sub: session.userId,
            username: 'admin',
            permissions: ['platform:users:manage']
        });
        expect(session.lastSeenAt).toEqual(new Date('2026-05-13T01:10:01.000Z'));
        expect(session.lastIp).toBe('10.0.0.2');
        expect(session.idleExpiresAt).toEqual(new Date('2026-05-13T01:25:01.000Z'));
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('keeps authenticated requests alive when another concurrent request already touched last seen', async () => {
        const token = 'session-token';
        const session = createSession({
            tokenHash: hashToken(token),
            lastSeenAt: new Date('2026-05-13T01:00:00.000Z'),
            idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
            absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z')
        });
        repository.findByTokenHash.mockResolvedValue(session);
        repository.touchLastSeenIfDue.mockResolvedValue(null);
        platformService.resolveActiveAuthUser.mockResolvedValue({
            userId: session.userId,
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        const result = await service.resolveSessionToken(
            token,
            { ip: '10.0.0.3', userAgent: 'jest' },
            {
                now: new Date('2026-05-13T01:10:01.000Z'),
                idleTimeoutSeconds: 900,
                absoluteTimeoutSeconds: 28800,
                lastSeenThrottleSeconds: 60
            }
        );

        expect(result.user.sub).toBe(session.userId);
        expect(repository.touchLastSeenIfDue).toHaveBeenCalledWith({
            sessionId: session.id,
            now: new Date('2026-05-13T01:10:01.000Z'),
            ip: '10.0.0.3',
            idleTimeoutSeconds: 900,
            lastSeenThrottleSeconds: 60
        });
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('does not touch last seen before the throttle window is due', async () => {
        const token = 'session-token';
        const session = createSession({
            tokenHash: hashToken(token),
            lastSeenAt: new Date('2026-05-13T01:09:30.000Z'),
            idleExpiresAt: new Date('2026-05-13T01:24:30.000Z'),
            absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z')
        });
        repository.findByTokenHash.mockResolvedValue(session);
        platformService.resolveActiveAuthUser.mockResolvedValue({
            userId: session.userId,
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        await service.resolveSessionToken(
            token,
            { ip: '10.0.0.2', userAgent: 'jest' },
            {
                now: new Date('2026-05-13T01:10:01.000Z'),
                idleTimeoutSeconds: 900,
                absoluteTimeoutSeconds: 28800,
                lastSeenThrottleSeconds: 60
            }
        );

        expect(repository.touchLastSeenIfDue).not.toHaveBeenCalled();
        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('marks an expired active session and throws session_expired', async () => {
        const session = createSession({
            idleExpiresAt: new Date('2026-05-13T01:15:00.000Z'),
            absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z')
        });
        repository.findByTokenHash.mockResolvedValue(session);

        await expect(
            service.resolveSessionToken('expired-token', {}, { now: new Date('2026-05-13T01:15:00.000Z') })
        ).rejects.toMatchObject<AuthSessionAuthenticationError>({
            code: AuthSessionErrorCodeValue.SessionExpired
        });

        expect(session.status).toBe(AuthSessionStatusValue.Expired);
        expect(session.revokedAt).toEqual(new Date('2026-05-13T01:15:00.000Z'));
        expect(repository.saveAll).toHaveBeenCalledWith([session]);
    });

    it('revokes the session when the bound platform user is inactive or missing', async () => {
        const session = createSession();
        repository.findByTokenHash.mockResolvedValue(session);
        platformService.resolveActiveAuthUser.mockResolvedValue(null);

        await expect(
            service.resolveSessionToken('active-token', {}, { now: new Date('2026-05-13T01:30:00.000Z') })
        ).rejects.toMatchObject<AuthSessionAuthenticationError>({
            code: AuthSessionErrorCodeValue.AccountDisabled
        });

        expect(session.status).toBe(AuthSessionStatusValue.Revoked);
        expect(session.revokedReason).toBe(AuthSessionRevokedReasonValue.AccountDisabled);
        expect(repository.saveAll).toHaveBeenCalledWith([session]);
    });

    it('verifies CSRF token by hash', () => {
        const session = createSession({ csrfTokenHash: hashToken('csrf-token') });

        expect(service.verifyCsrfToken(session, 'csrf-token')).toBe(true);
        expect(service.verifyCsrfToken(session, 'wrong')).toBe(false);
    });

    it('refreshes the session-bound CSRF token hash', async () => {
        const token = 'session-token';
        const session = createSession({
            tokenHash: hashToken(token),
            idleExpiresAt: new Date('2026-05-13T02:00:00.000Z'),
            absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z')
        });
        repository.findByTokenHash.mockResolvedValue(session);
        platformService.resolveActiveAuthUser.mockResolvedValue({
            userId: session.userId,
            username: 'admin',
            permissions: ['platform:users:manage']
        });

        const result = await service.refreshCsrfToken(token, {}, { now: new Date('2026-05-13T01:05:00.000Z'), lastSeenThrottleSeconds: 3600 });

        expect(result.csrfToken).toHaveLength(43);
        expect(result.expiresAt).toEqual(new Date('2026-05-13T02:00:00.000Z'));
        expect(session.csrfTokenHash).toBe(hashToken(result.csrfToken));
        expect(repository.saveAll).toHaveBeenLastCalledWith([session]);
    });

    it('creates an anonymous CSRF token with idle timeout expiry', () => {
        const result = service.createAnonymousCsrfToken({
            now: new Date('2026-05-13T01:00:00.000Z'),
            idleTimeoutSeconds: 900
        });

        expect(result.session).toBeNull();
        expect(result.user).toBeNull();
        expect(result.csrfToken).toHaveLength(43);
        expect(result.expiresAt).toEqual(new Date('2026-05-13T01:15:00.000Z'));
    });
});

function createSession(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        id: 'session-1',
        tokenHash: 'token-hash',
        csrfTokenHash: 'csrf-hash',
        userId: '00000000-0000-4000-8000-000000000001',
        status: AuthSessionStatusValue.Active,
        idleExpiresAt: new Date('2026-05-13T02:00:00.000Z'),
        absoluteExpiresAt: new Date('2026-05-13T09:00:00.000Z'),
        lastSeenAt: new Date('2026-05-13T01:00:00.000Z'),
        revokedAt: null,
        revokedReason: null,
        createdIp: '127.0.0.1',
        lastIp: '127.0.0.1',
        createdUserAgent: 'jest',
        rowVersion: 1,
        createdAt: new Date('2026-05-13T01:00:00.000Z'),
        updatedAt: new Date('2026-05-13T01:00:00.000Z'),
        ...overrides
    };
}
