import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ApprovalSummaryFieldProjection, ApprovalSummaryPackageDefinition, ApprovalSummarySnapshot } from './approval-summary.entity';
import {
    ApprovalSummaryFieldProjectionRepository,
    ApprovalSummaryPackageDefinitionRepository,
    ApprovalSummarySnapshotRepository
} from './approval-summary.repository';
import { ApprovalSummaryService } from './approval-summary.service';

@Module({
    imports: [MikroOrmModule.forFeature([ApprovalSummaryPackageDefinition, ApprovalSummarySnapshot, ApprovalSummaryFieldProjection])],
    providers: [
        ApprovalSummaryPackageDefinitionRepository,
        ApprovalSummarySnapshotRepository,
        ApprovalSummaryFieldProjectionRepository,
        ApprovalSummaryService
    ],
    exports: [
        ApprovalSummaryPackageDefinitionRepository,
        ApprovalSummarySnapshotRepository,
        ApprovalSummaryFieldProjectionRepository,
        ApprovalSummaryService
    ]
})
export class ApprovalSummaryModule {}
