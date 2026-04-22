import 'reflect-metadata';

import { MikroOrmModule } from '@mikro-orm/nestjs';
import { PostgreSqlDriver } from '@mikro-orm/postgresql';
import { Global, Module } from '@nestjs/common';
import { SwaggerModule } from '@nestjs/swagger';
import { Test } from '@nestjs/testing';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppModule } from './app/app.module';
import { PersistenceModule } from './app/core/persistence/persistence.module';
import { GLOBAL_PREFIX, buildOpenApiConfig } from './config/openapi.config';

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
    app.setGlobalPrefix(GLOBAL_PREFIX);

    const openApiDoc = SwaggerModule.createDocument(app, buildOpenApiConfig());
    const cleaned = cleanupOpenApiDoc(openApiDoc);
    normalizeNullableRefs(cleaned);

    const outFile = resolve(process.cwd(), 'libs/shared/api-spec/openapi.json');
    mkdirSync(dirname(outFile), { recursive: true });
    writeFileSync(outFile, JSON.stringify(cleaned, null, 2) + '\n', 'utf8');

    await app.close();
}

function normalizeNullableRefs(doc: unknown): void {
    const typedDoc = doc as Record<string, unknown>;
    const components = typedDoc['components'] as Record<string, unknown> | undefined;
    const schemas = components?.['schemas'] as Record<string, unknown> | undefined;
    if (!schemas) return;

    for (const schema of Object.values(schemas)) {
        const typedSchema = schema as Record<string, unknown>;
        const properties = typedSchema['properties'] as Record<string, Record<string, unknown>> | undefined;
        if (!properties) continue;

        for (const prop of Object.values(properties)) {
            if (prop['$ref'] && prop['nullable'] === true) {
                const ref = prop['$ref'] as string;
                delete prop['$ref'];
                prop['allOf'] = [{ $ref: ref }];
            }
        }
    }
}

exportOpenApi().catch((err) => {
    console.error(err);
    process.exit(1);
});
