import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { ProjectStage, ProjectStatus, ProjectStore, ProjectWorkspaceStore, type ProjectDetailView, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { ProjectCommissionShell } from './project-commission-shell';

function createProject(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '华南地铁运营平台',
        customerId: null,
        customerName: '华南地铁集团',
        customerProjectNo: null,
        status: ProjectStatus.Active,
        currentStage: ProjectStage.Handover,
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
            currentStage: ProjectStage.Handover,
            status: ProjectStatus.Active,
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
            signedAmount: '123456.78',
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
        currentStage: ProjectStage.Handover,
        status: ProjectStatus.Active,
        currentStageLabel: '项目移交',
        statusLabel: '正常推进',
        headline: '后端确认的提成工作区总览',
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
                key: 'commission-freeze-binding',
                label: '冻结与责任边界',
                description: '查看提成冻结版本、责任边界、参与人权重和移交收口关系。',
                route: '/projects/project-1/commission/freeze-binding',
                enabled: true,
                disabledReason: null,
                actionKey: 'commission:assignments:manage'
            },
            {
                key: 'commission-gate-overview',
                label: '阶段闸口',
                description: '解释当前阶段为什么可发或不可发。',
                route: '/projects/project-1/commission/gate-overview',
                enabled: true,
                disabledReason: null,
                actionKey: 'view-project-workspace'
            },
            {
                key: 'commission-final-settlement',
                label: '最终结算',
                description: '查看验收、回款和结算收口说明。',
                route: '/projects/project-1/commission/final-settlement',
                enabled: true,
                disabledReason: null,
                actionKey: 'commission:payouts:manage'
            },
            {
                key: 'commission-rule-explanation',
                label: '规则解释',
                description: '查看提成规则和经营口径说明。',
                route: '/projects/project-1/commission/rule-explanation',
                enabled: true,
                disabledReason: null,
                actionKey: 'view-project-workspace'
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

describe('ProjectCommissionShell', () => {
    let fixture: ComponentFixture<ProjectCommissionShell>;
    let component: ProjectCommissionShell;
    let navigateSpy: jest.SpiedFunction<Router['navigate']>;
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
            imports: [ProjectCommissionShell],
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
            .overrideComponent(ProjectCommissionShell, {
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

        fixture = TestBed.createComponent(ProjectCommissionShell);
        component = fixture.componentInstance;
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('renders commission shell with shared context and command panel', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(projectStoreMock.loadProject).toHaveBeenCalledWith('project-1');
        expect(workspaceStoreMock.loadGuidance).toHaveBeenCalledWith('project-1');
        expect(text).toContain('提成工作区 · 华南地铁运营平台');
        expect(text).toContain('P-2026-001');
        expect(text).toContain('提成处理重点');
        expect(text).toContain('请财务补齐回款确认后再继续');
        expect(text).toContain('缺少回款确认');
        expect(text).toContain('责任归口');
        expect(text).toContain('财务负责人');
        expect(text).toContain('提成相关事项');
        expect(text).toContain('冻结与责任边界');
    });

    it('keeps restricted commission entries disabled by backend guidance', async () => {
        await setup(
            createGuidance({
                recommendedEntries: createGuidance().recommendedEntries.map((entry) => {
                    if (entry.key === 'commission-freeze-binding') {
                        return {
                            ...entry,
                            enabled: false,
                            disabledReason: '需要项目查看和提成角色冻结权限。'
                        };
                    }

                    if (entry.key === 'commission-operations') {
                        return {
                            ...entry,
                            enabled: false,
                            disabledReason: '需要完整的提成治理操作权限。'
                        };
                    }

                    return entry;
                })
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('冻结与责任边界 · 需要项目查看和提成角色冻结权限。');
        expect(text).toContain('提成操作 · 需要完整的提成治理操作权限。');
    });

    it('navigates back to project workspace', async () => {
        await setup();

        component.goBackToWorkspace();

        expect(navigateSpy).toHaveBeenCalledWith(['/projects', 'project-1', 'workspace']);
    });
});
