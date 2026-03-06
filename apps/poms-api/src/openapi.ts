import 'reflect-metadata';

import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app/app.module';

async function exportOpenApi() {
    const app = await NestFactory.create(AppModule, { logger: false });

    const globalPrefix = 'api';
    app.setGlobalPrefix(globalPrefix);

    const openApiConfig = new DocumentBuilder()
        .setTitle('POMS API')
        .setDescription('Project Oriented Management System API')
        .setVersion('0.1.0')
        .addBearerAuth()
        .build();

    const openApiDoc = SwaggerModule.createDocument(app, openApiConfig);
    const cleaned = cleanupOpenApiDoc(openApiDoc);

    const outFile = resolve(process.cwd(), 'libs/shared/api-spec/openapi.json');
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify(cleaned, null, 2) + '\n', 'utf8');

    await app.close();
}

exportOpenApi().catch((err) => {
    // eslint-disable-next-line no-console
    console.error(err);
    process.exit(1);
});

