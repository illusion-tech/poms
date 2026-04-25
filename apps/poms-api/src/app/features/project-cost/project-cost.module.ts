import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { BusinessNumberModule } from '../business-number/business-number.module';
import { ContractFinanceModule } from '../contract-finance/contract-finance.module';
import { ApprovalSummaryModule } from '../approval-summary/approval-summary.module';
import { ProjectHandoverModule } from '../project-handover/project-handover.module';
import { AccountingTaxTreatmentSnapshot } from './accounting-tax-treatment-snapshot.entity';
import { ChangePackageBaseline } from './change-package-baseline.entity';
import { CommissionGateReviewRecord } from './commission-gate-review-record.entity';
import { CostStageAttributionSnapshot } from './cost-stage-attribution-snapshot.entity';
import { DataMaturityEvaluationResult } from './data-maturity-evaluation-result.entity';
import { ExpenseRecord } from './expense-record.entity';
import { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { OperatingBaselinePackage } from './operating-baseline-package.entity';
import { OperatingRestatementRecord } from './operating-restatement-record.entity';
import { OperatingSignalEvaluationResult } from './operating-signal-evaluation-result.entity';
import { OperatingSignalToCommissionGateBinding } from './operating-signal-gate-binding.entity';
import { OperatingSignalReviewRecord } from './operating-signal-review-record.entity';
import { PeriodClosingSnapshot } from './period-closing-snapshot.entity';
import { ProjectActualCostRecord } from './project-actual-cost-record.entity';
import { ProjectOperatingSnapshot } from './project-operating-snapshot.entity';
import { SharedCostAllocationBasis } from './shared-cost-allocation-basis.entity';
import { SharedCostAllocationResult } from './shared-cost-allocation-result.entity';
import {
    AccountingTaxTreatmentSnapshotRepository,
    ChangePackageBaselineRepository,
    CommissionGateReviewRecordRepository,
    CostStageAttributionSnapshotRepository,
    DataMaturityEvaluationResultRepository,
    ExpenseRecordRepository,
    InternalCostRateVersionRepository,
    OperatingBaselinePackageRepository,
    OperatingRestatementRecordRepository,
    OperatingSignalEvaluationResultRepository,
    OperatingSignalReviewRecordRepository,
    OperatingSignalToCommissionGateBindingRepository,
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
            CommissionGateReviewRecord,
            CostStageAttributionSnapshot,
            DataMaturityEvaluationResult,
            ExpenseRecord,
            InternalCostRateVersion,
            OperatingBaselinePackage,
            OperatingRestatementRecord,
            OperatingSignalEvaluationResult,
            OperatingSignalToCommissionGateBinding,
            OperatingSignalReviewRecord,
            PeriodClosingSnapshot,
            ProjectActualCostRecord,
            ProjectOperatingSnapshot,
            SharedCostAllocationBasis,
            SharedCostAllocationResult
        ]),
        BusinessNumberModule,
        ApprovalSummaryModule,
        ContractFinanceModule,
        ProjectHandoverModule
    ],
    controllers: [ProjectCostController],
    providers: [
        AccountingTaxTreatmentSnapshotRepository,
        ChangePackageBaselineRepository,
        CommissionGateReviewRecordRepository,
        CostStageAttributionSnapshotRepository,
        DataMaturityEvaluationResultRepository,
        ExpenseRecordRepository,
        InternalCostRateVersionRepository,
        OperatingBaselinePackageRepository,
        OperatingRestatementRecordRepository,
        OperatingSignalEvaluationResultRepository,
        OperatingSignalReviewRecordRepository,
        OperatingSignalToCommissionGateBindingRepository,
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
        CommissionGateReviewRecordRepository,
        CostStageAttributionSnapshotRepository,
        DataMaturityEvaluationResultRepository,
        ExpenseRecordRepository,
        InternalCostRateVersionRepository,
        OperatingBaselinePackageRepository,
        OperatingRestatementRecordRepository,
        OperatingSignalEvaluationResultRepository,
        OperatingSignalReviewRecordRepository,
        OperatingSignalToCommissionGateBindingRepository,
        PeriodClosingSnapshotRepository,
        ProjectActualCostRecordRepository,
        ProjectOperatingSnapshotRepository,
        SharedCostAllocationBasisRepository,
        SharedCostAllocationResultRepository,
        ProjectCostService
    ]
})
export class ProjectCostModule {}
