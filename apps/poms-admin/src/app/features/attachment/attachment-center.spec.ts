import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import {
    ActiveInactiveStatus,
    AttachmentCenterStore,
    AttachmentSecurityLevel,
    AttachmentStatus,
    AttachmentTargetType,
    DictionaryDomain,
    DictionaryStore,
    type AttachmentCenterRecord,
    type DictionaryItemSummary
} from '@poms/admin-data-access';
import { AttachmentCenter } from './attachment-center';

const DEMAND_ATTACHMENT_CATEGORY = 'demand';

function createDictionaryItem(): DictionaryItemSummary {
    return {
        id: 'dictionary-demand',
        domain: DictionaryDomain.AttachmentCategory,
        code: DEMAND_ATTACHMENT_CATEGORY,
        name: '需求资料',
        description: null,
        status: ActiveInactiveStatus.Active,
        sortOrder: 0,
        isSystem: true,
        usageCount: 0,
        rowVersion: 1,
        createdAt: '2026-05-01T00:00:00.000Z',
        createdBy: null,
        updatedAt: '2026-05-01T00:00:00.000Z',
        updatedBy: null
    };
}

function createRecord(overrides: Partial<AttachmentCenterRecord> = {}): AttachmentCenterRecord {
    return {
        id: 'project:project-1:attachment-1',
        targetType: AttachmentTargetType.Project,
        targetId: 'project-1',
        targetNo: 'PROJ-2026-001',
        targetName: '智慧园区项目',
        targetOwnerName: '张销售',
        routeCommands: ['/projects', 'project-1'],
        attachment: {
            id: 'attachment-1',
            originalName: '需求确认.pdf',
            displayName: '需求确认.pdf',
            extension: 'pdf',
            mimeType: 'application/pdf',
            sizeBytes: 2048,
            checksumSha256: 'a'.repeat(64),
            category: DEMAND_ATTACHMENT_CATEGORY,
            securityLevel: AttachmentSecurityLevel.Internal,
            status: AttachmentStatus.Active,
            description: null,
            previousAttachmentId: null,
            changeNote: null,
            versionGroupId: 'attachment-1',
            versionNo: 1,
            isLatest: true,
            isFinal: true,
            previewSupported: true,
            previewMimeType: 'application/pdf',
            previewUrl: '/api/attachments/attachment-1/preview',
            thumbnailAvailable: false,
            thumbnailUrl: null,
            uploadedBy: 'user-1',
            uploadedByName: '张销售',
            uploadedAt: '2026-05-04T08:00:00.000Z',
            updatedAt: '2026-05-04T08:00:00.000Z',
            deletedAt: null,
            links: []
        },
        ...overrides
    };
}

describe('AttachmentCenter', () => {
    let fixture: ComponentFixture<AttachmentCenter>;
    let component: AttachmentCenter;
    let records: ReturnType<typeof signal<AttachmentCenterRecord[]>>;
    let dictionaryItems: ReturnType<typeof signal<DictionaryItemSummary[]>>;
    let routerMock: { navigate: jest.Mock };
    let storeMock: {
        records: ReturnType<typeof signal<AttachmentCenterRecord[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        errors: ReturnType<typeof signal<string[]>>;
        loadRecords: jest.Mock;
        clearRecords: jest.Mock;
    };
    let dictionaryStoreMock: {
        items: typeof dictionaryItems;
        activeItems: typeof dictionaryItems;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadItems: jest.Mock;
        clearItems: jest.Mock;
    };

    beforeEach(async () => {
        records = signal([createRecord()]);
        dictionaryItems = signal([createDictionaryItem()]);
        routerMock = { navigate: jest.fn() };
        storeMock = {
            records,
            loading: signal(false),
            loaded: signal(true),
            errors: signal([]),
            loadRecords: jest.fn().mockResolvedValue(records()),
            clearRecords: jest.fn(() => records.set([]))
        };
        dictionaryStoreMock = {
            items: dictionaryItems,
            activeItems: dictionaryItems,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadItems: jest.fn().mockResolvedValue(dictionaryItems()),
            clearItems: jest.fn(() => dictionaryItems.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [AttachmentCenter],
            providers: [{ provide: Router, useValue: routerMock }]
        })
            .overrideComponent(AttachmentCenter, {
                set: {
                    providers: [
                        { provide: AttachmentCenterStore, useValue: storeMock },
                        { provide: DictionaryStore, useValue: dictionaryStoreMock }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(AttachmentCenter);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });

    it('loads records and renders attachment evidence rows', () => {
        expect(storeMock.loadRecords).toHaveBeenCalled();
        expect(dictionaryStoreMock.loadItems).toHaveBeenCalledWith({
            domain: DictionaryDomain.AttachmentCategory,
            status: ActiveInactiveStatus.Active
        });
        expect(fixture.nativeElement.textContent).toContain('需求确认.pdf');
        expect(fixture.nativeElement.textContent).toContain('智慧园区项目');
        expect(fixture.nativeElement.textContent).toContain('需求资料');
    });

    it('filters records by keyword', () => {
        component.keyword.set('园区');

        expect(component.filteredRecords()).toHaveLength(1);

        component.keyword.set('不存在');

        expect(component.filteredRecords()).toHaveLength(0);
    });

    it('navigates back to the source business object', () => {
        component.navigateToSource(createRecord());

        expect(routerMock.navigate).toHaveBeenCalledWith(['/projects', 'project-1'], undefined);
    });
});
