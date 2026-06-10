import { MikroOrmModule } from '@mikro-orm/nestjs';
import { Module } from '@nestjs/common';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgSource } from './external-org-source.entity';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

@Module({
    imports: [MikroOrmModule.forFeature([ExternalOrgSource, ExternalDepartmentMapping, OrgSyncRun, OrgSyncDiffItem])],
    exports: [MikroOrmModule]
})
export class ExternalOrgSyncModule {}
