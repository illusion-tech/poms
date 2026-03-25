import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { PersistenceModule } from './core/persistence/persistence.module';
import { ApprovalModule } from './features/approval/approval.module';
import { ContractModule } from './features/contract/contract.module';
import { NavigationModule } from './features/navigation/navigation.module';
import { PlatformModule } from './features/platform/platform.module';
import { ProjectModule } from './features/project/project.module';

@Module({
    imports: [PersistenceModule, AuthModule, NavigationModule, PlatformModule, ProjectModule, ApprovalModule, ContractModule],
    controllers: [AppController],
    providers: [
        AppService,
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
export class AppModule {}
