import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { AuthStore, ProjectStore, type ProjectArchiveRecordSummary, type ProjectDetailView, type ProjectTimelineView } from '@poms/admin-data-access';
import { ProjectDetail } from './project-detail';

function createProject(overrides: Partial<ProjectDetailView> = {}): ProjectDetailView {
    return {
        id: 'project-1',
        projectNo: 'P-2026-001',
        projectName: '华南地铁运营平台',
        sourceLeadId: null,
        customerId: null,
        customerName: '华南地铁集团',
        customerProjectNo: 'CUS-PRJ-2026-01',
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
        sourceLeadSummary: null,
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

function createArchiveRecord(overrides: Partial<Record<keyof ProjectArchiveRecordSummary, unknown>> = {}): ProjectArchiveRecordSummary {
    return {
        id: 'archive-1',
        projectId: 'project-1',
        archiveAnchorStage: 'completed',
        archiveAnchorSourceType: 'project',
        archiveAnchorSourceId: 'project-1',
        status: 'recorded',
        archivedAt: '2026-04-24T15:20:00.000Z',
        archivedBy: 'user-4',
        archivedByName: '赵归档',
        archiveSummary: '项目资料已完成归档',
        evidenceSummary: '项目归档清单',
        supersedesArchiveRecordId: null,
        replacementReason: null,
        voidedAt: null,
        voidedBy: null,
        voidedByName: null,
        voidReason: null,
        createdAt: '2026-04-24T15:20:00.000Z',
        createdBy: 'user-4',
        updatedAt: '2026-04-24T15:20:00.000Z',
        updatedBy: 'user-4',
        rowVersion: 7,
        ...overrides
    } as ProjectArchiveRecordSummary;
}

describe('ProjectDetail', () => {
    let fixture: ComponentFixture<ProjectDetail>;
    let component: ProjectDetail;
    let projectSignal: ReturnType<typeof signal<ProjectDetailView | null>>;
    let timelineSignal: ReturnType<typeof signal<ProjectTimelineView | null>>;
    let archiveRecordsSignal: ReturnType<typeof signal<ProjectArchiveRecordSummary[]>>;
    let timelineErrorSignal: ReturnType<typeof signal<string | null>>;
    let archiveRecordsErrorSignal: ReturnType<typeof signal<string | null>>;
    let routerMock: { navigate: jest.Mock };
    let authStoreMock: {
        hasAnyPermission: jest.Mock;
    };
    let projectStoreMock: {
        loadProject: jest.Mock;
        loadProjectTimeline: jest.Mock;
        loadProjectArchiveRecords: jest.Mock;
        loading: ReturnType<typeof signal<boolean>>;
        saving: ReturnType<typeof signal<boolean>>;
        loadingArchiveRecords: ReturnType<typeof signal<boolean>>;
        savingArchiveCommand: ReturnType<typeof signal<boolean>>;
        selectedProject: ReturnType<typeof signal<ProjectDetailView | null>>;
        selectedProjectTimeline: ReturnType<typeof signal<ProjectTimelineView | null>>;
        selectedProjectArchiveRecords: ReturnType<typeof signal<ProjectArchiveRecordSummary[]>>;
        timelineError: ReturnType<typeof signal<string | null>>;
        archiveRecordsError: ReturnType<typeof signal<string | null>>;
        updateProject: jest.Mock;
        replaceProjectArchiveRecord: jest.Mock;
        voidProjectArchiveRecord: jest.Mock;
    };

    async function setup(project: ProjectDetailView | null = createProject(), timeline: ProjectTimelineView | null = null, timelineError: string | null = null, archiveRecords: ProjectArchiveRecordSummary[] = [], canWriteProject = true) {
        projectSignal = signal<ProjectDetailView | null>(project);
        timelineSignal = signal<ProjectTimelineView | null>(timeline);
        archiveRecordsSignal = signal<ProjectArchiveRecordSummary[]>(archiveRecords);
        timelineErrorSignal = signal<string | null>(timelineError);
        archiveRecordsErrorSignal = signal<string | null>(null);
        routerMock = { navigate: jest.fn() };
        authStoreMock = {
            hasAnyPermission: jest.fn((permissions: readonly string[]) => permissions.includes('project:write') && canWriteProject)
        };
        projectStoreMock = {
            loadProject: jest.fn().mockResolvedValue(project),
            loadProjectTimeline: jest.fn().mockResolvedValue(timeline),
            loadProjectArchiveRecords: jest.fn().mockResolvedValue(archiveRecords),
            loading: signal(false),
            saving: signal(false),
            loadingArchiveRecords: signal(false),
            savingArchiveCommand: signal(false),
            selectedProject: projectSignal,
            selectedProjectTimeline: timelineSignal,
            selectedProjectArchiveRecords: archiveRecordsSignal,
            timelineError: timelineErrorSignal,
            archiveRecordsError: archiveRecordsErrorSignal,
            updateProject: jest.fn().mockResolvedValue(project),
            replaceProjectArchiveRecord: jest.fn().mockResolvedValue(archiveRecords[0] ?? createArchiveRecord()),
            voidProjectArchiveRecord: jest.fn().mockResolvedValue(archiveRecords[0] ?? createArchiveRecord())
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
                },
                {
                    provide: AuthStore,
                    useValue: authStoreMock
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
        expect(projectStoreMock.loadProjectArchiveRecords).toHaveBeenCalledWith('project-1');
        expect(text).toContain('华南地铁运营平台');
        expect(text).toContain('POMS 项目编号');
        expect(text).toContain('P-2026-001');
        expect(text).toContain('客户项目编号');
        expect(text).toContain('CUS-PRJ-2026-01');
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
        expect(text).toContain('暂未形成正式投标事实');
        expect(text).not.toContain('project-status-blocked');
        expect(text).not.toContain('not_configured');
        expect(text).not.toContain('allowedActions');
    });

    it('renders project detail bid summary when the backend provides a current bid process', async () => {
        await setup(
            createProject({
                currentBidSummary: {
                    bidProcessId: '6f2820b4-9665-4f22-8000-000000000011',
                    bidStatus: 'submitted',
                    resultStatus: 'pending',
                    summary: '投标材料已提交，等待商务评审结果'
                }
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('投标材料已提交，等待商务评审结果');
        expect(text).not.toContain('投标详情暂未接入正式事实源');
    });

    it('renders source lead summary for projects converted from leads', async () => {
        await setup(
            createProject({
                sourceLeadId: 'lead-1',
                sourceLeadSummary: {
                    id: 'lead-1',
                    leadNo: 'L-2026-001',
                    leadName: '华南地铁线索',
                    customerName: '华南地铁集团',
                    status: 'converted'
                }
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('来源线索');
        expect(text).toContain('L-2026-001');
        expect(text).toContain('华南地铁线索');
        expect(text).toContain('已转项目');
        expect(text).toContain('查看线索列表');
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
            customerName: '   ',
            customerProjectNo: '  CUS-PRJ-NEW  '
        };

        await component.saveProject();

        expect(projectStoreMock.updateProject).toHaveBeenCalledWith('project-1', {
            projectName: '更新后的项目',
            customerName: null,
            customerProjectNo: 'CUS-PRJ-NEW'
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

    it('maps authoritative project completion record events into completed milestone detail', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
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
                    eventKey: 'project-completed:completion-1',
                    stage: 'completed',
                    stageLabel: '已完成',
                    eventType: 'stage-completed',
                    occurredAt: '2026-04-24T11:45:00.000Z',
                    actorUserId: 'user-3',
                    actorName: '王交付',
                    resultLabel: '项目完成已确认',
                    sourceType: 'project-completion-record',
                    sourceId: 'completion-1',
                    evidenceLabel: '项目完成确认单',
                    isAuthoritative: true
                }
            ]
        });
        await setup(project, timeline);

        const completed = component.lifecycleItems(project, timeline).find((item) => item.key === 'completed');

        expect(completed?.description).toBe('形成业务完成结论');
        expect(completed?.completedAtLabel).toContain('2026-04-24');
        expect(completed?.tooltip).toContain('项目完成已确认');
        expect(completed?.tooltip).toContain('王交付');
        expect(completed?.tooltip).toContain('项目完成确认单');
    });

    it('renders archive panel from authoritative archive milestone for terminal projects', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
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
                    eventKey: 'project-archive:archive-1',
                    stage: 'completed',
                    stageLabel: '已完成',
                    eventType: 'milestone',
                    occurredAt: '2026-04-24T15:20:00.000Z',
                    actorUserId: 'user-4',
                    actorName: '赵归档',
                    resultLabel: '项目资料已完成归档',
                    sourceType: 'project-archive-record',
                    sourceId: 'archive-1',
                    evidenceLabel: '项目归档清单',
                    isAuthoritative: true
                }
            ]
        });
        await setup(project, timeline);

        const archive = component.archiveSummary(project, timeline);
        const text = fixture.nativeElement.textContent;

        expect(archive?.stage).toBe('completed');
        expect(archive?.occurredAtLabel).toContain('2026-04-24');
        expect(archive?.resultLabel).toBe('项目资料已完成归档');
        expect(archive?.actorName).toBe('赵归档');
        expect(archive?.evidenceLabel).toBe('项目归档清单');
        expect(text).toContain('项目归档');
        expect(text).toContain('已形成归档记录');
        expect(text).toContain('项目资料已完成归档');
        expect(text).toContain('项目归档清单');
    });

    it('renders current archive record and non-current archive audit history', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const current = createArchiveRecord({
            id: 'archive-2',
            archiveSummary: '修正后的归档结论',
            evidenceSummary: '修正后的归档清单',
            replacementReason: '补充遗漏的验收附件'
        });
        const superseded = createArchiveRecord({
            id: 'archive-1',
            status: 'superseded',
            archiveSummary: '原始归档结论',
            evidenceSummary: '原始归档清单',
            rowVersion: 3
        });
        const voided = createArchiveRecord({
            id: 'archive-0',
            status: 'voided',
            archiveSummary: '重复归档记录',
            evidenceSummary: '重复归档清单',
            voidedAt: '2026-04-25T09:00:00.000Z',
            voidedByName: '王经理',
            voidReason: '资料重复'
        });

        await setup(project, null, null, [current, superseded, voided]);

        const text = fixture.nativeElement.textContent;

        expect(component.currentArchiveRecord([current, superseded, voided])).toEqual(current);
        expect(text).toContain('当前有效');
        expect(text).toContain('修正后的归档结论');
        expect(text).toContain('修正后的归档清单');
        expect(text).toContain('归档历史');
        expect(text).toContain('已被替代');
        expect(text).toContain('已撤销');
        expect(text).toContain('补充遗漏的验收附件');
        expect(text).toContain('资料重复');
        expect(text).toContain('王经理');
    });

    it('shows archive replace and void actions when the user can maintain project archives', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const archiveRecord = createArchiveRecord();

        await setup(project, null, null, [archiveRecord]);

        expect(fixture.nativeElement.textContent).toContain('替代归档');
        expect(fixture.nativeElement.textContent).toContain('撤销归档');
    });

    it('hides archive replace and void actions when the user lacks project write permission', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const archiveRecord = createArchiveRecord();

        await setup(project, null, null, [archiveRecord], false);

        expect(fixture.nativeElement.textContent).not.toContain('替代归档');
        expect(fixture.nativeElement.textContent).not.toContain('撤销归档');
        expect(fixture.nativeElement.textContent).toContain('当前账号不能维护归档记录');
    });

    it('submits archive replacement with expectedVersion from the selected record', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const archiveRecord = createArchiveRecord({ rowVersion: 9 });
        await setup(project, null, null, [archiveRecord]);

        component.openReplaceArchiveDialog(archiveRecord);
        component.replaceArchiveForm = {
            archivedAt: '2026-04-26T10:30:00.000Z',
            archiveSummary: '  新归档结论  ',
            evidenceSummary: '  新证据摘要  ',
            replacementReason: '  原记录证据不完整  '
        };

        await component.replaceArchiveRecord();

        expect(projectStoreMock.replaceProjectArchiveRecord).toHaveBeenCalledWith('archive-1', {
            archivedAt: '2026-04-26T10:30:00.000Z',
            archiveSummary: '新归档结论',
            evidenceSummary: '新证据摘要',
            replacementReason: '原记录证据不完整',
            expectedVersion: 9
        });
        expect(component.replaceArchiveDialogVisible).toBe(false);
    });

    it('submits archive void with expectedVersion from the selected record', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        const archiveRecord = createArchiveRecord({ rowVersion: 10 });
        await setup(project, null, null, [archiveRecord]);

        component.openVoidArchiveDialog(archiveRecord);
        component.voidArchiveForm = {
            reason: '  归档事实错误  ',
            comment: '  待重新归档  '
        };

        await component.voidArchiveRecord();

        expect(projectStoreMock.voidProjectArchiveRecord).toHaveBeenCalledWith('archive-1', {
            reason: '归档事实错误',
            comment: '待重新归档',
            expectedVersion: 10
        });
        expect(component.voidArchiveDialogVisible).toBe(false);
    });

    it('shows archive gap feedback when terminal project has no archive milestone', async () => {
        const project = createProject({
            currentStage: 'closed-lost',
            status: 'closed-lost',
            stageSummary: {
                currentStage: 'closed-lost',
                status: 'closed-lost',
                plannedSignAt: null,
                closedAt: '2026-04-24T08:00:00.000Z',
                closedReason: '客户取消预算',
                blockingReasons: []
            }
        });

        await setup(project, createTimeline());

        const text = fixture.nativeElement.textContent;

        expect(component.archiveSummary(project, createTimeline())).toBeNull();
        expect(text).toContain('项目归档');
        expect(text).toContain('尚未形成归档记录');
        expect(text).toContain('项目当前已进入已丢单');
    });

    it('shows a non-blocking feedback message when timeline loading fails', async () => {
        await setup(createProject(), null, '项目生命周期完成时间暂时读取失败，当前仅显示阶段状态。');

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('阶段完成时间暂时不可用');
        expect(text).toContain('项目生命周期完成时间暂时读取失败');
        expect(text).toContain('华南地铁运营平台');
    });

    it('does not misreport archive gap when terminal timeline loading fails', async () => {
        const project = createProject({
            currentStage: 'completed',
            status: 'completed',
            stageSummary: {
                currentStage: 'completed',
                status: 'completed',
                plannedSignAt: null,
                closedAt: null,
                closedReason: null,
                blockingReasons: []
            }
        });
        await setup(project, null, '项目生命周期完成时间暂时读取失败，当前仅显示阶段状态。');

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('项目归档');
        expect(text).toContain('归档事实暂时不可用');
        expect(text).not.toContain('尚未形成归档记录');
    });
});
