import { BadRequestException, ConflictException } from '@nestjs/common';
import {
    ExternalDepartmentMappingReviewStateValue,
    ExternalDepartmentMappingStatusValue,
    ExternalOrgProviderValue,
    ExternalOrgSourceStatusValue,
    IdentityProviderConfigStatusValue,
    IdentityProviderSearchGrantModeValue,
    OrgSyncDiffActionValue,
    OrgSyncDiffItemStatusValue,
    OrgSyncRunStatusValue
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS } from '../identity-provider/identity-provider-secret.constants';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgDirectoryAdapterError } from './external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterRegistry } from './external-org-directory-adapter.registry';
import { ExternalOrgSource } from './external-org-source.entity';
import { ExternalOrgSyncRepository } from './external-org-sync.repository';
import { ExternalOrgSyncService } from './external-org-sync.service';
import { OrgSyncDiffItem } from './org-sync-diff-item.entity';
import { OrgSyncRun } from './org-sync-run.entity';

describe('ExternalOrgSyncService', () => {
    const operatorId = '00000000-0000-4000-8000-000000000001';
    const sourceId = '97000000-0000-4000-8000-000000000001';
    const providerConfigId = '97000000-0000-4000-8000-000000000031';
    const rootOrgUnitId = '97000000-0000-4000-8000-000000000020';
    const orgUnitId = '97000000-0000-4000-8000-000000000021';
    const runId = '97000000-0000-4000-8000-000000000011';
    const diffItemId = '97000000-0000-4000-8000-000000000201';
    let repository: {
        findSources: jest.Mock;
        findSourceById: jest.Mock;
        findSourceByProviderTenant: jest.Mock;
        createSource: jest.Mock;
        findProviderConfigById: jest.Mock;
        findOrgUnitById: jest.Mock;
        findOrgUnitsByIds: jest.Mock;
        findAllOrgUnits: jest.Mock;
        createOrgUnit: jest.Mock;
        findMappings: jest.Mock;
        findMappingById: jest.Mock;
        findMappedOrgUnitMapping: jest.Mock;
        findMappingsBySourceId: jest.Mock;
        findRecentDiffItemsForMappings: jest.Mock;
        createMapping: jest.Mock;
        replaceMappings: jest.Mock;
        createRun: jest.Mock;
        findRunById: jest.Mock;
        findRunsBySourceId: jest.Mock;
        findDiffItems: jest.Mock;
        createDiffItem: jest.Mock;
        saveAll: jest.Mock;
    };
    let adapterRegistry: {
        get: jest.Mock;
    };
    let feishuAdapter: {
        fetchDepartmentTree: jest.Mock;
    };
    let runtimeAuditService: {
        recordAuditLog: jest.Mock;
    };
    let secretCipherService: SecretCipherService;
    let service: ExternalOrgSyncService;

    beforeEach(() => {
        repository = {
            findSources: jest.fn(),
            findSourceById: jest.fn(),
            findSourceByProviderTenant: jest.fn(),
            createSource: jest.fn((input) => createSource(input)),
            findProviderConfigById: jest.fn(),
            findOrgUnitById: jest.fn(),
            findOrgUnitsByIds: jest.fn(),
            findAllOrgUnits: jest.fn(),
            createOrgUnit: jest.fn((input) => createOrgUnit(input)),
            findMappings: jest.fn(),
            findMappingById: jest.fn(),
            findMappedOrgUnitMapping: jest.fn(),
            findMappingsBySourceId: jest.fn(),
            findRecentDiffItemsForMappings: jest.fn().mockResolvedValue([]),
            createMapping: jest.fn((input) => createMapping(input)),
            replaceMappings: jest.fn().mockResolvedValue(undefined),
            createRun: jest.fn((input) => createRun(input)),
            findRunById: jest.fn(),
            findRunsBySourceId: jest.fn(),
            findDiffItems: jest.fn(),
            createDiffItem: jest.fn((input) => createDiffItem(input)),
            saveAll: jest.fn().mockResolvedValue(undefined)
        };
        feishuAdapter = {
            fetchDepartmentTree: jest.fn()
        };
        adapterRegistry = {
            get: jest.fn().mockReturnValue(feishuAdapter)
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        secretCipherService = new SecretCipherService();
        service = new ExternalOrgSyncService(repository as never as ExternalOrgSyncRepository, runtimeAuditService as never as RuntimeAuditService, adapterRegistry as never as ExternalOrgDirectoryAdapterRegistry, secretCipherService);
    });

    it('creates a draft source with external root department and records audit', async () => {
        repository.findSourceByProviderTenant.mockResolvedValue(null);
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig());

        const result = await service.createExternalOrgSource(
            {
                provider: ExternalOrgProviderValue.Feishu,
                displayName: '飞书通讯录',
                providerConfigId,
                externalRootDepartmentId: '0',
                syncScopes: ['department.read']
            },
            operatorId
        );

        expect(repository.createSource).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: ExternalOrgProviderValue.Feishu,
                displayName: '飞书通讯录',
                status: ExternalOrgSourceStatusValue.Draft,
                providerConfigId,
                externalRootDepartmentId: '0',
                syncScopes: ['department.read'],
                createdBy: operatorId,
                updatedBy: operatorId
            })
        );
        expect(repository.saveAll).toHaveBeenCalledWith([expect.objectContaining({ id: sourceId })]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'external-org-source.created',
                targetType: 'ExternalOrgSource',
                targetId: sourceId,
                operatorId,
                result: 'success'
            })
        );
        expect(result).toMatchObject({
            id: sourceId,
            status: ExternalOrgSourceStatusValue.Draft,
            providerConfigId,
            externalRootDepartmentId: '0'
        });
    });

    it('activates a draft source with a ready provider config and records audit', async () => {
        const source = createSource({ status: ExternalOrgSourceStatusValue.Draft, providerConfigId, rowVersion: 3 });
        repository.findSourceById.mockResolvedValue(source);
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig());

        const result = await service.activateExternalOrgSource(sourceId, { expectedVersion: 3 }, operatorId);

        expect(source.status).toBe(ExternalOrgSourceStatusValue.Active);
        expect(repository.saveAll).toHaveBeenCalledWith([source]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'external-org-source.activated',
                targetType: 'ExternalOrgSource',
                targetId: sourceId,
                operatorId,
                result: 'success'
            })
        );
        expect(result.status).toBe(ExternalOrgSourceStatusValue.Active);
    });

    it('rejects activating sources without a ready provider config', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Draft }));

        await expect(
            service.activateExternalOrgSource(sourceId, { expectedVersion: 1 }, operatorId)
        ).rejects.toThrow(BadRequestException);

        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('rejects activating sources when the selected provider config is not active', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Draft, providerConfigId }));
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig({ status: IdentityProviderConfigStatusValue.Draft }));

        await expect(
            service.activateExternalOrgSource(sourceId, { expectedVersion: 1 }, operatorId)
        ).rejects.toThrow('所选企业协同接入状态为「草稿」，尚未就绪，不能用于外部组织同步。');

        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('rejects activating a source when existing provider config no longer matches the source provider', async () => {
        const source = createSource({
            status: ExternalOrgSourceStatusValue.Draft,
            providerConfigId
        });
        repository.findSourceById.mockResolvedValue(source);
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig({ provider: ExternalOrgProviderValue.DingTalk as IdentityProviderConfig['provider'] }));

        await expect(
            service.activateExternalOrgSource(sourceId, { expectedVersion: 1 }, operatorId)
        ).rejects.toThrow(`Identity provider config provider ${ExternalOrgProviderValue.DingTalk} does not match external org source provider ${ExternalOrgProviderValue.Feishu}`);

        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('pauses active sources and archives paused sources through lifecycle commands', async () => {
        const source = createSource({ status: ExternalOrgSourceStatusValue.Active, providerConfigId, rowVersion: 4 });
        repository.findSourceById.mockResolvedValue(source);

        const paused = await service.pauseExternalOrgSource(sourceId, { expectedVersion: 4 }, operatorId);

        expect(paused.status).toBe(ExternalOrgSourceStatusValue.Paused);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'external-org-source.paused' }));

        source.rowVersion = 5;
        const archived = await service.archiveExternalOrgSource(sourceId, { expectedVersion: 5 }, operatorId);

        expect(archived.status).toBe(ExternalOrgSourceStatusValue.Archived);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'external-org-source.archived' }));
    });

    it('rejects archiving active sources and editing archived sources', async () => {
        repository.findSourceById.mockResolvedValueOnce(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 1 }));

        await expect(service.archiveExternalOrgSource(sourceId, { expectedVersion: 1 }, operatorId)).rejects.toThrow('Active external org sources must be paused before archiving.');

        repository.findSourceById.mockResolvedValueOnce(createSource({ status: ExternalOrgSourceStatusValue.Archived, rowVersion: 1 }));

        await expect(service.updateExternalOrgSource(sourceId, { displayName: '归档源更新', expectedVersion: 1 }, operatorId)).rejects.toThrow('Archived external org sources are read-only.');
    });

    it('replaces mappings after validating source version, duplicate external departments, and org units', async () => {
        const source = createSource({ rowVersion: 2 });
        const existingMapping = createMapping({ id: '97000000-0000-4000-8000-000000000101', externalDepartmentId: 'old-dept' });
        repository.findSourceById.mockResolvedValue(source);
        repository.findOrgUnitsByIds.mockResolvedValue([{ id: orgUnitId }]);
        repository.findMappingsBySourceId.mockResolvedValue([existingMapping]);

        const result = await service.replaceExternalDepartmentMappings(
            sourceId,
            {
                expectedSourceVersion: 2,
                items: [
                    {
                        externalDepartmentId: 'dept-sales',
                        externalParentDepartmentId: 'root',
                        externalDepartmentName: '销售部',
                        orgUnitId,
                        externalSnapshot: { leader: 'Alice' }
                    }
                ]
            },
            operatorId
        );

        expect(repository.replaceMappings).toHaveBeenCalledWith([existingMapping], [expect.objectContaining({ externalDepartmentId: 'dept-sales', status: ExternalDepartmentMappingStatusValue.Mapped })]);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'external-department-mapping.replaced',
                targetType: 'ExternalOrgSource',
                targetId: sourceId
            })
        );
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            externalDepartmentId: 'dept-sales',
            orgUnitId,
            status: ExternalDepartmentMappingStatusValue.Mapped,
            externalSnapshot: { leader: 'Alice' }
        });
    });

    it('rejects duplicate mapping replacement items', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ rowVersion: 1 }));

        await expect(
            service.replaceExternalDepartmentMappings(sourceId, {
                expectedSourceVersion: 1,
                items: [
                    { externalDepartmentId: 'dept-sales', externalDepartmentName: '销售部' },
                    { externalDepartmentId: 'dept-sales', externalDepartmentName: '销售二部' }
                ]
            })
        ).rejects.toThrow(ConflictException);

        expect(repository.replaceMappings).not.toHaveBeenCalled();
    });

    it('lists mappings with derived conflict review metadata from latest diff items', async () => {
        const mapping = createMapping({ externalDepartmentId: 'od-sales', status: ExternalDepartmentMappingStatusValue.Mapped, orgUnitId });
        const run = createRun({ id: runId, startedAt: new Date('2026-06-11T00:00:00.000Z') });
        const diffItem = createDiffItem({
            id: diffItemId,
            runId,
            externalDepartmentId: 'od-sales',
            action: OrgSyncDiffActionValue.Conflict,
            errorMessage: 'Mapped OrgUnit is inactive.'
        });
        repository.findSourceById.mockResolvedValue(createSource({ id: sourceId }));
        repository.findMappings.mockResolvedValue([mapping]);
        repository.findRecentDiffItemsForMappings.mockResolvedValue([{ run, item: diffItem }]);

        const result = await service.listExternalDepartmentMappings(sourceId);

        expect(repository.findRecentDiffItemsForMappings).toHaveBeenCalledWith(sourceId, ['od-sales']);
        expect(result[0]).toMatchObject({
            reviewState: ExternalDepartmentMappingReviewStateValue.Conflict,
            conflictReason: '已映射的 POMS 组织已停用，请重新映射到启用组织、解除映射或忽略。',
            lastConflictRunId: runId,
            lastConflictDiffItemId: diffItemId
        });
    });

    it('filters mappings by derived review state and search text after building summaries', async () => {
        const conflictMapping = createMapping({ id: '97000000-0000-4000-8000-000000000104', externalDepartmentId: 'od-sales', externalDepartmentName: '销售部', status: ExternalDepartmentMappingStatusValue.Mapped, orgUnitId });
        const normalMapping = createMapping({ id: '97000000-0000-4000-8000-000000000105', externalDepartmentId: 'od-finance', externalDepartmentName: '财务部', status: ExternalDepartmentMappingStatusValue.Mapped, orgUnitId: rootOrgUnitId });
        const run = createRun({ id: runId, startedAt: new Date('2026-06-11T00:00:00.000Z') });
        const diffItem = createDiffItem({
            id: diffItemId,
            runId,
            externalDepartmentId: 'od-sales',
            action: OrgSyncDiffActionValue.Conflict,
            errorMessage: 'Mapped OrgUnit was not found.'
        });
        repository.findSourceById.mockResolvedValue(createSource({ id: sourceId }));
        repository.findMappings.mockResolvedValue([normalMapping, conflictMapping]);
        repository.findRecentDiffItemsForMappings.mockResolvedValue([{ run, item: diffItem }]);

        const result = await service.listExternalDepartmentMappings(sourceId, {
            reviewState: ExternalDepartmentMappingReviewStateValue.Conflict,
            search: '销售'
        });

        expect(repository.findMappings).toHaveBeenCalledWith(sourceId, {
            reviewState: ExternalDepartmentMappingReviewStateValue.Conflict,
            search: '销售'
        });
        expect(result).toHaveLength(1);
        expect(result[0]).toMatchObject({
            externalDepartmentId: 'od-sales',
            reviewState: ExternalDepartmentMappingReviewStateValue.Conflict
        });
    });

    it('maps one external department with row version and active org unit checks', async () => {
        const mapping = createMapping({ rowVersion: 3, status: ExternalDepartmentMappingStatusValue.Conflict });
        const source = createSource({ status: ExternalOrgSourceStatusValue.Active });
        repository.findMappingById.mockResolvedValue(mapping);
        repository.findSourceById.mockResolvedValue(source);
        repository.findOrgUnitById.mockResolvedValue(createOrgUnit({ id: orgUnitId, isActive: true }));
        repository.findMappedOrgUnitMapping.mockResolvedValue(null);

        const result = await service.mapExternalDepartmentMapping(mapping.id, { orgUnitId, expectedVersion: 3 }, operatorId);

        expect(repository.findMappedOrgUnitMapping).toHaveBeenCalledWith(sourceId, orgUnitId);
        expect(repository.saveAll).toHaveBeenCalledWith([mapping]);
        expect(mapping).toMatchObject({
            orgUnitId,
            status: ExternalDepartmentMappingStatusValue.Mapped,
            updatedBy: operatorId
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'external-department-mapping.mapped',
                targetType: 'ExternalDepartmentMapping',
                targetId: mapping.id
            })
        );
        expect(result).toMatchObject({
            orgUnitId,
            status: ExternalDepartmentMappingStatusValue.Mapped,
            reviewState: ExternalDepartmentMappingReviewStateValue.Mapped
        });
    });

    it('rejects mapping commands with stale row versions, inactive org units, or occupied mapped org units', async () => {
        const mapping = createMapping({ rowVersion: 3 });
        repository.findMappingById.mockResolvedValue(mapping);

        await expect(service.mapExternalDepartmentMapping(mapping.id, { orgUnitId, expectedVersion: 2 }, operatorId)).rejects.toThrow('External department mapping version conflict');

        repository.findMappingById.mockResolvedValue(mapping);
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active }));
        repository.findOrgUnitById.mockResolvedValue(createOrgUnit({ id: orgUnitId, isActive: false }));

        await expect(service.mapExternalDepartmentMapping(mapping.id, { orgUnitId, expectedVersion: 3 }, operatorId)).rejects.toThrow(`OrgUnit ${orgUnitId} is inactive`);

        repository.findMappingById.mockResolvedValue(mapping);
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active }));
        repository.findOrgUnitById.mockResolvedValue(createOrgUnit({ id: orgUnitId, isActive: true }));
        repository.findMappedOrgUnitMapping.mockResolvedValue(createMapping({ id: '97000000-0000-4000-8000-000000000103', orgUnitId, status: ExternalDepartmentMappingStatusValue.Mapped, externalDepartmentId: 'od-other' }));

        await expect(service.mapExternalDepartmentMapping(mapping.id, { orgUnitId, expectedVersion: 3 }, operatorId)).rejects.toThrow(`OrgUnit ${orgUnitId} is already mapped to external department od-other.`);

        expect(repository.saveAll).not.toHaveBeenCalled();
    });

    it('unmaps, ignores, and restores one external department through row-level commands', async () => {
        const mapping = createMapping({ rowVersion: 5, orgUnitId, status: ExternalDepartmentMappingStatusValue.Mapped });
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active }));
        repository.findMappingById.mockResolvedValue(mapping);

        const unmapped = await service.unmapExternalDepartmentMapping(mapping.id, { expectedVersion: 5 }, operatorId);

        expect(unmapped).toMatchObject({
            orgUnitId: null,
            status: ExternalDepartmentMappingStatusValue.Unmapped,
            reviewState: ExternalDepartmentMappingReviewStateValue.Unmapped
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'external-department-mapping.unmapped' }));

        mapping.rowVersion = 6;
        mapping.orgUnitId = orgUnitId;
        mapping.status = ExternalDepartmentMappingStatusValue.Mapped;
        const ignored = await service.ignoreExternalDepartmentMapping(mapping.id, { expectedVersion: 6 }, operatorId);

        expect(ignored).toMatchObject({
            orgUnitId: null,
            status: ExternalDepartmentMappingStatusValue.Ignored,
            reviewState: ExternalDepartmentMappingReviewStateValue.Ignored
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'external-department-mapping.ignored' }));

        mapping.rowVersion = 7;
        const restored = await service.restoreExternalDepartmentMapping(mapping.id, { expectedVersion: 7 }, operatorId);

        expect(restored).toMatchObject({
            orgUnitId: null,
            status: ExternalDepartmentMappingStatusValue.Unmapped,
            reviewState: ExternalDepartmentMappingReviewStateValue.Unmapped
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(expect.objectContaining({ eventType: 'external-department-mapping.restored' }));
    });

    it('creates a preview run with Feishu department snapshots and create diff items', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 3, providerConfigId, authoritativeOrgUnitId: rootOrgUnitId, externalRootDepartmentId: '0' }));
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig());
        repository.findMappingsBySourceId.mockResolvedValue([]);
        repository.findAllOrgUnits.mockResolvedValue([createOrgUnit({ id: rootOrgUnitId, name: '总部', code: 'HQ' })]);
        feishuAdapter.fetchDepartmentTree.mockResolvedValue([
            {
                externalDepartmentId: 'od-sales',
                externalParentDepartmentId: '0',
                externalDepartmentName: '销售部',
                isActive: true,
                displayOrder: 7,
                raw: { open_department_id: 'od-sales', name: '销售部' }
            }
        ]);

        const result = await service.createOrgSyncRun(sourceId, { expectedSourceVersion: 3, requestSnapshot: { requestedByUi: true } }, operatorId);

        expect(adapterRegistry.get).toHaveBeenCalledWith(ExternalOrgProviderValue.Feishu);
        expect(feishuAdapter.fetchDepartmentTree).toHaveBeenCalledWith(
            expect.objectContaining({
                source: expect.objectContaining({ id: sourceId }),
                providerConfig: expect.objectContaining({ id: providerConfigId }),
                clientSecret: 'client-secret'
            })
        );
        expect(repository.createDiffItem).toHaveBeenCalledWith(
            expect.objectContaining({
                runId,
                externalDepartmentId: 'od-sales',
                action: OrgSyncDiffActionValue.CreateOrgUnit,
                status: OrgSyncDiffItemStatusValue.Pending,
                candidateSnapshot: expect.objectContaining({
                    targetName: '销售部',
                    targetParentOrgUnitId: rootOrgUnitId
                })
            })
        );
        expect(result).toMatchObject({
            id: runId,
            status: OrgSyncRunStatusValue.Previewed,
            totalItemCount: 1
        });
    });

    it('rejects preview runs when provider config is not ready for org sync', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 3, providerConfigId, externalRootDepartmentId: '0' }));
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig({ status: IdentityProviderConfigStatusValue.Misconfigured }));

        await expect(service.createOrgSyncRun(sourceId, { expectedSourceVersion: 3 }, operatorId)).rejects.toThrow('所选企业协同接入状态为「配置异常」，尚未就绪，不能用于外部组织同步。');

        expect(repository.createRun).not.toHaveBeenCalled();
        expect(feishuAdapter.fetchDepartmentTree).not.toHaveBeenCalled();
    });

    it('returns a failed preview run with adapter diagnostics when Feishu pull fails', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 3, providerConfigId, authoritativeOrgUnitId: rootOrgUnitId, externalRootDepartmentId: '0' }));
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig());
        feishuAdapter.fetchDepartmentTree.mockRejectedValue(
            new ExternalOrgDirectoryAdapterError('飞书部门分页大小超过限制，请将 page_size 调整为 50 或更小。（飞书返回：page size is more than 50 error，code 40011）', {
                providerCode: '40011',
                providerMessage: 'page size is more than 50 error',
                nextActions: ['请确认 POMS 飞书部门读取参数使用 page_size <= 50 后重试。']
            })
        );

        const result = await service.createOrgSyncRun(sourceId, { expectedSourceVersion: 3, requestSnapshot: { requestedByUi: true } }, operatorId);

        expect(result).toMatchObject({
            id: runId,
            status: OrgSyncRunStatusValue.Failed,
            totalItemCount: 0,
            errorSummary: expect.stringContaining('飞书部门分页大小超过限制'),
            diagnosticSummary: expect.objectContaining({
                message: expect.stringContaining('飞书部门分页大小超过限制'),
                adapterStatus: 'adapter_failed',
                providerCode: '40011',
                httpStatus: null,
                providerMessage: 'page size is more than 50 error',
                nextActions: ['请确认 POMS 飞书部门读取参数使用 page_size <= 50 后重试。']
            })
        });
        expect(result.resultSummary).toMatchObject({
            diagnosticSummary: expect.objectContaining({
                providerCode: '40011'
            })
        });
        expect(result.requestSnapshot).toMatchObject({
            requestedByUi: true,
            adapterStatus: 'adapter_failed',
            providerConfigId
        });
        expect(repository.createDiffItem).not.toHaveBeenCalled();
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'org-sync-run.preview.failed',
                result: 'failed',
                reason: expect.stringContaining('飞书部门分页大小超过限制')
            })
        );
    });

    it('caps failed run diagnostic next actions to the shared contract limit', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 3, providerConfigId, authoritativeOrgUnitId: rootOrgUnitId, externalRootDepartmentId: '0' }));
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig());
        const nextActions = Array.from({ length: 10 }, (_value, index) => `排查动作 ${index + 1}`);
        feishuAdapter.fetchDepartmentTree.mockRejectedValue(
            new ExternalOrgDirectoryAdapterError('飞书通讯录读取失败', {
                providerCode: '99991663',
                nextActions
            })
        );

        const result = await service.createOrgSyncRun(sourceId, { expectedSourceVersion: 3 }, operatorId);

        expect(result.diagnosticSummary?.nextActions).toEqual(nextActions.slice(0, 8));
        expect((result.resultSummary?.['diagnosticSummary'] as { nextActions?: string[] }).nextActions).toEqual(nextActions.slice(0, 8));
    });

    it('normalizes failed run diagnostic text to the shared contract limit', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 3, providerConfigId, authoritativeOrgUnitId: rootOrgUnitId, externalRootDepartmentId: '0' }));
        repository.findProviderConfigById.mockResolvedValue(createProviderConfig());
        const longMessage = ` ${'飞'.repeat(1010)} `;
        const longProviderMessage = ` ${'书'.repeat(1010)} `;
        feishuAdapter.fetchDepartmentTree.mockRejectedValue(
            new ExternalOrgDirectoryAdapterError(longMessage, {
                providerMessage: longProviderMessage
            })
        );

        const result = await service.createOrgSyncRun(sourceId, { expectedSourceVersion: 3 }, operatorId);

        expect(result.diagnosticSummary?.message).toBe('飞'.repeat(1000));
        expect(result.diagnosticSummary?.providerMessage).toBe('书'.repeat(1000));
        expect((result.resultSummary?.['diagnosticSummary'] as { message?: string; providerMessage?: string }).message).toBe('飞'.repeat(1000));
        expect((result.resultSummary?.['diagnosticSummary'] as { message?: string; providerMessage?: string }).providerMessage).toBe('书'.repeat(1000));
    });

    it('lists recent sync runs for a source with status and limit filters', async () => {
        const run = createRun({ status: OrgSyncRunStatusValue.Failed, errorSummary: '飞书权限未开通' });
        repository.findSourceById.mockResolvedValue(createSource({ id: sourceId }));
        repository.findRunsBySourceId.mockResolvedValue([run]);

        const result = await service.listOrgSyncRuns(sourceId, { status: OrgSyncRunStatusValue.Failed, limit: 10 });

        expect(repository.findRunsBySourceId).toHaveBeenCalledWith(sourceId, { status: OrgSyncRunStatusValue.Failed, limit: 10 });
        expect(result).toEqual([
            expect.objectContaining({
                id: runId,
                status: OrgSyncRunStatusValue.Failed,
                diagnosticSummary: expect.objectContaining({
                    message: '飞书权限未开通'
                })
            })
        ]);
    });

    it('normalizes persisted run diagnostic text when listing history', async () => {
        const run = createRun({
            status: OrgSyncRunStatusValue.Failed,
            errorSummary: 'fallback',
            resultSummary: {
                diagnosticSummary: {
                    message: ` ${'错'.repeat(1010)} `,
                    providerMessage: ` ${'误'.repeat(1010)} `,
                    nextActions: ['请检查配置'],
                    generatedAt: '2026-06-10T00:00:00.000Z'
                }
            }
        });
        repository.findSourceById.mockResolvedValue(createSource({ id: sourceId }));
        repository.findRunsBySourceId.mockResolvedValue([run]);

        const result = await service.listOrgSyncRuns(sourceId);

        expect(result[0]?.diagnosticSummary?.message).toBe('错'.repeat(1000));
        expect(result[0]?.diagnosticSummary?.providerMessage).toBe('误'.repeat(1000));
    });

    it('applies approved create diff items and maps the external department to the new org unit', async () => {
        const run = createRun({ status: OrgSyncRunStatusValue.Previewed, rowVersion: 1, totalItemCount: 1 });
        const mapping = createMapping({ externalDepartmentId: 'od-sales', externalDepartmentName: '销售部' });
        const diffItem = createDiffItem({
            externalDepartmentId: 'od-sales',
            action: OrgSyncDiffActionValue.CreateOrgUnit,
            status: OrgSyncDiffItemStatusValue.Pending,
            candidateSnapshot: {
                externalDepartmentId: 'od-sales',
                externalParentDepartmentId: '0',
                externalDepartmentName: '销售部',
                targetName: '销售部',
                targetCode: 'EXT-FS-OD-SALES-12345678',
                targetParentOrgUnitId: rootOrgUnitId,
                targetParentExternalDepartmentId: null,
                displayOrder: 7,
                externalSnapshot: { open_department_id: 'od-sales' }
            }
        });
        repository.findRunById.mockResolvedValue(run);
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, providerConfigId, authoritativeOrgUnitId: rootOrgUnitId, externalRootDepartmentId: '0' }));
        repository.findMappingsBySourceId.mockResolvedValue([mapping]);
        repository.findAllOrgUnits.mockResolvedValue([createOrgUnit({ id: rootOrgUnitId, name: '总部', code: 'HQ' })]);
        repository.findDiffItems.mockResolvedValue([diffItem]);

        const result = await service.applyOrgSyncRun(runId, { expectedVersion: 1, approvedDiffItemIds: [diffItemId] }, operatorId);

        expect(repository.createOrgUnit).toHaveBeenCalledWith(
            expect.objectContaining({
                name: '销售部',
                code: 'EXT-FS-OD-SALES-12345678',
                parentId: rootOrgUnitId,
                displayOrder: 7,
                createdBy: operatorId,
                updatedBy: operatorId
            })
        );
        expect(mapping).toMatchObject({
            orgUnitId,
            status: ExternalDepartmentMappingStatusValue.Mapped
        });
        expect(diffItem).toMatchObject({
            status: OrgSyncDiffItemStatusValue.Applied,
            orgUnitId
        });
        expect(result).toMatchObject({
            status: OrgSyncRunStatusValue.Applied,
            approvedItemCount: 1,
            failedItemCount: 0
        });
    });

    function createSource(overrides: Partial<ExternalOrgSource> = {}): ExternalOrgSource {
        return {
            id: sourceId,
            provider: ExternalOrgProviderValue.Feishu,
            externalTenantId: null,
            displayName: '飞书通讯录',
            status: ExternalOrgSourceStatusValue.Draft,
            providerConfigId: null,
            authoritativeOrgUnitId: null,
            externalRootDepartmentId: null,
            syncScopes: [],
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as ExternalOrgSource;
    }

    function createProviderConfig(overrides: Partial<IdentityProviderConfig> = {}): IdentityProviderConfig {
        return {
            id: providerConfigId,
            provider: ExternalOrgProviderValue.Feishu,
            tenantId: null,
            displayName: '飞书',
            status: IdentityProviderConfigStatusValue.Active,
            enabled: true,
            loginEnabled: true,
            bindingEnabled: true,
            searchEnabled: true,
            clientId: 'cli_a',
            encryptedClientSecret: secretCipherService.encrypt('client-secret', IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS),
            secretUpdatedAt: new Date('2026-06-10T00:00:00.000Z'),
            redirectUri: null,
            searchRedirectUri: null,
            loginScopes: [],
            searchScopes: [],
            tenantAllowlist: [],
            searchGrantMode: IdentityProviderSearchGrantModeValue.PerAdmin,
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as IdentityProviderConfig;
    }

    function createOrgUnit(overrides: Partial<OrgUnit> = {}): OrgUnit {
        return {
            id: orgUnitId,
            name: '销售部',
            code: 'SALES',
            description: null,
            parentId: null,
            isActive: true,
            displayOrder: 0,
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as OrgUnit;
    }

    function createMapping(overrides: Partial<ExternalDepartmentMapping> = {}): ExternalDepartmentMapping {
        return {
            id: '97000000-0000-4000-8000-000000000102',
            sourceId,
            externalDepartmentId: 'dept-sales',
            externalParentDepartmentId: null,
            externalDepartmentName: '销售部',
            orgUnitId: null,
            status: ExternalDepartmentMappingStatusValue.Unmapped,
            externalSnapshot: {},
            lastSeenAt: new Date('2026-06-10T00:00:00.000Z'),
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as ExternalDepartmentMapping;
    }

    function createDiffItem(overrides: Partial<OrgSyncDiffItem> = {}): OrgSyncDiffItem {
        return {
            id: diffItemId,
            runId,
            externalDepartmentId: 'od-sales',
            action: OrgSyncDiffActionValue.CreateOrgUnit,
            status: OrgSyncDiffItemStatusValue.Pending,
            orgUnitId: null,
            beforeSnapshot: null,
            candidateSnapshot: {},
            errorMessage: null,
            appliedAt: null,
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as OrgSyncDiffItem;
    }

    function createRun(overrides: Partial<OrgSyncRun> = {}): OrgSyncRun {
        return {
            id: runId,
            sourceId,
            status: OrgSyncRunStatusValue.Previewed,
            requestedBy: operatorId,
            startedAt: new Date('2026-06-10T00:00:00.000Z'),
            finishedAt: new Date('2026-06-10T00:00:00.000Z'),
            totalItemCount: 0,
            approvedItemCount: 0,
            skippedItemCount: 0,
            failedItemCount: 0,
            errorSummary: null,
            requestSnapshot: {},
            resultSummary: {
                generatedItemCount: 0
            },
            rowVersion: 1,
            createdAt: new Date('2026-06-10T00:00:00.000Z'),
            createdBy: operatorId,
            updatedAt: new Date('2026-06-10T00:00:00.000Z'),
            updatedBy: operatorId,
            ...overrides
        } as OrgSyncRun;
    }
});
