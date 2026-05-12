import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ActiveInactiveStatus,
    AttachmentRelationType,
    AttachmentSecurityLevel,
    AttachmentStorageProviderType,
    AttachmentStatus,
    AttachmentStore,
    AttachmentTargetType,
    AttachmentUploadMode,
    AttachmentUploadSessionOperationType,
    DictionaryDomain,
    DictionaryStore,
    type AttachmentUploadProgressState,
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

function uploadProgress(overrides: Partial<AttachmentUploadProgressState> = {}): AttachmentUploadProgressState {
    return {
        phase: 'idle',
        operationType: null,
        sessionId: null,
        uploadMode: null,
        providerType: null,
        fileName: null,
        progressPercent: 0,
        loadedBytes: 0,
        totalBytes: 0,
        message: '',
        canAbort: false,
        error: null,
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
        uploadProgress: ReturnType<typeof signal<AttachmentUploadProgressState>>;
        loadAttachments: jest.Mock;
        uploadAttachment: jest.Mock;
        uploadAttachmentVersion: jest.Mock;
        abortCurrentUpload: jest.Mock;
        voidAttachment: jest.Mock;
        loadAttachmentVersions: jest.Mock;
        markAttachmentFinal: jest.Mock;
        clearAttachmentFinal: jest.Mock;
        previewAttachment: jest.Mock;
        thumbnailAttachment: jest.Mock;
        downloadAttachment: jest.Mock;
        clearAttachments: jest.Mock;
        clearUploadProgress: jest.Mock;
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
            uploadProgress: signal(uploadProgress()),
            loadAttachments: jest.fn().mockResolvedValue(attachments()),
            uploadAttachment: jest.fn().mockResolvedValue(createAttachment({ id: 'attachment-2' })),
            uploadAttachmentVersion: jest.fn().mockResolvedValue(createAttachment({ id: 'attachment-2', versionNo: 2, previousAttachmentId: 'attachment-1' })),
            abortCurrentUpload: jest.fn().mockResolvedValue(undefined),
            voidAttachment: jest.fn().mockResolvedValue(createAttachment({ status: AttachmentStatus.Voided })),
            loadAttachmentVersions: jest.fn().mockResolvedValue([createAttachment({ versionNo: 2, isLatest: true }), createAttachment({ id: 'attachment-old', versionNo: 1, isLatest: false })]),
            markAttachmentFinal: jest.fn().mockResolvedValue(createAttachment({ isFinal: true })),
            clearAttachmentFinal: jest.fn().mockResolvedValue(createAttachment({ isFinal: false })),
            previewAttachment: jest.fn().mockResolvedValue({ blob: new Blob(['pdf'], { type: 'application/pdf' }), mimeType: 'application/pdf', fileName: '需求确认.pdf' }),
            thumbnailAttachment: jest.fn().mockResolvedValue(null),
            downloadAttachment: jest.fn(),
            clearAttachments: jest.fn(() => attachments.set([])),
            clearUploadProgress: jest.fn(() => storeMock.uploadProgress.set(uploadProgress()))
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

    it('shows upload session progress and lets the user abort the current session', async () => {
        component.showUploadDialog();
        storeMock.uploadProgress.set(
            uploadProgress({
                phase: 'uploading',
                operationType: AttachmentUploadSessionOperationType.CreateAttachment,
                sessionId: 'upload-session-1',
                uploadMode: AttachmentUploadMode.PresignedPut,
                providerType: AttachmentStorageProviderType.HuaweiObsS3,
                fileName: '会议纪要.pdf',
                progressPercent: 42,
                loadedBytes: 420,
                totalBytes: 1000,
                message: '正在直传到对象存储',
                canAbort: true
            })
        );
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('正在上传');
        expect(fixture.nativeElement.textContent).toContain('OBS Direct');
        expect(fixture.nativeElement.textContent).toContain('42%');

        await component.abortUpload();

        expect(storeMock.abortCurrentUpload).toHaveBeenCalledWith('用户在附件面板中止附件上传。');
    });

    it('keeps selected file and metadata after upload failure so the user can retry', async () => {
        const file = new File(['hello'], '会议纪要.pdf', { type: 'application/pdf' });
        storeMock.uploadAttachment.mockRejectedValueOnce(new Error('provider unavailable'));

        component.showUploadDialog();
        component.selectedFile.set(file);
        component.updateUploadField('category', COMMUNICATION_ATTACHMENT_CATEGORY);
        component.updateUploadField('displayName', '会议纪要');

        await component.upload();

        expect(component.uploadDialogVisible).toBe(true);
        expect(component.selectedFile()).toBe(file);
        expect(component.uploadForm().displayName).toBe('会议纪要');
        expect(component.uploadError()).toContain('存储 provider');

        storeMock.uploadAttachment.mockResolvedValueOnce(createAttachment({ id: 'attachment-3' }));
        await component.upload();

        expect(storeMock.uploadAttachment).toHaveBeenCalledTimes(2);
        expect(component.uploadDialogVisible).toBe(false);
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

    it('shows the same upload session progress for version uploads', async () => {
        component.showVersionUploadDialog(createAttachment());
        storeMock.uploadProgress.set(
            uploadProgress({
                phase: 'uploading',
                operationType: AttachmentUploadSessionOperationType.CreateVersion,
                sessionId: 'upload-session-2',
                uploadMode: AttachmentUploadMode.Proxy,
                providerType: AttachmentStorageProviderType.Local,
                fileName: '需求确认-v2.pdf',
                progressPercent: 64,
                loadedBytes: 640,
                totalBytes: 1000,
                message: '正在通过 POMS 代理上传',
                canAbort: true
            })
        );
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('POMS Proxy');
        expect(fixture.nativeElement.textContent).toContain('64%');

        await component.abortUpload();

        expect(storeMock.abortCurrentUpload).toHaveBeenCalledWith('用户在附件面板中止附件上传。');
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
