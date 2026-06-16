import { createHash } from 'node:crypto';
import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import {
    ExternalDepartmentMappingStatusValue,
    ExternalOrgProviderValue,
    ExternalOrgSourceStatusValue,
    IdentityProviderConfigStatusValue,
    OrgSyncDiffActionValue,
    OrgSyncDiffItemStatusValue,
    OrgSyncRunStatusValue,
    type ActivateExternalOrgSourceRequest,
    type ArchiveExternalOrgSourceRequest,
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
    type OrgSyncRunDiagnosticSummary,
    type OrgSyncRunDetail,
    type OrgSyncRunList,
    type OrgSyncRunListQuery,
    type PauseExternalOrgSourceRequest,
    type ReplaceExternalDepartmentMappingsRequest,
    type UpdateExternalOrgSourceRequest
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS } from '../identity-provider/identity-provider-secret.constants';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import type { ExternalDepartmentSnapshot } from './external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterError } from './external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterRegistry } from './external-org-directory-adapter.registry';
import { ExternalOrgSource } from './external-org-source.entity';
import { ExternalOrgSyncRepository } from './external-org-sync.repository';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

type JsonObject = Record<string, unknown>;

interface CreateOrgUnitCandidateSnapshot extends JsonObject {
    externalDepartmentId: string;
    externalParentDepartmentId: string | null;
    externalDepartmentName: string;
    targetName: string;
    targetCode: string;
    targetParentOrgUnitId: string | null;
    targetParentExternalDepartmentId: string | null;
    displayOrder: number;
    externalSnapshot: JsonObject;
}

interface UpdateOrgUnitCandidateSnapshot extends JsonObject {
    targetName?: string;
    targetParentOrgUnitId?: string | null;
    targetParentExternalDepartmentId?: string | null;
    displayOrder?: number;
}

interface ApplyDiffItemInput {
    source: ExternalOrgSource;
    item: OrgSyncDiffItem;
    mappings: ExternalDepartmentMapping[];
    orgUnits: OrgUnit[];
    createdOrgUnitIdsByExternalDepartmentId: Map<string, string>;
    operatorId: string | null;
    entitiesToSave: object[];
}

const FEISHU_ROOT_DEPARTMENT_ID = '0';

@Injectable()
export class ExternalOrgSyncService {
    constructor(
        private readonly repository: ExternalOrgSyncRepository,
        private readonly runtimeAuditService: RuntimeAuditService,
        private readonly adapterRegistry: ExternalOrgDirectoryAdapterRegistry,
        private readonly secretCipherService: SecretCipherService
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
            status: ExternalOrgSourceStatusValue.Draft,
            providerConfigId: providerConfig?.id ?? null,
            authoritativeOrgUnitId: authoritativeOrgUnit?.id ?? null,
            externalRootDepartmentId: request.externalRootDepartmentId ?? null,
            syncScopes: request.syncScopes ?? [],
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });
        this.assertSourceState(source, providerConfig);

        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.created', 'ExternalOrgSource', source.id, operatorId, null, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async getExternalOrgSource(id: string): Promise<ExternalOrgSourceDetail> {
        return this.toSourceDetail(await this.requireSource(id));
    }

    async updateExternalOrgSource(id: string, request: UpdateExternalOrgSourceRequest, operatorId?: string | null): Promise<ExternalOrgSourceDetail> {
        const source = await this.requireSource(id);
        this.assertSourceEditable(source);
        if (request.expectedVersion !== undefined && request.expectedVersion !== source.rowVersion) {
            throw new ConflictException(`External org source version conflict: expected ${request.expectedVersion}, actual ${source.rowVersion}`);
        }

        const beforeSnapshot = this.sourceAuditSnapshot(source);

        if (request.displayName !== undefined) source.displayName = request.displayName;
        let providerConfig: IdentityProviderConfig | null = null;
        if (request.providerConfigId !== undefined) {
            providerConfig = await this.requireProviderConfigIfPresent(request.providerConfigId);
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

        if (source.status === ExternalOrgSourceStatusValue.Active && request.providerConfigId === undefined) {
            providerConfig = await this.requireProviderConfigIfPresent(source.providerConfigId ?? null);
        }
        this.assertSourceState(source, providerConfig);
        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.updated', 'ExternalOrgSource', source.id, operatorId, beforeSnapshot, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async activateExternalOrgSource(id: string, request: ActivateExternalOrgSourceRequest = {}, operatorId?: string | null): Promise<ExternalOrgSourceDetail> {
        const source = await this.requireSourceForLifecycleCommand(id, request.expectedVersion);
        if (source.status === ExternalOrgSourceStatusValue.Archived) {
            throw new BadRequestException('Archived external org sources cannot be activated.');
        }
        const providerConfig = await this.requireProviderConfigIfPresent(source.providerConfigId ?? null);
        const beforeSnapshot = this.sourceAuditSnapshot(source);

        source.status = ExternalOrgSourceStatusValue.Active;
        source.updatedBy = operatorId ?? null;
        this.assertSourceState(source, providerConfig);

        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.activated', 'ExternalOrgSource', source.id, operatorId, beforeSnapshot, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async pauseExternalOrgSource(id: string, request: PauseExternalOrgSourceRequest = {}, operatorId?: string | null): Promise<ExternalOrgSourceDetail> {
        const source = await this.requireSourceForLifecycleCommand(id, request.expectedVersion);
        if (source.status !== ExternalOrgSourceStatusValue.Active) {
            throw new BadRequestException('Only active external org sources can be paused.');
        }
        const beforeSnapshot = this.sourceAuditSnapshot(source);

        source.status = ExternalOrgSourceStatusValue.Paused;
        source.updatedBy = operatorId ?? null;

        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.paused', 'ExternalOrgSource', source.id, operatorId, beforeSnapshot, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async archiveExternalOrgSource(id: string, request: ArchiveExternalOrgSourceRequest = {}, operatorId?: string | null): Promise<ExternalOrgSourceDetail> {
        const source = await this.requireSourceForLifecycleCommand(id, request.expectedVersion);
        if (source.status === ExternalOrgSourceStatusValue.Active) {
            throw new BadRequestException('Active external org sources must be paused before archiving.');
        }
        if (source.status === ExternalOrgSourceStatusValue.Archived) {
            return this.toSourceDetail(source);
        }
        const beforeSnapshot = this.sourceAuditSnapshot(source);

        source.status = ExternalOrgSourceStatusValue.Archived;
        source.updatedBy = operatorId ?? null;

        await this.repository.saveAll([source]);
        await this.recordAudit('external-org-source.archived', 'ExternalOrgSource', source.id, operatorId, beforeSnapshot, this.sourceAuditSnapshot(source));

        return this.toSourceDetail(source);
    }

    async listExternalDepartmentMappings(sourceId: string, query: ExternalDepartmentMappingListQuery = {}): Promise<ExternalDepartmentMappingList> {
        await this.requireSource(sourceId);
        const mappings = await this.repository.findMappings(sourceId, query);
        return mappings.map((mapping) => this.toMappingSummary(mapping));
    }

    async replaceExternalDepartmentMappings(sourceId: string, request: ReplaceExternalDepartmentMappingsRequest, operatorId?: string | null): Promise<ExternalDepartmentMappingList> {
        const source = await this.requireSource(sourceId);
        this.assertSourceEditable(source);
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
        await this.recordAudit('external-department-mapping.replaced', 'ExternalOrgSource', sourceId, operatorId, beforeSnapshot, {
            sourceId,
            itemCount: nextMappings.length,
            items: nextMappings.map((mapping) => this.mappingAuditSnapshot(mapping))
        });

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
        const providerConfig = await this.requireProviderConfigForSync(source);

        const now = new Date();
        const run = this.repository.createRun({
            sourceId,
            status: OrgSyncRunStatusValue.Previewing,
            requestedBy: operatorId ?? null,
            startedAt: now,
            finishedAt: null,
            totalItemCount: 0,
            approvedItemCount: 0,
            skippedItemCount: 0,
            failedItemCount: 0,
            errorSummary: null,
            requestSnapshot: {
                ...(request.requestSnapshot ?? {}),
                provider: source.provider,
                providerConfigId: providerConfig.id,
                externalRootDepartmentId: this.sourceRootDepartmentId(source),
                adapterStatus: 'previewing'
            },
            resultSummary: {},
            createdBy: operatorId ?? null,
            updatedBy: operatorId ?? null
        });

        await this.repository.saveAll([run]);
        await this.recordAudit('org-sync-run.preview-started', 'OrgSyncRun', run.id, operatorId, null, this.runAuditSnapshot(run));

        try {
            const departments = await this.adapterRegistry.get(source.provider).fetchDepartmentTree({
                source,
                providerConfig,
                clientSecret: this.decryptProviderSecret(providerConfig)
            });
            const { mappings, diffItems, summary } = await this.buildPreviewDiff(source, run, departments, operatorId ?? null);
            const finishedAt = new Date();
            run.status = OrgSyncRunStatusValue.Previewed;
            run.finishedAt = finishedAt;
            run.totalItemCount = diffItems.length;
            run.approvedItemCount = 0;
            run.skippedItemCount = diffItems.filter((item) => item.status === OrgSyncDiffItemStatusValue.Skipped).length;
            run.failedItemCount = 0;
            run.errorSummary = null;
            run.requestSnapshot = {
                ...(run.requestSnapshot ?? {}),
                adapterStatus: 'previewed',
                externalDepartmentCount: departments.length
            };
            run.resultSummary = summary;
            run.updatedBy = operatorId ?? null;

            await this.repository.saveAll([run, ...mappings, ...diffItems]);
            await this.recordAudit('org-sync-run.previewed', 'OrgSyncRun', run.id, operatorId, null, this.runAuditSnapshot(run));

            return this.toRunDetail(run);
        } catch (error) {
            const message = this.safeErrorMessage(error, 'External org sync preview failed.');
            run.status = OrgSyncRunStatusValue.Failed;
            run.finishedAt = new Date();
            run.errorSummary = message;
            const diagnosticSummary = this.buildRunDiagnosticSummary(run, error, message);
            run.requestSnapshot = {
                ...(run.requestSnapshot ?? {}),
                adapterStatus: error instanceof ExternalOrgDirectoryAdapterError ? 'adapter_failed' : 'preview_failed'
            };
            run.resultSummary = {
                failedAt: run.finishedAt.toISOString(),
                diagnosticSummary
            };
            run.updatedBy = operatorId ?? null;

            await this.repository.saveAll([run]);
            await this.runtimeAuditService.recordAuditLog({
                eventType: 'org-sync-run.preview.failed',
                targetType: 'OrgSyncRun',
                targetId: run.id,
                operatorId: operatorId ?? null,
                result: 'failed',
                reason: message,
                beforeSnapshot: null,
                afterSnapshot: this.runAuditSnapshot(run)
            });

            return this.toRunDetail(run);
        }
    }

    async listOrgSyncRuns(sourceId: string, query: OrgSyncRunListQuery = {}): Promise<OrgSyncRunList> {
        await this.requireSource(sourceId);
        const runs = await this.repository.findRunsBySourceId(sourceId, query);
        return runs.map((run) => this.toRunDetail(run));
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

        const beforeSnapshot = this.runAuditSnapshot(run);
        const source = await this.requireSource(run.sourceId);
        const mappings = await this.repository.findMappingsBySourceId(source.id);
        const orgUnits = await this.repository.findAllOrgUnits();
        const diffItems = await this.repository.findDiffItems(run.id, {});
        const skippedIds = new Set(request.skippedDiffItemIds ?? []);
        const approvedIds = new Set(request.approvedDiffItemIds ?? []);
        const explicitApproval = approvedIds.size > 0;
        const createdOrgUnitIdsByExternalDepartmentId = new Map<string, string>();
        const entitiesToSave: object[] = [run];

        run.status = OrgSyncRunStatusValue.Applying;
        run.updatedBy = operatorId ?? null;
        await this.repository.saveAll([run]);

        let appliedCount = 0;
        let skippedCount = 0;
        let failedCount = 0;

        for (const item of this.sortDiffItemsForApply(diffItems)) {
            const shouldSkip =
                skippedIds.has(item.id) || item.status !== OrgSyncDiffItemStatusValue.Pending || item.action === OrgSyncDiffActionValue.Conflict || item.action === OrgSyncDiffActionValue.Ignore || (explicitApproval && !approvedIds.has(item.id));

            if (shouldSkip) {
                item.status = OrgSyncDiffItemStatusValue.Skipped;
                item.updatedBy = operatorId ?? null;
                skippedCount += 1;
                entitiesToSave.push(item);
                continue;
            }

            try {
                await this.applyDiffItem({
                    source,
                    item,
                    mappings,
                    orgUnits,
                    createdOrgUnitIdsByExternalDepartmentId,
                    operatorId: operatorId ?? null,
                    entitiesToSave
                });
                item.status = OrgSyncDiffItemStatusValue.Applied;
                item.appliedAt = new Date();
                item.errorMessage = null;
                item.updatedBy = operatorId ?? null;
                appliedCount += 1;
                entitiesToSave.push(item);
            } catch (error) {
                item.status = OrgSyncDiffItemStatusValue.Failed;
                item.errorMessage = this.safeErrorMessage(error, 'Org sync diff item apply failed.');
                item.updatedBy = operatorId ?? null;
                failedCount += 1;
                entitiesToSave.push(item);
            }
        }

        run.status = failedCount > 0 ? OrgSyncRunStatusValue.Failed : OrgSyncRunStatusValue.Applied;
        run.finishedAt = new Date();
        run.approvedItemCount = appliedCount;
        run.skippedItemCount = skippedCount;
        run.failedItemCount = failedCount;
        run.errorSummary = failedCount > 0 ? `${failedCount} org sync diff item(s) failed.` : null;
        run.resultSummary = {
            appliedItemCount: appliedCount,
            skippedItemCount: skippedCount,
            failedItemCount: failedCount,
            explicitApproval
        };
        run.updatedBy = operatorId ?? null;

        await this.repository.saveAll(entitiesToSave);
        await this.runtimeAuditService.recordAuditLog({
            eventType: failedCount > 0 ? 'org-sync-run.apply.failed' : 'org-sync-run.applied',
            targetType: 'OrgSyncRun',
            targetId: run.id,
            operatorId: operatorId ?? null,
            result: failedCount > 0 ? 'failed' : 'success',
            beforeSnapshot,
            afterSnapshot: this.runAuditSnapshot(run),
            metadata: {
                approvedDiffItemIds: request.approvedDiffItemIds ?? [],
                skippedDiffItemIds: request.skippedDiffItemIds ?? []
            }
        });

        return this.toRunDetail(run);
    }

    private async requireSource(id: string): Promise<ExternalOrgSource> {
        const source = await this.repository.findSourceById(id);
        if (!source) throw new NotFoundException(`External org source ${id} not found`);
        return source;
    }

    private async requireSourceForLifecycleCommand(id: string, expectedVersion?: number): Promise<ExternalOrgSource> {
        const source = await this.requireSource(id);
        if (expectedVersion !== undefined && expectedVersion !== source.rowVersion) {
            throw new ConflictException(`External org source version conflict: expected ${expectedVersion}, actual ${source.rowVersion}`);
        }
        return source;
    }

    private assertSourceEditable(source: ExternalOrgSource): void {
        if (source.status === ExternalOrgSourceStatusValue.Archived) {
            throw new BadRequestException('Archived external org sources are read-only.');
        }
    }

    private async requireRun(id: string): Promise<OrgSyncRun> {
        const run = await this.repository.findRunById(id);
        if (!run) throw new NotFoundException(`Org sync run ${id} not found`);
        return run;
    }

    private async requireProviderConfigIfPresent(id: string | null): Promise<IdentityProviderConfig | null> {
        if (!id) return null;
        return this.requireProviderConfig(id);
    }

    private async requireProviderConfig(id: string): Promise<IdentityProviderConfig> {
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

    private assertSourceState(source: ExternalOrgSource, providerConfig: IdentityProviderConfig | null): void {
        if (source.status !== ExternalOrgSourceStatusValue.Active) return;
        if (source.provider !== ExternalOrgProviderValue.Feishu) {
            throw new BadRequestException('当前外部平台尚未支持组织同步，请先保持为草稿。');
        }
        if (!source.providerConfigId || !providerConfig) {
            throw new BadRequestException('启用外部组织同步源前，请先选择已启用且已配置 Client Secret 的企业协同接入。');
        }

        this.assertProviderConfigMatchesSource(source.provider, providerConfig);
        this.assertProviderConfigReadyForOrgSync(providerConfig);
    }

    private async requireProviderConfigForSync(source: ExternalOrgSource): Promise<IdentityProviderConfig> {
        if (source.provider !== ExternalOrgProviderValue.Feishu) {
            throw new BadRequestException(`External org sync is not supported for provider ${source.provider} yet.`);
        }
        if (!source.providerConfigId) {
            throw new BadRequestException('Active external org source requires a provider config before creating sync runs.');
        }

        const providerConfig = await this.requireProviderConfig(source.providerConfigId);
        this.assertProviderConfigMatchesSource(source.provider, providerConfig);
        this.assertProviderConfigReadyForOrgSync(providerConfig);

        return providerConfig;
    }

    private assertProviderConfigReadyForOrgSync(providerConfig: IdentityProviderConfig): void {
        if (!providerConfig.enabled) {
            throw new BadRequestException('所选企业协同接入总开关未启用，不能用于外部组织同步。');
        }
        if (!providerConfig.encryptedClientSecret) {
            throw new BadRequestException('所选企业协同接入缺少 Client Secret，不能用于外部组织同步。');
        }
        if (providerConfig.status !== IdentityProviderConfigStatusValue.Active) {
            throw new BadRequestException(`所选企业协同接入状态为「${this.providerConfigStatusLabel(providerConfig.status)}」，尚未就绪，不能用于外部组织同步。`);
        }
    }

    private providerConfigStatusLabel(status: string): string {
        const labels: Record<string, string> = {
            [IdentityProviderConfigStatusValue.Draft]: '草稿',
            [IdentityProviderConfigStatusValue.Active]: '启用',
            [IdentityProviderConfigStatusValue.Disabled]: '停用',
            [IdentityProviderConfigStatusValue.Misconfigured]: '配置异常'
        };
        return labels[status] ?? status;
    }

    private decryptProviderSecret(providerConfig: IdentityProviderConfig): string {
        if (!providerConfig.encryptedClientSecret) {
            throw new BadRequestException('Identity provider client secret is required before external org sync.');
        }

        return this.secretCipherService.decrypt(providerConfig.encryptedClientSecret, IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS);
    }

    private async buildPreviewDiff(
        source: ExternalOrgSource,
        run: OrgSyncRun,
        departments: ExternalDepartmentSnapshot[],
        operatorId: string | null
    ): Promise<{
        mappings: ExternalDepartmentMapping[];
        diffItems: OrgSyncDiffItem[];
        summary: JsonObject;
    }> {
        const now = new Date();
        const existingMappings = await this.repository.findMappingsBySourceId(source.id);
        const orgUnits = await this.repository.findAllOrgUnits();
        const mappingByExternalDepartmentId = new Map(existingMappings.map((mapping) => [mapping.externalDepartmentId, mapping]));
        const departmentById = new Map(departments.map((department) => [department.externalDepartmentId, department]));
        const mappingsToSave: ExternalDepartmentMapping[] = [];
        const diffItems: OrgSyncDiffItem[] = [];
        const plannedCreateExternalDepartmentIds = new Set<string>();

        for (const department of departments) {
            const mapping =
                mappingByExternalDepartmentId.get(department.externalDepartmentId) ??
                this.repository.createMapping({
                    sourceId: source.id,
                    externalDepartmentId: department.externalDepartmentId,
                    externalParentDepartmentId: department.externalParentDepartmentId,
                    externalDepartmentName: department.externalDepartmentName,
                    orgUnitId: null,
                    status: ExternalDepartmentMappingStatusValue.Unmapped,
                    externalSnapshot: department.raw,
                    lastSeenAt: now,
                    createdBy: operatorId,
                    updatedBy: operatorId
                });

            mapping.externalParentDepartmentId = department.externalParentDepartmentId;
            mapping.externalDepartmentName = department.externalDepartmentName;
            mapping.externalSnapshot = department.raw;
            mapping.lastSeenAt = now;
            mapping.updatedBy = operatorId;
            if (!mapping.orgUnitId && mapping.status === ExternalDepartmentMappingStatusValue.Mapped) {
                mapping.status = ExternalDepartmentMappingStatusValue.Unmapped;
            }
            mappingsToSave.push(mapping);

            const diffItem = this.buildDiffItemForSeenDepartment({
                source,
                run,
                department,
                mapping,
                existingMappings,
                orgUnits,
                departmentById,
                plannedCreateExternalDepartmentIds,
                operatorId
            });
            if (diffItem) {
                diffItems.push(diffItem);
                if (diffItem.action === OrgSyncDiffActionValue.CreateOrgUnit) {
                    plannedCreateExternalDepartmentIds.add(department.externalDepartmentId);
                }
            }
        }

        for (const mapping of existingMappings) {
            if (departmentById.has(mapping.externalDepartmentId) || mapping.status === ExternalDepartmentMappingStatusValue.Ignored || !mapping.orgUnitId) continue;
            const orgUnit = orgUnits.find((candidate) => candidate.id === mapping.orgUnitId);
            diffItems.push(
                this.repository.createDiffItem({
                    runId: run.id,
                    externalDepartmentId: mapping.externalDepartmentId,
                    action: orgUnit ? OrgSyncDiffActionValue.DisableOrgUnit : OrgSyncDiffActionValue.Conflict,
                    status: orgUnit ? OrgSyncDiffItemStatusValue.Pending : OrgSyncDiffItemStatusValue.Pending,
                    orgUnitId: mapping.orgUnitId,
                    beforeSnapshot: orgUnit ? this.orgUnitSnapshot(orgUnit) : null,
                    candidateSnapshot: {
                        externalDepartmentId: mapping.externalDepartmentId,
                        externalDepartmentName: mapping.externalDepartmentName,
                        reason: orgUnit ? 'external_department_missing' : 'mapped_org_unit_missing'
                    },
                    errorMessage: orgUnit ? null : 'Mapped OrgUnit was not found.',
                    appliedAt: null,
                    createdBy: operatorId,
                    updatedBy: operatorId
                })
            );
        }

        return {
            mappings: mappingsToSave,
            diffItems,
            summary: this.previewSummary(departments, diffItems)
        };
    }

    private buildDiffItemForSeenDepartment(input: {
        source: ExternalOrgSource;
        run: OrgSyncRun;
        department: ExternalDepartmentSnapshot;
        mapping: ExternalDepartmentMapping;
        existingMappings: ExternalDepartmentMapping[];
        orgUnits: OrgUnit[];
        departmentById: Map<string, ExternalDepartmentSnapshot>;
        plannedCreateExternalDepartmentIds: Set<string>;
        operatorId: string | null;
    }): OrgSyncDiffItem | null {
        const { source, run, department, mapping, existingMappings, orgUnits, departmentById, plannedCreateExternalDepartmentIds, operatorId } = input;
        if (mapping.status === ExternalDepartmentMappingStatusValue.Ignored) return null;

        if (!department.isActive) {
            if (!mapping.orgUnitId) return null;
            const orgUnit = orgUnits.find((candidate) => candidate.id === mapping.orgUnitId);
            return this.repository.createDiffItem({
                runId: run.id,
                externalDepartmentId: department.externalDepartmentId,
                action: orgUnit ? OrgSyncDiffActionValue.DisableOrgUnit : OrgSyncDiffActionValue.Conflict,
                status: OrgSyncDiffItemStatusValue.Pending,
                orgUnitId: mapping.orgUnitId,
                beforeSnapshot: orgUnit ? this.orgUnitSnapshot(orgUnit) : null,
                candidateSnapshot: {
                    externalDepartmentId: department.externalDepartmentId,
                    externalDepartmentName: department.externalDepartmentName,
                    reason: orgUnit ? 'external_department_inactive' : 'mapped_org_unit_missing'
                },
                errorMessage: orgUnit ? null : 'Mapped OrgUnit was not found.',
                appliedAt: null,
                createdBy: operatorId,
                updatedBy: operatorId
            });
        }

        const parentResolution = this.resolveTargetParent({
            source,
            department,
            mappings: existingMappings,
            orgUnits,
            departmentById,
            plannedCreateExternalDepartmentIds
        });

        if (!mapping.orgUnitId) {
            if (parentResolution.errorMessage) {
                return this.createConflictDiffItem(run, department, parentResolution.errorMessage, operatorId);
            }

            const candidateSnapshot: CreateOrgUnitCandidateSnapshot = {
                externalDepartmentId: department.externalDepartmentId,
                externalParentDepartmentId: department.externalParentDepartmentId,
                externalDepartmentName: department.externalDepartmentName,
                targetName: department.externalDepartmentName,
                targetCode: this.buildExternalOrgUnitCode(source, department.externalDepartmentId),
                targetParentOrgUnitId: parentResolution.parentOrgUnitId,
                targetParentExternalDepartmentId: parentResolution.parentExternalDepartmentId,
                displayOrder: department.displayOrder ?? this.resolveNextDisplayOrder(orgUnits, parentResolution.parentOrgUnitId),
                externalSnapshot: department.raw
            };

            return this.repository.createDiffItem({
                runId: run.id,
                externalDepartmentId: department.externalDepartmentId,
                action: OrgSyncDiffActionValue.CreateOrgUnit,
                status: OrgSyncDiffItemStatusValue.Pending,
                orgUnitId: null,
                beforeSnapshot: null,
                candidateSnapshot,
                errorMessage: null,
                appliedAt: null,
                createdBy: operatorId,
                updatedBy: operatorId
            });
        }

        const orgUnit = orgUnits.find((candidate) => candidate.id === mapping.orgUnitId);
        if (!orgUnit) return this.createConflictDiffItem(run, department, 'Mapped OrgUnit was not found.', operatorId, mapping.orgUnitId);
        if (!orgUnit.isActive) return this.createConflictDiffItem(run, department, 'Mapped OrgUnit is inactive.', operatorId, orgUnit.id);
        if (parentResolution.errorMessage) return this.createConflictDiffItem(run, department, parentResolution.errorMessage, operatorId, orgUnit.id);

        if (department.externalDepartmentName !== orgUnit.name) {
            return this.repository.createDiffItem({
                runId: run.id,
                externalDepartmentId: department.externalDepartmentId,
                action: OrgSyncDiffActionValue.UpdateOrgUnit,
                status: OrgSyncDiffItemStatusValue.Pending,
                orgUnitId: orgUnit.id,
                beforeSnapshot: this.orgUnitSnapshot(orgUnit),
                candidateSnapshot: {
                    targetName: department.externalDepartmentName
                } satisfies UpdateOrgUnitCandidateSnapshot,
                errorMessage: null,
                appliedAt: null,
                createdBy: operatorId,
                updatedBy: operatorId
            });
        }

        if ((orgUnit.parentId ?? null) !== parentResolution.parentOrgUnitId || (department.displayOrder !== null && department.displayOrder !== orgUnit.displayOrder)) {
            return this.repository.createDiffItem({
                runId: run.id,
                externalDepartmentId: department.externalDepartmentId,
                action: OrgSyncDiffActionValue.MoveOrgUnit,
                status: OrgSyncDiffItemStatusValue.Pending,
                orgUnitId: orgUnit.id,
                beforeSnapshot: this.orgUnitSnapshot(orgUnit),
                candidateSnapshot: {
                    targetParentOrgUnitId: parentResolution.parentOrgUnitId,
                    targetParentExternalDepartmentId: parentResolution.parentExternalDepartmentId,
                    displayOrder: department.displayOrder ?? orgUnit.displayOrder
                } satisfies UpdateOrgUnitCandidateSnapshot,
                errorMessage: null,
                appliedAt: null,
                createdBy: operatorId,
                updatedBy: operatorId
            });
        }

        return null;
    }

    private resolveTargetParent(input: {
        source: ExternalOrgSource;
        department: ExternalDepartmentSnapshot;
        mappings: ExternalDepartmentMapping[];
        orgUnits: OrgUnit[];
        departmentById: Map<string, ExternalDepartmentSnapshot>;
        plannedCreateExternalDepartmentIds: Set<string>;
    }): {
        parentOrgUnitId: string | null;
        parentExternalDepartmentId: string | null;
        errorMessage: string | null;
    } {
        const parentExternalDepartmentId = input.department.externalParentDepartmentId ?? this.sourceRootDepartmentId(input.source);
        if (parentExternalDepartmentId === this.sourceRootDepartmentId(input.source)) {
            return { parentOrgUnitId: input.source.authoritativeOrgUnitId ?? null, parentExternalDepartmentId: null, errorMessage: null };
        }

        const parentMapping = input.mappings.find((mapping) => mapping.externalDepartmentId === parentExternalDepartmentId);
        if (parentMapping?.orgUnitId) {
            const parentOrgUnit = input.orgUnits.find((orgUnit) => orgUnit.id === parentMapping.orgUnitId);
            if (!parentOrgUnit) return { parentOrgUnitId: null, parentExternalDepartmentId, errorMessage: `Mapped parent OrgUnit ${parentMapping.orgUnitId} was not found.` };
            if (!parentOrgUnit.isActive) return { parentOrgUnitId: parentOrgUnit.id, parentExternalDepartmentId, errorMessage: `Mapped parent OrgUnit ${parentOrgUnit.id} is inactive.` };
            return { parentOrgUnitId: parentOrgUnit.id, parentExternalDepartmentId, errorMessage: null };
        }

        if (input.departmentById.has(parentExternalDepartmentId) || input.plannedCreateExternalDepartmentIds.has(parentExternalDepartmentId)) {
            return { parentOrgUnitId: null, parentExternalDepartmentId, errorMessage: null };
        }

        return { parentOrgUnitId: null, parentExternalDepartmentId, errorMessage: `External parent department ${parentExternalDepartmentId} is not mapped or present in this preview.` };
    }

    private createConflictDiffItem(run: OrgSyncRun, department: ExternalDepartmentSnapshot, errorMessage: string, operatorId: string | null, orgUnitId: string | null = null): OrgSyncDiffItem {
        return this.repository.createDiffItem({
            runId: run.id,
            externalDepartmentId: department.externalDepartmentId,
            action: OrgSyncDiffActionValue.Conflict,
            status: OrgSyncDiffItemStatusValue.Pending,
            orgUnitId,
            beforeSnapshot: null,
            candidateSnapshot: {
                externalDepartmentId: department.externalDepartmentId,
                externalDepartmentName: department.externalDepartmentName,
                externalParentDepartmentId: department.externalParentDepartmentId,
                externalSnapshot: department.raw
            },
            errorMessage,
            appliedAt: null,
            createdBy: operatorId,
            updatedBy: operatorId
        });
    }

    private async applyDiffItem(input: ApplyDiffItemInput): Promise<void> {
        switch (input.item.action) {
            case OrgSyncDiffActionValue.CreateOrgUnit:
                this.applyCreateOrgUnitDiff(input);
                return;
            case OrgSyncDiffActionValue.UpdateOrgUnit:
                this.applyUpdateOrgUnitDiff(input);
                return;
            case OrgSyncDiffActionValue.MoveOrgUnit:
                this.applyMoveOrgUnitDiff(input);
                return;
            case OrgSyncDiffActionValue.DisableOrgUnit:
                this.applyDisableOrgUnitDiff(input);
                return;
            case OrgSyncDiffActionValue.MapExistingOrgUnit:
            case OrgSyncDiffActionValue.Ignore:
            case OrgSyncDiffActionValue.Conflict:
                throw new BadRequestException(`Org sync diff action ${input.item.action} cannot be applied automatically.`);
        }
    }

    private applyCreateOrgUnitDiff(input: ApplyDiffItemInput): void {
        const candidate = this.createCandidateSnapshot(input.item.candidateSnapshot);
        const parentId = candidate.targetParentOrgUnitId ?? (candidate.targetParentExternalDepartmentId ? (input.createdOrgUnitIdsByExternalDepartmentId.get(candidate.targetParentExternalDepartmentId) ?? null) : null);
        this.assertNoSiblingNameConflict(input.orgUnits, parentId, candidate.targetName);
        this.assertOrgUnitCodeAvailable(input.orgUnits, candidate.targetCode);

        const orgUnit = this.repository.createOrgUnit({
            name: candidate.targetName,
            code: candidate.targetCode,
            description: null,
            parentId,
            isActive: true,
            displayOrder: candidate.displayOrder,
            createdBy: input.operatorId,
            updatedBy: input.operatorId
        });
        input.orgUnits.push(orgUnit);
        input.createdOrgUnitIdsByExternalDepartmentId.set(candidate.externalDepartmentId, orgUnit.id);
        input.item.orgUnitId = orgUnit.id;
        input.item.candidateSnapshot = {
            ...input.item.candidateSnapshot,
            appliedOrgUnitId: orgUnit.id,
            targetParentOrgUnitId: parentId
        };
        const mapping = this.requireMapping(input.mappings, candidate.externalDepartmentId);
        mapping.orgUnitId = orgUnit.id;
        mapping.status = ExternalDepartmentMappingStatusValue.Mapped;
        mapping.externalSnapshot = candidate.externalSnapshot;
        mapping.updatedBy = input.operatorId;
        input.entitiesToSave.push(orgUnit, mapping);
    }

    private applyUpdateOrgUnitDiff(input: ApplyDiffItemInput): void {
        const orgUnit = this.requireMappedOrgUnit(input);
        const candidate = this.updateCandidateSnapshot(input.item.candidateSnapshot);
        if (!candidate.targetName) throw new BadRequestException('Update org unit diff item requires targetName.');
        this.assertNoSiblingNameConflict(input.orgUnits, orgUnit.parentId ?? null, candidate.targetName, orgUnit.id);
        orgUnit.name = candidate.targetName;
        orgUnit.updatedBy = input.operatorId;
        input.entitiesToSave.push(orgUnit);
    }

    private applyMoveOrgUnitDiff(input: ApplyDiffItemInput): void {
        const orgUnit = this.requireMappedOrgUnit(input);
        const candidate = this.updateCandidateSnapshot(input.item.candidateSnapshot);
        const parentId = candidate.targetParentOrgUnitId ?? (candidate.targetParentExternalDepartmentId ? (input.createdOrgUnitIdsByExternalDepartmentId.get(candidate.targetParentExternalDepartmentId) ?? null) : null);
        if (parentId === orgUnit.id) throw new ConflictException(`OrgUnit ${orgUnit.id} cannot move under itself.`);
        if (parentId && this.collectDescendantIds(input.orgUnits, orgUnit.id).has(parentId)) {
            throw new ConflictException(`OrgUnit ${orgUnit.id} cannot move under its own descendant.`);
        }
        const parent = parentId ? (input.orgUnits.find((candidateOrgUnit) => candidateOrgUnit.id === parentId) ?? null) : null;
        if (parentId && !parent) throw new NotFoundException(`Parent OrgUnit ${parentId} not found`);
        if (parent && !parent.isActive) throw new ConflictException(`Parent OrgUnit ${parent.id} is inactive`);
        this.assertNoSiblingNameConflict(input.orgUnits, parentId, orgUnit.name, orgUnit.id);
        orgUnit.parentId = parentId;
        orgUnit.displayOrder = candidate.displayOrder ?? orgUnit.displayOrder;
        orgUnit.updatedBy = input.operatorId;
        input.entitiesToSave.push(orgUnit);
    }

    private applyDisableOrgUnitDiff(input: ApplyDiffItemInput): void {
        const orgUnit = this.requireMappedOrgUnit(input);
        const affectedIds = new Set([orgUnit.id, ...this.collectDescendantIds(input.orgUnits, orgUnit.id)]);
        for (const candidate of input.orgUnits) {
            if (!affectedIds.has(candidate.id)) continue;
            candidate.isActive = false;
            candidate.updatedBy = input.operatorId;
            input.entitiesToSave.push(candidate);
        }
    }

    private requireMappedOrgUnit(input: ApplyDiffItemInput): OrgUnit {
        if (!input.item.orgUnitId) throw new BadRequestException(`Org sync diff item ${input.item.id} is not mapped to an OrgUnit.`);
        const orgUnit = input.orgUnits.find((candidate) => candidate.id === input.item.orgUnitId);
        if (!orgUnit) throw new NotFoundException(`OrgUnit ${input.item.orgUnitId} not found`);
        return orgUnit;
    }

    private requireMapping(mappings: ExternalDepartmentMapping[], externalDepartmentId: string): ExternalDepartmentMapping {
        const mapping = mappings.find((candidate) => candidate.externalDepartmentId === externalDepartmentId);
        if (!mapping) throw new NotFoundException(`External department mapping ${externalDepartmentId} not found`);
        return mapping;
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

    private sourceRootDepartmentId(source: ExternalOrgSource): string {
        return source.externalRootDepartmentId?.trim() || FEISHU_ROOT_DEPARTMENT_ID;
    }

    private buildExternalOrgUnitCode(source: ExternalOrgSource, externalDepartmentId: string): string {
        const providerPrefix = source.provider === ExternalOrgProviderValue.Feishu ? 'FS' : source.provider.toUpperCase().slice(0, 6);
        const normalized = externalDepartmentId
            .replace(/[^a-zA-Z0-9]+/g, '-')
            .replace(/^-+|-+$/g, '')
            .toUpperCase();
        const digest = createHash('sha1').update(`${source.id}:${externalDepartmentId}`).digest('hex').slice(0, 8).toUpperCase();
        const prefix = `EXT-${providerPrefix}`;
        const bodyLength = Math.max(1, 64 - prefix.length - digest.length - 2);
        return `${prefix}-${(normalized || 'DEPT').slice(0, bodyLength)}-${digest}`;
    }

    private resolveNextDisplayOrder(orgUnits: OrgUnit[], parentId: string | null): number {
        const siblingOrders = orgUnits.filter((orgUnit) => (orgUnit.parentId ?? null) === parentId).map((orgUnit) => orgUnit.displayOrder);
        return siblingOrders.length === 0 ? 0 : Math.max(...siblingOrders) + 1;
    }

    private previewSummary(departments: ExternalDepartmentSnapshot[], diffItems: OrgSyncDiffItem[]): JsonObject {
        const actionCounts = new Map<string, number>();
        for (const item of diffItems) {
            actionCounts.set(item.action, (actionCounts.get(item.action) ?? 0) + 1);
        }

        return {
            externalDepartmentCount: departments.length,
            generatedItemCount: diffItems.length,
            actionCounts: Object.fromEntries(actionCounts)
        };
    }

    private orgUnitSnapshot(orgUnit: OrgUnit): JsonObject {
        return {
            id: orgUnit.id,
            name: orgUnit.name,
            code: orgUnit.code,
            parentId: orgUnit.parentId ?? null,
            isActive: orgUnit.isActive,
            displayOrder: orgUnit.displayOrder,
            rowVersion: orgUnit.rowVersion
        };
    }

    private sortDiffItemsForApply(items: OrgSyncDiffItem[]): OrgSyncDiffItem[] {
        const rankByAction: Partial<Record<string, number>> = {
            [OrgSyncDiffActionValue.CreateOrgUnit]: 10,
            [OrgSyncDiffActionValue.UpdateOrgUnit]: 20,
            [OrgSyncDiffActionValue.MoveOrgUnit]: 30,
            [OrgSyncDiffActionValue.DisableOrgUnit]: 40,
            [OrgSyncDiffActionValue.MapExistingOrgUnit]: 50,
            [OrgSyncDiffActionValue.Ignore]: 60,
            [OrgSyncDiffActionValue.Conflict]: 70
        };

        return [...items].sort((left, right) => (rankByAction[left.action] ?? 99) - (rankByAction[right.action] ?? 99) || left.createdAt.getTime() - right.createdAt.getTime() || left.id.localeCompare(right.id));
    }

    private createCandidateSnapshot(value: Record<string, unknown>): CreateOrgUnitCandidateSnapshot {
        const externalDepartmentId = this.readRequiredString(value, 'externalDepartmentId');
        return {
            externalDepartmentId,
            externalParentDepartmentId: this.readNullableString(value, 'externalParentDepartmentId'),
            externalDepartmentName: this.readRequiredString(value, 'externalDepartmentName'),
            targetName: this.readRequiredString(value, 'targetName'),
            targetCode: this.readRequiredString(value, 'targetCode'),
            targetParentOrgUnitId: this.readNullableString(value, 'targetParentOrgUnitId'),
            targetParentExternalDepartmentId: this.readNullableString(value, 'targetParentExternalDepartmentId'),
            displayOrder: this.readNumberOrDefault(value, 'displayOrder', 0),
            externalSnapshot: this.readJsonObject(value, 'externalSnapshot')
        };
    }

    private updateCandidateSnapshot(value: Record<string, unknown>): UpdateOrgUnitCandidateSnapshot {
        return {
            targetName: this.readOptionalString(value, 'targetName'),
            targetParentOrgUnitId: this.readNullableString(value, 'targetParentOrgUnitId'),
            targetParentExternalDepartmentId: this.readNullableString(value, 'targetParentExternalDepartmentId'),
            displayOrder: this.readOptionalNumber(value, 'displayOrder')
        };
    }

    private readRequiredString(value: Record<string, unknown>, key: string): string {
        const result = this.readOptionalString(value, key);
        if (!result) throw new BadRequestException(`Org sync candidate snapshot requires ${key}.`);
        return result;
    }

    private readOptionalString(value: Record<string, unknown>, key: string): string | undefined {
        const result = value[key];
        return typeof result === 'string' && result.trim() ? result : undefined;
    }

    private readNullableString(value: Record<string, unknown>, key: string): string | null {
        return this.readOptionalString(value, key) ?? null;
    }

    private readOptionalNumber(value: Record<string, unknown>, key: string): number | undefined {
        const result = value[key];
        if (typeof result === 'number' && Number.isFinite(result)) return result;
        return undefined;
    }

    private readNumberOrDefault(value: Record<string, unknown>, key: string, defaultValue: number): number {
        return this.readOptionalNumber(value, key) ?? defaultValue;
    }

    private readJsonObject(value: Record<string, unknown>, key: string): JsonObject {
        const result = value[key];
        return result && typeof result === 'object' && !Array.isArray(result) ? (result as JsonObject) : {};
    }

    private assertNoSiblingNameConflict(orgUnits: OrgUnit[], parentId: string | null, name: string, excludedOrgUnitId?: string): void {
        const normalizedName = name.trim().toLocaleLowerCase();
        const conflict = orgUnits.find((candidate) => candidate.id !== excludedOrgUnitId && (candidate.parentId ?? null) === parentId && candidate.name.trim().toLocaleLowerCase() === normalizedName);
        if (conflict) {
            throw new ConflictException(`OrgUnit name ${name} already exists under the same parent.`);
        }
    }

    private assertOrgUnitCodeAvailable(orgUnits: OrgUnit[], code: string): void {
        const normalizedCode = code.trim().toLocaleLowerCase();
        const conflict = orgUnits.find((candidate) => candidate.code.trim().toLocaleLowerCase() === normalizedCode);
        if (conflict) throw new ConflictException(`OrgUnit code ${code} already exists.`);
    }

    private collectDescendantIds(orgUnits: OrgUnit[], rootId: string): Set<string> {
        const descendants = new Set<string>();
        const queue = [rootId];

        while (queue.length > 0) {
            const currentId = queue.shift();
            if (!currentId) continue;
            for (const candidate of orgUnits) {
                if (candidate.parentId !== currentId || descendants.has(candidate.id)) continue;
                descendants.add(candidate.id);
                queue.push(candidate.id);
            }
        }

        return descendants;
    }

    private safeErrorMessage(error: unknown, fallbackMessage: string): string {
        const message = this.rawSafeErrorMessage(error, fallbackMessage);
        return this.redactDiagnosticSecrets(message);
    }

    private rawSafeErrorMessage(error: unknown, fallbackMessage: string): string {
        if (error instanceof BadRequestException || error instanceof ConflictException || error instanceof NotFoundException || error instanceof ExternalOrgDirectoryAdapterError) {
            return error.message;
        }
        if (error instanceof Error && error.message) return error.message;
        return fallbackMessage;
    }

    private redactDiagnosticSecrets(message: string): string {
        return message
            .replace(/(["']?)(tenant_access_token|app_secret|client_secret|access_token|refresh_token)\1\s*([:=])\s*(["']?)[^\s"',，)}\]]+\4/gi, (_match, keyQuote: string, key: string, separator: string, valueQuote: string) => `${keyQuote}${key}${keyQuote}${separator}${valueQuote}<redacted>${valueQuote}`)
            .replace(/\bBearer\s+\S+/gi, 'Bearer <redacted>');
    }

    private buildRunDiagnosticSummary(run: OrgSyncRun, error: unknown, message: string): OrgSyncRunDiagnosticSummary {
        const isAdapterError = error instanceof ExternalOrgDirectoryAdapterError;
        const providerMessage = isAdapterError && error.providerMessage ? this.redactDiagnosticSecrets(error.providerMessage) : null;
        return {
            message,
            adapterStatus: isAdapterError ? 'adapter_failed' : 'preview_failed',
            providerCode: isAdapterError ? error.providerCode : null,
            httpStatus: isAdapterError ? error.httpStatus : null,
            providerMessage,
            nextActions: this.resolveRunDiagnosticNextActions(error),
            generatedAt: (run.finishedAt ?? new Date()).toISOString()
        };
    }

    private resolveRunDiagnosticNextActions(error: unknown): string[] {
        if (error instanceof ExternalOrgDirectoryAdapterError && error.nextActions.length > 0) {
            return error.nextActions.map((action) => this.redactDiagnosticSecrets(action));
        }
        return ['请检查企业协同接入配置、外部平台权限和根部门配置后重新生成预览。'];
    }

    private toRunDiagnosticSummary(run: OrgSyncRun): OrgSyncRunDiagnosticSummary | null {
        const resultSummary = run.resultSummary ?? {};
        const persisted = this.asRecord(resultSummary['diagnosticSummary']);
        const message = this.readString(persisted, 'message') ?? run.errorSummary ?? null;
        if (!message) return null;

        const persistedGeneratedAt = this.readString(persisted, 'generatedAt');
        const generatedAt = persistedGeneratedAt && !Number.isNaN(Date.parse(persistedGeneratedAt)) ? persistedGeneratedAt : (run.finishedAt?.toISOString() ?? run.updatedAt.toISOString());
        const nextActions = this.readStringArray(persisted, 'nextActions');
        return {
            message: this.redactDiagnosticSecrets(message),
            adapterStatus: this.readString(persisted, 'adapterStatus') ?? this.readString(this.asRecord(run.requestSnapshot), 'adapterStatus'),
            providerCode: this.readString(persisted, 'providerCode'),
            httpStatus: this.readHttpStatus(persisted),
            providerMessage: this.redactNullableDiagnosticSecret(this.readString(persisted, 'providerMessage')),
            nextActions: nextActions.length > 0 ? nextActions : ['请检查企业协同接入配置、外部平台权限和根部门配置后重新生成预览。'],
            generatedAt
        };
    }

    private readString(record: JsonObject, key: string): string | null {
        const value = record[key];
        if (typeof value !== 'string') return null;
        const trimmed = value.trim();
        return trimmed ? trimmed : null;
    }

    private readStringArray(record: JsonObject, key: string): string[] {
        const value = record[key];
        if (!Array.isArray(value)) return [];
        return value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).map((item) => this.redactDiagnosticSecrets(item.trim())).slice(0, 8);
    }

    private redactNullableDiagnosticSecret(value: string | null): string | null {
        return value ? this.redactDiagnosticSecrets(value) : null;
    }

    private readHttpStatus(record: JsonObject): number | null {
        const value = record['httpStatus'];
        return typeof value === 'number' && Number.isInteger(value) && value >= 100 && value <= 599 ? value : null;
    }

    private asRecord(value: unknown): JsonObject {
        return value && typeof value === 'object' && !Array.isArray(value) ? (value as JsonObject) : {};
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
            errorSummary: run.errorSummary ? this.redactDiagnosticSecrets(run.errorSummary) : null,
            diagnosticSummary: this.toRunDiagnosticSummary(run),
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
