import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { RuntimeAuditModule } from '../../core/runtime-audit/runtime-audit.module';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgSyncController } from './external-org-sync.controller';
import { ExternalOrgSource } from './external-org-source.entity';
import { ExternalOrgSyncRepository } from './external-org-sync.repository';
import { ExternalOrgSyncService } from './external-org-sync.service';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

@Module({
    imports: [MikroOrmModule.forFeature([ExternalOrgSource, ExternalDepartmentMapping, OrgSyncRun, OrgSyncDiffItem, IdentityProviderConfig, OrgUnit]), RuntimeAuditModule],
    controllers: [ExternalOrgSyncController],
    providers: [ExternalOrgSyncRepository, ExternalOrgSyncService],
    exports: [MikroOrmModule, ExternalOrgSyncService]
})
export class ExternalOrgSyncModule {}
