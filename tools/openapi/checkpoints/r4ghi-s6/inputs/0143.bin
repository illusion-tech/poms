import { EntityRepository, QueryOrder } from '@mikro-orm/core';
import { InjectRepository } from '@mikro-orm/nestjs';
import { Injectable } from '@nestjs/common';
import {
    ExternalDepartmentMappingStatusValue,
    OrgSyncDiffActionValue,
    type ExternalDepartmentMappingListQuery,
    type ExternalOrgProvider,
    type ExternalOrgSourceListQuery,
    type OrgSyncDiffItemListQuery,
    type OrgSyncRunListQuery
} from '@poms/shared-contracts';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgSource } from './external-org-source.entity';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

export interface ExternalDepartmentMappingDiffContext {
    run: OrgSyncRun;
    item: OrgSyncDiffItem;
}

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

    findAllOrgUnits(): Promise<OrgUnit[]> {
        return this.orgUnitRepository.findAll({ orderBy: { displayOrder: QueryOrder.ASC, createdAt: QueryOrder.ASC } });
    }

    createOrgUnit(input: ConstructorParameters<typeof OrgUnit>[0]): OrgUnit {
        return this.orgUnitRepository.create(input);
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

    findMappingById(id: string): Promise<ExternalDepartmentMapping | null> {
        return this.mappingRepository.findOne({ id });
    }

    findMappedOrgUnitMapping(sourceId: string, orgUnitId: string): Promise<ExternalDepartmentMapping | null> {
        return this.mappingRepository.findOne({
            sourceId,
            orgUnitId,
            status: ExternalDepartmentMappingStatusValue.Mapped
        });
    }

    findMappingsBySourceId(sourceId: string): Promise<ExternalDepartmentMapping[]> {
        return this.mappingRepository.find({ sourceId }, { orderBy: { externalDepartmentName: QueryOrder.ASC, createdAt: QueryOrder.ASC } });
    }

    async findRecentDiffItemsForMappings(sourceId: string, externalDepartmentIds: string[], runLimit = 20): Promise<ExternalDepartmentMappingDiffContext[]> {
        const uniqueExternalDepartmentIds = [...new Set(externalDepartmentIds.filter((id) => id.trim()))];
        if (uniqueExternalDepartmentIds.length === 0) return [];

        const runs = await this.runRepository.find(
            { sourceId },
            {
                orderBy: { startedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC },
                limit: runLimit
            }
        );
        if (runs.length === 0) return [];

        const runById = new Map(runs.map((run) => [run.id, run]));
        const items = await this.diffItemRepository.find(
            {
                runId: { $in: runs.map((run) => run.id) },
                externalDepartmentId: { $in: uniqueExternalDepartmentIds },
                action: { $in: [OrgSyncDiffActionValue.Conflict, OrgSyncDiffActionValue.DisableOrgUnit] }
            },
            { orderBy: { createdAt: QueryOrder.DESC } }
        );

        return items
            .map((item) => {
                const run = runById.get(item.runId);
                return run ? { run, item } : null;
            })
            .filter((value): value is ExternalDepartmentMappingDiffContext => value !== null)
            .sort((left, right) => {
                const leftStartedAt = left.run.startedAt.getTime();
                const rightStartedAt = right.run.startedAt.getTime();
                if (leftStartedAt !== rightStartedAt) return rightStartedAt - leftStartedAt;
                const leftRunCreatedAt = left.run.createdAt.getTime();
                const rightRunCreatedAt = right.run.createdAt.getTime();
                if (leftRunCreatedAt !== rightRunCreatedAt) return rightRunCreatedAt - leftRunCreatedAt;
                return right.item.createdAt.getTime() - left.item.createdAt.getTime();
            });
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

    findRunsBySourceId(sourceId: string, query: OrgSyncRunListQuery = {}): Promise<OrgSyncRun[]> {
        return this.runRepository.find(
            {
                sourceId,
                ...(query.status ? { status: query.status } : {})
            },
            {
                orderBy: { startedAt: QueryOrder.DESC, createdAt: QueryOrder.DESC },
                limit: query.limit ?? 20
            }
        );
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

    createDiffItem(input: ConstructorParameters<typeof OrgSyncDiffItem>[0]): OrgSyncDiffItem {
        return this.diffItemRepository.create(input);
    }

    async saveAll(entities: object[]): Promise<void> {
        await this.sourceRepository.getEntityManager().persist(entities).flush();
    }
}
