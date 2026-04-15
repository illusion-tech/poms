import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ApprovalRecord } from '../approval/approval-record.entity';
import { ApprovalModule } from '../approval/approval.module';
import { ContractReadinessModule } from '../contract-readiness/contract-readiness.module';
import { ProjectModule } from '../project/project.module';
import { ContractController } from './contract.controller';
import { Contract, ContractAmendment } from './contract.entity';
import { ContractAmendmentRepository, ContractRepository } from './contract.repository';
import { ContractService } from './contract.service';

@Module({
    imports: [MikroOrmModule.forFeature([Contract, ContractAmendment, ApprovalRecord]), ProjectModule, ApprovalModule, ContractReadinessModule],
    controllers: [ContractController],
    providers: [ContractRepository, ContractAmendmentRepository, ContractService],
    exports: [ContractService, ContractRepository, ContractAmendmentRepository]
})
export class ContractModule {}
