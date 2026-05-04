import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActiveInactiveStatus,
    DictionaryDomain,
    DictionaryStore,
    type DictionaryItemSummary
} from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { DictionaryList } from './dictionary-list';

function createDictionaryItem(overrides: Partial<DictionaryItemSummary> = {}): DictionaryItemSummary {
    return {
        id: 'dictionary-1',
        domain: DictionaryDomain.AttachmentCategory,
        code: 'demand',
        name: '需求资料',
        description: '需求文档、流程图、现场图片等需求材料',
        status: ActiveInactiveStatus.Active,
        sortOrder: 20,
        isSystem: true,
        usageCount: 2,
        rowVersion: 3,
        createdAt: '2026-05-03T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-05-03T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

describe('DictionaryList', () => {
    let fixture: ComponentFixture<DictionaryList>;
    let component: DictionaryList;
    let items: ReturnType<typeof signal<DictionaryItemSummary[]>>;
    let dictionaryStoreMock: {
        items: typeof items;
        activeItems: typeof items;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadItems: jest.Mock;
        createItem: jest.Mock;
        updateItem: jest.Mock;
        clearItems: jest.Mock;
    };

    beforeEach(async () => {
        items = signal<DictionaryItemSummary[]>([
            createDictionaryItem(),
            createDictionaryItem({
                id: 'dictionary-2',
                domain: DictionaryDomain.SalesFollowUpType,
                code: 'meeting',
                name: '会议',
                description: '线上或线下会议沟通',
                usageCount: 1,
                sortOrder: 20
            })
        ]);

        dictionaryStoreMock = {
            items,
            activeItems: items,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadItems: jest.fn().mockResolvedValue(items()),
            createItem: jest.fn().mockResolvedValue(createDictionaryItem({ id: 'dictionary-3', code: 'customer-visit', name: '客户拜访' })),
            updateItem: jest.fn().mockResolvedValue(createDictionaryItem()),
            clearItems: jest.fn(() => items.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [DictionaryList]
        })
            .overrideComponent(DictionaryList, {
                set: {
                    providers: [
                        {
                            provide: DictionaryStore,
                            useValue: dictionaryStoreMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(DictionaryList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads and renders dictionary items from the backend dictionary store', () => {
        const text = fixture.nativeElement.textContent;

        expect(dictionaryStoreMock.loadItems).toHaveBeenCalledWith({
            domain: undefined,
            status: undefined,
            keyword: undefined
        });
        expect(text).toContain('业务字典');
        expect(text).toContain('附件分类');
        expect(text).toContain('需求资料');
        expect(text).toContain('会议');
        expect(text).toContain('v3');
    });

    it('reloads dictionary items with selected filters', async () => {
        dictionaryStoreMock.loadItems.mockClear();

        await component.setDomainFilter(DictionaryDomain.SalesFollowUpType);
        await component.setStatusFilter(ActiveInactiveStatus.Active);
        component.keyword.set('会议');
        await component.reload();

        expect(dictionaryStoreMock.loadItems).toHaveBeenLastCalledWith({
            domain: DictionaryDomain.SalesFollowUpType,
            status: ActiveInactiveStatus.Active,
            keyword: '会议'
        });
    });

    it('creates dictionary items without local fallback values', async () => {
        component.showCreateDialog();
        component.updateCreateDomain(DictionaryDomain.SalesFollowUpType);
        component.updateCreateText('code', 'customer-visit');
        component.updateCreateText('name', '客户拜访');
        component.updateCreateText('description', '客户现场拜访');
        component.updateCreateSortOrder(30);

        await component.createItem();

        expect(dictionaryStoreMock.createItem).toHaveBeenCalledWith({
            domain: DictionaryDomain.SalesFollowUpType,
            code: 'customer-visit',
            name: '客户拜访',
            description: '客户现场拜访',
            sortOrder: 30
        });
        expect(component.createDialogVisible).toBe(false);
    });

    it('toggles item status with optimistic version evidence', async () => {
        const item = createDictionaryItem({ status: ActiveInactiveStatus.Active, rowVersion: 7 });

        await component.toggleStatus(item);

        expect(dictionaryStoreMock.updateItem).toHaveBeenCalledWith(item.id, {
            status: ActiveInactiveStatus.Inactive,
            expectedVersion: 7
        });
    });
});
