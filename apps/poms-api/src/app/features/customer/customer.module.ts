import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { BusinessNumberModule } from '../business-number/business-number.module';
import { Contract } from '../contract/contract.entity';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { CustomerController } from './customer.controller';
import { Customer, CustomerAlias } from './customer.entity';
import { CustomerRepository } from './customer.repository';
import { CustomerService } from './customer.service';

@Module({
    imports: [MikroOrmModule.forFeature([Customer, CustomerAlias, PlatformUser, OrgUnit, Lead, Project, Contract]), BusinessNumberModule],
    controllers: [CustomerController],
    providers: [CustomerRepository, CustomerService],
    exports: [CustomerRepository, CustomerService]
})
export class CustomerModule {}
