/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app/app.module';
import { AUTH_CSRF_HEADER_NAME } from './app/core/auth/auth-session-cookie.service';
import { loadValidatedEnv } from './config/load-env';
import { GLOBAL_PREFIX, buildOpenApiConfig } from './config/openapi.config';

async function bootstrap() {
    const env = loadValidatedEnv();
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix(GLOBAL_PREFIX);

    const openApiDoc = SwaggerModule.createDocument(app, buildOpenApiConfig());
    SwaggerModule.setup('api-docs', app, cleanupOpenApiDoc(openApiDoc));

    app.enableCors(buildCorsOptions(env.CORS_ORIGIN));

    const port = env.PORT || 3333;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`);
    Logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
}

bootstrap();

function buildCorsOptions(corsOrigin: string) {
    const origins = corsOrigin
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean);
    if (origins.length === 0 || origins.includes('*')) {
        throw new Error('CORS_ORIGIN must contain explicit origins when credentials are enabled.');
    }

    return {
        origin: origins.length === 1 ? origins[0] : origins,
        credentials: true,
        methods: ['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
        allowedHeaders: ['Accept', 'Content-Type', AUTH_CSRF_HEADER_NAME]
    };
}
