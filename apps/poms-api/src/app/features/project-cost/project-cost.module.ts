import { Module } from '@nestjs/common';
import { MikroOrmModule } from '@mikro-orm/nestjs';
import { ContractFinanceModule } from '../contract-finance/contract-finance.module';
import { ExpenseRecord } from './expense-record.entity';
import { InternalCostRateVersion } from './internal-cost-rate-version.entity';
import { ProjectActualCostRecord } from './project-actual-cost-record.entity';
import { ExpenseRecordRepository, InternalCostRateVersionRepository, ProjectActualCostRecordRepository } from './project-cost.repository';
import { ProjectCostService } from './project-cost.service';
import { ProjectCostController } from './project-cost.controller';

@Module({
    imports: [MikroOrmModule.forFeature([ExpenseRecord, InternalCostRateVersion, ProjectActualCostRecord]), ContractFinanceModule],
    controllers: [ProjectCostController],
    providers: [ExpenseRecordRepository, InternalCostRateVersionRepository, ProjectActualCostRecordRepository, ProjectCostService],
    exports: [ExpenseRecordRepository, InternalCostRateVersionRepository, ProjectActualCostRecordRepository, ProjectCostService],
})
export class ProjectCostModule {}
