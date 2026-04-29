import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { BusinessNumberModule } from '../business-number/business-number.module';
import { CustomerModule } from '../customer/customer.module';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { LeadSourceController } from './lead-source.controller';
import { LeadController } from './lead.controller';
import { Lead, LeadSource } from './lead.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

@Module({
    imports: [MikroOrmModule.forFeature([Lead, LeadSource, Project, PlatformUser, OrgUnit]), BusinessNumberModule, CustomerModule],
    controllers: [LeadController, LeadSourceController],
    providers: [LeadRepository, LeadQueryService, LeadService],
    exports: [LeadRepository, LeadQueryService, LeadService]
})
export class LeadModule {}
