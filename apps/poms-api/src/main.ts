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
import { GLOBAL_PREFIX, buildOpenApiConfig } from './config/openapi.config';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.setGlobalPrefix(GLOBAL_PREFIX);

    const openApiDoc = SwaggerModule.createDocument(app, buildOpenApiConfig());
    SwaggerModule.setup('api-docs', app, cleanupOpenApiDoc(openApiDoc));

    app.enableCors({
        origin: process.env['CORS_ORIGIN'] ?? 'http://localhost:4200',
        credentials: true
    });

    const port = process.env['PORT'] || 3333;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${GLOBAL_PREFIX}`);
    Logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
}

bootstrap();
