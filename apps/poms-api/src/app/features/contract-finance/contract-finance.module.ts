import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { Contract } from '../contract/contract.entity';
import { Project } from '../project/project.entity';
import { ContractFinanceController } from './contract-finance.controller';
import { ContractFinanceRepository } from './contract-finance.repository';
import { ContractFinanceService } from './contract-finance.service';
import { PaymentRecord } from './payment-record.entity';
import { ReceiptRecord } from './receipt-record.entity';

@Module({
    imports: [MikroOrmModule.forFeature([Project, Contract, ReceiptRecord, PaymentRecord])],
    controllers: [ContractFinanceController],
    providers: [ContractFinanceRepository, ContractFinanceService],
    exports: [ContractFinanceRepository, ContractFinanceService]
})
export class ContractFinanceModule {}
