import { Controller, Get, HttpStatus, Res } from '@nestjs/common';
import { ApiOkResponse, ApiOperation, ApiProperty, ApiServiceUnavailableResponse, ApiTags } from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';
import { type HealthCheckView, HealthService } from './health.service';

type StatusResponse = {
    status(code: number): unknown;
};

class HealthDependencyCheckDto {
    @ApiProperty({ enum: ['pass', 'fail'] })
    status!: 'pass' | 'fail';

    @ApiProperty()
    message!: string;

    @ApiProperty()
    durationMs!: number;
}

class HealthChecksDto {
    @ApiProperty({ type: HealthDependencyCheckDto })
    process!: HealthDependencyCheckDto;

    @ApiProperty({ type: HealthDependencyCheckDto, required: false })
    database?: HealthDependencyCheckDto;
}

class HealthCheckDto {
    @ApiProperty({ enum: ['poms-api'] })
    service!: 'poms-api';

    @ApiProperty({ enum: ['live', 'ready', 'not_ready'] })
    status!: 'live' | 'ready' | 'not_ready';

    @ApiProperty({ format: 'date-time' })
    checkedAt!: string;

    @ApiProperty()
    uptimeSeconds!: number;

    @ApiProperty({ type: HealthChecksDto })
    checks!: HealthChecksDto;
}

@ApiTags('Health')
@Controller('health')
export class HealthController {
    constructor(private readonly healthService: HealthService) {}

    @Get()
    @Public()
    @ApiOperation({ summary: 'API liveness check' })
    @ApiOkResponse({ type: HealthCheckDto })
    getLiveness(): HealthCheckView {
        return this.healthService.getLiveness();
    }

    @Get('readiness')
    @Public()
    @ApiOperation({ summary: 'API readiness check' })
    @ApiOkResponse({ type: HealthCheckDto })
    @ApiServiceUnavailableResponse({ type: HealthCheckDto })
    async getReadiness(@Res({ passthrough: true }) response: StatusResponse): Promise<HealthCheckView> {
        const readiness = await this.healthService.getReadiness();
        if (readiness.status !== 'ready') {
            response.status(HttpStatus.SERVICE_UNAVAILABLE);
        }

        return readiness;
    }
}
