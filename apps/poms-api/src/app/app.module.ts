import { Module } from '@nestjs/common';
import { APP_INTERCEPTOR, APP_PIPE } from '@nestjs/core';
import { ZodSerializerInterceptor, ZodValidationPipe } from 'nestjs-zod';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './core/auth/auth.module';
import { HealthModule } from './core/health/health.module';
import { PersistenceModule } from './core/persistence/persistence.module';
import { RuntimeAuditModule } from './core/runtime-audit/runtime-audit.module';
import { SecretCipherModule } from './core/secret/secret-cipher.module';
import { SensitiveFieldProjectionModule } from './core/sensitive-field-projection/sensitive-field-projection.module';
import { ApprovalModule } from './features/approval/approval.module';
import { ApprovalSummaryModule } from './features/approval-summary/approval-summary.module';
import { AttachmentModule } from './features/attachment/attachment.module';
import { BusinessDiscussionModule } from './features/business-discussion/business-discussion.module';
import { CommissionModule } from './features/commission/commission.module';
import { ContractModule } from './features/contract/contract.module';
import { ContractReadinessModule } from './features/contract-readiness/contract-readiness.module';
import { ContractFinanceModule } from './features/contract-finance/contract-finance.module';
import { CustomerModule } from './features/customer/customer.module';
import { DictionaryModule } from './features/dictionary/dictionary.module';
import { IdentityProviderModule } from './features/identity-provider/identity-provider.module';
import { LeadModule } from './features/lead/lead.module';
import { NavigationModule } from './features/navigation/navigation.module';
import { PlatformModule } from './features/platform/platform.module';
import { ProjectModule } from './features/project/project.module';
import { ProjectCostModule } from './features/project-cost/project-cost.module';
import { ProjectHandoverModule } from './features/project-handover/project-handover.module';
import { SalesFollowUpModule } from './features/sales-follow-up/sales-follow-up.module';
import { SalesIntelligenceModule } from './features/sales-intelligence/sales-intelligence.module';

@Module({
    imports: [
        PersistenceModule,
        RuntimeAuditModule,
        SecretCipherModule,
        SensitiveFieldProjectionModule,
        HealthModule,
        AuthModule,
        NavigationModule,
        PlatformModule,
        AttachmentModule,
        DictionaryModule,
        IdentityProviderModule,
        CustomerModule,
        LeadModule,
        ProjectModule,
        ProjectCostModule,
        ProjectHandoverModule,
        SalesFollowUpModule,
        SalesIntelligenceModule,
        BusinessDiscussionModule,
        ApprovalModule,
        ApprovalSummaryModule,
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
