import { HttpStatus } from '@nestjs/common';
import { HealthController } from './health.controller';
import type { HealthCheckView, HealthService } from './health.service';

describe('HealthController', () => {
    let healthService: jest.Mocked<Pick<HealthService, 'getLiveness' | 'getReadiness'>>;
    let controller: HealthController;

    beforeEach(() => {
        healthService = {
            getLiveness: jest.fn(),
            getReadiness: jest.fn()
        };
        controller = new HealthController(healthService as never as HealthService);
    });

    it('returns liveness without touching readiness dependencies', () => {
        const view = createHealthView('live');
        healthService.getLiveness.mockReturnValue(view);

        expect(controller.getLiveness()).toBe(view);
        expect(healthService.getReadiness).not.toHaveBeenCalled();
    });

    it('leaves the response status untouched when readiness passes', async () => {
        const view = createHealthView('ready');
        const response = { status: jest.fn() };
        healthService.getReadiness.mockResolvedValue(view);

        await expect(controller.getReadiness(response)).resolves.toBe(view);
        expect(response.status).not.toHaveBeenCalled();
    });

    it('marks readiness as service unavailable when a dependency fails', async () => {
        const view = createHealthView('not_ready');
        const response = { status: jest.fn() };
        healthService.getReadiness.mockResolvedValue(view);

        await expect(controller.getReadiness(response)).resolves.toBe(view);
        expect(response.status).toHaveBeenCalledWith(HttpStatus.SERVICE_UNAVAILABLE);
    });

    function createHealthView(status: HealthCheckView['status']): HealthCheckView {
        return {
            service: 'poms-api',
            status,
            checkedAt: '2026-05-25T00:00:00.000Z',
            uptimeSeconds: 1,
            checks: {
                process: {
                    status: 'pass',
                    message: 'API process is running.',
                    durationMs: 0
                }
            }
        };
    }
});
