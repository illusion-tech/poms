import { DocumentBuilder } from '@nestjs/swagger';

export const GLOBAL_PREFIX = 'api';

export function buildOpenApiConfig() {
    return new DocumentBuilder()
        .setTitle('POMS API')
        .setDescription('Project Oriented Management System API')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();
}
