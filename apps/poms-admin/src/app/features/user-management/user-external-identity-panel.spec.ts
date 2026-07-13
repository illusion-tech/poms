import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ExternalIdentityBindingStatus,
    ExternalUserCandidateFieldAvailability,
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderOAuthGrantStatus,
    IdentityProviderSearchGrantMode,
    IdentityProviderStore,
    type ExternalIdentityBindingSummary,
    type ExternalUserCandidate,
    type IdentityProviderConfigSummary,
    type IdentityProviderOAuthGrantSummary
} from '@poms/admin-data-access';
import { ConfirmationService, MessageService } from 'primeng/api';
import { UserExternalIdentityPanel } from './user-external-identity-panel';

const FEISHU_BINDING_CANDIDATE_SCOPES = ['contact:user:search', 'contact:contact.base:readonly', 'contact:user.department:readonly', 'contact:department.base:readonly', 'contact:user.email:readonly', 'contact:user.phone:readonly'];

function createConfig(overrides: Partial<IdentityProviderConfigSummary> = {}): IdentityProviderConfigSummary {
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
        clientId: 'cli_feishu',
        secretConfigured: true,
        redirectUri: 'https://poms.example.com/auth/identity-providers:callback',
        searchRedirectUri: 'https://poms.example.com/api/platform/identity-provider-oauth-grants:callback',
        loginScopes: ['contact:user.base:readonly'],
        searchScopes: ['contact:user.employee_id:readonly'],
        tenantAllowlist: [],
        searchGrantMode: IdentityProviderSearchGrantMode.PerAdmin,
        rowVersion: 3,
        createdAt: '2026-05-07T08:00:00.000Z',
        createdBy: 'admin-1',
        updatedAt: '2026-05-07T08:00:00.000Z',
        updatedBy: 'admin-1',
        ...overrides
    };
}

function createBinding(overrides: Partial<ExternalIdentityBindingSummary> = {}): ExternalIdentityBindingSummary {
    return {
        id: 'external-identity-1',
        identityProviderConfigId: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: null,
        pomsUserId: 'user-1',
        subjectId: 'ou_feishu_user_1',
        unionId: 'on_union_1',
        subjectDisplayName: '张三',
        avatarUrl: null,
        email: null,
        mobile: null,
        status: ExternalIdentityBindingStatus.Active,
        boundAt: '2026-05-07T08:10:00.000Z',
        boundBy: 'admin-1',
        revokedAt: null,
        revokedBy: null,
        rowVersion: 6,
        createdAt: '2026-05-07T08:10:00.000Z',
        createdBy: 'admin-1',
        updatedAt: '2026-05-07T08:10:00.000Z',
        updatedBy: 'admin-1',
        ...overrides
    };
}

function createGrant(overrides: Partial<IdentityProviderOAuthGrantSummary> = {}): IdentityProviderOAuthGrantSummary {
    return {
        id: 'grant-1',
        identityProviderConfigId: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: null,
        pomsUserId: 'admin-1',
        status: IdentityProviderOAuthGrantStatus.Active,
        scopes: FEISHU_BINDING_CANDIDATE_SCOPES,
        requiredScopes: FEISHU_BINDING_CANDIDATE_SCOPES,
        missingRequiredScopes: [],
        grantedAt: '2026-05-07T08:12:00.000Z',
        expiresAt: '2026-05-07T10:12:00.000Z',
        refreshExpiresAt: null,
        lastUsedAt: null,
        lastError: null,
        rowVersion: 2,
        updatedAt: '2026-05-07T08:12:00.000Z',
        ...overrides
    };
}

function createCandidate(overrides: Partial<ExternalUserCandidate> = {}): ExternalUserCandidate {
    return {
        identityProviderConfigId: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: null,
        subjectId: 'ou_feishu_user_2',
        unionId: 'on_union_2',
        displayName: '李四',
        avatarUrl: null,
        email: null,
        mobile: null,
        departmentNames: ['销售部'],
        fieldAvailability: {
            department: ExternalUserCandidateFieldAvailability.Available,
            email: ExternalUserCandidateFieldAvailability.NotProvided,
            mobile: ExternalUserCandidateFieldAvailability.NotProvided
        },
        ...overrides
    };
}

describe('UserExternalIdentityPanel', () => {
    let fixture: ComponentFixture<UserExternalIdentityPanel>;
    let component: UserExternalIdentityPanel;
    let configs: ReturnType<typeof signal<IdentityProviderConfigSummary[]>>;
    let bindingsByUserId: ReturnType<typeof signal<Record<string, ExternalIdentityBindingSummary[]>>>;
    let grantsByConfigId: ReturnType<typeof signal<Record<string, IdentityProviderOAuthGrantSummary>>>;
    let searchResults: ReturnType<typeof signal<ExternalUserCandidate[]>>;
    let storeMock: {
        configs: typeof configs;
        loaded: ReturnType<typeof signal<boolean>>;
        loadingBindingsUserId: ReturnType<typeof signal<string | null>>;
        savingBindingUserId: ReturnType<typeof signal<string | null>>;
        unbindingIdentityId: ReturnType<typeof signal<string | null>>;
        grantsByConfigId: typeof grantsByConfigId;
        loadingGrantConfigId: ReturnType<typeof signal<string | null>>;
        authorizingGrantConfigId: ReturnType<typeof signal<string | null>>;
        searchResults: typeof searchResults;
        searchingConfigId: ReturnType<typeof signal<string | null>>;
        loadConfigs: jest.Mock;
        loadUserExternalIdentities: jest.Mock;
        loadCurrentAdminGrant: jest.Mock;
        authorizeCurrentAdminGrant: jest.Mock;
        searchExternalUsers: jest.Mock;
        bindUserExternalIdentity: jest.Mock;
        unbindExternalIdentity: jest.Mock;
        clearSearchResults: jest.Mock;
        bindingsByUserId: typeof bindingsByUserId;
    };

    beforeEach(async () => {
        configs = signal([createConfig()]);
        bindingsByUserId = signal({ 'user-1': [createBinding()] });
        grantsByConfigId = signal({ 'identity-provider-1': createGrant() });
        searchResults = signal([createCandidate()]);

        storeMock = {
            configs,
            loaded: signal(true),
            loadingBindingsUserId: signal(null),
            savingBindingUserId: signal(null),
            unbindingIdentityId: signal(null),
            bindingsByUserId,
            grantsByConfigId,
            loadingGrantConfigId: signal(null),
            authorizingGrantConfigId: signal(null),
            searchResults,
            searchingConfigId: signal(null),
            loadConfigs: jest.fn().mockResolvedValue(configs()),
            loadUserExternalIdentities: jest.fn().mockResolvedValue(bindingsByUserId()['user-1']),
            loadCurrentAdminGrant: jest.fn().mockResolvedValue(grantsByConfigId()['identity-provider-1']),
            authorizeCurrentAdminGrant: jest.fn().mockResolvedValue({ authorizeUrl: 'https://accounts.feishu.cn/oauth', stateExpiresAt: '2026-05-07T08:20:00.000Z' }),
            searchExternalUsers: jest.fn().mockImplementation(async () => searchResults()),
            bindUserExternalIdentity: jest.fn().mockResolvedValue(createBinding({ subjectId: 'ou_feishu_user_2', subjectDisplayName: '李四' })),
            unbindExternalIdentity: jest.fn().mockResolvedValue(createBinding({ status: ExternalIdentityBindingStatus.Revoked })),
            clearSearchResults: jest.fn(() => searchResults.set([]))
        };

        await TestBed.configureTestingModule({
            imports: [UserExternalIdentityPanel],
            providers: [MessageService, ConfirmationService]
        })
            .overrideComponent(UserExternalIdentityPanel, {
                set: {
                    providers: [
                        {
                            provide: IdentityProviderStore,
                            useValue: storeMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(UserExternalIdentityPanel);
        component = fixture.componentInstance;
        fixture.componentRef.setInput('userId', 'user-1');
        fixture.componentRef.setInput('userDisplayName', '王五');
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('renders active external identity bindings in the user detail panel', () => {
        const text = fixture.nativeElement.textContent;

        expect(storeMock.loadUserExternalIdentities).toHaveBeenCalledWith('user-1');
        expect(text).toContain('外部身份');
        expect(text).toContain('张三');
        expect(text).toContain('ou_feishu_user_1');
        expect(text).toContain('已绑定');
    });

    it('opens the binding dialog with bindable provider config and active grant', async () => {
        await component.openBindingDialog();
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(component.bindingDialogVisible).toBe(true);
        expect(component.selectedConfigId()).toBe('identity-provider-1');
        expect(storeMock.loadCurrentAdminGrant).toHaveBeenCalledWith('identity-provider-1');
        expect(text).toContain('飞书生产租户');
        expect(text).toContain('已授权');
    });

    it('searches external users by fuzzy name through the generated-client store', async () => {
        await component.openBindingDialog();
        component.searchQuery = '李四';

        await component.searchCandidates();

        expect(storeMock.searchExternalUsers).toHaveBeenCalledWith('identity-provider-1', '李四', 20);
    });

    it('blocks external user search when the current admin grant is missing required Feishu scopes', async () => {
        grantsByConfigId.set({
            'identity-provider-1': createGrant({
                scopes: ['auth:user.id:read'],
                missingRequiredScopes: ['contact:user:search']
            })
        });
        await component.openBindingDialog();
        component.searchQuery = '李四';
        fixture.detectChanges();

        await component.searchCandidates();
        fixture.detectChanges();

        expect(storeMock.searchExternalUsers).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('当前授权缺少飞书候选资料读取权限');
        expect(fixture.nativeElement.textContent).toContain('重新授权');
    });

    it('renders candidate field availability without treating absent provider fields as empty profile values', async () => {
        await component.openBindingDialog();
        searchResults.set([
            createCandidate({
                subjectId: 'ou_7d5402f203e7702b7c5fa4434a003e9d',
                departmentNames: [],
                fieldAvailability: {
                    department: ExternalUserCandidateFieldAvailability.NotReturned,
                    email: ExternalUserCandidateFieldAvailability.NotProvided,
                    mobile: ExternalUserCandidateFieldAvailability.NotReturned
                }
            })
        ]);
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;
        const table = fixture.nativeElement.querySelector('table');

        expect(text).toContain('邮箱：未提供');
        expect(text).toContain('手机：飞书未返回');
        expect(text).toContain('飞书未返回');
        expect(text).toContain('ou_7d5402f203e7702b7c5fa4434a003e9d');
        expect(table).not.toBeNull();
        expect(table.style.minWidth).toBe('61rem');
    });

    it('binds a selected external candidate without requiring email or mobile', async () => {
        const candidate = createCandidate({ email: null, mobile: null });

        await component.bindCandidate(candidate);

        expect(storeMock.bindUserExternalIdentity).toHaveBeenCalledWith('user-1', {
            identityProviderConfigId: 'identity-provider-1',
            tenantId: null,
            subjectId: 'ou_feishu_user_2',
            unionId: 'on_union_2',
            subjectDisplayName: '李四',
            avatarUrl: null,
            email: null,
            mobile: null
        });
        expect(component.bindingDialogVisible).toBe(false);
    });

    it('unbinds with the current rowVersion as optimistic evidence', async () => {
        const binding = createBinding({ rowVersion: 9 });

        await component.unbind(binding);

        expect(storeMock.unbindExternalIdentity).toHaveBeenCalledWith(binding, { expectedVersion: 9 });
    });

    it('opens provider authorization URL for the current admin grant', async () => {
        const openSpy = jest.spyOn(window, 'open').mockImplementation(() => null);
        await component.openBindingDialog();

        await component.authorizeGrant();

        expect(storeMock.authorizeCurrentAdminGrant).toHaveBeenCalledWith('identity-provider-1');
        expect(openSpy).toHaveBeenCalledWith('https://accounts.feishu.cn/oauth', '_blank', 'noopener,noreferrer');
        openSpy.mockRestore();
    });
});
