import { BadRequestException, ConflictException } from '@nestjs/common';
import { ExternalDepartmentMappingStatusValue, ExternalOrgProviderValue, ExternalOrgSourceStatusValue, OrgSyncRunStatusValue } from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { ExternalDepartmentMapping } from './external-department-mapping.entity';
import { ExternalOrgSource } from './external-org-source.entity';
import { ExternalOrgSyncRepository } from './external-org-sync.repository';
import { ExternalOrgSyncService } from './external-org-sync.service';
import { OrgSyncRun } from './org-sync-run.entity';

describe('ExternalOrgSyncService', () => {
    const operatorId = '00000000-0000-4000-8000-000000000001';
    const sourceId = '97000000-0000-4000-8000-000000000001';
    const orgUnitId = '97000000-0000-4000-8000-000000000021';
    const runId = '97000000-0000-4000-8000-000000000011';
    let repository: {
        findSources: jest.Mock;
        findSourceById: jest.Mock;
        findSourceByProviderTenant: jest.Mock;
        createSource: jest.Mock;
        findProviderConfigById: jest.Mock;
        findOrgUnitById: jest.Mock;
        findOrgUnitsByIds: jest.Mock;
        findMappings: jest.Mock;
        findMappingsBySourceId: jest.Mock;
        createMapping: jest.Mock;
        replaceMappings: jest.Mock;
        createRun: jest.Mock;
        findRunById: jest.Mock;
        findDiffItems: jest.Mock;
        saveAll: jest.Mock;
    };
    let runtimeAuditService: {
        recordAuditLog: jest.Mock;
    };
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
            findMappings: jest.fn(),
            findMappingsBySourceId: jest.fn(),
            createMapping: jest.fn((input) => createMapping(input)),
            replaceMappings: jest.fn().mockResolvedValue(undefined),
            createRun: jest.fn((input) => createRun(input)),
            findRunById: jest.fn(),
            findDiffItems: jest.fn(),
            saveAll: jest.fn().mockResolvedValue(undefined)
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        service = new ExternalOrgSyncService(repository as never as ExternalOrgSyncRepository, runtimeAuditService as never as RuntimeAuditService);
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

    it('creates an empty preview run shell for active sources', async () => {
        repository.findSourceById.mockResolvedValue(createSource({ status: ExternalOrgSourceStatusValue.Active, rowVersion: 3, externalRootDepartmentId: '0' }));

        const result = await service.createOrgSyncRun(sourceId, { expectedSourceVersion: 3, requestSnapshot: { requestedByUi: true } }, operatorId);

        expect(repository.createRun).toHaveBeenCalledWith(
            expect.objectContaining({
                sourceId,
                status: OrgSyncRunStatusValue.Previewed,
                requestedBy: operatorId,
                totalItemCount: 0,
                requestSnapshot: expect.objectContaining({
                    requestedByUi: true,
                    adapterStatus: 'pending_ex72d'
                })
            })
        );
        expect(result).toMatchObject({
            id: runId,
            status: OrgSyncRunStatusValue.Previewed,
            totalItemCount: 0
        });
    });

    it('rejects apply while the adapter-backed workflow is still in EX-72D', async () => {
        repository.findRunById.mockResolvedValue(createRun({ status: OrgSyncRunStatusValue.Previewed, rowVersion: 1 }));

        await expect(service.applyOrgSyncRun(runId, { expectedVersion: 1 }, operatorId)).rejects.toThrow(ConflictException);

        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'org-sync-run.apply.rejected',
                targetType: 'OrgSyncRun',
                targetId: runId,
                operatorId,
                result: 'rejected',
                reason: 'apply-workflow-pending-ex72d'
            })
        );
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
