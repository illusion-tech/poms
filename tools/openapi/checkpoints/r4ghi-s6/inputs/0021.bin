import { MikroORM } from '@mikro-orm/core';
import { Inject, Injectable } from '@nestjs/common';

type HealthOverallStatus = 'live' | 'ready' | 'not_ready';
type HealthCheckStatus = 'pass' | 'fail';

export interface HealthDependencyCheck {
    status: HealthCheckStatus;
    message: string;
    durationMs: number;
}

export interface HealthCheckView {
    service: 'poms-api';
    status: HealthOverallStatus;
    checkedAt: string;
    uptimeSeconds: number;
    checks: {
        process: HealthDependencyCheck;
        database?: HealthDependencyCheck;
    };
}

@Injectable()
export class HealthService {
    constructor(@Inject(MikroORM) private readonly orm: MikroORM) {}

    getLiveness(): HealthCheckView {
        return this.buildView('live', {
            process: {
                status: 'pass',
                message: 'API process is running.',
                durationMs: 0
            }
        });
    }

    async getReadiness(): Promise<HealthCheckView> {
        const database = await this.checkDatabase();
        return this.buildView(database.status === 'pass' ? 'ready' : 'not_ready', {
            process: {
                status: 'pass',
                message: 'API process is running.',
                durationMs: 0
            },
            database
        });
    }

    private async checkDatabase(): Promise<HealthDependencyCheck> {
        const startedAt = Date.now();

        try {
            let result = await this.orm.checkConnection();
            if (!result.ok && result.reason === 'Connection not established') {
                await this.orm.connect();
                result = await this.orm.checkConnection();
            }

            if (result.ok) {
                return {
                    status: 'pass',
                    message: 'Database connection is healthy.',
                    durationMs: Date.now() - startedAt
                };
            }

            return {
                status: 'fail',
                message: result.reason,
                durationMs: Date.now() - startedAt
            };
        } catch (error) {
            return {
                status: 'fail',
                message: describeError(error),
                durationMs: Date.now() - startedAt
            };
        }
    }

    private buildView(status: HealthOverallStatus, checks: HealthCheckView['checks']): HealthCheckView {
        return {
            service: 'poms-api',
            status,
            checkedAt: new Date().toISOString(),
            uptimeSeconds: Math.floor(process.uptime()),
            checks
        };
    }
}

function describeError(error: unknown): string {
    if (error instanceof Error && error.message) {
        return error.message;
    }

    return 'Unknown database health check failure.';
}
