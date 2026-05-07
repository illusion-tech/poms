import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderConnectionTestStatus,
    IdentityProviderSearchGrantMode,
    IdentityProviderStore,
    type IdentityProviderConfigSummary
} from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { IdentityProviderList } from './identity-provider-list';

function createIdentityProviderConfig(overrides: Partial<IdentityProviderConfigSummary> = {}): IdentityProviderConfigSummary {
    return {
        id: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: null,
        displayName: '飞书生产租户',
        status: IdentityProviderConfigStatus.Active,
        enabled: true,
        loginEnabled: true,
        bindingEnabled: true,
        searchEnabled: true,
        clientId: 'cli_feishu_prod',
        secretConfigured: true,
        redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
        loginScopes: ['contact:user.base:readonly'],
        searchScopes: ['contact:user.employee_id:readonly'],
        tenantAllowlist: [],
        searchGrantMode: IdentityProviderSearchGrantMode.PerAdmin,
        rowVersion: 4,
        createdAt: '2026-05-07T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-05-07T08:00:00.000Z',
        updatedBy: 'user-1',
        ...overrides
    };
}

describe('IdentityProviderList', () => {
    let fixture: ComponentFixture<IdentityProviderList>;
    let component: IdentityProviderList;
    let configs: ReturnType<typeof signal<IdentityProviderConfigSummary[]>>;
    let storeMock: {
        configs: typeof configs;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        testingConfigId: ReturnType<typeof signal<string | null>>;
        loaded: ReturnType<typeof signal<boolean>>;
        loadConfigs: jest.Mock;
        createConfig: jest.Mock;
        updateConfig: jest.Mock;
        testConnection: jest.Mock;
        clearConfigs: jest.Mock;
    };

    beforeEach(async () => {
        configs = signal<IdentityProviderConfigSummary[]>([
            createIdentityProviderConfig(),
            createIdentityProviderConfig({
                id: 'identity-provider-2',
                displayName: '飞书测试租户',
                tenantId: 'tenant-test',
                status: IdentityProviderConfigStatus.Draft,
                enabled: false,
                loginEnabled: false,
                bindingEnabled: false,
                searchEnabled: false,
                secretConfigured: false,
                redirectUri: null,
                loginScopes: [],
                searchScopes: [],
                rowVersion: 1
            })
        ]);

        storeMock = {
            configs,
            loading: signal(false),
            saving: signal(false),
            testingConfigId: signal(null),
            loaded: signal(true),
            loadConfigs: jest.fn().mockResolvedValue(configs()),
            createConfig: jest.fn().mockResolvedValue(createIdentityProviderConfig({ id: 'identity-provider-3' })),
            updateConfig: jest.fn().mockResolvedValue(createIdentityProviderConfig()),
            testConnection: jest.fn().mockResolvedValue({
                status: IdentityProviderConnectionTestStatus.Success,
                message: 'Local configuration is complete.',
                checkedAt: '2026-05-07T08:30:00.000Z'
            }),
            clearConfigs: jest.fn(() => configs.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [IdentityProviderList]
        })
            .overrideComponent(IdentityProviderList, {
                set: {
                    providers: [
                        {
                            provide: IdentityProviderStore,
                            useValue: storeMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(IdentityProviderList);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads and renders provider configs with secret write-state only', () => {
        const text = fixture.nativeElement.textContent;

        expect(storeMock.loadConfigs).toHaveBeenCalledWith({
            provider: undefined,
            status: undefined
        });
        expect(text).toContain('外部身份提供商');
        expect(text).toContain('飞书生产租户');
        expect(text).toContain('secret 已配置');
        expect(text).toContain('飞书测试租户');
        expect(text).toContain('secret 未配置');
        expect(text).not.toContain('新增 Provider');
    });

    it('renders fixed provider card slots when a provider has not been configured', () => {
        configs.set([]);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('飞书');
        expect(text).toContain('待配置');
        expect(text).toContain('secret 未配置');
        expect(text).toContain('配置');
        expect(text).not.toContain('暂无 Provider 配置');
    });

    it('opens create dialog from a fixed provider card with provider locked', () => {
        component.showCreateDialog(IdentityProvider.Feishu);

        expect(component.createDialogVisible).toBe(true);
        expect(component.createProviderLocked).toBe(true);
        expect(component.form().provider).toBe(IdentityProvider.Feishu);
        expect(component.form().displayName).toBe('飞书');
        expect(component.createDialogHeader()).toBe('配置 飞书');
    });

    it('shows Feishu configuration help icons in the provider form', () => {
        component.showCreateDialog(IdentityProvider.Feishu);
        fixture.detectChanges();

        const helpButtons = Array.from(fixture.nativeElement.querySelectorAll('button[aria-label*="飞书"]')) as HTMLButtonElement[];
        const helpLabels = helpButtons.map((button) => button.getAttribute('aria-label'));

        expect(helpButtons.every((button) => button.classList.contains('provider-help-trigger'))).toBe(true);
        expect(helpLabels).toEqual(
            expect.arrayContaining([
                '飞书 AppID 配置说明',
                '飞书 AppSecret 配置说明',
                '飞书 Redirect URI 配置说明',
                '飞书搜索授权模式配置说明',
                '飞书 Login scopes 配置说明',
                '飞书 Search scopes 配置说明',
                '飞书 Tenant allowlist 配置说明'
            ])
        );
        expect(component.feishuConfigTip('clientId')).toContain('AppID');
        expect(component.feishuConfigTip('clientSecret')).toContain('AppSecret');
    });

    it('reloads provider configs with selected filters', async () => {
        storeMock.loadConfigs.mockClear();
        component.providerFilter.set(IdentityProvider.Feishu);
        component.statusFilter.set(IdentityProviderConfigStatus.Active);

        await component.reload();

        expect(storeMock.loadConfigs).toHaveBeenCalledWith({
            provider: IdentityProvider.Feishu,
            status: IdentityProviderConfigStatus.Active
        });
    });

    it('creates a provider config through the generated-client store', async () => {
        component.showCreateDialog();
        component.updateText('displayName', '飞书正式');
        component.updateText('clientId', 'cli_feishu');
        component.updateText('clientSecret', 'secret-value');
        component.updateText('redirectUri', 'https://poms.example.com/auth/identity-providers:callback');
        component.updateText('loginScopesText', 'contact:user.base:readonly');
        component.updateText('searchScopesText', 'contact:user.employee_id:readonly');
        component.updateToggle('enabled', true);
        component.updateToggle('loginEnabled', true);
        component.updateToggle('bindingEnabled', true);
        component.updateToggle('searchEnabled', true);

        await component.createConfig();

        expect(storeMock.createConfig).toHaveBeenCalledWith({
            provider: IdentityProvider.Feishu,
            tenantId: null,
            displayName: '飞书正式',
            enabled: true,
            loginEnabled: true,
            bindingEnabled: true,
            searchEnabled: true,
            clientId: 'cli_feishu',
            clientSecret: 'secret-value',
            redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
            loginScopes: ['contact:user.base:readonly'],
            searchScopes: ['contact:user.employee_id:readonly'],
            tenantAllowlist: [],
            searchGrantMode: IdentityProviderSearchGrantMode.PerAdmin
        });
        expect(component.createDialogVisible).toBe(false);
    });

    it('updates a provider config without overwriting secret when secret field is blank', async () => {
        const config = createIdentityProviderConfig({ rowVersion: 8, secretConfigured: true });

        component.showEditDialog(config);
        component.updateText('displayName', '飞书正式更新');
        component.updateText('clientSecret', '');

        await component.updateConfig();

        expect(storeMock.updateConfig).toHaveBeenCalledWith(
            config.id,
            expect.objectContaining({
                displayName: '飞书正式更新',
                expectedVersion: 8
            })
        );
        expect(storeMock.updateConfig.mock.calls[0][1]).not.toHaveProperty('clientSecret');
    });

    it('tests provider connection with optimistic version evidence', async () => {
        const config = createIdentityProviderConfig({ rowVersion: 6 });

        await component.testConnection(config);

        expect(storeMock.testConnection).toHaveBeenCalledWith(config.id, { expectedVersion: 6 });
        expect(component.testResults()[config.id]?.status).toBe(IdentityProviderConnectionTestStatus.Success);
    });
});
