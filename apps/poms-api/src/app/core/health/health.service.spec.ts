import type { MikroORM } from '@mikro-orm/core';
import { HealthService } from './health.service';

describe('HealthService', () => {
    let orm: jest.Mocked<Pick<MikroORM, 'checkConnection'>>;
    let service: HealthService;

    beforeEach(() => {
        orm = {
            checkConnection: jest.fn()
        };
        service = new HealthService(orm as never as MikroORM);
    });

    it('returns a process-only liveness view', () => {
        const result = service.getLiveness();

        expect(result).toEqual(
            expect.objectContaining({
                service: 'poms-api',
                status: 'live',
                checkedAt: expect.any(String),
                uptimeSeconds: expect.any(Number),
                checks: {
                    process: {
                        status: 'pass',
                        message: 'API process is running.',
                        durationMs: 0
                    }
                }
            })
        );
        expect(orm.checkConnection).not.toHaveBeenCalled();
    });

    it('returns ready when the database connection check succeeds', async () => {
        orm.checkConnection.mockResolvedValue({ ok: true });

        const result = await service.getReadiness();

        expect(result.status).toBe('ready');
        expect(result.checks.database).toEqual(
            expect.objectContaining({
                status: 'pass',
                message: 'Database connection is healthy.',
                durationMs: expect.any(Number)
            })
        );
    });

    it('returns not_ready when the database connection check fails', async () => {
        orm.checkConnection.mockResolvedValue({ ok: false, reason: 'connection refused' });

        const result = await service.getReadiness();

        expect(result.status).toBe('not_ready');
        expect(result.checks.database).toEqual(
            expect.objectContaining({
                status: 'fail',
                message: 'connection refused',
                durationMs: expect.any(Number)
            })
        );
    });
});
