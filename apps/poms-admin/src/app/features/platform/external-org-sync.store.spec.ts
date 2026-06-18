import { TestBed } from '@angular/core/testing';
import { ExternalDepartmentMappingReviewState, ExternalDepartmentMappingStatus, type ExternalDepartmentMappingSummary, ExternalOrgSyncApi, ExternalOrgSyncStore } from '@poms/admin-data-access';
import { of } from 'rxjs';

function createMapping(overrides: Partial<ExternalDepartmentMappingSummary> = {}): ExternalDepartmentMappingSummary {
    return {
        id: 'mapping-1',
        sourceId: 'external-org-source-1',
        externalDepartmentId: 'od-parent',
        externalParentDepartmentId: '0',
        externalDepartmentName: '销售部',
        orgUnitId: 'org-parent',
        status: ExternalDepartmentMappingStatus.Conflict,
        reviewState: ExternalDepartmentMappingReviewState.Conflict,
        conflictReason: '映射存在冲突但仍保留组织绑定',
        lastConflictRunId: null,
        lastConflictDiffItemId: null,
        externalSnapshot: {},
        lastSeenAt: '2026-06-10T08:30:00.000Z',
        rowVersion: 1,
        createdAt: '2026-06-10T08:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-06-10T08:30:00.000Z',
        updatedBy: 'admin',
        ...overrides
    };
}

describe('ExternalOrgSyncStore', () => {
    let store: ExternalOrgSyncStore;
    let externalOrgSyncApiMock: {
        externalOrgSyncControllerListExternalDepartmentMappings: jest.Mock;
        externalOrgSyncControllerListOrgSyncRuns: jest.Mock;
    };

    beforeEach(() => {
        externalOrgSyncApiMock = {
            externalOrgSyncControllerListExternalDepartmentMappings: jest.fn(),
            externalOrgSyncControllerListOrgSyncRuns: jest.fn().mockReturnValue(of([]))
        };

        TestBed.configureTestingModule({
            providers: [
                ExternalOrgSyncStore,
                {
                    provide: ExternalOrgSyncApi,
                    useValue: externalOrgSyncApiMock
                }
            ]
        });

        store = TestBed.inject(ExternalOrgSyncStore);
    });

    it('builds the apply dependency index from all orgUnit-bound mappings regardless of status', async () => {
        externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings.mockReturnValue(
            of([
                createMapping(),
                createMapping({
                    id: 'mapping-unmapped',
                    externalDepartmentId: 'od-unmapped',
                    orgUnitId: null,
                    status: ExternalDepartmentMappingStatus.Unmapped,
                    reviewState: ExternalDepartmentMappingReviewState.Unmapped
                })
            ])
        );

        const ids = await store.loadMappedExternalDepartmentIds('external-org-source-1');

        expect(externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings).toHaveBeenCalledWith({
            sourceId: 'external-org-source-1'
        });
        expect(ids.has('od-parent')).toBe(true);
        expect(ids.has('od-unmapped')).toBe(false);
        expect(store.mappedExternalDepartmentIds().has('od-parent')).toBe(true);
    });

    it('reuses the unfiltered mapping load as the dependency index when selecting a source without filters', async () => {
        externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings.mockReturnValue(
            of([
                createMapping(),
                createMapping({
                    id: 'mapping-unmapped',
                    externalDepartmentId: 'od-unmapped',
                    orgUnitId: null,
                    status: ExternalDepartmentMappingStatus.Unmapped,
                    reviewState: ExternalDepartmentMappingReviewState.Unmapped
                })
            ])
        );

        await store.selectSource('external-org-source-1');

        expect(externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings).toHaveBeenCalledTimes(1);
        expect(externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings).toHaveBeenCalledWith({
            sourceId: 'external-org-source-1',
            status: undefined,
            reviewState: undefined,
            search: undefined,
            externalDepartmentId: undefined,
            orgUnitId: undefined
        });
        expect(store.mappings().map((mapping) => mapping.externalDepartmentId)).toEqual(['od-parent', 'od-unmapped']);
        expect(store.mappedExternalDepartmentIds().has('od-parent')).toBe(true);
        expect(store.mappedExternalDepartmentIds().has('od-unmapped')).toBe(false);
    });

    it('keeps an unfiltered dependency index when selecting a source with mapping filters', async () => {
        externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings
            .mockReturnValueOnce(
                of([
                    createMapping({
                        id: 'mapping-unmapped',
                        externalDepartmentId: 'od-unmapped',
                        orgUnitId: null,
                        status: ExternalDepartmentMappingStatus.Unmapped,
                        reviewState: ExternalDepartmentMappingReviewState.Unmapped
                    })
                ])
            )
            .mockReturnValueOnce(of([createMapping()]));

        await store.selectSource('external-org-source-1', { reviewState: ExternalDepartmentMappingReviewState.Unmapped });

        expect(externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings).toHaveBeenCalledTimes(2);
        expect(externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings).toHaveBeenNthCalledWith(1, {
            sourceId: 'external-org-source-1',
            status: undefined,
            reviewState: ExternalDepartmentMappingReviewState.Unmapped,
            search: undefined,
            externalDepartmentId: undefined,
            orgUnitId: undefined
        });
        expect(externalOrgSyncApiMock.externalOrgSyncControllerListExternalDepartmentMappings).toHaveBeenNthCalledWith(2, {
            sourceId: 'external-org-source-1'
        });
        expect(store.mappings().map((mapping) => mapping.externalDepartmentId)).toEqual(['od-unmapped']);
        expect(store.mappedExternalDepartmentIds().has('od-parent')).toBe(true);
        expect(store.mappedExternalDepartmentIds().has('od-unmapped')).toBe(false);
    });
});
