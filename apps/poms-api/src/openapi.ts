import 'reflect-metadata';

import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { Module } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { cleanupOpenApiDoc } from 'nestjs-zod';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { AppController } from './app/app.controller';
import { AppService } from './app/app.service';
import { AuthController } from './app/core/auth/auth.controller';
import { ContractController } from './app/features/contract/contract.controller';
import { ContractService } from './app/features/contract/contract.service';
import { NavigationController } from './app/features/navigation/navigation.controller';
import { NavigationService } from './app/features/navigation/navigation.service';
import { ProjectController } from './app/features/project/project.controller';
import { ProjectService } from './app/features/project/project.service';

@Module({
    controllers: [AppController, AuthController, NavigationController, ProjectController, ContractController],
    providers: [
        AppService,
        {
            provide: JwtService,
            useValue: {
                sign: () => 'openapi-placeholder-token'
            }
        },
        {
            provide: NavigationService,
            useValue: {
                getNavigationForUser: () => []
            }
        },
        {
            provide: ProjectService,
            useValue: {}
        },
        {
            provide: ContractService,
            useValue: {}
        },
        {
            provide: APP_PIPE,
            useClass: ZodValidationPipe
        },
        {
            provide: APP_INTERCEPTOR,
            useClass: ZodSerializerInterceptor
        }
    ]
})
class OpenApiModule {}

async function exportOpenApi() {
    const app = await NestFactory.create(OpenApiModule, { logger: false });

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

