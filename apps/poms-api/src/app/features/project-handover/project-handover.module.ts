import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ContractHandoverRebaselineRecord, HandoverBaselineImpactItem, ProjectHandover } from './project-handover.entity';
import {
    ContractHandoverRebaselineRecordRepository,
    HandoverBaselineImpactItemRepository,
    ProjectHandoverRepository
} from './project-handover.repository';

@Module({
    imports: [MikroOrmModule.forFeature([ProjectHandover, ContractHandoverRebaselineRecord, HandoverBaselineImpactItem])],
    providers: [ProjectHandoverRepository, ContractHandoverRebaselineRecordRepository, HandoverBaselineImpactItemRepository],
    exports: [ProjectHandoverRepository, ContractHandoverRebaselineRecordRepository, HandoverBaselineImpactItemRepository]
})
export class ProjectHandoverModule {}
