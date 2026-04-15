import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ApprovalSummaryModule } from '../approval-summary/approval-summary.module';
import { ContractReadinessModule } from '../contract-readiness/contract-readiness.module';
import { ContractModule } from '../contract/contract.module';
import { ProjectModule } from '../project/project.module';
import { ProjectHandoverController } from './project-handover.controller';
import { ContractHandoverRebaselineRecord, HandoverBaselineImpactItem, ProjectHandover } from './project-handover.entity';
import { ProjectHandoverQueryService } from './project-handover-query.service';
import {
    ContractHandoverRebaselineRecordRepository,
    HandoverBaselineImpactItemRepository,
    ProjectHandoverRepository
} from './project-handover.repository';

@Module({
    imports: [
        MikroOrmModule.forFeature([ProjectHandover, ContractHandoverRebaselineRecord, HandoverBaselineImpactItem]),
        ProjectModule,
        ContractModule,
        ContractReadinessModule,
        ApprovalSummaryModule
    ],
    controllers: [ProjectHandoverController],
    providers: [
        ProjectHandoverRepository,
        ContractHandoverRebaselineRecordRepository,
        HandoverBaselineImpactItemRepository,
        ProjectHandoverQueryService
    ],
    exports: [
        ProjectHandoverRepository,
        ContractHandoverRebaselineRecordRepository,
        HandoverBaselineImpactItemRepository,
        ProjectHandoverQueryService
    ]
})
export class ProjectHandoverModule {}
