import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { LeadController } from './lead.controller';
import { Lead } from './lead.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

@Module({
    imports: [MikroOrmModule.forFeature([Lead, PlatformUser, OrgUnit])],
    controllers: [LeadController],
    providers: [LeadRepository, LeadQueryService, LeadService],
    exports: [LeadRepository, LeadQueryService, LeadService]
})
export class LeadModule {}
