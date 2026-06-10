import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import type { ExternalDepartmentMappingListQuery, ExternalOrgProvider, ExternalOrgSourceListQuery, OrgSyncDiffItemListQuery } from '@poms/shared-contracts';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgSource } from './external-org-source.entity';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

@Injectable()
export class ExternalOrgSyncRepository {
    constructor(
        @InjectRepository(ExternalOrgSource)
        private readonly sourceRepository: EntityRepository<ExternalOrgSource>,
        @InjectRepository(ExternalDepartmentMapping)
        private readonly mappingRepository: EntityRepository<ExternalDepartmentMapping>,
        @InjectRepository(OrgSyncRun)
        private readonly runRepository: EntityRepository<OrgSyncRun>,
        @InjectRepository(OrgSyncDiffItem)
        private readonly diffItemRepository: EntityRepository<OrgSyncDiffItem>,
        @InjectRepository(IdentityProviderConfig)
        private readonly providerConfigRepository: EntityRepository<IdentityProviderConfig>,
        @InjectRepository(OrgUnit)
        private readonly orgUnitRepository: EntityRepository<OrgUnit>
    ) {}

    findSources(query: ExternalOrgSourceListQuery = {}): Promise<ExternalOrgSource[]> {
        return this.sourceRepository.find(
            {
                ...(query.provider ? { provider: query.provider } : {}),
                ...(query.status ? { status: query.status } : {})
            },
            { orderBy: { createdAt: QueryOrder.DESC } }
        );
    }

    findSourceById(id: string): Promise<ExternalOrgSource | null> {
        return this.sourceRepository.findOne({ id });
    }

    findSourceByProviderTenant(provider: ExternalOrgProvider, externalTenantId: string | null): Promise<ExternalOrgSource | null> {
        return this.sourceRepository.findOne({ provider, externalTenantId });
    }

    createSource(input: ConstructorParameters<typeof ExternalOrgSource>[0]): ExternalOrgSource {
        return this.sourceRepository.create(input);
    }

    findProviderConfigById(id: string): Promise<IdentityProviderConfig | null> {
        return this.providerConfigRepository.findOne({ id });
    }

    findOrgUnitById(id: string): Promise<OrgUnit | null> {
        return this.orgUnitRepository.findOne({ id });
    }

    findOrgUnitsByIds(ids: string[]): Promise<OrgUnit[]> {
        if (ids.length === 0) return Promise.resolve([]);
        return this.orgUnitRepository.find({ id: { $in: ids } });
    }

    findMappings(sourceId: string, query: ExternalDepartmentMappingListQuery = {}): Promise<ExternalDepartmentMapping[]> {
        return this.mappingRepository.find(
            {
                sourceId,
                ...(query.status ? { status: query.status } : {}),
                ...(query.externalDepartmentId ? { externalDepartmentId: query.externalDepartmentId } : {}),
                ...(query.orgUnitId ? { orgUnitId: query.orgUnitId } : {})
            },
            { orderBy: { externalDepartmentName: QueryOrder.ASC, createdAt: QueryOrder.ASC } }
        );
    }

    findMappingsBySourceId(sourceId: string): Promise<ExternalDepartmentMapping[]> {
        return this.mappingRepository.find({ sourceId }, { orderBy: { externalDepartmentName: QueryOrder.ASC, createdAt: QueryOrder.ASC } });
    }

    createMapping(input: ConstructorParameters<typeof ExternalDepartmentMapping>[0]): ExternalDepartmentMapping {
        return this.mappingRepository.create(input);
    }

    async replaceMappings(existingMappings: ExternalDepartmentMapping[], nextMappings: ExternalDepartmentMapping[]): Promise<void> {
        const entityManager = this.mappingRepository.getEntityManager();
        for (const mapping of existingMappings) {
            entityManager.remove(mapping);
        }
        entityManager.persist(nextMappings);
        await entityManager.flush();
    }

    createRun(input: ConstructorParameters<typeof OrgSyncRun>[0]): OrgSyncRun {
        return this.runRepository.create(input);
    }

    findRunById(id: string): Promise<OrgSyncRun | null> {
        return this.runRepository.findOne({ id });
    }

    findDiffItems(runId: string, query: OrgSyncDiffItemListQuery = {}): Promise<OrgSyncDiffItem[]> {
        return this.diffItemRepository.find(
            {
                runId,
                ...(query.action ? { action: query.action } : {}),
                ...(query.status ? { status: query.status } : {})
            },
            { orderBy: { createdAt: QueryOrder.ASC } }
        );
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.sourceRepository.getEntityManager().persist(entities).flush();
    }
}
