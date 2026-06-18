import { TestBed } from '@angular/core/testing';
import { PlatformApi, PlatformStore, type OrgUnitTreeNode, type PlatformOrgUnitSummary } from '@poms/admin-data-access';
import { Subject } from 'rxjs';

function createOrgUnit(id: string, name: string): PlatformOrgUnitSummary {
    return {
        id,
        name,
        code: name.toUpperCase(),
        description: null,
        parentId: null,
        isActive: true,
        displayOrder: 0,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z'
    };
}

function createOrgUnitTreeNode(id: string, name: string): OrgUnitTreeNode {
    return {
        ...createOrgUnit(id, name),
        childCount: 0,
        activeMembershipCount: 0,
        canDelete: true,
        children: []
    };
}

describe('PlatformStore', () => {
    it('keeps org unit loading state until the latest concurrent management refresh finishes', async () => {
        const orgUnitResponses: Subject<PlatformOrgUnitSummary[]>[] = [];
        const orgUnitTreeResponses: Subject<OrgUnitTreeNode[]>[] = [];
        const platformApiMock = {
            platformControllerListOrgUnits: jest.fn(() => {
                const response = new Subject<PlatformOrgUnitSummary[]>();
                orgUnitResponses.push(response);
                return response.asObservable();
            }),
            platformControllerListOrgUnitTree: jest.fn(() => {
                const response = new Subject<OrgUnitTreeNode[]>();
                orgUnitTreeResponses.push(response);
                return response.asObservable();
            })
        };

        TestBed.configureTestingModule({
            providers: [
                PlatformStore,
                {
                    provide: PlatformApi,
                    useValue: platformApiMock
                }
            ]
        });

        const store = TestBed.inject(PlatformStore);
        const firstLoad = store.loadOrgUnitManagementData();
        const secondLoad = store.loadOrgUnitManagementData();

        expect(store.loadingOrgUnits()).toBe(true);
        expect(store.loadingOrgUnitTree()).toBe(true);

        orgUnitResponses[0].next([createOrgUnit('org-first', '首个响应')]);
        orgUnitResponses[0].complete();
        orgUnitTreeResponses[0].next([createOrgUnitTreeNode('tree-first', '首个树响应')]);
        orgUnitTreeResponses[0].complete();
        await firstLoad;

        expect(store.loadingOrgUnits()).toBe(true);
        expect(store.loadingOrgUnitTree()).toBe(true);
        expect(store.orgUnits()).toEqual([]);
        expect(store.orgUnitTree()).toEqual([]);

        orgUnitResponses[1].next([createOrgUnit('org-second', '最新响应')]);
        orgUnitResponses[1].complete();
        orgUnitTreeResponses[1].next([createOrgUnitTreeNode('tree-second', '最新树响应')]);
        orgUnitTreeResponses[1].complete();
        await secondLoad;

        expect(store.loadingOrgUnits()).toBe(false);
        expect(store.loadingOrgUnitTree()).toBe(false);
        expect(store.orgUnits().map((unit) => unit.id)).toEqual(['org-second']);
        expect(store.orgUnitTree().map((unit) => unit.id)).toEqual(['tree-second']);
    });
});
