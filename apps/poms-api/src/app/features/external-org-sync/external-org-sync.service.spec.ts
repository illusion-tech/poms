import { BadRequestException, ConflictException } from '@nestjs/common';
import { ExternalDepartmentMappingStatusValue, ExternalOrgProviderValue, ExternalOrgSourceStatusValue, OrgSyncDiffActionValue, OrgSyncDiffItemStatusValue, OrgSyncRunStatusValue } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SecretCipherService } from '../../core/secret/secret-cipher.service';
import { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import { IDENTITY_PROVIDER_SECRET_CIPHER_OPTIONS } from '../identity-provider/identity-provider-secret.constants';
import { OrgUnit } from '../platform/org-unit.entity';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
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
        findMappingsBySourceId: jest.Mock;
        createMapping: jest.Mock;
        replaceMappings: jest.Mock;
        createRun: jest.Mock;
        findRunById: jest.Mock;
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
            findMappingsBySourceId: jest.fn(),
            createMapping: jest.fn((input) => createMapping(input)),
            replaceMappings: jest.fn().mockResolvedValue(undefined),
            createRun: jest.fn((input) => createRun(input)),
            findRunById: jest.fn(),
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

    it('creates an active source with external root department and records audit', async () => {
        repository.findSourceByProviderTenant.mockResolvedValue(null);

        const result = await service.createExternalOrgSource(
            {
                provider: ExternalOrgProviderValue.Feishu,
                displayName: '飞书通讯录',
                status: ExternalOrgSourceStatusValue.Active,
                externalRootDepartmentId: '0',
                syncScopes: ['department.read']
            },
            operatorId
        );

        expect(repository.createSource).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: ExternalOrgProviderValue.Feishu,
                displayName: '飞书通讯录',
                status: ExternalOrgSourceStatusValue.Active,
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
            status: ExternalOrgSourceStatusValue.Active,
            externalRootDepartmentId: '0'
        });
    });

    it('rejects active sources without provider config or external root department', async () => {
        repository.findSourceByProviderTenant.mockResolvedValue(null);

        await expect(
            service.createExternalOrgSource({
                provider: ExternalOrgProviderValue.Feishu,
                displayName: '飞书通讯录',
                status: ExternalOrgSourceStatusValue.Active
            })
        ).rejects.toThrow(BadRequestException);

        expect(repository.saveAll).not.toHaveBeenCalled();
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
            status: 'active',
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
            searchGrantMode: 'per-admin',
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
