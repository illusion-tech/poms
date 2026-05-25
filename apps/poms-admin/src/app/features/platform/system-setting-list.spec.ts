import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SystemSettingKey, SystemSettingStore, SystemSettingValueType, type SystemSettingSummary } from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { SystemSettingList } from './system-setting-list';

function createSystemSetting(overrides: Partial<SystemSettingSummary> = {}): SystemSettingSummary {
    return {
        key: SystemSettingKey.AttachmentMaxUploadSizeMb,
        displayName: '附件上传大小上限',
        description: '控制单个附件上传会话允许声明的最大文件大小。',
        group: '附件',
        valueType: SystemSettingValueType.Integer,
        value: 50,
        defaultValue: 50,
        minValue: 1,
        maxValue: 500,
        unit: 'MB',
        rowVersion: 3,
        updatedAt: '2026-05-26T00:00:00.000Z',
        updatedBy: '00000000-0000-4000-8000-000000000001',
        ...overrides
    };
}

describe('SystemSettingList', () => {
    let fixture: ComponentFixture<SystemSettingList>;
    let component: SystemSettingList;
    let settings: ReturnType<typeof signal<SystemSettingSummary[]>>;
    let storeMock: {
        settings: typeof settings;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        updatingKey: ReturnType<typeof signal<string | null>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadSettings: jest.Mock;
        updateSetting: jest.Mock;
        clearSettings: jest.Mock;
    };

    beforeEach(async () => {
        settings = signal<SystemSettingSummary[]>([createSystemSetting()]);
        storeMock = {
            settings,
            loading: signal(false),
            saving: signal(false),
            updatingKey: signal(null),
            loaded: signal(true),
            loadSettings: jest.fn().mockResolvedValue(settings()),
            updateSetting: jest.fn().mockResolvedValue(createSystemSetting({ value: 128, rowVersion: 4 })),
            clearSettings: jest.fn(() => settings.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [SystemSettingList]
        })
            .overrideComponent(SystemSettingList, {
                set: {
                    providers: [
                        {
                            provide: SystemSettingStore,
                            useValue: storeMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(SystemSettingList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads and renders attachment upload size setting', () => {
        const text = fixture.nativeElement.textContent;

        expect(storeMock.loadSettings).toHaveBeenCalled();
        expect(text).toContain('系统设置');
        expect(text).toContain('附件上传大小上限');
        expect(text).toContain('范围 1-500 MB');
        expect(component.attachmentMaxUploadSizeDraft()).toBe(50);
    });

    it('blocks invalid values before save', async () => {
        component.updateAttachmentMaxUploadSizeDraft(501);

        await component.saveAttachmentMaxUploadSize();

        expect(component.attachmentMaxUploadSizeError()).toContain('不能大于 500 MB');
        expect(storeMock.updateSetting).not.toHaveBeenCalled();
    });

    it('saves the setting with optimistic version', async () => {
        component.updateAttachmentMaxUploadSizeDraft(128);

        await component.saveAttachmentMaxUploadSize();

        expect(storeMock.updateSetting).toHaveBeenCalledWith(SystemSettingKey.AttachmentMaxUploadSizeMb, {
            value: 128,
            expectedVersion: 3
        });
        expect(component.attachmentMaxUploadSizeDraft()).toBe(128);
    });

    it('shows a conflict message when optimistic version is stale', async () => {
        storeMock.updateSetting.mockRejectedValueOnce(new HttpErrorResponse({ status: 409 }));
        component.updateAttachmentMaxUploadSizeDraft(128);

        await component.saveAttachmentMaxUploadSize();

        expect(component.pageError()).toBe('系统设置已被其他人更新，请刷新后重试。');
    });
});
