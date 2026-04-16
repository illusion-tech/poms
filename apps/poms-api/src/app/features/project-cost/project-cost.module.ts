import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ContractFinanceModule } from '../contract-finance/contract-finance.module';
import { ProjectHandoverModule } from '../project-handover/project-handover.module';
import { AccountingTaxTreatmentSnapshot } from './accounting-tax-treatment-snapshot.entity';
import { ChangePackageBaseline } from './change-package-baseline.entity';
import { CostStageAttributionSnapshot } from './cost-stage-attribution-snapshot.entity';
import { ExpenseRecord } from './expense-record.entity';
import { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { OperatingBaselinePackage } from './operating-baseline-package.entity';
import { OperatingRestatementRecord } from './operating-restatement-record.entity';
import { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import { ProjectActualCostRecord } from './project-actual-cost-record.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';
import { SharedCostAllocationBasis } from './shared-cost-allocation-basis.entity';
import { SharedCostAllocationResult } from './shared-cost-allocation-result.entity';
import {
    AccountingTaxTreatmentSnapshotRepository,
    ChangePackageBaselineRepository,
    CostStageAttributionSnapshotRepository,
    ExpenseRecordRepository,
    InternalCostRateVersionRepository,
    OperatingBaselinePackageRepository,
    OperatingRestatementRecordRepository,
    PeriodClosingSnapshotRepository,
    ProjectActualCostRecordRepository,
    ProjectOperatingSnapshotRepository,
    SharedCostAllocationBasisRepository,
    SharedCostAllocationResultRepository
} from './project-cost.repository';
import { ProjectCostService } from './project-cost.service';
import { ProjectCostController } from './project-cost.controller';

@Module({
    imports: [
        MikroOrmModule.forFeature([
            AccountingTaxTreatmentSnapshot,
            ChangePackageBaseline,
            CostStageAttributionSnapshot,
            ExpenseRecord,
            InternalCostRateVersion,
            OperatingBaselinePackage,
            OperatingRestatementRecord,
            PeriodClosingSnapshot,
            ProjectActualCostRecord,
            ProjectOperatingSnapshot,
            SharedCostAllocationBasis,
            SharedCostAllocationResult
        ]),
        ContractFinanceModule,
        ProjectHandoverModule
    ],
    controllers: [ProjectCostController],
    providers: [
        AccountingTaxTreatmentSnapshotRepository,
        ChangePackageBaselineRepository,
        CostStageAttributionSnapshotRepository,
        ExpenseRecordRepository,
        InternalCostRateVersionRepository,
        OperatingBaselinePackageRepository,
        OperatingRestatementRecordRepository,
        PeriodClosingSnapshotRepository,
        ProjectActualCostRecordRepository,
        ProjectOperatingSnapshotRepository,
        SharedCostAllocationBasisRepository,
        SharedCostAllocationResultRepository,
        ProjectCostService
    ],
    exports: [
        AccountingTaxTreatmentSnapshotRepository,
        ChangePackageBaselineRepository,
        CostStageAttributionSnapshotRepository,
        ExpenseRecordRepository,
        InternalCostRateVersionRepository,
        OperatingBaselinePackageRepository,
        OperatingRestatementRecordRepository,
        PeriodClosingSnapshotRepository,
        ProjectActualCostRecordRepository,
        ProjectOperatingSnapshotRepository,
        SharedCostAllocationBasisRepository,
        SharedCostAllocationResultRepository,
        ProjectCostService
    ]
})
export class ProjectCostModule {}
