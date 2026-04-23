import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { ProjectStore, type ProjectDetailView, type ProjectTimelineView } from '@poms/admin-data-access';
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

function createTimeline(overrides: Partial<ProjectTimelineView> = {}): ProjectTimelineView {
    return {
        projectId: 'project-1',
        events: [
            {
                eventKey: 'project-created',
                stage: 'assessment',
                stageLabel: '立项评估',
                eventType: 'stage-entered',
                occurredAt: '2026-04-01T00:00:00.000Z',
                actorUserId: 'user-1',
                actorName: '张销售',
                resultLabel: '项目创建',
                sourceType: 'project',
                sourceId: 'project-1',
                evidenceLabel: 'P-2026-001',
                isAuthoritative: true
            },
            {
                eventKey: 'contract-signed:contract-1',
                stage: 'contracting',
                stageLabel: '签约中',
                eventType: 'stage-completed',
                occurredAt: '2026-04-18T08:00:00.000Z',
                actorUserId: 'user-1',
                actorName: '张销售',
                resultLabel: '合同签约完成',
                sourceType: 'contract',
                sourceId: 'contract-1',
                evidenceLabel: 'HT-2026-001',
                isAuthoritative: true
            }
        ],
        generatedAt: '2026-04-20T10:00:00.000Z',
        ...overrides
    } as ProjectTimelineView;
}

describe('ProjectDetail', () => {
    let fixture: ComponentFixture<ProjectDetail>;
    let component: ProjectDetail;
    let projectSignal: ReturnType<typeof signal<ProjectDetailView | null>>;
    let timelineSignal: ReturnType<typeof signal<ProjectTimelineView | null>>;
    let timelineErrorSignal: ReturnType<typeof signal<string | null>>;
    let routerMock: { navigate: jest.Mock };
    let projectStoreMock: {
        loadProject: jest.Mock;
        loadProjectTimeline: jest.Mock;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        selectedProject: ReturnType<typeof signal<ProjectDetailView | null>>;
        selectedProjectTimeline: ReturnType<typeof signal<ProjectTimelineView | null>>;
        timelineError: ReturnType<typeof signal<string | null>>;
        updateProject: jest.Mock;
    };

    async function setup(project: ProjectDetailView | null = createProject(), timeline: ProjectTimelineView | null = null, timelineError: string | null = null) {
        projectSignal = signal<ProjectDetailView | null>(project);
        timelineSignal = signal<ProjectTimelineView | null>(timeline);
        timelineErrorSignal = signal<string | null>(timelineError);
        routerMock = { navigate: jest.fn() };
        projectStoreMock = {
            loadProject: jest.fn().mockResolvedValue(project),
            loadProjectTimeline: jest.fn().mockResolvedValue(timeline),
            loading: signal(false),
            saving: signal(false),
            selectedProject: projectSignal,
            selectedProjectTimeline: timelineSignal,
            timelineError: timelineErrorSignal,
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
        expect(projectStoreMock.loadProjectTimeline).toHaveBeenCalledWith('project-1');
        expect(text).toContain('华南地铁运营平台');
        expect(text).toContain('华南地铁集团');
        expect(text).toContain('张销售');
        expect(text).toContain('华南销售一部');
        expect(text).toContain('项目生命周期');
        expect(text).toContain('有阻断');
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

    it('maps authoritative timeline events into lifecycle detail and tooltip text', async () => {
        const project = createProject({
            currentStage: 'execution',
            status: 'active',
            stageSummary: {
                currentStage: 'execution',
                status: 'active',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const timeline = createTimeline();
        await setup(project, timeline);

        const items = component.lifecycleItems(project, timeline);
        const assessment = items.find((item) => item.key === 'assessment');
        const contracting = items.find((item) => item.key === 'contracting');
        const acceptance = items.find((item) => item.key === 'acceptance');

        expect(assessment?.detail).toContain('项目创建');
        expect(assessment?.tooltip).toContain('P-2026-001');
        expect(contracting?.completedAtLabel).toContain('2026-04-18');
        expect(contracting?.tooltip).toContain('合同签约完成');
        expect(contracting?.tooltip).toContain('张销售');
        expect(contracting?.tooltip).toContain('HT-2026-001');
        expect(acceptance?.completedAtLabel).toBeUndefined();
        expect(acceptance?.detail).toBeUndefined();
    });

    it('maps authoritative acceptance record events into lifecycle completion detail', async () => {
        const project = createProject({
            currentStage: 'acceptance',
            status: 'active',
            stageSummary: {
                currentStage: 'acceptance',
                status: 'active',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const timeline = createTimeline({
            events: [
                ...createTimeline().events,
                {
                    eventKey: 'acceptance-confirmed:acceptance-1',
                    stage: 'acceptance',
                    stageLabel: '验收确认',
                    eventType: 'stage-completed',
                    occurredAt: '2026-04-21T09:30:00.000Z',
                    actorUserId: 'user-2',
                    actorName: '李业务',
                    resultLabel: '最终验收已通过',
                    sourceType: 'acceptance-record',
                    sourceId: 'acceptance-1',
                    evidenceLabel: '客户最终验收单',
                    isAuthoritative: true
                }
            ]
        });
        await setup(project, timeline);

        const acceptance = component.lifecycleItems(project, timeline).find((item) => item.key === 'acceptance');

        expect(acceptance?.completedAtLabel).toContain('2026-04-21');
        expect(acceptance?.tooltip).toContain('最终验收已通过');
        expect(acceptance?.tooltip).toContain('李业务');
        expect(acceptance?.tooltip).toContain('客户最终验收单');
    });

    it('shows a non-blocking feedback message when timeline loading fails', async () => {
        await setup(createProject(), null, '项目生命周期完成时间暂时读取失败，当前仅显示阶段状态。');

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('阶段完成时间暂时不可用');
        expect(text).toContain('项目生命周期完成时间暂时读取失败');
        expect(text).toContain('华南地铁运营平台');
    });
});
