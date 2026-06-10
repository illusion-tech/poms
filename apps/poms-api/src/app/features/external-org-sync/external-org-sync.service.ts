import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
    ExternalDepartmentMappingStatusValue,
    ExternalOrgSourceStatusValue,
    OrgSyncRunStatusValue,
    type ApplyOrgSyncRunRequest,
    type CreateExternalOrgSourceRequest,
    type CreateOrgSyncRunRequest,
    type ExternalDepartmentMappingList,
    type ExternalDepartmentMappingListQuery,
    type ExternalDepartmentMappingReplacementItem,
    type ExternalDepartmentMappingSummary,
    type ExternalOrgSourceDetail,
    type ExternalOrgSourceList,
    type ExternalOrgSourceListQuery,
    type OrgSyncDiffItemList,
    type OrgSyncDiffItemListQuery,
    type OrgSyncDiffItemSummary,
    type OrgSyncRunDetail,
    type ReplaceExternalDepartmentMappingsRequest,
    type UpdateExternalOrgSourceRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgSource } from './external-org-source.entity';
import { ExternalOrgSyncRepository } from './external-org-sync.repository';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

@Injectable()
export class ExternalOrgSyncService {
    constructor(
        private readonly repository: ExternalOrgSyncRepository,
        private readonly runtimeAuditService: RuntimeAuditService
    ) {}

    async listExternalOrgSources(query: ExternalOrgSourceListQuery = {}): Promise<ExternalOrgSourceList> {
        const sources = await this.repository.findSources(query);
        return sources.map((source) => this.toSourceDetail(source));
    }

    async createExternalOrgSource(request: CreateExternalOrgSourceRequest, operatorId?: string | null): Promise<ExternalOrgSourceDetail> {
        const externalTenantId = request.externalTenantId ?? null;
        const existing = await this.repository.findSourceByProviderTenant(request.provider, externalTenantId);
        if (existing) throw new ConflictException(`External org source already exists for provider ${request.provider} and tenant ${externalTenantId ?? '<default>'}`);

        const providerConfig = await this.requireProviderConfigIfPresent(request.providerConfigId ?? null);
        this.assertProviderConfigMatchesSource(request.provider, providerConfig);
        const authoritativeOrgUnit = await this.requireOrgUnitIfPresent(request.authoritativeOrgUnitId ?? null);

        const source = this.repository.createSource({
            provider: request.provider,
            externalTenantId,
            displayName: request.displayName,
            status: request.status ?? ExternalOrgSourceStatusValue.Draft,
            providerConfigId: providerConfig?.id ?? null,
            authoritativeOrgUnitId: authoritativeOrgUnit?.id ?? null,
            externalRootDepartmentId: request.externalRootDepartmentId ?? null,
            syncScopes: request.syncScopes ?? [],
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });
        this.assertSourceState(source);

        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.created', 'ExternalOrgSource', source.id, operatorId, null, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async getExternalOrgSource(id: string): Promise<ExternalOrgSourceDetail> {
        return this.toSourceDetail(await this.requireSource(id));
    }

    async updateExternalOrgSource(id: string, request: UpdateExternalOrgSourceRequest, operatorId?: string | null): Promise<ExternalOrgSourceDetail> {
        const source = await this.requireSource(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== source.rowVersion) {
            throw new ConflictException(`External org source version conflict: expected ${request.expectedVersion}, actual ${source.rowVersion}`);
        }

        const beforeSnapshot = this.sourceAuditSnapshot(source);

        if (request.displayName !== undefined) source.displayName = request.displayName;
        if (request.status !== undefined) source.status = request.status;
        if (request.providerConfigId !== undefined) {
            const providerConfig = await this.requireProviderConfigIfPresent(request.providerConfigId);
            this.assertProviderConfigMatchesSource(source.provider, providerConfig);
            source.providerConfigId = providerConfig?.id ?? null;
        }
        if (request.authoritativeOrgUnitId !== undefined) {
            const authoritativeOrgUnit = await this.requireOrgUnitIfPresent(request.authoritativeOrgUnitId);
            source.authoritativeOrgUnitId = authoritativeOrgUnit?.id ?? null;
        }
        if (request.externalRootDepartmentId !== undefined) source.externalRootDepartmentId = request.externalRootDepartmentId ?? null;
        if (request.syncScopes !== undefined) source.syncScopes = request.syncScopes;
        source.updatedBy = operatorId ?? null;

        this.assertSourceState(source);
        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.updated', 'ExternalOrgSource', source.id, operatorId, beforeSnapshot, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async listExternalDepartmentMappings(sourceId: string, query: ExternalDepartmentMappingListQuery = {}): Promise<ExternalDepartmentMappingList> {
        await this.requireSource(sourceId);
        const mappings = await this.repository.findMappings(sourceId, query);
        return mappings.map((mapping) => this.toMappingSummary(mapping));
    }

    async replaceExternalDepartmentMappings(sourceId: string, request: ReplaceExternalDepartmentMappingsRequest, operatorId?: string | null): Promise<ExternalDepartmentMappingList> {
        const source = await this.requireSource(sourceId);
        if (request.expectedSourceVersion !== undefined && request.expectedSourceVersion !== source.rowVersion) {
            throw new ConflictException(`External org source version conflict: expected ${request.expectedSourceVersion}, actual ${source.rowVersion}`);
        }

        this.assertUniqueExternalDepartmentIds(request.items);
        await this.assertOrgUnitsExist(request.items.map((item) => item.orgUnitId).filter((value): value is string => Boolean(value)));

        const existingMappings = await this.repository.findMappingsBySourceId(sourceId);
        const beforeSnapshot = {
            sourceId,
            itemCount: existingMappings.length,
            items: existingMappings.map((mapping) => this.mappingAuditSnapshot(mapping))
        };

        const now = new Date();
        const nextMappings = request.items.map((item) =>
            this.repository.createMapping({
                sourceId,
                externalDepartmentId: item.externalDepartmentId,
                externalParentDepartmentId: item.externalParentDepartmentId ?? null,
                externalDepartmentName: item.externalDepartmentName,
                orgUnitId: item.orgUnitId ?? null,
                status: this.resolveMappingStatus(item),
                externalSnapshot: item.externalSnapshot ?? {},
                lastSeenAt: now,
                createdBy: operatorId ?? null,
                updatedBy: operatorId ?? null
            })
        );

        await this.repository.replaceMappings(existingMappings, nextMappings);
        await this.recordAudit(
            'external-department-mapping.replaced',
            'ExternalOrgSource',
            sourceId,
            operatorId,
            beforeSnapshot,
            {
                sourceId,
                itemCount: nextMappings.length,
                items: nextMappings.map((mapping) => this.mappingAuditSnapshot(mapping))
            }
        );

        return nextMappings.map((mapping) => this.toMappingSummary(mapping));
    }

    async createOrgSyncRun(sourceId: string, request: CreateOrgSyncRunRequest = {}, operatorId?: string | null): Promise<OrgSyncRunDetail> {
        const source = await this.requireSource(sourceId);
        if (request.expectedSourceVersion !== undefined && request.expectedSourceVersion !== source.rowVersion) {
            throw new ConflictException(`External org source version conflict: expected ${request.expectedSourceVersion}, actual ${source.rowVersion}`);
        }
        if (source.status !== ExternalOrgSourceStatusValue.Active) {
            throw new BadRequestException('Only active external org sources can create sync runs.');
        }

        const now = new Date();
        const run = this.repository.createRun({
            sourceId,
            status: OrgSyncRunStatusValue.Previewed,
            requestedBy: operatorId ?? null,
            startedAt: now,
            finishedAt: now,
            totalItemCount: 0,
            approvedItemCount: 0,
            skippedItemCount: 0,
            failedItemCount: 0,
            errorSummary: null,
            requestSnapshot: {
                ...(request.requestSnapshot ?? {}),
                adapterStatus: 'pending_ex72d'
            },
            resultSummary: {
                generatedItemCount: 0,
                note: 'EX-72C only creates an empty preview run shell. External adapter and diff generation are handled by EX-72D.'
            },
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });

        await this.repository.saveAll([run]);
        await this.recordAudit('org-sync-run.preview-shell-created', 'OrgSyncRun', run.id, operatorId, null, this.runAuditSnapshot(run));

        return this.toRunDetail(run);
    }

    async getOrgSyncRun(id: string): Promise<OrgSyncRunDetail> {
        return this.toRunDetail(await this.requireRun(id));
    }

    async listOrgSyncDiffItems(runId: string, query: OrgSyncDiffItemListQuery = {}): Promise<OrgSyncDiffItemList> {
        await this.requireRun(runId);
        const items = await this.repository.findDiffItems(runId, query);
        return items.map((item) => this.toDiffItemSummary(item));
    }

    async applyOrgSyncRun(id: string, request: ApplyOrgSyncRunRequest = {}, operatorId?: string | null): Promise<OrgSyncRunDetail> {
        const run = await this.requireRun(id);
        if (request.expectedVersion !== undefined && request.expectedVersion !== run.rowVersion) {
            throw new ConflictException(`Org sync run version conflict: expected ${request.expectedVersion}, actual ${run.rowVersion}`);
        }
        if (run.status !== OrgSyncRunStatusValue.Previewed) {
            throw new BadRequestException('Only previewed org sync runs can be applied.');
        }

        await this.runtimeAuditService.recordAuditLog({
            eventType: 'org-sync-run.apply.rejected',
            targetType: 'OrgSyncRun',
            targetId: run.id,
            operatorId: operatorId ?? null,
            result: 'rejected',
            reason: 'apply-workflow-pending-ex72d',
            beforeSnapshot: this.runAuditSnapshot(run),
            metadata: {
                approvedDiffItemIds: request.approvedDiffItemIds ?? [],
                skippedDiffItemIds: request.skippedDiffItemIds ?? []
            }
        });
        throw new ConflictException('Org sync apply workflow is not available until EX-72D implements adapter-backed diff application.');
    }

    private async requireSource(id: string): Promise<ExternalOrgSource> {
        const source = await this.repository.findSourceById(id);
        if (!source) throw new NotFoundException(`External org source ${id} not found`);
        return source;
    }

    private async requireRun(id: string): Promise<OrgSyncRun> {
        const run = await this.repository.findRunById(id);
        if (!run) throw new NotFoundException(`Org sync run ${id} not found`);
        return run;
    }

    private async requireProviderConfigIfPresent(id: string | null): Promise<IdentityProviderConfig | null> {
        if (!id) return null;
        const config = await this.repository.findProviderConfigById(id);
        if (!config) throw new BadRequestException(`Identity provider config ${id} not found`);
        return config;
    }

    private async requireOrgUnitIfPresent(id: string | null): Promise<OrgUnit | null> {
        if (!id) return null;
        const orgUnit = await this.repository.findOrgUnitById(id);
        if (!orgUnit) throw new BadRequestException(`OrgUnit ${id} not found`);
        return orgUnit;
    }

    private async assertOrgUnitsExist(ids: string[]): Promise<void> {
        const uniqueIds = [...new Set(ids)];
        const orgUnits = await this.repository.findOrgUnitsByIds(uniqueIds);
        const foundIds = new Set(orgUnits.map((orgUnit) => orgUnit.id));
        const missingIds = uniqueIds.filter((id) => !foundIds.has(id));
        if (missingIds.length > 0) throw new BadRequestException(`OrgUnit not found: ${missingIds.join(', ')}`);
    }

    private assertProviderConfigMatchesSource(sourceProvider: string, config: IdentityProviderConfig | null): void {
        if (config && config.provider !== sourceProvider) {
            throw new BadRequestException(`Identity provider config provider ${config.provider} does not match external org source provider ${sourceProvider}`);
        }
    }

    private assertSourceState(source: ExternalOrgSource): void {
        if (source.status === ExternalOrgSourceStatusValue.Active && !source.providerConfigId && !source.externalRootDepartmentId) {
            throw new BadRequestException('Active external org source requires a provider config or external root department id.');
        }
    }

    private assertUniqueExternalDepartmentIds(items: ExternalDepartmentMappingReplacementItem[]): void {
        const seen = new Set<string>();
        for (const item of items) {
            if (seen.has(item.externalDepartmentId)) throw new ConflictException(`Duplicate external department id: ${item.externalDepartmentId}`);
            seen.add(item.externalDepartmentId);
            if ((item.status ?? null) === ExternalDepartmentMappingStatusValue.Mapped && !item.orgUnitId) {
                throw new BadRequestException(`Mapped external department ${item.externalDepartmentId} requires orgUnitId.`);
            }
        }
    }

    private resolveMappingStatus(item: ExternalDepartmentMappingReplacementItem): string {
        return item.status ?? (item.orgUnitId ? ExternalDepartmentMappingStatusValue.Mapped : ExternalDepartmentMappingStatusValue.Unmapped);
    }

    private toSourceDetail(source: ExternalOrgSource): ExternalOrgSourceDetail {
        return {
            id: source.id,
            provider: source.provider as ExternalOrgSourceDetail['provider'],
            externalTenantId: source.externalTenantId ?? null,
            displayName: source.displayName,
            status: source.status as ExternalOrgSourceDetail['status'],
            providerConfigId: source.providerConfigId ?? null,
            authoritativeOrgUnitId: source.authoritativeOrgUnitId ?? null,
            externalRootDepartmentId: source.externalRootDepartmentId ?? null,
            syncScopes: source.syncScopes ?? [],
            rowVersion: source.rowVersion,
            createdAt: source.createdAt.toISOString(),
            createdBy: source.createdBy ?? null,
            updatedAt: source.updatedAt.toISOString(),
            updatedBy: source.updatedBy ?? null
        };
    }

    private toMappingSummary(mapping: ExternalDepartmentMapping): ExternalDepartmentMappingSummary {
        return {
            id: mapping.id,
            sourceId: mapping.sourceId,
            externalDepartmentId: mapping.externalDepartmentId,
            externalParentDepartmentId: mapping.externalParentDepartmentId ?? null,
            externalDepartmentName: mapping.externalDepartmentName,
            orgUnitId: mapping.orgUnitId ?? null,
            status: mapping.status as ExternalDepartmentMappingSummary['status'],
            externalSnapshot: mapping.externalSnapshot ?? {},
            lastSeenAt: mapping.lastSeenAt?.toISOString() ?? null,
            rowVersion: mapping.rowVersion,
            createdAt: mapping.createdAt.toISOString(),
            createdBy: mapping.createdBy ?? null,
            updatedAt: mapping.updatedAt.toISOString(),
            updatedBy: mapping.updatedBy ?? null
        };
    }

    private toRunDetail(run: OrgSyncRun): OrgSyncRunDetail {
        return {
            id: run.id,
            sourceId: run.sourceId,
            status: run.status as OrgSyncRunDetail['status'],
            requestedBy: run.requestedBy ?? null,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt?.toISOString() ?? null,
            totalItemCount: run.totalItemCount,
            approvedItemCount: run.approvedItemCount,
            skippedItemCount: run.skippedItemCount,
            failedItemCount: run.failedItemCount,
            errorSummary: run.errorSummary ?? null,
            requestSnapshot: run.requestSnapshot ?? {},
            resultSummary: run.resultSummary ?? {},
            rowVersion: run.rowVersion,
            createdAt: run.createdAt.toISOString(),
            createdBy: run.createdBy ?? null,
            updatedAt: run.updatedAt.toISOString(),
            updatedBy: run.updatedBy ?? null
        };
    }

    private toDiffItemSummary(item: OrgSyncDiffItem): OrgSyncDiffItemSummary {
        return {
            id: item.id,
            runId: item.runId,
            externalDepartmentId: item.externalDepartmentId,
            action: item.action as OrgSyncDiffItemSummary['action'],
            status: item.status as OrgSyncDiffItemSummary['status'],
            orgUnitId: item.orgUnitId ?? null,
            beforeSnapshot: item.beforeSnapshot ?? null,
            candidateSnapshot: item.candidateSnapshot ?? {},
            errorMessage: item.errorMessage ?? null,
            appliedAt: item.appliedAt?.toISOString() ?? null,
            rowVersion: item.rowVersion,
            createdAt: item.createdAt.toISOString(),
            createdBy: item.createdBy ?? null,
            updatedAt: item.updatedAt.toISOString(),
            updatedBy: item.updatedBy ?? null
        };
    }

    private sourceAuditSnapshot(source: ExternalOrgSource): Record<string, unknown> {
        return {
            provider: source.provider,
            externalTenantId: source.externalTenantId ?? null,
            displayName: source.displayName,
            status: source.status,
            providerConfigId: source.providerConfigId ?? null,
            authoritativeOrgUnitId: source.authoritativeOrgUnitId ?? null,
            externalRootDepartmentId: source.externalRootDepartmentId ?? null,
            syncScopes: source.syncScopes ?? [],
            rowVersion: source.rowVersion
        };
    }

    private mappingAuditSnapshot(mapping: ExternalDepartmentMapping): Record<string, unknown> {
        return {
            id: mapping.id,
            externalDepartmentId: mapping.externalDepartmentId,
            externalParentDepartmentId: mapping.externalParentDepartmentId ?? null,
            externalDepartmentName: mapping.externalDepartmentName,
            orgUnitId: mapping.orgUnitId ?? null,
            status: mapping.status,
            lastSeenAt: mapping.lastSeenAt?.toISOString() ?? null,
            rowVersion: mapping.rowVersion
        };
    }

    private runAuditSnapshot(run: OrgSyncRun): Record<string, unknown> {
        return {
            sourceId: run.sourceId,
            status: run.status,
            requestedBy: run.requestedBy ?? null,
            startedAt: run.startedAt.toISOString(),
            finishedAt: run.finishedAt?.toISOString() ?? null,
            totalItemCount: run.totalItemCount,
            approvedItemCount: run.approvedItemCount,
            skippedItemCount: run.skippedItemCount,
            failedItemCount: run.failedItemCount,
            errorSummary: run.errorSummary ?? null,
            rowVersion: run.rowVersion
        };
    }

    private async recordAudit(eventType: string, targetType: string, targetId: string, operatorId: string | null | undefined, beforeSnapshot: Record<string, unknown> | null, afterSnapshot: Record<string, unknown>): Promise<void> {
        await this.runtimeAuditService.recordAuditLog({
            eventType,
            targetType,
            targetId,
            operatorId: operatorId ?? null,
            result: 'success',
            beforeSnapshot,
            afterSnapshot
        });
    }
}
