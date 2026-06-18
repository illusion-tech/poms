import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PlatformStore, type OrgUnitTreeNode, type PlatformOrgUnitSummary } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { OrgUnitList } from './org-unit-list';

function createOrgUnit(overrides: Partial<PlatformOrgUnitSummary> = {}): PlatformOrgUnitSummary {
    return {
        id: 'org-root',
        name: '总部',
        code: 'HQ',
        description: '总部组织',
        parentId: null,
        isActive: true,
        displayOrder: 0,
        createdAt: '2026-06-18T00:00:00.000Z',
        updatedAt: '2026-06-18T00:00:00.000Z',
        ...overrides
    };
}

function createTreeNode(overrides: Partial<OrgUnitTreeNode> = {}): OrgUnitTreeNode {
    const summary = createOrgUnit(overrides);
    return {
        ...summary,
        childCount: overrides.children?.length ?? 0,
        activeMembershipCount: 0,
        canDelete: true,
        children: [],
        ...overrides
    };
}

describe('OrgUnitList', () => {
    let fixture: ComponentFixture<OrgUnitList>;
    let component: OrgUnitList;
    let orgUnits: ReturnType<typeof signal<PlatformOrgUnitSummary[]>>;
    let orgUnitTree: ReturnType<typeof signal<OrgUnitTreeNode[]>>;
    let platformStoreMock: {
        orgUnits: typeof orgUnits;
        orgUnitTree: typeof orgUnitTree;
        loadingOrgUnits: ReturnType<typeof signal<boolean>>;
        loadingOrgUnitTree: ReturnType<typeof signal<boolean>>;
        loadedOrgUnits: ReturnType<typeof signal<boolean>>;
        savingOrgUnit: ReturnType<typeof signal<boolean>>;
        loadOrgUnitManagementData: jest.Mock;
        createOrgUnit: jest.Mock;
        updateOrgUnit: jest.Mock;
        moveOrgUnit: jest.Mock;
        activateOrgUnit: jest.Mock;
        deactivateOrgUnit: jest.Mock;
    };

    beforeEach(async () => {
        const market = createTreeNode({
            id: 'org-market',
            name: '市场部',
            code: 'MKT',
            parentId: 'org-jiangsu'
        });
        const research = createTreeNode({
            id: 'org-research',
            name: '研发中心',
            code: 'RD',
            parentId: 'org-jiangsu'
        });
        const jiangsu = createTreeNode({
            id: 'org-jiangsu',
            name: '江苏分公司',
            code: 'JS',
            parentId: 'org-root',
            children: [market, research]
        });
        const finance = createTreeNode({
            id: 'org-finance',
            name: '财务部',
            code: 'FIN',
            parentId: 'org-root'
        });
        const root = createTreeNode({
            id: 'org-root',
            name: '北京开源幻境科技有限公司',
            code: 'ROOT',
            children: [jiangsu, finance]
        });

        orgUnitTree = signal<OrgUnitTreeNode[]>([root]);
        orgUnits = signal<PlatformOrgUnitSummary[]>([root, jiangsu, market, research, finance]);
        platformStoreMock = {
            orgUnits,
            orgUnitTree,
            loadingOrgUnits: signal(false),
            loadingOrgUnitTree: signal(false),
            loadedOrgUnits: signal(true),
            savingOrgUnit: signal(false),
            loadOrgUnitManagementData: jest.fn().mockResolvedValue({ orgUnits: orgUnits(), orgUnitTree: orgUnitTree() }),
            createOrgUnit: jest.fn().mockResolvedValue(createOrgUnit({ id: 'org-sales', name: '销售部', parentId: 'org-jiangsu' })),
            updateOrgUnit: jest.fn().mockResolvedValue(createOrgUnit()),
            moveOrgUnit: jest.fn().mockResolvedValue(createOrgUnit()),
            activateOrgUnit: jest.fn().mockResolvedValue(createOrgUnit()),
            deactivateOrgUnit: jest.fn().mockResolvedValue(createOrgUnit())
        };

        await TestBed.configureTestingModule({
            imports: [OrgUnitList]
        })
            .overrideComponent(OrgUnitList, {
                set: {
                    providers: [
                        {
                            provide: PlatformStore,
                            useValue: platformStoreMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(OrgUnitList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads org unit management data and expands root nodes by default', () => {
        expect(platformStoreMock.loadOrgUnitManagementData).toHaveBeenCalledWith();
        expect(component.effectiveExpandedKeys()).toMatchObject({ 'org-root': true });
        expect(component.visibleOrgUnitCount()).toBe(5);
    });

    it('filters the tree while preserving matched node ancestors', () => {
        component.updateSearchQuery('市场');

        const nodes = component.treeTableNodes();
        const root = nodes[0];
        const jiangsu = root.children?.[0];

        expect(root.data?.name).toBe('北京开源幻境科技有限公司');
        expect(jiangsu?.data?.name).toBe('江苏分公司');
        expect(jiangsu?.children?.map((node) => node.data?.name)).toEqual(['市场部']);
        expect(component.effectiveExpandedKeys()).toMatchObject({ 'org-root': true, 'org-jiangsu': true });
    });

    it('keeps children visible when the parent node matches search', () => {
        component.updateSearchQuery('江苏');

        const jiangsu = component.treeTableNodes()[0].children?.[0];

        expect(jiangsu?.data?.name).toBe('江苏分公司');
        expect(jiangsu?.children?.map((node) => node.data?.name)).toEqual(['市场部', '研发中心']);
    });

    it('excludes the moving org unit and its descendants from parent options', () => {
        const options = component.selectableParents('org-jiangsu');

        expect(options.map((option) => option.id)).toEqual(['org-root', 'org-finance']);
    });

    it('expands the selected parent after creating a child org unit', async () => {
        component.openCreateDialog();
        component.createForm = {
            name: '销售部',
            code: 'SALES',
            description: '',
            parentId: 'org-jiangsu',
            displayOrder: 30
        };

        await component.createOrgUnit();

        expect(platformStoreMock.createOrgUnit).toHaveBeenCalledWith({
            name: '销售部',
            code: 'SALES',
            description: null,
            parentId: 'org-jiangsu',
            displayOrder: 30
        });
        expect(component.effectiveExpandedKeys()).toMatchObject({ 'org-jiangsu': true });
    });
});
