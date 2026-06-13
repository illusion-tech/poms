import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ExternalDepartmentMappingStatus,
    type ExternalDepartmentMappingSummary,
    ExternalOrgProvider,
    ExternalOrgSourceStatus,
    ExternalOrgSyncStore,
    type ExternalOrgSourceSummary,
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderStore,
    type IdentityProviderConfigSummary,
    OrgSyncDiffAction,
    OrgSyncDiffItemStatus,
    type OrgSyncDiffItemSummary,
    OrgSyncRunStatus,
    type OrgSyncRunSummary,
    PlatformStore,
    type PlatformOrgUnitSummary
} from '@poms/admin-data-access';
import { MessageService } from 'primeng/api';
import { ExternalOrgSyncWorkbench } from './external-org-sync-workbench';

function createSource(overrides: Partial<ExternalOrgSourceSummary> = {}): ExternalOrgSourceSummary {
    return {
        id: 'external-org-source-1',
        provider: ExternalOrgProvider.Feishu,
        externalTenantId: 'tenant-feishu',
        displayName: '飞书通讯录',
        status: ExternalOrgSourceStatus.Active,
        providerConfigId: 'identity-provider-1',
        authoritativeOrgUnitId: 'org-root',
        externalRootDepartmentId: '0',
        syncScopes: ['contact:department.base:readonly'],
        rowVersion: 3,
        createdAt: '2026-06-10T08:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-06-10T08:00:00.000Z',
        updatedBy: 'admin',
        ...overrides
    };
}

function createMapping(overrides: Partial<ExternalDepartmentMappingSummary> = {}): ExternalDepartmentMappingSummary {
    return {
        id: 'mapping-1',
        sourceId: 'external-org-source-1',
        externalDepartmentId: 'od-root',
        externalParentDepartmentId: null,
        externalDepartmentName: '飞书总部',
        orgUnitId: 'org-root',
        status: ExternalDepartmentMappingStatus.Mapped,
        externalSnapshot: {},
        lastSeenAt: '2026-06-10T08:30:00.000Z',
        rowVersion: 1,
        createdAt: '2026-06-10T08:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-06-10T08:30:00.000Z',
        updatedBy: 'admin',
        ...overrides
    };
}

function createRun(overrides: Partial<OrgSyncRunSummary> = {}): OrgSyncRunSummary {
    return {
        id: 'org-sync-run-1',
        sourceId: 'external-org-source-1',
        status: OrgSyncRunStatus.Previewed,
        requestedBy: 'admin',
        startedAt: '2026-06-10T09:00:00.000Z',
        finishedAt: '2026-06-10T09:00:03.000Z',
        totalItemCount: 1,
        approvedItemCount: 0,
        skippedItemCount: 0,
        failedItemCount: 0,
        errorSummary: null,
        requestSnapshot: {},
        resultSummary: {},
        rowVersion: 2,
        createdAt: '2026-06-10T09:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-06-10T09:00:03.000Z',
        updatedBy: 'admin',
        ...overrides
    };
}

function createDiffItem(overrides: Partial<OrgSyncDiffItemSummary> = {}): OrgSyncDiffItemSummary {
    return {
        id: 'diff-item-1',
        runId: 'org-sync-run-1',
        externalDepartmentId: 'od-sales',
        action: OrgSyncDiffAction.CreateOrgUnit,
        status: OrgSyncDiffItemStatus.Pending,
        orgUnitId: null,
        beforeSnapshot: null,
        candidateSnapshot: { name: '销售部' },
        errorMessage: null,
        appliedAt: null,
        rowVersion: 1,
        createdAt: '2026-06-10T09:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-06-10T09:00:00.000Z',
        updatedBy: 'admin',
        ...overrides
    };
}

function createOrgUnit(overrides: Partial<PlatformOrgUnitSummary> = {}): PlatformOrgUnitSummary {
    return {
        id: 'org-root',
        name: 'POMS 总部',
        code: 'HQ',
        parentId: null,
        displayOrder: 0,
        isActive: true,
        description: null,
        createdAt: '2026-06-10T08:00:00.000Z',
        updatedAt: '2026-06-10T08:00:00.000Z',
        ...overrides
    };
}

function createProviderConfig(overrides: Partial<IdentityProviderConfigSummary> = {}): IdentityProviderConfigSummary {
    return {
        id: 'identity-provider-1',
        provider: IdentityProvider.Feishu,
        tenantId: 'tenant-feishu',
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
        loginScopes: [],
        searchScopes: [],
        tenantAllowlist: [],
        searchGrantMode: 'per_admin',
        rowVersion: 1,
        createdAt: '2026-06-10T08:00:00.000Z',
        createdBy: 'admin',
        updatedAt: '2026-06-10T08:00:00.000Z',
        updatedBy: 'admin',
        ...overrides
    } as IdentityProviderConfigSummary;
}

describe('ExternalOrgSyncWorkbench', () => {
    let fixture: ComponentFixture<ExternalOrgSyncWorkbench>;
    let component: ExternalOrgSyncWorkbench;
    let sources: ReturnType<typeof signal<ExternalOrgSourceSummary[]>>;
    let selectedSourceId: ReturnType<typeof signal<string | null>>;
    let mappings: ReturnType<typeof signal<ExternalDepartmentMappingSummary[]>>;
    let activeRun: ReturnType<typeof signal<OrgSyncRunSummary | null>>;
    let diffItems: ReturnType<typeof signal<OrgSyncDiffItemSummary[]>>;
    let syncStoreMock: {
        sources: typeof sources;
        selectedSourceId: typeof selectedSourceId;
        selectedSource: ReturnType<typeof computed<ExternalOrgSourceSummary | null>>;
        mappings: typeof mappings;
        activeRun: typeof activeRun;
        diffItems: typeof diffItems;
        loadingSources: ReturnType<typeof signal<boolean>>;
        savingSource: ReturnType<typeof signal<boolean>>;
        loadingMappings: ReturnType<typeof signal<boolean>>;
        creatingRun: ReturnType<typeof signal<boolean>>;
        loadingDiffItems: ReturnType<typeof signal<boolean>>;
        applyingRun: ReturnType<typeof signal<boolean>>;
        loadSources: jest.Mock;
        selectSource: jest.Mock;
        createSource: jest.Mock;
        updateSource: jest.Mock;
        createPreviewRun: jest.Mock;
        applyRun: jest.Mock;
    };
    let identityProviderStoreMock: {
        configs: ReturnType<typeof signal<IdentityProviderConfigSummary[]>>;
        loadConfigs: jest.Mock;
    };
    let platformStoreMock: {
        orgUnits: ReturnType<typeof signal<PlatformOrgUnitSummary[]>>;
        loadOrgUnits: jest.Mock;
    };

    beforeEach(async () => {
        sources = signal<ExternalOrgSourceSummary[]>([createSource()]);
        selectedSourceId = signal<string | null>('external-org-source-1');
        mappings = signal<ExternalDepartmentMappingSummary[]>([createMapping()]);
        activeRun = signal<OrgSyncRunSummary | null>(createRun());
        diffItems = signal<OrgSyncDiffItemSummary[]>([createDiffItem()]);

        syncStoreMock = {
            sources,
            selectedSourceId,
            selectedSource: computed(() => sources().find((source) => source.id === selectedSourceId()) ?? null),
            mappings,
            activeRun,
            diffItems,
            loadingSources: signal(false),
            savingSource: signal(false),
            loadingMappings: signal(false),
            creatingRun: signal(false),
            loadingDiffItems: signal(false),
            applyingRun: signal(false),
            loadSources: jest.fn().mockResolvedValue(sources()),
            selectSource: jest.fn().mockImplementation((id: string | null) => {
                selectedSourceId.set(id);
                return Promise.resolve();
            }),
            createSource: jest.fn().mockResolvedValue(createSource({ id: 'external-org-source-2' })),
            updateSource: jest.fn().mockResolvedValue(createSource()),
            createPreviewRun: jest.fn().mockResolvedValue(createRun()),
            applyRun: jest.fn().mockResolvedValue(createRun({ status: OrgSyncRunStatus.Applied }))
        };
        identityProviderStoreMock = {
            configs: signal<IdentityProviderConfigSummary[]>([createProviderConfig()]),
            loadConfigs: jest.fn().mockResolvedValue([createProviderConfig()])
        };
        platformStoreMock = {
            orgUnits: signal<PlatformOrgUnitSummary[]>([createOrgUnit()]),
            loadOrgUnits: jest.fn().mockResolvedValue([createOrgUnit()])
        };

        await TestBed.configureTestingModule({
            imports: [ExternalOrgSyncWorkbench],
            providers: [
                {
                    provide: PlatformStore,
                    useValue: platformStoreMock
                }
            ]
        })
            .overrideComponent(ExternalOrgSyncWorkbench, {
                set: {
                    providers: [
                        {
                            provide: ExternalOrgSyncStore,
                            useValue: syncStoreMock
                        },
                        {
                            provide: IdentityProviderStore,
                            useValue: identityProviderStoreMock
                        },
                        MessageService
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(ExternalOrgSyncWorkbench);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    });

    it('loads and renders external org sync source, mapping and diff preview', () => {
        const text = fixture.nativeElement.textContent;

        expect(syncStoreMock.loadSources).toHaveBeenCalledWith();
        expect(identityProviderStoreMock.loadConfigs).toHaveBeenCalledWith({ provider: IdentityProvider.Feishu });
        expect(platformStoreMock.loadOrgUnits).toHaveBeenCalledWith();
        expect(text).toContain('外部组织同步');
        expect(text).toContain('飞书通讯录');
        expect(text).toContain('飞书总部');
        expect(text).toContain('销售部');
    });

    it('creates a source with provider config and root department settings', async () => {
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.externalTenantId = 'tenant-test';
        component.sourceForm.status = ExternalOrgSourceStatus.Active;
        component.sourceForm.providerConfigId = 'identity-provider-1';
        component.sourceForm.authoritativeOrgUnitId = 'org-root';
        component.sourceForm.externalRootDepartmentId = '0';
        component.sourceForm.syncScopesText = 'contact:department.base:readonly\ncontact:department:readonly';

        await component.saveSource();

        expect(syncStoreMock.createSource).toHaveBeenCalledWith({
            provider: ExternalOrgProvider.Feishu,
            externalTenantId: 'tenant-test',
            displayName: '飞书测试通讯录',
            status: ExternalOrgSourceStatus.Active,
            providerConfigId: 'identity-provider-1',
            authoritativeOrgUnitId: 'org-root',
            externalRootDepartmentId: '0',
            syncScopes: ['contact:department.base:readonly', 'contact:department:readonly']
        });
        expect(component.sourceDialogVisible).toBe(false);
    });

    it('marks provider configs that are not ready for org sync as disabled options', () => {
        identityProviderStoreMock.configs.set([
            createProviderConfig({
                id: 'identity-provider-draft',
                displayName: '飞书草稿',
                status: IdentityProviderConfigStatus.Draft,
                enabled: false,
                secretConfigured: false
            })
        ]);

        const option = component.providerConfigOptions().find((candidate) => candidate.value === 'identity-provider-draft');

        expect(option).toEqual(expect.objectContaining({ disabled: true }));
        expect(option?.label).toContain('总开关未启用');
    });

    it('marks misconfigured provider configs with a status-specific issue', () => {
        identityProviderStoreMock.configs.set([
            createProviderConfig({
                id: 'identity-provider-misconfigured',
                displayName: '飞书配置异常',
                status: IdentityProviderConfigStatus.Misconfigured,
                enabled: true,
                secretConfigured: true
            })
        ]);

        const option = component.providerConfigOptions().find((candidate) => candidate.value === 'identity-provider-misconfigured');

        expect(option).toEqual(expect.objectContaining({ disabled: true }));
        expect(option?.label).toContain('状态为「配置异常」，尚未就绪');
        expect(option?.label).not.toContain('接入未启用');
    });

    it('prevents saving an active source with a provider config that is not ready', async () => {
        identityProviderStoreMock.configs.set([
            createProviderConfig({
                id: 'identity-provider-draft',
                status: IdentityProviderConfigStatus.Draft,
                enabled: false,
                secretConfigured: false
            })
        ]);
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.status = ExternalOrgSourceStatus.Active;
        component.sourceForm.providerConfigId = 'identity-provider-draft';

        await component.saveSource();

        expect(syncStoreMock.createSource).not.toHaveBeenCalled();
    });

    it('prevents saving a draft non-feishu source with a provider config binding', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '钉钉通讯录';
        component.sourceForm.provider = ExternalOrgProvider.Dingtalk;
        component.sourceForm.status = ExternalOrgSourceStatus.Draft;
        component.sourceForm.providerConfigId = 'identity-provider-1';

        expect(component.selectedProviderConfigIssue()).toContain('尚未支持绑定企业协同接入');

        await component.saveSource();

        expect(syncStoreMock.createSource).not.toHaveBeenCalled();
        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                summary: '不能保存同步源',
                detail: '当前外部平台尚未支持绑定企业协同接入，请先选择“不绑定”，或切换为飞书。'
            })
        );
    });

    it('creates preview run with optimistic source version and selects pending actionable diff items', async () => {
        await component.createPreviewRun();

        expect(syncStoreMock.createPreviewRun).toHaveBeenCalledWith('external-org-source-1', {
            expectedSourceVersion: 3,
            requestSnapshot: { triggeredFrom: 'poms-admin' }
        });
        expect(component.selectedDiffItemIds().has('diff-item-1')).toBe(true);
    });

    it('applies selected diff items and skips unselected actionable items', async () => {
        diffItems.set([createDiffItem({ id: 'diff-item-1' }), createDiffItem({ id: 'diff-item-2', externalDepartmentId: 'od-service' }), createDiffItem({ id: 'diff-item-conflict', action: OrgSyncDiffAction.Conflict })]);
        component.selectedDiffItemIds.set(new Set(['diff-item-1']));

        await component.applySelectedDiffItems('org-sync-run-1');

        expect(syncStoreMock.applyRun).toHaveBeenCalledWith('org-sync-run-1', {
            expectedVersion: 2,
            approvedDiffItemIds: ['diff-item-1'],
            skippedDiffItemIds: ['diff-item-2']
        });
    });
});
