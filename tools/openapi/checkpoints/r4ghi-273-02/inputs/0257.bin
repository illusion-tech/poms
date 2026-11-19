import { DocumentBuilder } from '@nestjs/swagger';
import { AUTH_CSRF_HEADER_NAME } from '../app/core/auth/auth-session-cookie.service';

export const GLOBAL_PREFIX = 'api';

export function buildOpenApiConfig() {
    return new DocumentBuilder()
        .setTitle('POMS API')
        .setDescription('Project Oriented Management System API')
        .setVersion('0.1.0')
        .addCookieAuth('poms_session', { type: 'apiKey' }, 'pomsSession')
        .addApiKey({ type: 'apiKey', in: 'header', name: AUTH_CSRF_HEADER_NAME }, 'pomsCsrf')
        .build();
}
