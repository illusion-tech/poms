import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ProjectStore, type ProjectDetailView } from '@poms/admin-data-access';
import { ProjectDetail } from './project-detail';

function createProject(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectCode: 'P-2026-001',
        projectName: '华南地铁运营平台',
        customerId: null,
        customerName: '华南地铁集团',
        status: 'blocked',
        currentStage: 'handover',
        ownerOrgId: 'org-1',
        ownerUserId: 'user-1',
        plannedSignAt: '2026-05-01T00:00:00.000Z',
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
            status: 'blocked',
            plannedSignAt: '2026-05-01T00:00:00.000Z',
            closedAt: null,
            closedReason: null,
            blockingReasons: ['project-status-blocked']
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
            summarySnapshotId: '11111111-2222-3333-4444-555555555555',
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
        summarySnapshotId: '11111111-2222-3333-4444-555555555555',
        projectionLevel: 'project',
        exportPolicy: 'internal',
        allowedActions: ['view-project-workspace', 'edit-project-basic-info', 'manage-project-commission'],
        generatedAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

describe('ProjectDetail', () => {
    let fixture: ComponentFixture<ProjectDetail>;
    let component: ProjectDetail;
    let projectSignal: ReturnType<typeof signal<ProjectDetailView | null>>;
    let routerMock: { navigate: jest.Mock };
    let projectStoreMock: {
        loadProject: jest.Mock;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        selectedProject: ReturnType<typeof signal<ProjectDetailView | null>>;
        updateProject: jest.Mock;
    };

    async function setup(project: ProjectDetailView | null = createProject()) {
        projectSignal = signal<ProjectDetailView | null>(project);
        routerMock = { navigate: jest.fn() };
        projectStoreMock = {
            loadProject: jest.fn().mockResolvedValue(project),
            loading: signal(false),
            saving: signal(false),
            selectedProject: projectSignal,
            updateProject: jest.fn().mockResolvedValue(project)
        };

        await TestBed.configureTestingModule({
            imports: [ProjectDetail],
            providers: [
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({ id: 'project-1' })
                        }
                    }
                },
                {
                    provide: Router,
                    useValue: routerMock
                }
            ]
        })
            .overrideComponent(ProjectDetail, {
                set: {
                    providers: [
                        {
                            provide: ProjectStore,
                            useValue: projectStoreMock
                        }
                    ]
                }
            })
            .compileComponents();

        fixture = TestBed.createComponent(ProjectDetail);
        component = fixture.componentInstance;
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('renders ProjectDetailView business facts without leaking internal keys', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(projectStoreMock.loadProject).toHaveBeenCalledWith('project-1');
        expect(text).toContain('华南地铁运营平台');
        expect(text).toContain('华南地铁集团');
        expect(text).toContain('张销售');
        expect(text).toContain('华南销售一部');
        expect(text).toContain('项目被标记为阻塞');
        expect(text).toContain('HT-2026-001');
        expect(text).toContain('123,456.78 CNY');
        expect(text).toContain('审批摘要已形成');
        expect(text).toContain('暂未形成确认记录');
        expect(text).toContain('投标详情暂未接入正式事实源');
        expect(text).not.toContain('project-status-blocked');
        expect(text).not.toContain('not_configured');
        expect(text).not.toContain('allowedActions');
    });

    it('hides edit and commission actions when allowedActions only permits workspace access', async () => {
        await setup(
            createProject({
                allowedActions: ['view-project-workspace']
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('项目工作区');
        expect(text).not.toContain('编辑基本信息');
        expect(text).not.toContain('提成操作');

        component.goToCommission();

        expect(routerMock.navigate).not.toHaveBeenCalledWith(['/projects', 'project-1', 'commission', 'operations']);
    });

    it('submits trimmed basic info and allows clearing customer name', async () => {
        await setup();

        component.showEditDialog();
        component.editForm = {
            projectName: '  更新后的项目  ',
            customerName: '   '
        };

        await component.saveProject();

        expect(projectStoreMock.updateProject).toHaveBeenCalledWith('project-1', {
            projectName: '更新后的项目',
            customerName: null
        });
        expect(component.editDialogVisible).toBe(false);
    });
});
