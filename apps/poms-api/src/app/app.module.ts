import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { PersistenceModule } from './core/persistence/persistence.module';
import { RuntimeAuditModule } from './core/runtime-audit/runtime-audit.module';
import { ApprovalModule } from './features/approval/approval.module';
import { CommissionModule } from './features/commission/commission.module';
import { ContractModule } from './features/contract/contract.module';
import { ContractReadinessModule } from './features/contract-readiness/contract-readiness.module';
import { ContractFinanceModule } from './features/contract-finance/contract-finance.module';
import { NavigationModule } from './features/navigation/navigation.module';
import { PlatformModule } from './features/platform/platform.module';
import { ProjectModule } from './features/project/project.module';
import { ProjectCostModule } from './features/project-cost/project-cost.module';
import { ProjectHandoverModule } from './features/project-handover/project-handover.module';

@Module({
    imports: [
        PersistenceModule,
        RuntimeAuditModule,
        AuthModule,
        NavigationModule,
        PlatformModule,
        ProjectModule,
        ProjectCostModule,
        ProjectHandoverModule,
        ApprovalModule,
        ContractReadinessModule,
        ContractModule,
        ContractFinanceModule,
        CommissionModule
    ],
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
