import axios from 'axios';

jest.setTimeout(120_000);

describe('poms-api health e2e', () => {
    it('exposes unauthenticated liveness and readiness checks', async () => {
        const livenessResponse = await axios.get('/health');
        expect(livenessResponse.status).toBe(200);
        expect(livenessResponse.data).toEqual(
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

        const readinessResponse = await axios.get('/health/readiness');
        expect([200, 503]).toContain(readinessResponse.status);
        expect(readinessResponse.data).toEqual(
            expect.objectContaining({
                service: 'poms-api',
                status: readinessResponse.status === 200 ? 'ready' : 'not_ready',
                checkedAt: expect.any(String),
                uptimeSeconds: expect.any(Number),
                checks: expect.objectContaining({
                    process: expect.objectContaining({
                        status: 'pass'
                    }),
                    database: expect.objectContaining({
                        status: readinessResponse.status === 200 ? 'pass' : 'fail',
                        message: expect.any(String),
                        durationMs: expect.any(Number)
                    })
                })
            })
        );
    });
});
