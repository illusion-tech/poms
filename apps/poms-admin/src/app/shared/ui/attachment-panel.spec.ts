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

const DEMAND_ATTACHMENT_CATEGORY = 'demand';
const COMMUNICATION_ATTACHMENT_CATEGORY = 'communication';

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
        category: DEMAND_ATTACHMENT_CATEGORY,
        securityLevel: AttachmentSecurityLevel.Internal,
        status: AttachmentStatus.Active,
        description: '客户提供的需求材料',
        previousAttachmentId: null,
        changeNote: null,
        versionGroupId: 'attachment-1',
        versionNo: 1,
        isLatest: true,
        isFinal: false,
        previewSupported: true,
        previewMimeType: 'application/pdf',
        previewUrl: '/api/attachments/attachment-1/preview',
        thumbnailAvailable: false,
        thumbnailUrl: null,
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
        uploadAttachmentVersion: jest.Mock;
        voidAttachment: jest.Mock;
        loadAttachmentVersions: jest.Mock;
        markAttachmentFinal: jest.Mock;
        clearAttachmentFinal: jest.Mock;
        previewAttachment: jest.Mock;
        thumbnailAttachment: jest.Mock;
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
        dictionaryItems = signal([createDictionaryItem(DEMAND_ATTACHMENT_CATEGORY, '需求资料'), createDictionaryItem(COMMUNICATION_ATTACHMENT_CATEGORY, '沟通资料', 10)]);
        storeMock = {
            attachments,
            loading: signal(false),
            saving: signal(false),
            loaded: signal(true),
            loadAttachments: jest.fn().mockResolvedValue(attachments()),
            uploadAttachment: jest.fn().mockResolvedValue(createAttachment({ id: 'attachment-2' })),
            uploadAttachmentVersion: jest.fn().mockResolvedValue(createAttachment({ id: 'attachment-2', versionNo: 2, previousAttachmentId: 'attachment-1' })),
            voidAttachment: jest.fn().mockResolvedValue(createAttachment({ status: AttachmentStatus.Voided })),
            loadAttachmentVersions: jest.fn().mockResolvedValue([createAttachment({ versionNo: 2, isLatest: true }), createAttachment({ id: 'attachment-old', versionNo: 1, isLatest: false })]),
            markAttachmentFinal: jest.fn().mockResolvedValue(createAttachment({ isFinal: true })),
            clearAttachmentFinal: jest.fn().mockResolvedValue(createAttachment({ isFinal: false })),
            previewAttachment: jest.fn().mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), mimeType: 'application/pdf', fileName: '需求确认.pdf' }),
            thumbnailAttachment: jest.fn().mockResolvedValue(null),
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
        component.updateUploadField('category', COMMUNICATION_ATTACHMENT_CATEGORY);
        component.updateUploadField('securityLevel', AttachmentSecurityLevel.Internal);
        component.updateUploadField('displayName', '会议纪要');
        component.updateUploadField('description', '客户会议纪要');

        await component.upload();

        expect(storeMock.uploadAttachment).toHaveBeenCalledWith({
            targetType: AttachmentTargetType.Lead,
            targetId: 'lead-1',
            file,
            category: COMMUNICATION_ATTACHMENT_CATEGORY,
            securityLevel: AttachmentSecurityLevel.Internal,
            relationType: AttachmentRelationType.Normal,
            displayName: '会议纪要',
            description: '客户会议纪要'
        });
        expect(storeMock.loadAttachments).toHaveBeenCalledTimes(2);
    });

    it('loads attachment versions for the selected attachment', async () => {
        await component.openVersions(createAttachment());

        expect(storeMock.loadAttachmentVersions).toHaveBeenCalledWith('attachment-1');
        expect(component.versions()).toHaveLength(2);
    });

    it('uploads a new attachment version with change note and inherited metadata', async () => {
        const file = new File(['hello-v2'], '需求确认-v2.pdf', { type: 'application/pdf' });

        component.showVersionUploadDialog(createAttachment());
        component.selectedVersionFile.set(file);
        component.updateVersionUploadField('changeNote', '替换为客户确认版本');
        component.updateVersionUploadField('displayName', '需求确认最终版');

        await component.uploadVersion();

        expect(storeMock.uploadAttachmentVersion).toHaveBeenCalledWith({
            id: 'attachment-1',
            file,
            changeNote: '替换为客户确认版本',
            displayName: '需求确认最终版',
            category: DEMAND_ATTACHMENT_CATEGORY,
            securityLevel: AttachmentSecurityLevel.Internal,
            description: '客户提供的需求材料'
        });
        expect(storeMock.loadAttachments).toHaveBeenCalledTimes(2);
    });

    it('marks and clears the final version state through explicit commands', async () => {
        component.showMarkFinalDialog(createAttachment());
        component.markFinalNote.set('客户已确认');

        await component.confirmMarkFinal();

        expect(storeMock.markAttachmentFinal).toHaveBeenCalledWith('attachment-1', { note: '客户已确认' });

        component.showClearFinalDialog(createAttachment({ isFinal: true }));
        component.clearFinalReason.set('客户要求重新确认');

        await component.confirmClearFinal();

        expect(storeMock.clearAttachmentFinal).toHaveBeenCalledWith('attachment-1', { reason: '客户要求重新确认' });
    });
});
