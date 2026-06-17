import { ExternalDepartmentMappingReviewStateValue, ExternalDepartmentMappingStatusValue, ExternalOrgProviderValue, ExternalOrgSourceStatusValue, OrgSyncRunStatusValue } from '@poms/shared-contracts';
import { ExternalOrgSyncController } from './external-org-sync.controller';
import { ExternalOrgSyncService } from './external-org-sync.service';

describe('ExternalOrgSyncController', () => {
    const operatorRequest = { user: { sub: '00000000-0000-4000-8000-000000000001' } };
    const sourceId = '97000000-0000-4000-8000-000000000001';
    const runId = '97000000-0000-4000-8000-000000000011';
    let service: jest.Mocked<
        Pick<
            ExternalOrgSyncService,
            | 'listExternalOrgSources'
            | 'createExternalOrgSource'
            | 'getExternalOrgSource'
            | 'updateExternalOrgSource'
            | 'activateExternalOrgSource'
            | 'pauseExternalOrgSource'
            | 'archiveExternalOrgSource'
            | 'listExternalDepartmentMappings'
            | 'replaceExternalDepartmentMappings'
            | 'mapExternalDepartmentMapping'
            | 'unmapExternalDepartmentMapping'
            | 'ignoreExternalDepartmentMapping'
            | 'restoreExternalDepartmentMapping'
            | 'createOrgSyncRun'
            | 'listOrgSyncRuns'
            | 'getOrgSyncRun'
            | 'listOrgSyncDiffItems'
            | 'applyOrgSyncRun'
        >
    >;
    let controller: ExternalOrgSyncController;

    beforeEach(() => {
        service = {
            listExternalOrgSources: jest.fn(),
            createExternalOrgSource: jest.fn(),
            getExternalOrgSource: jest.fn(),
            updateExternalOrgSource: jest.fn(),
            activateExternalOrgSource: jest.fn(),
            pauseExternalOrgSource: jest.fn(),
            archiveExternalOrgSource: jest.fn(),
            listExternalDepartmentMappings: jest.fn(),
            replaceExternalDepartmentMappings: jest.fn(),
            mapExternalDepartmentMapping: jest.fn(),
            unmapExternalDepartmentMapping: jest.fn(),
            ignoreExternalDepartmentMapping: jest.fn(),
            restoreExternalDepartmentMapping: jest.fn(),
            createOrgSyncRun: jest.fn(),
            listOrgSyncRuns: jest.fn(),
            getOrgSyncRun: jest.fn(),
            listOrgSyncDiffItems: jest.fn(),
            applyOrgSyncRun: jest.fn()
        };
        controller = new ExternalOrgSyncController(service as never as ExternalOrgSyncService);
    });

    it('delegates source list and source commands', async () => {
        const source = createSource();
        service.listExternalOrgSources.mockResolvedValue([source]);
        service.createExternalOrgSource.mockResolvedValue(source);
        service.getExternalOrgSource.mockResolvedValue(source);
        service.updateExternalOrgSource.mockResolvedValue({ ...source, displayName: '飞书通讯录正式源' });
        service.activateExternalOrgSource.mockResolvedValue({ ...source, status: ExternalOrgSourceStatusValue.Active });
        service.pauseExternalOrgSource.mockResolvedValue({ ...source, status: ExternalOrgSourceStatusValue.Paused });
        service.archiveExternalOrgSource.mockResolvedValue({ ...source, status: ExternalOrgSourceStatusValue.Archived });

        await controller.listExternalOrgSources({ provider: ExternalOrgProviderValue.Feishu, status: ExternalOrgSourceStatusValue.Active });
        await controller.createExternalOrgSource({ provider: ExternalOrgProviderValue.Feishu, displayName: '飞书通讯录', externalRootDepartmentId: '0' }, operatorRequest as never);
        await controller.getExternalOrgSource(sourceId);
        await controller.updateExternalOrgSource(sourceId, { displayName: '飞书通讯录正式源', expectedVersion: 1 }, operatorRequest as never);
        await controller.activateExternalOrgSource(sourceId, { expectedVersion: 2 }, operatorRequest as never);
        await controller.pauseExternalOrgSource(sourceId, { expectedVersion: 3 }, operatorRequest as never);
        await controller.archiveExternalOrgSource(sourceId, { expectedVersion: 4 }, operatorRequest as never);

        expect(service.listExternalOrgSources).toHaveBeenCalledWith({ provider: ExternalOrgProviderValue.Feishu, status: ExternalOrgSourceStatusValue.Active });
        expect(service.createExternalOrgSource).toHaveBeenCalledWith({ provider: ExternalOrgProviderValue.Feishu, displayName: '飞书通讯录', externalRootDepartmentId: '0' }, operatorRequest.user.sub);
        expect(service.getExternalOrgSource).toHaveBeenCalledWith(sourceId);
        expect(service.updateExternalOrgSource).toHaveBeenCalledWith(sourceId, { displayName: '飞书通讯录正式源', expectedVersion: 1 }, operatorRequest.user.sub);
        expect(service.activateExternalOrgSource).toHaveBeenCalledWith(sourceId, { expectedVersion: 2 }, operatorRequest.user.sub);
        expect(service.pauseExternalOrgSource).toHaveBeenCalledWith(sourceId, { expectedVersion: 3 }, operatorRequest.user.sub);
        expect(service.archiveExternalOrgSource).toHaveBeenCalledWith(sourceId, { expectedVersion: 4 }, operatorRequest.user.sub);
    });

    it('delegates mapping replacement and run operations', async () => {
        const mappings = [
            {
                id: '97000000-0000-4000-8000-000000000101',
                sourceId,
                externalDepartmentId: 'od-1',
                externalParentDepartmentId: null,
                externalDepartmentName: '销售部',
                orgUnitId: null,
                status: ExternalDepartmentMappingStatusValue.Unmapped,
                reviewState: ExternalDepartmentMappingReviewStateValue.Unmapped,
                conflictReason: null,
                lastConflictRunId: null,
                lastConflictDiffItemId: null,
                externalSnapshot: {},
                lastSeenAt: '2026-06-10T00:00:00.000Z',
                rowVersion: 1,
                createdAt: '2026-06-10T00:00:00.000Z',
                createdBy: operatorRequest.user.sub,
                updatedAt: '2026-06-10T00:00:00.000Z',
                updatedBy: operatorRequest.user.sub
            }
        ];
        const run = createRun();
        service.listExternalDepartmentMappings.mockResolvedValue(mappings);
        service.replaceExternalDepartmentMappings.mockResolvedValue(mappings);
        service.mapExternalDepartmentMapping.mockResolvedValue({ ...mappings[0], orgUnitId: '97000000-0000-4000-8000-000000000201', status: ExternalDepartmentMappingStatusValue.Mapped, reviewState: ExternalDepartmentMappingReviewStateValue.Mapped });
        service.unmapExternalDepartmentMapping.mockResolvedValue(mappings[0]);
        service.ignoreExternalDepartmentMapping.mockResolvedValue({ ...mappings[0], status: ExternalDepartmentMappingStatusValue.Ignored, reviewState: ExternalDepartmentMappingReviewStateValue.Ignored });
        service.restoreExternalDepartmentMapping.mockResolvedValue(mappings[0]);
        service.createOrgSyncRun.mockResolvedValue(run);
        service.listOrgSyncRuns.mockResolvedValue([run]);
        service.getOrgSyncRun.mockResolvedValue(run);
        service.listOrgSyncDiffItems.mockResolvedValue([]);
        service.applyOrgSyncRun.mockResolvedValue(run);

        await controller.listExternalDepartmentMappings(sourceId, { status: ExternalDepartmentMappingStatusValue.Unmapped });
        await controller.replaceExternalDepartmentMappings(sourceId, { expectedSourceVersion: 1, items: [] }, operatorRequest as never);
        await controller.mapExternalDepartmentMapping(mappings[0].id, { orgUnitId: '97000000-0000-4000-8000-000000000201', expectedVersion: 1 }, operatorRequest as never);
        await controller.unmapExternalDepartmentMapping(mappings[0].id, { expectedVersion: 2 }, operatorRequest as never);
        await controller.ignoreExternalDepartmentMapping(mappings[0].id, { expectedVersion: 3 }, operatorRequest as never);
        await controller.restoreExternalDepartmentMapping(mappings[0].id, { expectedVersion: 4 }, operatorRequest as never);
        await controller.createOrgSyncRun(sourceId, { expectedSourceVersion: 1 }, operatorRequest as never);
        await controller.listOrgSyncRuns(sourceId, { status: OrgSyncRunStatusValue.Failed, limit: 10 });
        await controller.getOrgSyncRun(runId);
        await controller.listOrgSyncDiffItems(runId, {});
        await controller.applyOrgSyncRun(runId, { expectedVersion: 1 }, operatorRequest as never);

        expect(service.listExternalDepartmentMappings).toHaveBeenCalledWith(sourceId, { status: ExternalDepartmentMappingStatusValue.Unmapped, externalDepartmentId: undefined, orgUnitId: undefined });
        expect(service.replaceExternalDepartmentMappings).toHaveBeenCalledWith(sourceId, { expectedSourceVersion: 1, items: [] }, operatorRequest.user.sub);
        expect(service.mapExternalDepartmentMapping).toHaveBeenCalledWith(mappings[0].id, { orgUnitId: '97000000-0000-4000-8000-000000000201', expectedVersion: 1 }, operatorRequest.user.sub);
        expect(service.unmapExternalDepartmentMapping).toHaveBeenCalledWith(mappings[0].id, { expectedVersion: 2 }, operatorRequest.user.sub);
        expect(service.ignoreExternalDepartmentMapping).toHaveBeenCalledWith(mappings[0].id, { expectedVersion: 3 }, operatorRequest.user.sub);
        expect(service.restoreExternalDepartmentMapping).toHaveBeenCalledWith(mappings[0].id, { expectedVersion: 4 }, operatorRequest.user.sub);
        expect(service.createOrgSyncRun).toHaveBeenCalledWith(sourceId, { expectedSourceVersion: 1 }, operatorRequest.user.sub);
        expect(service.listOrgSyncRuns).toHaveBeenCalledWith(sourceId, { status: OrgSyncRunStatusValue.Failed, limit: 10 });
        expect(service.getOrgSyncRun).toHaveBeenCalledWith(runId);
        expect(service.listOrgSyncDiffItems).toHaveBeenCalledWith(runId, { action: undefined, status: undefined });
        expect(service.applyOrgSyncRun).toHaveBeenCalledWith(runId, { expectedVersion: 1 }, operatorRequest.user.sub);
    });

    function createSource() {
        return {
            id: sourceId,
            provider: ExternalOrgProviderValue.Feishu,
            externalTenantId: null,
            displayName: '飞书通讯录',
            status: ExternalOrgSourceStatusValue.Active,
            providerConfigId: null,
            authoritativeOrgUnitId: null,
            externalRootDepartmentId: '0',
            syncScopes: [],
            rowVersion: 1,
            createdAt: '2026-06-10T00:00:00.000Z',
            createdBy: operatorRequest.user.sub,
            updatedAt: '2026-06-10T00:00:00.000Z',
            updatedBy: operatorRequest.user.sub
        };
    }

    function createRun() {
        return {
            id: runId,
            sourceId,
            status: OrgSyncRunStatusValue.Previewed,
            requestedBy: operatorRequest.user.sub,
            startedAt: '2026-06-10T00:00:00.000Z',
            finishedAt: '2026-06-10T00:00:00.000Z',
            totalItemCount: 0,
            approvedItemCount: 0,
            skippedItemCount: 0,
            failedItemCount: 0,
            errorSummary: null,
            diagnosticSummary: null,
            requestSnapshot: {},
            resultSummary: {},
            rowVersion: 1,
            createdAt: '2026-06-10T00:00:00.000Z',
            createdBy: operatorRequest.user.sub,
            updatedAt: '2026-06-10T00:00:00.000Z',
            updatedBy: operatorRequest.user.sub
        };
    }
});
