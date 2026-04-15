import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ApprovalRecord } from '../approval/approval-record.entity';
import { ApprovalModule } from '../approval/approval.module';
import { ContractReadinessModule } from '../contract-readiness/contract-readiness.module';
import { ProjectModule } from '../project/project.module';
import { ContractController } from './contract.controller';
import { Contract, ContractAmendment, ContractTermSnapshot } from './contract.entity';
import { ContractAmendmentRepository, ContractRepository, ContractTermSnapshotRepository } from './contract.repository';
import { ContractService } from './contract.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([Contract, ContractTermSnapshot, ContractAmendment, ApprovalRecord]),
        ProjectModule,
        ApprovalModule,
        ContractReadinessModule
    ],
    controllers: [ContractController],
    providers: [ContractRepository, ContractTermSnapshotRepository, ContractAmendmentRepository, ContractService],
    exports: [ContractService, ContractRepository, ContractTermSnapshotRepository, ContractAmendmentRepository]
})
export class ContractModule {}
