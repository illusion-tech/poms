import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AttachmentModule } from '../attachment/attachment.module';
import { BusinessNumberModule } from '../business-number/business-number.module';
import { CustomerModule } from '../customer/customer.module';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { LeadSourceController } from './lead-source.controller';
import { LeadController } from './lead.controller';
import { Lead, LeadSource } from './lead.entity';
import { LeadOwnerAssignmentRecord } from './lead-owner-assignment-record.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

@Module({
    imports: [MikroOrmModule.forFeature([Lead, LeadSource, LeadOwnerAssignmentRecord, Project, PlatformUser, OrgUnit]), AttachmentModule, BusinessNumberModule, CustomerModule],
    controllers: [LeadController, LeadSourceController],
    providers: [LeadRepository, LeadQueryService, LeadService],
    exports: [LeadRepository, LeadQueryService, LeadService]
})
export class LeadModule {}
