import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { AttachmentModule } from '../attachment/attachment.module';
import { BusinessNumberModule } from '../business-number/business-number.module';
import { CustomerModule } from '../customer/customer.module';
import { RuntimeAuditModule } from '../../core/runtime-audit/runtime-audit.module';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { LeadSourceController } from './lead-source.controller';
import { LeadController, LeadScoreOverrideController } from './lead.controller';
import { Lead, LeadSource } from './lead.entity';
import { LeadOwnerAssignmentRecord } from './lead-owner-assignment-record.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadRepository } from './lead.repository';
import { LeadScoreOverride, LeadScoreSnapshot } from './lead-score-history.entity';
import { LeadScoreService } from './lead-score.service';
import { LeadService } from './lead.service';

@Module({
    imports: [
        MikroOrmModule.forFeature([Lead, LeadSource, LeadOwnerAssignmentRecord, LeadScoreSnapshot, LeadScoreOverride, Project, PlatformUser, OrgUnit]),
        AttachmentModule,
        BusinessNumberModule,
        CustomerModule,
        RuntimeAuditModule
    ],
    controllers: [LeadController, LeadScoreOverrideController, LeadSourceController],
    providers: [LeadRepository, LeadQueryService, LeadScoreService, LeadService],
    exports: [LeadRepository, LeadQueryService, LeadScoreService, LeadService]
})
export class LeadModule {}
