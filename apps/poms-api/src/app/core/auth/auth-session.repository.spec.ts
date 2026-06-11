jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { AuthSessionRepository } from './auth-session.repository';
import { AuthSessionRevokedReasonValue, AuthSessionStatusValue } from './auth-session.entity';

describe('AuthSessionRepository', () => {
    it('touches last seen through a guarded atomic update', async () => {
        const now = new Date('2026-06-10T07:30:43.000Z');
        const execute = jest.fn().mockResolvedValue([
            {
                lastSeenAt: now,
                lastIp: '10.0.0.2',
                idleExpiresAt: new Date('2026-06-10T07:45:43.000Z'),
                rowVersion: 3,
                updatedAt: now
            }
        ]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        const touched = await repository.touchLastSeenIfDue({
            sessionId: 'session-1',
            now,
            ip: '10.0.0.2',
            idleTimeoutSeconds: 900,
            lastSeenThrottleSeconds: 60
        });

        expect(execute).toHaveBeenCalledWith(
            expect.stringContaining('update "poms"."auth_session"'),
            [
                now,
                '10.0.0.2',
                new Date('2026-06-10T07:45:43.000Z'),
                now,
                'session-1',
                'active',
                new Date('2026-06-10T07:29:43.000Z'),
                now,
                now
            ]
        );
        expect(execute.mock.calls[0][0]).toContain('"last_seen_at" <= ?');
        expect(execute.mock.calls[0][0]).toContain('"idle_expires_at" > ?');
        expect(execute.mock.calls[0][0]).toContain('"absolute_expires_at" > ?');
        expect(touched).toEqual({
            lastSeenAt: now,
            lastIp: '10.0.0.2',
            idleExpiresAt: new Date('2026-06-10T07:45:43.000Z'),
            rowVersion: 3,
            updatedAt: now
        });
    });

    it('returns null when the session was already touched by another request', async () => {
        const execute = jest.fn().mockResolvedValue([]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        await expect(
            repository.touchLastSeenIfDue({
                sessionId: 'session-1',
                now: new Date('2026-06-10T07:30:43.000Z'),
                ip: null,
                idleTimeoutSeconds: 900,
                lastSeenThrottleSeconds: 60
            })
        ).resolves.toBeNull();
    });

    it('reads a write snapshot by id through a raw query', async () => {
        const snapshot = createSessionWriteSnapshot({ rowVersion: 7 });
        const execute = jest.fn().mockResolvedValue([snapshot]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        const result = await repository.findWriteSnapshotById('session-1');

        expect(execute).toHaveBeenCalledWith(expect.stringContaining('from "poms"."auth_session"'), ['session-1']);
        expect(execute.mock.calls[0][0]).toContain('"row_version" as "rowVersion"');
        expect(result).toEqual(snapshot);
    });

    it('rotates CSRF token through a guarded atomic update', async () => {
        const now = new Date('2026-06-10T07:31:00.000Z');
        const snapshot = createSessionWriteSnapshot({
            csrfTokenHash: 'new-csrf-hash',
            rowVersion: 4,
            updatedAt: now
        });
        const execute = jest.fn().mockResolvedValue([snapshot]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        const rotated = await repository.rotateCsrfTokenForActiveSession({
            sessionId: 'session-1',
            csrfTokenHash: 'new-csrf-hash',
            now
        });

        expect(execute).toHaveBeenCalledWith(expect.stringContaining('update "poms"."auth_session"'), [
            'new-csrf-hash',
            now,
            'session-1',
            AuthSessionStatusValue.Active,
            now,
            now
        ]);
        expect(execute.mock.calls[0][0]).toContain('"csrf_token_hash" = ?');
        expect(execute.mock.calls[0][0]).toContain('"idle_expires_at" > ?');
        expect(execute.mock.calls[0][0]).toContain('"absolute_expires_at" > ?');
        expect(execute.mock.calls[0][0]).toContain('"row_version" = "row_version" + 1');
        expect(rotated).toEqual(snapshot);
    });

    it('expires only an active session through a guarded atomic update', async () => {
        const now = new Date('2026-06-10T07:32:00.000Z');
        const snapshot = createSessionWriteSnapshot({
            status: AuthSessionStatusValue.Expired,
            revokedAt: now,
            rowVersion: 5,
            updatedAt: now
        });
        const execute = jest.fn().mockResolvedValue([snapshot]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        const expired = await repository.expireActiveSession({ sessionId: 'session-1', now });

        expect(execute).toHaveBeenCalledWith(expect.stringContaining('"status" = ?'), [
            AuthSessionStatusValue.Expired,
            now,
            now,
            'session-1',
            AuthSessionStatusValue.Active
        ]);
        expect(execute.mock.calls[0][0]).toContain('"revoked_reason" = null');
        expect(execute.mock.calls[0][0]).toContain('"id" = ?');
        expect(execute.mock.calls[0][0]).toContain('"status" = ?');
        expect(expired).toEqual(snapshot);
    });

    it('revokes only an active session through a guarded atomic update', async () => {
        const now = new Date('2026-06-10T07:33:00.000Z');
        const snapshot = createSessionWriteSnapshot({
            status: AuthSessionStatusValue.Revoked,
            revokedAt: now,
            revokedReason: AuthSessionRevokedReasonValue.Logout,
            rowVersion: 6,
            updatedAt: now
        });
        const execute = jest.fn().mockResolvedValue([snapshot]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        const revoked = await repository.revokeActiveSession({
            sessionId: 'session-1',
            reason: AuthSessionRevokedReasonValue.Logout,
            now
        });

        expect(execute).toHaveBeenCalledWith(expect.stringContaining('"revoked_reason" = ?'), [
            AuthSessionStatusValue.Revoked,
            now,
            AuthSessionRevokedReasonValue.Logout,
            now,
            'session-1',
            AuthSessionStatusValue.Active
        ]);
        expect(execute.mock.calls[0][0]).toContain('"id" = ?');
        expect(execute.mock.calls[0][0]).toContain('"status" = ?');
        expect(revoked).toEqual(snapshot);
    });

    it('revokes active sessions for a user in one atomic command', async () => {
        const now = new Date('2026-06-10T07:34:00.000Z');
        const execute = jest.fn().mockResolvedValue([{ id: 'session-1' }, { id: 'session-2' }]);
        const repository = new AuthSessionRepository(createEntityRepositoryMock(execute) as never);

        const count = await repository.revokeActiveSessionsForUser('user-1', AuthSessionRevokedReasonValue.AdminRevoked, now);

        expect(execute).toHaveBeenCalledWith(expect.stringContaining('"user_id" = ?'), [
            AuthSessionStatusValue.Revoked,
            now,
            AuthSessionRevokedReasonValue.AdminRevoked,
            now,
            'user-1',
            AuthSessionStatusValue.Active
        ]);
        expect(execute.mock.calls[0][0]).toContain('returning');
        expect(count).toBe(2);
    });
});

function createEntityRepositoryMock(execute: jest.Mock) {
    return {
        getEntityManager: jest.fn(() => ({
            getConnection: jest.fn(() => ({
                execute
            }))
        }))
    };
}

function createSessionWriteSnapshot(overrides: Partial<Record<string, unknown>> = {}) {
    return {
        status: AuthSessionStatusValue.Active,
        csrfTokenHash: 'csrf-hash',
        idleExpiresAt: new Date('2026-06-10T07:45:43.000Z'),
        absoluteExpiresAt: new Date('2026-06-10T15:30:43.000Z'),
        lastSeenAt: new Date('2026-06-10T07:30:43.000Z'),
        lastIp: '10.0.0.2',
        revokedAt: null,
        revokedReason: null,
        rowVersion: 3,
        updatedAt: new Date('2026-06-10T07:30:43.000Z'),
        ...overrides
    };
}
