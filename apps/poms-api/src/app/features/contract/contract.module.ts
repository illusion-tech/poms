import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ProjectModule } from '../project/project.module';
import { ContractController } from './contract.controller';
import { Contract } from './contract.entity';
import { ContractRepository } from './contract.repository';
import { ContractService } from './contract.service';

@Module({
    imports: [MikroOrmModule.forFeature([Contract]), ProjectModule],
    controllers: [ContractController],
    providers: [ContractRepository, ContractService],
    exports: [ContractService]
})
export class ContractModule {}
