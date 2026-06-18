import { HttpErrorResponse } from '@angular/common/http';
import { computed, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import {
    ExternalDepartmentMappingReviewState,
    ExternalDepartmentMappingStatus,
    type ExternalDepartmentMappingSummary,
    ExternalOrgProvider,
    ExternalOrgSourceStatus,
    ExternalOrgSyncStore,
    type ExternalOrgSourceSummary,
    IdentityProvider,
    IdentityProviderConfigStatus,
    IdentityProviderConnectionDiagnosticStatus,
    IdentityProviderConnectionTestCapability,
    IdentityProviderConnectionTestStatus,
    IdentityProviderStore,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult,
    OrgSyncDiffAction,
    OrgSyncDiffItemStatus,
    type OrgSyncDiffItemSummary,
    OrgSyncRunStatus,
    type OrgSyncRunSummary,
    PlatformStore,
    type PlatformOrgUnitSummary
} from '@poms/admin-data-access';
import { provideRouter } from '@angular/router';
import { ConfirmationService, MessageService } from 'primeng/api';
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
        reviewState: ExternalDepartmentMappingReviewState.Mapped,
        conflictReason: null,
        lastConflictRunId: null,
        lastConflictDiffItemId: null,
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
        diagnosticSummary: null,
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

function createOrgSyncDiagnostic(overrides: Partial<IdentityProviderConnectionTestResult> = {}): IdentityProviderConnectionTestResult {
    return {
        status: IdentityProviderConnectionTestStatus.Success,
        capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
        message: '组织同步可用性检查通过，飞书通讯录读取正常。',
        checkedAt: '2026-06-10T08:30:00.000Z',
        checks: [
            {
                key: 'departmentReadAccess',
                label: '飞书部门读取',
                status: IdentityProviderConnectionDiagnosticStatus.Passed,
                message: '根部门 0 可访问，已读取 1 个直接子部门。'
            }
        ],
        nextActions: [],
        ...overrides
    };
}

describe('ExternalOrgSyncWorkbench', () => {
    let fixture: ComponentFixture<ExternalOrgSyncWorkbench>;
    let component: ExternalOrgSyncWorkbench;
    let sources: ReturnType<typeof signal<ExternalOrgSourceSummary[]>>;
    let selectedSourceId: ReturnType<typeof signal<string | null>>;
    let mappings: ReturnType<typeof signal<ExternalDepartmentMappingSummary[]>>;
    let activeRun: ReturnType<typeof signal<OrgSyncRunSummary | null>>;
    let diffItems: ReturnType<typeof signal<OrgSyncDiffItemSummary[]>>;
    let runHistory: ReturnType<typeof signal<OrgSyncRunSummary[]>>;
    let selectedRunDetail: ReturnType<typeof signal<OrgSyncRunSummary | null>>;
    let selectedRunDiffItems: ReturnType<typeof signal<OrgSyncDiffItemSummary[]>>;
    let syncStoreMock: {
        sources: typeof sources;
        selectedSourceId: typeof selectedSourceId;
        selectedSource: ReturnType<typeof computed<ExternalOrgSourceSummary | null>>;
        mappings: typeof mappings;
        activeRun: typeof activeRun;
        diffItems: typeof diffItems;
        runHistory: typeof runHistory;
        selectedRunDetail: typeof selectedRunDetail;
        selectedRunDiffItems: typeof selectedRunDiffItems;
        loadingSources: ReturnType<typeof signal<boolean>>;
        savingSource: ReturnType<typeof signal<boolean>>;
        loadingMappings: ReturnType<typeof signal<boolean>>;
        creatingRun: ReturnType<typeof signal<boolean>>;
        loadingDiffItems: ReturnType<typeof signal<boolean>>;
        loadingRunHistory: ReturnType<typeof signal<boolean>>;
        loadingRunDetail: ReturnType<typeof signal<boolean>>;
        loadingRunDetailId: ReturnType<typeof signal<string | null>>;
        applyingRun: ReturnType<typeof signal<boolean>>;
        savingMappingIds: ReturnType<typeof signal<ReadonlySet<string>>>;
        previewStale: ReturnType<typeof signal<boolean>>;
        loadSources: jest.Mock;
        loadMappings: jest.Mock;
        loadRunHistory: jest.Mock;
        loadRunDetail: jest.Mock;
        clearRunDetail: jest.Mock;
        selectSource: jest.Mock;
        createSource: jest.Mock;
        updateSource: jest.Mock;
        activateSource: jest.Mock;
        pauseSource: jest.Mock;
        archiveSource: jest.Mock;
        createPreviewRun: jest.Mock;
        applyRun: jest.Mock;
        mapMapping: jest.Mock;
        unmapMapping: jest.Mock;
        ignoreMapping: jest.Mock;
        restoreMapping: jest.Mock;
    };
    let identityProviderStoreMock: {
        configs: ReturnType<typeof signal<IdentityProviderConfigSummary[]>>;
        testingConfigId: ReturnType<typeof signal<string | null>>;
        loadConfigs: jest.Mock;
        testConnection: jest.Mock;
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
        runHistory = signal<OrgSyncRunSummary[]>([createRun(), createRun({ id: 'org-sync-run-2', status: OrgSyncRunStatus.Failed, errorSummary: '飞书权限未开通', totalItemCount: 0 })]);
        selectedRunDetail = signal<OrgSyncRunSummary | null>(null);
        selectedRunDiffItems = signal<OrgSyncDiffItemSummary[]>([]);

        syncStoreMock = {
            sources,
            selectedSourceId,
            selectedSource: computed(() => sources().find((source) => source.id === selectedSourceId()) ?? null),
            mappings,
            activeRun,
            diffItems,
            runHistory,
            selectedRunDetail,
            selectedRunDiffItems,
            loadingSources: signal(false),
            savingSource: signal(false),
            loadingMappings: signal(false),
            creatingRun: signal(false),
            loadingDiffItems: signal(false),
            loadingRunHistory: signal(false),
            loadingRunDetail: signal(false),
            loadingRunDetailId: signal(null),
            applyingRun: signal(false),
            savingMappingIds: signal<ReadonlySet<string>>(new Set<string>()),
            previewStale: signal(false),
            loadSources: jest.fn().mockResolvedValue(sources()),
            loadMappings: jest.fn().mockImplementation(() => Promise.resolve(mappings())),
            loadRunHistory: jest.fn().mockResolvedValue(runHistory()),
            loadRunDetail: jest.fn().mockImplementation((id: string) => {
                syncStoreMock.loadingRunDetail.set(true);
                syncStoreMock.loadingRunDetailId.set(id);
                selectedRunDetail.set(null);
                selectedRunDiffItems.set([]);
                const run = runHistory().find((candidate) => candidate.id === id) ?? createRun({ id });
                selectedRunDetail.set(run);
                selectedRunDiffItems.set([createDiffItem({ runId: id })]);
                syncStoreMock.loadingRunDetail.set(false);
                syncStoreMock.loadingRunDetailId.set(null);
                return Promise.resolve(run);
            }),
            clearRunDetail: jest.fn().mockImplementation(() => {
                selectedRunDetail.set(null);
                selectedRunDiffItems.set([]);
                syncStoreMock.loadingRunDetail.set(false);
                syncStoreMock.loadingRunDetailId.set(null);
            }),
            selectSource: jest.fn().mockImplementation((id: string | null) => {
                selectedSourceId.set(id);
                return Promise.resolve();
            }),
            createSource: jest.fn().mockResolvedValue(createSource({ id: 'external-org-source-2', status: ExternalOrgSourceStatus.Draft, rowVersion: 4 })),
            updateSource: jest.fn().mockResolvedValue(createSource()),
            activateSource: jest.fn().mockResolvedValue(createSource({ id: 'external-org-source-2', status: ExternalOrgSourceStatus.Active, rowVersion: 5 })),
            pauseSource: jest.fn().mockResolvedValue(createSource({ status: ExternalOrgSourceStatus.Paused, rowVersion: 4 })),
            archiveSource: jest.fn().mockResolvedValue(createSource({ status: ExternalOrgSourceStatus.Archived, rowVersion: 4 })),
            createPreviewRun: jest.fn().mockResolvedValue(createRun()),
            applyRun: jest.fn().mockResolvedValue(createRun({ status: OrgSyncRunStatus.Applied })),
            mapMapping: jest.fn().mockImplementation((id: string, request: { orgUnitId: string; expectedVersion: number }) => {
                const updated = { ...mappings().find((mapping) => mapping.id === id), orgUnitId: request.orgUnitId, status: ExternalDepartmentMappingStatus.Mapped, reviewState: ExternalDepartmentMappingReviewState.Mapped, rowVersion: request.expectedVersion + 1 } as ExternalDepartmentMappingSummary;
                mappings.set(mappings().map((mapping) => (mapping.id === id ? updated : mapping)));
                syncStoreMock.previewStale.set(true);
                return Promise.resolve(updated);
            }),
            unmapMapping: jest.fn().mockImplementation((id: string, request: { expectedVersion: number }) => {
                const updated = { ...mappings().find((mapping) => mapping.id === id), orgUnitId: null, status: ExternalDepartmentMappingStatus.Unmapped, reviewState: ExternalDepartmentMappingReviewState.Unmapped, rowVersion: request.expectedVersion + 1 } as ExternalDepartmentMappingSummary;
                mappings.set(mappings().map((mapping) => (mapping.id === id ? updated : mapping)));
                syncStoreMock.previewStale.set(true);
                return Promise.resolve(updated);
            }),
            ignoreMapping: jest.fn().mockImplementation((id: string, request: { expectedVersion: number }) => {
                const updated = { ...mappings().find((mapping) => mapping.id === id), orgUnitId: null, status: ExternalDepartmentMappingStatus.Ignored, reviewState: ExternalDepartmentMappingReviewState.Ignored, rowVersion: request.expectedVersion + 1 } as ExternalDepartmentMappingSummary;
                mappings.set(mappings().map((mapping) => (mapping.id === id ? updated : mapping)));
                syncStoreMock.previewStale.set(true);
                return Promise.resolve(updated);
            }),
            restoreMapping: jest.fn().mockImplementation((id: string, request: { expectedVersion: number }) => {
                const updated = { ...mappings().find((mapping) => mapping.id === id), orgUnitId: null, status: ExternalDepartmentMappingStatus.Unmapped, reviewState: ExternalDepartmentMappingReviewState.Unmapped, rowVersion: request.expectedVersion + 1 } as ExternalDepartmentMappingSummary;
                mappings.set(mappings().map((mapping) => (mapping.id === id ? updated : mapping)));
                syncStoreMock.previewStale.set(true);
                return Promise.resolve(updated);
            })
        };
        identityProviderStoreMock = {
            configs: signal<IdentityProviderConfigSummary[]>([createProviderConfig()]),
            testingConfigId: signal(null),
            loadConfigs: jest.fn().mockResolvedValue([createProviderConfig()]),
            testConnection: jest.fn().mockResolvedValue(createOrgSyncDiagnostic())
        };
        platformStoreMock = {
            orgUnits: signal<PlatformOrgUnitSummary[]>([createOrgUnit()]),
            loadOrgUnits: jest.fn().mockResolvedValue([createOrgUnit()])
        };

        await TestBed.configureTestingModule({
            imports: [ExternalOrgSyncWorkbench],
            providers: [
                provideRouter([]),
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
                        ConfirmationService,
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

    it('loads mappings with server-side review state and search filters', async () => {
        component.updateMappingReviewStateFilter(ExternalDepartmentMappingReviewState.Conflict);
        await fixture.whenStable();

        expect(syncStoreMock.loadMappings).toHaveBeenLastCalledWith('external-org-source-1', {
            reviewState: ExternalDepartmentMappingReviewState.Conflict,
            search: undefined
        });

        jest.useFakeTimers();
        component.updateMappingSearchText(' 销售 ');
        try {
            jest.advanceTimersByTime(300);
            await Promise.resolve();
            await Promise.resolve();
        } finally {
            jest.useRealTimers();
        }

        expect(syncStoreMock.loadMappings).toHaveBeenLastCalledWith('external-org-source-1', {
            reviewState: ExternalDepartmentMappingReviewState.Conflict,
            search: '销售'
        });
    });

    it('keeps all in-flight mapping rows busy', () => {
        const first = createMapping({ id: 'mapping-1' });
        const second = createMapping({ id: 'mapping-2', externalDepartmentId: 'od-sales' });

        syncStoreMock.savingMappingIds.set(new Set(['mapping-1', 'mapping-2']));

        expect(component.isMappingSaving(first)).toBe(true);
        expect(component.isMappingSaving(second)).toBe(true);
        expect(component.canIgnoreMapping(first)).toBe(false);
        expect(component.canIgnoreMapping(second)).toBe(false);
    });

    it('passes current mapping filters when selecting a source', async () => {
        component.mappingReviewStateFilter.set(ExternalDepartmentMappingReviewState.Conflict);
        component.mappingSearchText.set('销售');

        await component.selectSource(createSource({ id: 'external-org-source-2' }));

        expect(syncStoreMock.selectSource).toHaveBeenCalledWith('external-org-source-2', {
            reviewState: ExternalDepartmentMappingReviewState.Conflict,
            search: '销售'
        });
    });

    it('allows unmapping only when persisted mapping state has an org unit binding', () => {
        const derivedConflict = createMapping({
            orgUnitId: null,
            status: ExternalDepartmentMappingStatus.Unmapped,
            reviewState: ExternalDepartmentMappingReviewState.Conflict
        });
        const mapped = createMapping({
            orgUnitId: 'org-root',
            status: ExternalDepartmentMappingStatus.Mapped,
            reviewState: ExternalDepartmentMappingReviewState.Mapped
        });
        const inconsistent = createMapping({
            orgUnitId: 'org-root',
            status: ExternalDepartmentMappingStatus.Unmapped,
            reviewState: ExternalDepartmentMappingReviewState.Unmapped
        });

        expect(component.canUnmapMapping(derivedConflict)).toBe(false);
        expect(component.canUnmapMapping(mapped)).toBe(true);
        expect(component.canUnmapMapping(inconsistent)).toBe(true);
    });

    it('maps an external department through the row-level command and marks preview stale', async () => {
        const mapping = createMapping({ rowVersion: 2, orgUnitId: null, status: ExternalDepartmentMappingStatus.Unmapped, reviewState: ExternalDepartmentMappingReviewState.Unmapped });

        component.openMappingDialog(mapping);
        component.mappingTargetOrgUnitId = 'org-root';

        await component.saveMappingDialog();

        expect(syncStoreMock.mapMapping).toHaveBeenCalledWith('mapping-1', {
            orgUnitId: 'org-root',
            expectedVersion: 2
        });
        expect(syncStoreMock.previewStale()).toBe(true);
        expect(component.mappingDialogVisible).toBe(false);
    });

    it('blocks applying the current preview after mapping changes', () => {
        component.selectedDiffItemIds.set(new Set(['diff-item-1']));

        expect(component.canApplyRun()).toBe(true);

        syncStoreMock.previewStale.set(true);

        expect(component.canApplyRun()).toBe(false);
    });

    it('shows run history and opens run detail without replacing the active preview', async () => {
        component.setSyncRunView('history');
        fixture.detectChanges();

        expect(fixture.nativeElement.textContent).toContain('飞书权限未开通');

        await component.openRunDetail(runHistory()[1]);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();

        expect(syncStoreMock.loadRunDetail).toHaveBeenCalledWith('org-sync-run-2');
        expect(syncStoreMock.activeRun()).toEqual(createRun());
        expect(syncStoreMock.selectedRunDetail()).toEqual(runHistory()[1]);
        expect(fixture.nativeElement.textContent).toContain('同步运行详情');
    });

    it('marks only the loading run detail action as busy', () => {
        const [, failedRun] = runHistory();

        syncStoreMock.loadingRunDetailId.set(failedRun.id);

        expect(component.isRunDetailLoading(failedRun)).toBe(true);
        expect(component.isRunDetailLoading(runHistory()[0])).toBe(false);
    });

    it('prefers structured diagnostic message for preview failures', () => {
        const detail = component.previewFailureDetail(
            createRun({
                status: OrgSyncRunStatus.Failed,
                errorSummary: 'legacy error',
                diagnosticSummary: {
                    message: '飞书应用身份通讯录权限未开通',
                    adapterStatus: 'adapter_failed',
                    providerCode: '99991663',
                    httpStatus: 403,
                    providerMessage: 'permission denied',
                    nextActions: ['请在飞书开放平台开通应用身份通讯录部门读取权限。'],
                    generatedAt: '2026-06-10T09:00:03.000Z'
                }
            })
        );

        expect(detail).toBe('飞书应用身份通讯录权限未开通');
    });

    it('creates a source with provider config and root department settings', async () => {
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.externalTenantId = 'tenant-test';
        component.sourceForm.providerConfigId = 'identity-provider-1';
        component.sourceForm.authoritativeOrgUnitId = 'org-root';
        component.sourceForm.externalRootDepartmentId = '0';
        component.sourceForm.syncScopesText = 'contact:department.base:readonly\ncontact:department:readonly';

        await component.saveSource();

        expect(syncStoreMock.createSource).toHaveBeenCalledWith({
            provider: ExternalOrgProvider.Feishu,
            externalTenantId: 'tenant-test',
            displayName: '飞书测试通讯录',
            providerConfigId: 'identity-provider-1',
            authoritativeOrgUnitId: 'org-root',
            externalRootDepartmentId: '0',
            syncScopes: ['contact:department.base:readonly', 'contact:department:readonly']
        });
        expect(identityProviderStoreMock.testConnection).toHaveBeenCalledWith('identity-provider-1', {
            capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
            externalRootDepartmentId: '0',
            expectedVersion: 1
        });
        expect(syncStoreMock.activateSource).not.toHaveBeenCalled();
        expect(component.sourceDialogVisible).toBe(false);
    });

    it('creates a draft source and activates it through save-and-activate', async () => {
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.providerConfigId = 'identity-provider-1';

        await component.saveSource({ activateAfterCreate: true });

        expect(syncStoreMock.createSource).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: ExternalOrgProvider.Feishu,
                displayName: '飞书测试通讯录',
                providerConfigId: 'identity-provider-1'
            })
        );
        expect(syncStoreMock.createSource.mock.calls[0][0]).not.toHaveProperty('status');
        expect(syncStoreMock.activateSource).toHaveBeenCalledWith('external-org-source-2', { expectedVersion: 4 });
        expect(identityProviderStoreMock.testConnection).toHaveBeenCalledWith('identity-provider-1', {
            capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
            externalRootDepartmentId: '0',
            expectedVersion: 1
        });
        expect(component.sourceDialogVisible).toBe(false);
    });

    it('opens the create flow as a task wizard and requires a supported platform name before advancing', () => {
        component.openCreateSourceDialog();

        expect(component.sourceWizardStep()).toBe('platform');
        expect(component.canGoToNextWizardStep()).toBe(false);
        expect(component.canSelectWizardStep('review')).toBe(false);
        expect(component.isWizardStepCompleted('platform')).toBe(false);

        component.goToWizardStep('review');
        expect(component.sourceWizardStep()).toBe('platform');

        component.sourceForm.displayName = '飞书测试通讯录';

        expect(component.canGoToNextWizardStep()).toBe(true);
        expect(component.canSelectWizardStep('connection')).toBe(true);
        component.goToWizardStep('connection');
        expect(component.sourceWizardStep()).toBe('connection');
        expect(component.isWizardStepCompleted('platform')).toBe(true);
        expect(component.wizardStepButtonClass('platform')).toContain('border-emerald-200');
        expect(component.canSelectWizardStep('review')).toBe(false);

        component.goToWizardStep('review');
        expect(component.sourceWizardStep()).toBe('connection');

        component.goToNextWizardStep();
        expect(component.sourceWizardStep()).toBe('scope');
        expect(component.isWizardStepCompleted('connection')).toBe(false);
        expect(component.wizardStepButtonClass('connection')).not.toContain('border-emerald-200');

        component.goToWizardStep('platform');
        component.selectWizardProvider(ExternalOrgProvider.Dingtalk);

        expect(component.canGoToNextWizardStep()).toBe(false);
        expect(component.wizardPreviewIssue()).toContain('当前仅支持飞书组织同步');
        expect(component.shouldShowWizardProviderConfigLink()).toBe(false);
    });

    it('marks the connection step complete only after selecting a provider config', async () => {
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.goToNextWizardStep();

        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        component.goToNextWizardStep();

        expect(component.sourceWizardStep()).toBe('scope');
        expect(component.isWizardStepCompleted('connection')).toBe(true);
        expect(component.wizardStepButtonClass('connection')).toContain('border-emerald-200');
    });

    it('keeps save-and-preview unavailable when there is no ready provider config', () => {
        identityProviderStoreMock.configs.set([
            createProviderConfig({
                id: 'identity-provider-misconfigured',
                displayName: '飞书配置异常',
                status: IdentityProviderConfigStatus.Misconfigured,
                enabled: true,
                secretConfigured: true
            })
        ]);

        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.goToNextWizardStep();
        component.goToNextWizardStep();
        component.goToNextWizardStep();

        expect(component.hasUsableProviderConfig()).toBe(false);
        expect(component.canSaveDraftFromWizard()).toBe(true);
        expect(component.canSaveAndPreviewWizard()).toBe(false);
        expect(component.wizardPreviewIssue()).toContain('需要选择一个已启用且已配置 Client Secret 的企业协同接入');
        expect(component.shouldShowWizardProviderConfigLink()).toBe(true);
    });

    it('keeps draft save unavailable until selected provider config readiness succeeds', async () => {
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';

        component.sourceForm.providerConfigId = 'identity-provider-1';
        expect(component.canSaveDraftFromWizard()).toBe(false);

        identityProviderStoreMock.testingConfigId.set('identity-provider-1');
        expect(component.canSaveDraftFromWizard()).toBe(false);
        identityProviderStoreMock.testingConfigId.set(null);

        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '组织同步可用性检查未通过：飞书应用身份通讯录权限未开通。'
            })
        );
        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();
        expect(component.canSaveDraftFromWizard()).toBe(false);

        identityProviderStoreMock.testConnection.mockResolvedValueOnce(createOrgSyncDiagnostic());
        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        expect(component.canSaveDraftFromWizard()).toBe(true);
    });

    it('allows moving to scope when provider readiness fails so root department can be changed', async () => {
        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '组织同步可用性检查未通过：根部门 0 不可访问。'
            })
        );

        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.goToNextWizardStep();

        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        expect(component.sourceWizardStep()).toBe('connection');
        expect(component.canGoToNextWizardStep()).toBe(true);

        component.goToNextWizardStep();

        expect(component.sourceWizardStep()).toBe('scope');
        expect(component.isWizardStepCompleted('connection')).toBe(true);
        expect(component.canSaveDraftFromWizard()).toBe(false);
        expect(component.wizardPreviewIssue()).toBe('组织同步可用性检查未通过：根部门 0 不可访问。');
    });

    it('shows the provider config repair link when diagnostics fail without fixed keywords', async () => {
        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '飞书返回 99991672，请检查通讯录权限范围。'
            })
        );

        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';

        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        expect(component.wizardPreviewIssue()).toBe('飞书返回 99991672，请检查通讯录权限范围。');
        expect(component.shouldShowWizardProviderConfigLink()).toBe(true);
    });

    it('does not save a draft when an unusable provider config is selected', async () => {
        identityProviderStoreMock.configs.set([
            createProviderConfig({
                id: 'identity-provider-misconfigured',
                displayName: '飞书配置异常',
                status: IdentityProviderConfigStatus.Misconfigured,
                enabled: true,
                secretConfigured: true
            })
        ]);

        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.providerConfigId = 'identity-provider-misconfigured';

        expect(component.canSaveDraftFromWizard()).toBe(false);

        await component.saveSource();

        expect(syncStoreMock.createSource).not.toHaveBeenCalled();
    });

    it('blocks saving a draft when organization sync readiness diagnostics fail for a new binding', async () => {
        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '组织同步可用性检查未通过：飞书应用身份通讯录权限未开通。'
            })
        );
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.providerConfigId = 'identity-provider-1';

        await component.saveSource();

        expect(syncStoreMock.createSource).not.toHaveBeenCalled();
        expect(component.sourceDialogVisible).toBe(true);
    });

    it('allows editing a paused source when its unchanged provider config is no longer ready', async () => {
        identityProviderStoreMock.configs.set([
            createProviderConfig({
                id: 'identity-provider-1',
                displayName: '飞书配置异常',
                status: IdentityProviderConfigStatus.Misconfigured,
                enabled: true,
                secretConfigured: true
            })
        ]);
        const pausedSource = createSource({ status: ExternalOrgSourceStatus.Paused, providerConfigId: 'identity-provider-1' });
        sources.set([pausedSource]);

        component.openEditSourceDialog(pausedSource);
        component.sourceForm.displayName = '飞书通讯录改名';
        component.sourceForm.syncScopesText = 'contact:department.base:readonly\ncontact:department.organize:readonly';

        await component.saveSource();

        expect(syncStoreMock.updateSource).toHaveBeenCalledWith('external-org-source-1', {
            displayName: '飞书通讯录改名',
            providerConfigId: 'identity-provider-1',
            authoritativeOrgUnitId: 'org-root',
            externalRootDepartmentId: '0',
            syncScopes: ['contact:department.base:readonly', 'contact:department.organize:readonly'],
            expectedVersion: 3
        });
        expect(component.sourceDialogVisible).toBe(false);
    });

    it('prevents editing a source to switch to a provider config that is not ready', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        identityProviderStoreMock.configs.set([
            createProviderConfig({ id: 'identity-provider-1', displayName: '飞书生产租户' }),
            createProviderConfig({
                id: 'identity-provider-misconfigured',
                displayName: '飞书配置异常',
                status: IdentityProviderConfigStatus.Misconfigured,
                enabled: true,
                secretConfigured: true
            })
        ]);
        const pausedSource = createSource({ status: ExternalOrgSourceStatus.Paused, providerConfigId: 'identity-provider-1' });
        sources.set([pausedSource]);

        component.openEditSourceDialog(pausedSource);
        component.updateProviderConfigId('identity-provider-misconfigured');

        await component.saveSource();

        expect(syncStoreMock.updateSource).not.toHaveBeenCalled();
        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                summary: '不能保存同步源',
                detail: '状态为「配置异常」，尚未就绪。'
            })
        );
    });

    it('blocks editing a source to switch to a provider config that fails organization sync readiness', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        identityProviderStoreMock.configs.set([
            createProviderConfig({ id: 'identity-provider-1', displayName: '飞书生产租户' }),
            createProviderConfig({ id: 'identity-provider-2', displayName: '飞书新租户', rowVersion: 2 })
        ]);
        const pausedSource = createSource({ status: ExternalOrgSourceStatus.Paused, providerConfigId: 'identity-provider-1' });
        sources.set([pausedSource]);

        component.openEditSourceDialog(pausedSource);
        await fixture.whenStable();

        component.sourceForm.providerConfigId = 'identity-provider-2';
        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '组织同步可用性检查未通过：飞书新租户缺少通讯录权限。'
            })
        );

        await component.saveSource();

        expect(syncStoreMock.updateSource).not.toHaveBeenCalled();
        expect(identityProviderStoreMock.testConnection).toHaveBeenLastCalledWith('identity-provider-2', {
            capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
            externalRootDepartmentId: '0',
            expectedVersion: 2
        });
        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                summary: '组织同步不可用',
                detail: '组织同步可用性检查未通过：飞书新租户缺少通讯录权限。'
            })
        );
    });

    it('blocks editing a source when root department change fails organization sync readiness', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        const pausedSource = createSource({ status: ExternalOrgSourceStatus.Paused, providerConfigId: 'identity-provider-1', externalRootDepartmentId: '0' });
        sources.set([pausedSource]);

        component.openEditSourceDialog(pausedSource);
        await fixture.whenStable();

        component.sourceForm.externalRootDepartmentId = 'od-sales';
        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '组织同步可用性检查未通过：根部门 od-sales 不可访问。'
            })
        );

        await component.saveSource();

        expect(syncStoreMock.updateSource).not.toHaveBeenCalled();
        expect(identityProviderStoreMock.testConnection).toHaveBeenLastCalledWith('identity-provider-1', {
            capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
            externalRootDepartmentId: 'od-sales',
            expectedVersion: 1
        });
        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'warn',
                summary: '组织同步不可用',
                detail: '组织同步可用性检查未通过：根部门 od-sales 不可访问。'
            })
        );
    });

    it('creates, activates and generates a preview from the wizard', async () => {
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.providerConfigId = 'identity-provider-1';

        await component.saveSource({ activateAfterCreate: true, previewAfterActivate: true });

        expect(syncStoreMock.createSource).toHaveBeenCalledWith(
            expect.objectContaining({
                provider: ExternalOrgProvider.Feishu,
                displayName: '飞书测试通讯录',
                providerConfigId: 'identity-provider-1'
            })
        );
        expect(syncStoreMock.activateSource).toHaveBeenCalledWith('external-org-source-2', { expectedVersion: 4 });
        expect(syncStoreMock.createPreviewRun).toHaveBeenCalledWith('external-org-source-2', {
            expectedSourceVersion: 5,
            requestSnapshot: { triggeredFrom: 'poms-admin-wizard' }
        });
        expect(component.selectedDiffItemIds().has('diff-item-1')).toBe(true);
        expect(component.sourceDialogVisible).toBe(false);
    });

    it('runs organization sync readiness diagnostics when selecting a provider config', async () => {
        component.openCreateSourceDialog();

        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        expect(identityProviderStoreMock.testConnection).toHaveBeenCalledWith('identity-provider-1', {
            capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
            externalRootDepartmentId: '0',
            expectedVersion: 1
        });
        expect(component.selectedProviderConfigDiagnostic()?.status).toBe(IdentityProviderConnectionTestStatus.Success);
    });

    it('clears cached organization sync diagnostics when the latest provider check fails', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        component.openCreateSourceDialog();

        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        expect(component.selectedProviderConfigDiagnostic()?.status).toBe(IdentityProviderConnectionTestStatus.Success);

        const addMessage = jest.spyOn(messageService, 'add');
        identityProviderStoreMock.testConnection.mockRejectedValueOnce(new Error('Feishu network failed'));

        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        expect(component.selectedProviderConfigDiagnostic()).toBeNull();
        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'error',
                summary: '检查失败'
            })
        );
    });

    it('reruns organization sync readiness diagnostics when root department changes', async () => {
        component.openCreateSourceDialog();
        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();
        expect(component.selectedProviderConfigDiagnostic()?.status).toBe(IdentityProviderConnectionTestStatus.Success);

        jest.useFakeTimers();
        try {
            identityProviderStoreMock.testConnection.mockClear();

            component.updateExternalRootDepartmentId('od-sales');

            expect(component.selectedProviderConfigDiagnostic()).toBeNull();
            expect(identityProviderStoreMock.testConnection).not.toHaveBeenCalled();

            jest.advanceTimersByTime(399);
            await Promise.resolve();
            expect(identityProviderStoreMock.testConnection).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            await Promise.resolve();
            await Promise.resolve();

            expect(identityProviderStoreMock.testConnection).toHaveBeenCalledWith('identity-provider-1', {
                capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
                externalRootDepartmentId: 'od-sales',
                expectedVersion: 1
            });
            expect(component.selectedProviderConfigDiagnostic()?.status).toBe(IdentityProviderConnectionTestStatus.Success);
        } finally {
            jest.useRealTimers();
        }
    });

    it('does not run debounced root department diagnostics after closing the source dialog', async () => {
        component.openCreateSourceDialog();
        component.updateProviderConfigId('identity-provider-1');
        await fixture.whenStable();

        jest.useFakeTimers();
        try {
            identityProviderStoreMock.testConnection.mockClear();

            component.updateExternalRootDepartmentId('od-sales');
            component.closeSourceDialog();

            jest.advanceTimersByTime(400);
            await Promise.resolve();
            await Promise.resolve();

            expect(identityProviderStoreMock.testConnection).not.toHaveBeenCalled();
        } finally {
            jest.useRealTimers();
        }
    });

    it('blocks save-and-activate when organization sync readiness diagnostics fail', async () => {
        identityProviderStoreMock.testConnection.mockResolvedValueOnce(
            createOrgSyncDiagnostic({
                status: IdentityProviderConnectionTestStatus.Failed,
                message: '组织同步可用性检查未通过：飞书应用身份通讯录权限未开通。'
            })
        );
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '飞书测试通讯录';
        component.sourceForm.providerConfigId = 'identity-provider-1';

        await component.saveSource({ activateAfterCreate: true });

        expect(syncStoreMock.createSource).not.toHaveBeenCalled();
        expect(syncStoreMock.activateSource).not.toHaveBeenCalled();
        expect(component.sourceDialogVisible).toBe(true);
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
        expect(option?.label).toBe('飞书配置异常 · 状态为「配置异常」，尚未就绪。');
        expect(option?.label).not.toContain('配置异常 · 配置异常 · 状态为「配置异常」');
        expect(option?.label).not.toContain('接入未启用');
    });

    it('prevents save-and-activate when the provider config is not ready', async () => {
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
        component.sourceForm.providerConfigId = 'identity-provider-draft';

        await component.saveSource({ activateAfterCreate: true });

        expect(syncStoreMock.createSource).not.toHaveBeenCalled();
        expect(syncStoreMock.activateSource).not.toHaveBeenCalled();
    });

    it('prevents saving a draft non-feishu source with a provider config binding', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        component.openCreateSourceDialog();
        component.sourceForm.displayName = '钉钉通讯录';
        component.sourceForm.provider = ExternalOrgProvider.Dingtalk;
        component.sourceForm.providerConfigId = 'identity-provider-1';

        const option = component.providerConfigOptions().find((candidate) => candidate.value === 'identity-provider-1');
        expect(option).toEqual(expect.objectContaining({ disabled: true }));
        expect(option?.label).toContain('尚未支持绑定企业协同接入');
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

    it('uses lifecycle commands for pause, activate and archive actions', async () => {
        const activeSource = createSource({ status: ExternalOrgSourceStatus.Active, rowVersion: 3 });
        const pausedSource = createSource({ status: ExternalOrgSourceStatus.Paused, rowVersion: 4 });

        await component.toggleSourceStatus(activeSource);
        await component.toggleSourceStatus(pausedSource);
        await component.archiveSource(pausedSource);

        expect(syncStoreMock.pauseSource).toHaveBeenCalledWith(activeSource.id, { expectedVersion: 3 });
        expect(syncStoreMock.activateSource).toHaveBeenCalledWith(pausedSource.id, { expectedVersion: 4 });
        expect(syncStoreMock.archiveSource).toHaveBeenCalledWith(pausedSource.id, { expectedVersion: 4 });
        expect(syncStoreMock.updateSource).not.toHaveBeenCalled();
    });

    it('normalizes blank persisted root department id before activate diagnostics', async () => {
        const pausedSource = createSource({ status: ExternalOrgSourceStatus.Paused, rowVersion: 4, externalRootDepartmentId: '' });

        await component.toggleSourceStatus(pausedSource);

        expect(identityProviderStoreMock.testConnection).toHaveBeenCalledWith('identity-provider-1', {
            capability: IdentityProviderConnectionTestCapability.ExternalOrgSync,
            externalRootDepartmentId: '0',
            expectedVersion: 1
        });
        expect(syncStoreMock.activateSource).toHaveBeenCalledWith(pausedSource.id, { expectedVersion: 4 });
    });

    it('creates preview run with optimistic source version and selects pending actionable diff items', async () => {
        await component.createPreviewRun();

        expect(syncStoreMock.createPreviewRun).toHaveBeenCalledWith('external-org-source-1', {
            expectedSourceVersion: 3,
            requestSnapshot: { triggeredFrom: 'poms-admin' }
        });
        expect(component.selectedDiffItemIds().has('diff-item-1')).toBe(true);
    });

    it('treats a failed preview run as a failure instead of a zero-diff success', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        syncStoreMock.createPreviewRun.mockResolvedValueOnce(
            createRun({
                status: OrgSyncRunStatus.Failed,
                totalItemCount: 0,
                errorSummary: '飞书部门分页大小超过限制，请将 page_size 调整为 50 或更小。'
            })
        );
        component.selectedDiffItemIds.set(new Set(['diff-item-1']));

        await component.createPreviewRun();

        expect(component.selectedDiffItemIds().size).toBe(0);
        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'error',
                summary: '预览失败',
                detail: '飞书部门分页大小超过限制，请将 page_size 调整为 50 或更小。'
            })
        );
        expect(addMessage).not.toHaveBeenCalledWith(expect.objectContaining({ severity: 'success', summary: '预览已生成' }));
    });

    it('uses run-aware preview empty messages', () => {
        activeRun.set(null);
        expect(component.previewEmptyMessage()).toBe('尚未生成预览');

        activeRun.set(createRun({ status: OrgSyncRunStatus.Previewing, totalItemCount: 0 }));
        expect(component.previewEmptyMessage()).toBe('预览生成中，请稍后刷新');

        activeRun.set(createRun({ status: OrgSyncRunStatus.Failed, totalItemCount: 0, errorSummary: '飞书权限未开通' }));
        expect(component.previewEmptyMessage()).toBe('预览失败，未生成差异项');

        activeRun.set(createRun({ status: OrgSyncRunStatus.Previewed, totalItemCount: 0 }));
        expect(component.previewEmptyMessage()).toBe('预览已完成，暂无差异');

        activeRun.set(createRun({ status: OrgSyncRunStatus.Applying, totalItemCount: 0 }));
        expect(component.previewEmptyMessage()).toBe('正在应用预览差异，请稍后刷新');

        activeRun.set(createRun({ status: OrgSyncRunStatus.Applied, totalItemCount: 0 }));
        expect(component.previewEmptyMessage()).toBe('本次预览已应用完成');

        activeRun.set(createRun({ status: OrgSyncRunStatus.Cancelled, totalItemCount: 0 }));
        expect(component.previewEmptyMessage()).toBe('预览已取消，请重新生成预览');
        expect(component.previewFailureDetail(createRun({ status: OrgSyncRunStatus.Failed, errorSummary: null }))).toBe('外部组织拉取或差异生成失败');
    });

    it('uses the fallback toast detail for HttpErrorResponse without a server message', async () => {
        const messageService = fixture.debugElement.injector.get(MessageService);
        const addMessage = jest.spyOn(messageService, 'add');
        syncStoreMock.createPreviewRun.mockRejectedValueOnce(
            new HttpErrorResponse({
                status: 500,
                statusText: 'Internal Server Error',
                url: '/api/platform/external-org-sync/sources/external-org-source-1/runs',
                error: null
            })
        );

        await component.createPreviewRun();

        expect(addMessage).toHaveBeenCalledWith(
            expect.objectContaining({
                severity: 'error',
                summary: '预览失败',
                detail: '外部组织拉取或差异生成失败'
            })
        );
        expect(addMessage.mock.calls.at(-1)?.[0].detail).not.toContain('Http failure response');
    });

    it('applies selected diff items and skips unselected actionable items', async () => {
        diffItems.set([createDiffItem({ id: 'diff-item-1' }), createDiffItem({ id: 'diff-item-2', externalDepartmentId: 'od-service' }), createDiffItem({ id: 'diff-item-conflict', action: OrgSyncDiffAction.Conflict })]);
        component.selectedDiffItemIds.set(new Set(['diff-item-1']));

        await component.applySelectedDiffItems('org-sync-run-1');

        expect(syncStoreMock.applyRun).toHaveBeenCalledWith(
            'org-sync-run-1',
            {
                expectedVersion: 2,
                approvedDiffItemIds: ['diff-item-1'],
                skippedDiffItemIds: ['diff-item-2']
            },
            {
                reviewState: undefined,
                search: undefined
            }
        );
    });
});
