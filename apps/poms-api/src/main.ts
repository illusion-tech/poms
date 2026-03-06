/**
 * This is not a production server yet!
 * This is only a minimal backend to get started.
 */

import 'reflect-metadata';

import { Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { AppModule } from './app/app.module';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);

    const openApiConfig = new DocumentBuilder().setTitle('POMS API').setDescription('Project Oriented Management System API').setVersion('0.1.0').addBearerAuth().build();
    const openApiDoc = SwaggerModule.createDocument(app, openApiConfig);
    SwaggerModule.setup('api-docs', app, cleanupOpenApiDoc(openApiDoc));

    const port = process.env['PORT'] || 3333;
    await app.listen(port);
    Logger.log(`🚀 Application is running on: http://localhost:${port}/${globalPrefix}`);
    Logger.log(`📚 Swagger UI: http://localhost:${port}/api-docs`);
}

bootstrap();
