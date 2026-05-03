import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActiveInactiveStatus,
    AttachmentRelationType,
    AttachmentSecurityLevel,
    AttachmentStatus,
    AttachmentStore,
    AttachmentTargetType,
    DictionaryDomain,
    DictionaryStore,
    type DictionaryItemSummary,
    type AttachmentSummary
} from '@poms/admin-data-access';
import { AttachmentPanel } from './attachment-panel';

function createDictionaryItem(code: string, name: string, sortOrder = 0): DictionaryItemSummary {
    return {
        id: `dictionary-${code}`,
        domain: DictionaryDomain.AttachmentCategory,
        code,
        name,
        description: null,
        status: ActiveInactiveStatus.Active,
        sortOrder,
        isSystem: true,
        usageCount: 0,
        rowVersion: 1,
        createdAt: '2026-05-01T00:00:00.000Z',
        createdBy: null,
        updatedAt: '2026-05-01T00:00:00.000Z',
        updatedBy: null
    };
}

function createAttachment(overrides: Partial<AttachmentSummary> = {}): AttachmentSummary {
    return {
        id: 'attachment-1',
        originalName: '需求确认.pdf',
        displayName: '需求确认.pdf',
        extension: 'pdf',
        mimeType: 'application/pdf',
        sizeBytes: 1024,
        checksumSha256: 'a'.repeat(64),
        category: 'demand',
        securityLevel: AttachmentSecurityLevel.Internal,
        status: AttachmentStatus.Active,
        description: '客户提供的需求材料',
        versionGroupId: null,
        versionNo: 1,
        isLatest: true,
        isFinal: false,
        uploadedBy: 'user-1',
        uploadedByName: '张销售',
        uploadedAt: '2026-04-30T08:00:00.000Z',
        updatedAt: '2026-04-30T08:00:00.000Z',
        deletedAt: null,
        links: [],
        ...overrides
    };
}

describe('AttachmentPanel', () => {
    let fixture: ComponentFixture<AttachmentPanel>;
    let component: AttachmentPanel;
    let attachments: ReturnType<typeof signal<AttachmentSummary[]>>;
    let dictionaryItems: ReturnType<typeof signal<DictionaryItemSummary[]>>;
    let storeMock: {
        attachments: ReturnType<typeof signal<AttachmentSummary[]>>;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadAttachments: jest.Mock;
        uploadAttachment: jest.Mock;
        voidAttachment: jest.Mock;
        downloadAttachment: jest.Mock;
        clearAttachments: jest.Mock;
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
        attachments = signal([createAttachment()]);
        dictionaryItems = signal([createDictionaryItem('demand', '需求资料'), createDictionaryItem('communication', '沟通资料', 10)]);
        storeMock = {
            attachments,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadAttachments: jest.fn().mockResolvedValue(attachments()),
            uploadAttachment: jest.fn().mockResolvedValue(createAttachment({ id: 'attachment-2' })),
            voidAttachment: jest.fn().mockResolvedValue(createAttachment({ status: AttachmentStatus.Voided })),
            downloadAttachment: jest.fn(),
            clearAttachments: jest.fn(() => attachments.set([]))
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
            imports: [AttachmentPanel]
        })
            .overrideComponent(AttachmentPanel, {
                set: {
                    providers: [
                        {
                            provide: AttachmentStore,
                            useValue: storeMock
                        },
                        {
                            provide: DictionaryStore,
                            useValue: dictionaryStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(AttachmentPanel);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('targetType', AttachmentTargetType.Lead);
        fixture.componentRef.setInput('targetId', 'lead-1');
        fixture.componentRef.setInput('canWrite', true);
        fixture.detectChanges();
    });

    it('loads and renders attachments for the target object', () => {
        expect(storeMock.loadAttachments).toHaveBeenCalledWith({
            targetType: AttachmentTargetType.Lead,
            targetId: 'lead-1'
        });
        expect(fixture.nativeElement.textContent).toContain('需求确认.pdf');
        expect(fixture.nativeElement.textContent).toContain('需求资料');
        expect(fixture.nativeElement.textContent).toContain('张销售');
    });

    it('uploads an attachment with the selected category, security level and relation', async () => {
        const file = new File(['hello'], '会议纪要.pdf', { type: 'application/pdf' });

        component.selectedFile.set(file);
        component.updateUploadField('category', 'communication');
        component.updateUploadField('securityLevel', AttachmentSecurityLevel.Internal);
        component.updateUploadField('displayName', '会议纪要');
        component.updateUploadField('description', '客户会议纪要');

        await component.upload();

        expect(storeMock.uploadAttachment).toHaveBeenCalledWith({
            targetType: AttachmentTargetType.Lead,
            targetId: 'lead-1',
            file,
            category: 'communication',
            securityLevel: AttachmentSecurityLevel.Internal,
            relationType: AttachmentRelationType.Normal,
            displayName: '会议纪要',
            description: '客户会议纪要'
        });
        expect(storeMock.loadAttachments).toHaveBeenCalledTimes(2);
    });
});
