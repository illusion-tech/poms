import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ProjectStore, ProjectWorkspaceStore, type ProjectDetailView, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { ProjectWorkspaceShell } from './project-workspace-shell';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function createProject(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '华南地铁运营平台',
        customerId: null,
        customerName: '华南地铁集团',
        status: 'active',
        currentStage: 'handover',
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        plannedSignAt: null,
        closedAt: null,
        closedReason: null,
        rowVersion: 3,
        createdAt: '2026-04-19T10:00:00.000Z',
        createdBy: 'system',
        updatedAt: '2026-04-20T10:00:00.000Z',
        updatedBy: 'admin',
        ownerName: '张销售',
        ownerOrgName: '华南销售一部',
        stageSummary: {
            currentStage: 'handover',
            status: 'active',
            plannedSignAt: null,
            closedAt: null,
            closedReason: null,
            blockingReasons: []
        },
        currentBidSummary: {
            bidProcessId: null,
            bidStatus: 'not_configured',
            resultStatus: null,
            summary: null
        },
        currentContractSummary: {
            activeContractCount: 1,
            latestContractId: 'contract-1',
            latestContractNo: 'HT-2026-001',
            latestContractStatus: 'active',
            signedAmountProjection: sensitiveProjection('123456.78'),
            currencyCode: 'CNY',
            signedAt: '2026-04-18T00:00:00.000Z',
            currentSnapshotId: 'snapshot-1'
        },
        currentApprovalSummary: {
            summarySnapshotId: 'summary-1',
            summaryPackageKey: 'project-detail',
            projectionLevel: 'project',
            exportPolicy: 'internal',
            generatedAt: '2026-04-20T08:00:00.000Z'
        },
        currentConfirmationSummary: {
            confirmationRecordId: null,
            status: 'not_configured',
            requiredCount: 0,
            confirmedCount: 0,
            pendingCount: 0,
            confirmedAt: null
        },
        summarySnapshotId: 'summary-1',
        projectionLevel: 'project',
        exportPolicy: 'internal',
        allowedActions: ['view-project-workspace', 'manage-project-commission'],
        generatedAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

function createGuidance(overrides: Partial<ProjectWorkspaceGuidanceView> = {}): ProjectWorkspaceGuidanceView {
    return {
        projectId: 'project-1',
        currentStage: 'handover',
        status: 'active',
        currentStageLabel: '项目移交',
        statusLabel: '正常推进',
        headline: '后端确认的工作区总览',
        currentFocus: '先完成移交和经营快照确认',
        currentGap: '缺少回款确认',
        nextStep: '请财务补齐回款确认后再继续',
        ownerLabel: '财务负责人',
        blockingReasons: ['缺少回款确认'],
        basisSummary: {
            summarySnapshotId: 'summary-1',
            projectionLevel: 'workspace-guidance',
            exportPolicy: 'internal',
            generatedAt: '2026-04-20T08:00:00.000Z'
        },
        recommendedEntries: [
            {
                key: 'workspace-home',
                label: '工作区总览',
                description: '查看当前阶段、缺口和下一步。',
                route: '/projects/project-1/workspace',
                enabled: true,
                disabledReason: null,
                actionKey: 'view-project-workspace'
            },
            {
                key: 'operating-overview',
                label: '经营总览',
                description: '查看收入、成本、回款和经营口径。',
                route: '/projects/project-1/workspace/operating-overview',
                enabled: false,
                disabledReason: '后端判定当前不能查看经营总览。',
                actionKey: 'contract:finance:manage'
            },
            {
                key: 'commission-operations',
                label: '提成操作',
                description: '处理提成规则、计算、发放和调整。',
                route: '/projects/project-1/commission/operations',
                enabled: true,
                disabledReason: null,
                actionKey: 'manage-project-commission'
            }
        ],
        generatedAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

describe('ProjectWorkspaceShell', () => {
    let fixture: ComponentFixture<ProjectWorkspaceShell>;
    let component: ProjectWorkspaceShell;
    let navigateSpy: jest.SpiedFunction<Router['navigate']>;
    let navigateByUrlSpy: jest.SpiedFunction<Router['navigateByUrl']>;
    let projectStoreMock: {
        loadProject: jest.Mock;
        clearSelectedProject: jest.Mock;
        loading: ReturnType<typeof signal<boolean>>;
        selectedProject: ReturnType<typeof signal<ProjectDetailView | null>>;
    };
    let workspaceStoreMock: {
        loadGuidance: jest.Mock;
        clear: jest.Mock;
        guidance: ReturnType<typeof signal<ProjectWorkspaceGuidanceView | null>>;
        guidanceError: ReturnType<typeof signal<string | null>>;
        loadingGuidance: ReturnType<typeof signal<boolean>>;
        hasGuidance: ReturnType<typeof signal<boolean>>;
    };

    async function setup(guidance: ProjectWorkspaceGuidanceView | null = createGuidance()) {
        projectStoreMock = {
            loadProject: jest.fn().mockResolvedValue(createProject()),
            clearSelectedProject: jest.fn(),
            loading: signal(false),
            selectedProject: signal<ProjectDetailView | null>(createProject())
        };
        workspaceStoreMock = {
            loadGuidance: jest.fn().mockResolvedValue(guidance),
            clear: jest.fn(),
            guidance: signal<ProjectWorkspaceGuidanceView | null>(guidance),
            guidanceError: signal<string | null>(null),
            loadingGuidance: signal(false),
            hasGuidance: signal(guidance !== null)
        };

        await TestBed.configureTestingModule({
            imports: [ProjectWorkspaceShell],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ id: 'project-1' })
                        }
                    }
                }
            ]
        })
            .overrideComponent(ProjectWorkspaceShell, {
                set: {
                    providers: [
                        {
                            provide: ProjectStore,
                            useValue: projectStoreMock
                        },
                        {
                            provide: ProjectWorkspaceStore,
                            useValue: workspaceStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        const router = TestBed.inject(Router);
        navigateSpy = jest.spyOn(router, 'navigate').mockResolvedValue(true);
        navigateByUrlSpy = jest.spyOn(router, 'navigateByUrl').mockResolvedValue(true);

        fixture = TestBed.createComponent(ProjectWorkspaceShell);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads guidance and renders backend guidance facts in the shell', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(projectStoreMock.loadProject).toHaveBeenCalledWith('project-1');
        expect(workspaceStoreMock.loadGuidance).toHaveBeenCalledWith('project-1');
        expect(text).toContain('后端确认的工作区总览');
        expect(text).toContain('当前工作重点');
        expect(text).toContain('先完成移交和经营快照确认');
        expect(text).toContain('缺少回款确认');
        expect(text).toContain('请财务补齐回款确认后再继续');
        expect(text).toContain('财务负责人');
        expect(text).toContain('后端判定当前不能查看经营总览。');
    });

    it('uses backend entry route and availability for commission operations', async () => {
        await setup();

        component.goToCommissionOperations();

        expect(navigateByUrlSpy).toHaveBeenCalledWith('/projects/project-1/commission/operations');
    });

    it('does not locally route to disabled commission operations entry', async () => {
        await setup(
            createGuidance({
                recommendedEntries: [
                    {
                        key: 'commission-operations',
                        label: '提成操作',
                        description: '处理提成规则、计算、发放和调整。',
                        route: null,
                        enabled: false,
                        disabledReason: '后端判定当前不能处理提成操作。',
                        actionKey: 'manage-project-commission'
                    }
                ]
            })
        );

        component.goToCommissionOperations();

        expect(navigateByUrlSpy).not.toHaveBeenCalled();
        expect(fixture.nativeElement.textContent).toContain('后端判定当前不能处理提成操作。');
    });

    it('navigates back to project detail from the workspace shell', async () => {
        await setup();

        component.goBackToProject();

        expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'project-1']);
    });
});
