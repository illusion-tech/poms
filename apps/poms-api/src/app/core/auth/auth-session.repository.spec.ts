jest.mock('@mikro-orm/nestjs', () => ({
    InjectRepository: () => () => undefined
}));

import { AuthSessionRepository } from './auth-session.repository';

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
