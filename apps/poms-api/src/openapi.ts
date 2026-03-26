import 'reflect-metadata';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Global, Module } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app/app.module';
import { PersistenceModule } from './app/core/persistence/persistence.module';

@Global()
@Module({
    imports: [
        MikroOrmModule.forRoot({
            driver: PostgreSqlDriver,
            dbName: 'openapi-placeholder',
            connect: false,
            autoLoadEntities: true,
            registerRequestContext: false,
            discovery: { warnWhenNoEntities: false }
        } as never)
    ]
})
class OpenApiPersistenceModule {}

async function exportOpenApi() {
    const moduleRef = await Test.createTestingModule({
        imports: [AppModule]
    })
        .overrideModule(PersistenceModule)
        .useModule(OpenApiPersistenceModule)
        .compile();

    const app = moduleRef.createNestApplication();
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
