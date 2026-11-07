import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RuntimeAuditModule } from '../../core/runtime-audit/runtime-audit.module';
import { Customer } from '../customer/customer.entity';
import { Lead } from '../lead/lead.entity';
import { Project } from '../project/project.entity';
import {
    CompetitorIntelligenceRecordController,
    CustomerContactController,
    OpportunityStakeholderController,
    SalesDiscoveryRecordController,
    SalesIntelligenceGapController
} from './sales-intelligence.controller';
import { CompetitorIntelligenceRecord, CustomerContact, OpportunityStakeholder, SalesDiscoveryRecord } from './sales-intelligence.entity';
import { SalesIntelligenceRepository } from './sales-intelligence.repository';
import { SalesIntelligenceService } from './sales-intelligence.service';

@Module({
    imports: [MikroOrmModule.forFeature([CustomerContact, OpportunityStakeholder, CompetitorIntelligenceRecord, SalesDiscoveryRecord, Customer, Lead, Project]), RuntimeAuditModule],
    controllers: [CustomerContactController, OpportunityStakeholderController, CompetitorIntelligenceRecordController, SalesDiscoveryRecordController, SalesIntelligenceGapController],
    providers: [SalesIntelligenceRepository, SalesIntelligenceService],
    exports: [SalesIntelligenceRepository, SalesIntelligenceService]
})
export class SalesIntelligenceModule {}
