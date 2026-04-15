import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ApprovalModule } from '../approval/approval.module';
import { ApprovalSummaryModule } from '../approval-summary/approval-summary.module';
import { ContractReadinessModule } from '../contract-readiness/contract-readiness.module';
import { ContractModule } from '../contract/contract.module';
import { ProjectModule } from '../project/project.module';
import { ProjectHandoverController } from './project-handover.controller';
import {
    ContractHandoverRebaselineRecord,
    HandoverBaselineImpactItem,
    ProjectHandover,
    ProjectReceiptJudgmentFreeze
} from './project-handover.entity';
import { ProjectHandoverCommandService } from './project-handover-command.service';
import { ProjectHandoverQueryService } from './project-handover-query.service';
import {
    ContractHandoverRebaselineRecordRepository,
    HandoverBaselineImpactItemRepository,
    ProjectHandoverRepository,
    ProjectReceiptJudgmentFreezeRepository
} from './project-handover.repository';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            ProjectHandover,
            ContractHandoverRebaselineRecord,
            HandoverBaselineImpactItem,
            ProjectReceiptJudgmentFreeze
        ]),
        ApprovalModule,
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
        ProjectReceiptJudgmentFreezeRepository,
        ProjectHandoverCommandService,
        ProjectHandoverQueryService
    ],
    exports: [
        ProjectHandoverRepository,
        ContractHandoverRebaselineRecordRepository,
        HandoverBaselineImpactItemRepository,
        ProjectReceiptJudgmentFreezeRepository,
        ProjectHandoverCommandService,
        ProjectHandoverQueryService
    ]
})
export class ProjectHandoverModule {}
