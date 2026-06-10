import { HttpErrorResponse } from '@angular/common/http';
import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    AttachmentStorageProviderConfigStatus,
    AttachmentStorageProviderConnectionTestStatus,
    AttachmentStorageProviderStore,
    AttachmentStorageProviderType,
    type AttachmentStorageProviderConfigSummary
} from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { AttachmentStorageProviderList } from './attachment-storage-provider-list';

function createStorageProviderConfig(overrides: Partial<AttachmentStorageProviderConfigSummary> = {}): AttachmentStorageProviderConfigSummary {
    return {
        id: 'attachment-storage-provider-1',
        providerType: AttachmentStorageProviderType.HuaweiObsS3,
        displayName: '华为云 OBS 生产',
        status: AttachmentStorageProviderConfigStatus.Active,
        enabled: true,
        isDefault: false,
        endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
        region: 'cn-north-4',
        bucket: 'poms-prod',
        keyPrefix: 'poms/attachments',
        forcePathStyle: false,
        accessKeyConfigured: true,
        secretAccessKeyConfigured: true,
        credentialsUpdatedAt: '2026-05-11T08:00:00.000Z',
        rowVersion: 4,
        createdAt: '2026-05-11T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-05-11T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

describe('AttachmentStorageProviderList', () => {
    let fixture: ComponentFixture<AttachmentStorageProviderList>;
    let component: AttachmentStorageProviderList;
    let configs: ReturnType<typeof signal<AttachmentStorageProviderConfigSummary[]>>;
    let storeMock: {
        configs: typeof configs;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        testingConfigId: ReturnType<typeof signal<string | null>>;
        settingDefaultConfigId: ReturnType<typeof signal<string | null>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadConfigs: jest.Mock;
        createConfig: jest.Mock;
        updateConfig: jest.Mock;
        testConnection: jest.Mock;
        setDefaultConfig: jest.Mock;
        clearConfigs: jest.Mock;
    };

    beforeEach(async () => {
        configs = signal<AttachmentStorageProviderConfigSummary[]>([
            createStorageProviderConfig({
                id: 'attachment-storage-provider-local',
                providerType: AttachmentStorageProviderType.Local,
                displayName: '本地附件存储',
                isDefault: true,
                endpoint: null,
                region: null,
                bucket: null,
                keyPrefix: null,
                accessKeyConfigured: false,
                secretAccessKeyConfigured: false,
                credentialsUpdatedAt: null
            }),
            createStorageProviderConfig()
        ]);

        storeMock = {
            configs,
            loading: signal(false),
            saving: signal(false),
            testingConfigId: signal(null),
            settingDefaultConfigId: signal(null),
            loaded: signal(true),
            loadConfigs: jest.fn().mockResolvedValue(configs()),
            createConfig: jest.fn().mockResolvedValue(createStorageProviderConfig({ id: 'attachment-storage-provider-3' })),
            updateConfig: jest.fn().mockResolvedValue(createStorageProviderConfig()),
            testConnection: jest.fn().mockResolvedValue({
                status: AttachmentStorageProviderConnectionTestStatus.Success,
                message: 'Attachment storage provider connection is healthy.',
                checkedAt: '2026-05-11T08:30:00.000Z'
            }),
            setDefaultConfig: jest.fn().mockResolvedValue(createStorageProviderConfig({ isDefault: true })),
            clearConfigs: jest.fn(() => configs.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [AttachmentStorageProviderList]
        })
            .overrideComponent(AttachmentStorageProviderList, {
                set: {
                    providers: [
                        {
                            provide: AttachmentStorageProviderStore,
                            useValue: storeMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(AttachmentStorageProviderList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads and renders fixed provider cards with secret write-state only', () => {
        const text = fixture.nativeElement.textContent;

        expect(storeMock.loadConfigs).toHaveBeenCalledWith();
        expect(text).toContain('文件存储接入');
        expect(text).toContain('本地附件存储');
        expect(text).toContain('华为云 OBS 生产');
        expect(text).toContain('无需 AK/SK');
        expect(text).toContain('AK/SK 已配置');
        expect(text).not.toContain('secret-value');
        expect(text).not.toContain('新增提供商');
        expect((fixture.nativeElement.querySelector('[data-testid="provider-card-grid"]') as HTMLElement | null)?.className).toContain('2xl:grid-cols-3');
    });

    it('renders fixed unconfigured slots without dashed cards', () => {
        configs.set([]);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        const cards = Array.from(fixture.nativeElement.querySelectorAll('article')) as HTMLElement[];

        expect(text).toContain('本地存储');
        expect(text).toContain('华为云 OBS');
        expect(text).toContain('待配置');
        expect(cards).toHaveLength(2);
        expect(cards.every((card) => !card.className.includes('border-dashed'))).toBe(true);
    });

    it('opens create dialog from a fixed Huawei OBS card with provider locked', () => {
        component.showCreateDialog(AttachmentStorageProviderType.HuaweiObsS3);

        expect(component.createDialogVisible).toBe(true);
        expect(component.form().providerType).toBe(AttachmentStorageProviderType.HuaweiObsS3);
        expect(component.form().displayName).toBe('华为云 OBS');
        expect(component.createDialogHeader()).toBe('配置 华为云 OBS');
    });

    it('shows OBS configuration help icons in the provider form', () => {
        component.showCreateDialog(AttachmentStorageProviderType.HuaweiObsS3);
        fixture.detectChanges();

        const helpButtons = Array.from(fixture.nativeElement.querySelectorAll('button[aria-label*="OBS"], button[aria-label*="Key Prefix"]')) as HTMLButtonElement[];
        const helpLabels = helpButtons.map((button) => button.getAttribute('aria-label'));

        expect(helpButtons.every((button) => button.classList.contains('provider-help-trigger'))).toBe(true);
        expect(helpLabels).toEqual(
            expect.arrayContaining([
                'OBS Endpoint 配置说明',
                'OBS Region 配置说明',
                'OBS Bucket 配置说明',
                'OBS 路径样式访问配置说明',
                'OBS Access Key ID 配置说明',
                'OBS Secret Access Key 配置说明',
                'Key Prefix 配置说明'
            ])
        );
        expect(component.storageTip('secretAccessKey')).toContain('不会回显明文');
        expect(component.storageTip('forcePathStyle')).toContain('path-style 请求');
    });

    it('creates a Huawei OBS config through the generated-client store', async () => {
        component.showCreateDialog(AttachmentStorageProviderType.HuaweiObsS3);
        component.updateText('displayName', '华为云 OBS 正式');
        component.updateText('endpoint', 'https://obs.cn-north-4.myhuaweicloud.com');
        component.updateText('region', 'cn-north-4');
        component.updateText('bucket', 'poms-prod');
        component.updateText('keyPrefix', 'poms/attachments');
        component.updateText('accessKeyId', 'ak-value');
        component.updateText('secretAccessKey', 'sk-value');
        component.updateToggle('enabled', true);
        component.updateToggle('forcePathStyle', true);

        await component.createConfig();

        expect(storeMock.createConfig).toHaveBeenCalledWith({
            providerType: AttachmentStorageProviderType.HuaweiObsS3,
            displayName: '华为云 OBS 正式',
            enabled: true,
            endpoint: 'https://obs.cn-north-4.myhuaweicloud.com',
            region: 'cn-north-4',
            bucket: 'poms-prod',
            keyPrefix: 'poms/attachments',
            forcePathStyle: true,
            accessKeyId: 'ak-value',
            secretAccessKey: 'sk-value'
        });
        expect(component.createDialogVisible).toBe(false);
    });

    it('shows login expired feedback instead of OBS validation feedback when create is unauthorized', async () => {
        storeMock.createConfig.mockRejectedValueOnce(new HttpErrorResponse({ status: 401 }));

        component.showCreateDialog(AttachmentStorageProviderType.HuaweiObsS3);
        component.updateText('displayName', '华为云 OBS 正式');
        component.updateText('endpoint', 'https://obs.cn-north-4.myhuaweicloud.com');
        component.updateText('region', 'cn-north-4');
        component.updateText('bucket', 'poms-prod');
        component.updateText('accessKeyId', 'ak-value');
        component.updateText('secretAccessKey', 'sk-value');
        component.updateToggle('enabled', true);

        await component.createConfig();

        expect(component.formError()).toBe('登录已过期，请重新登录后再操作。');
        expect(component.formError()).not.toContain('OBS 字段');
        expect(component.createDialogVisible).toBe(true);
    });

    it('updates a provider config without overwriting credentials when credential fields are blank', async () => {
        const config = createStorageProviderConfig({ rowVersion: 8, accessKeyConfigured: true, secretAccessKeyConfigured: true });

        component.showEditDialog(config);
        component.updateText('displayName', '华为云 OBS 正式更新');
        component.updateText('accessKeyId', '');
        component.updateText('secretAccessKey', '');

        await component.updateConfig();

        expect(storeMock.updateConfig).toHaveBeenCalledWith(
            config.id,
            expect.objectContaining({
                displayName: '华为云 OBS 正式更新',
                expectedVersion: 8
            })
        );
        expect(storeMock.updateConfig.mock.calls[0][1]).not.toHaveProperty('accessKeyId');
        expect(storeMock.updateConfig.mock.calls[0][1]).not.toHaveProperty('secretAccessKey');
    });

    it('saves and tests the persisted provider config from the edit dialog', async () => {
        const config = createStorageProviderConfig({ rowVersion: 8 });
        const updatedConfig = createStorageProviderConfig({ id: config.id, rowVersion: 9, displayName: '华为云 OBS 正式更新' });
        storeMock.updateConfig.mockResolvedValueOnce(updatedConfig);

        component.showEditDialog(config);
        component.updateText('displayName', '华为云 OBS 正式更新');

        await component.updateAndTestConfig();

        expect(storeMock.updateConfig).toHaveBeenCalledWith(config.id, expect.objectContaining({ displayName: '华为云 OBS 正式更新', expectedVersion: 8 }));
        expect(storeMock.testConnection).toHaveBeenCalledWith(config.id, { expectedVersion: 9 });
        expect(component.testResults()[config.id]?.status).toBe(AttachmentStorageProviderConnectionTestStatus.Success);
    });

    it('tests provider connection with optimistic version evidence', async () => {
        const config = createStorageProviderConfig({ rowVersion: 6 });

        await component.testConnection(config);

        expect(storeMock.testConnection).toHaveBeenCalledWith(config.id, { expectedVersion: 6 });
        expect(component.testResults()[config.id]?.status).toBe(AttachmentStorageProviderConnectionTestStatus.Success);
    });

    it('sets default provider with optimistic version evidence', async () => {
        const config = createStorageProviderConfig({ rowVersion: 7 });

        await component.setDefaultConfig(config);

        expect(storeMock.setDefaultConfig).toHaveBeenCalledWith(config.id, { expectedVersion: 7 });
    });
});
