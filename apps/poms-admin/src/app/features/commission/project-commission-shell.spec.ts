import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { AuthStore, ProjectStore, ProjectWorkspaceStore, type ProjectDetailView } from '@poms/admin-data-access';
import { ProjectCommissionShell } from './project-commission-shell';

function createProject(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectCode: 'P-2026-001',
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

    async function setup(
        permissions: string[] = ['project:read', 'contract:finance:manage', 'commission:payouts:manage', 'commission:assignments:manage']
    ) {
        projectStoreMock = {
            loadProject: jest.fn().mockResolvedValue(createProject()),
            clearSelectedProject: jest.fn(),
            loading: signal(false),
            selectedProject: signal<ProjectDetailView | null>(createProject())
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
                },
                {
                    provide: AuthStore,
                    useValue: {
                        currentUser: signal({
                            permissions
                        })
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
                            useValue: {
                                clear: jest.fn()
                            }
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
        expect(text).toContain('提成工作区 · 华南地铁运营平台');
        expect(text).toContain('P-2026-001');
        expect(text).toContain('提成处理重点');
        expect(text).toContain('移交完成后进入正式执行');
        expect(text).toContain('责任归口');
        expect(text).toContain('提成相关事项');
        expect(text).toContain('冻结与责任边界');
    });

    it('keeps restricted commission operation entry disabled by current permissions', async () => {
        await setup(['project:read', 'contract:finance:manage']);

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
