import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ProjectStage, ProjectStatus, ProjectWorkspaceStore, type ProjectBidCommercialProcessSummary, type ProjectBidCommercialWorkspaceView } from '@poms/admin-data-access';
import { ProjectBidCommercialWorkspace } from './project-bid-commercial-workspace';

function createWorkspace(overrides: Partial<ProjectBidCommercialWorkspaceView> = {}): ProjectBidCommercialWorkspaceView {
    return {
        projectId: 'project-1',
        currentStage: ProjectStage.CommercialClosure,
        status: ProjectStatus.Active,
        currentProcess: {
            id: 'bid-process-1',
            projectId: 'project-1',
            version: 2,
            isCurrent: true,
            supersedesId: 'bid-process-0',
            status: 'effective',
            bidMode: 'public-tender',
            currentStage: 'submitted',
            decision: 'participate',
            resultStatus: 'pending',
            processSummary: '公开招标已提交，等待客户确认结果。',
            decisionSummary: '销售和商务决定参与本次公开招标。',
            resultSummary: null,
            tenderNo: 'TB-2026-001',
            bidPackageNo: '包件-02',
            ownerRole: '销售负责人',
            blockerCount: 1,
            effectiveAt: '2026-04-24T08:10:00.000Z',
            createdAt: '2026-04-24T08:10:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:10:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        materialItems: [
            {
                id: 'material-1',
                processId: 'bid-process-1',
                materialKey: 'tender-document',
                label: '投标文件',
                materialStatus: 'in-progress',
                responsibleRole: '商务负责人',
                dueAt: '2026-04-26T10:00:00.000Z',
                blocksNextStep: true,
                navigationHint: '补齐投标报价附件',
                sortOrder: 1
            }
        ],
        timelineItems: [
            {
                id: 'timeline-1',
                processId: 'bid-process-1',
                eventKey: 'submitted',
                label: '投标提交',
                summary: '投标文件已正式提交。',
                timelineStatus: 'done',
                occurredAt: '2026-04-24T09:00:00.000Z',
                dueAt: null,
                responsibleRole: '销售负责人',
                sortOrder: 1
            }
        ],
        blockingReasons: ['客户招标结果尚未确认。'],
        nextStep: '等待客户确认竞标结果，再进入报价与毛利评审。',
        ownerLabel: '销售负责人 / 商务负责人',
        allowedActions: ['view-bid-commercial-workspace'],
        generatedAt: '2026-04-24T08:15:00.000Z',
        ...overrides
    };
}

function createHistory(workspace: ProjectBidCommercialWorkspaceView): ProjectBidCommercialProcessSummary[] {
    const current = workspace.currentProcess;
    if (!current) {
        return [];
    }

    return [
        current,
        {
            ...current,
            id: 'bid-process-0',
            version: current.version - 1,
            isCurrent: false,
            supersedesId: null,
            status: 'superseded',
            processSummary: '旧版竞标过程已被替代。',
            createdBy: null,
            updatedBy: null,
            rowVersion: 1
        }
    ];
}

describe('ProjectBidCommercialWorkspace', () => {
    let fixture: ComponentFixture<ProjectBidCommercialWorkspace>;
    let workspaceSignal: ReturnType<typeof signal<ProjectBidCommercialWorkspaceView | null>>;
    let historySignal: ReturnType<typeof signal<ProjectBidCommercialProcessSummary[]>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let loadingHistorySignal: ReturnType<typeof signal<boolean>>;
    let savingSignal: ReturnType<typeof signal<boolean>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let historyErrorSignal: ReturnType<typeof signal<string | null>>;
    let loadBidCommercialWorkspace: jest.Mock;
    let loadBidCommercialProcessHistory: jest.Mock;
    let createBidCommercialProcess: jest.Mock;

    async function setup(workspace: ProjectBidCommercialWorkspaceView | null = createWorkspace()) {
        const history = workspace ? createHistory(workspace) : [];
        workspaceSignal = signal<ProjectBidCommercialWorkspaceView | null>(workspace);
        historySignal = signal<ProjectBidCommercialProcessSummary[]>(history);
        loadingSignal = signal(false);
        loadingHistorySignal = signal(false);
        savingSignal = signal(false);
        errorSignal = signal<string | null>(null);
        historyErrorSignal = signal<string | null>(null);
        loadBidCommercialWorkspace = jest.fn().mockResolvedValue(workspace);
        loadBidCommercialProcessHistory = jest.fn().mockResolvedValue(history);
        createBidCommercialProcess = jest.fn().mockResolvedValue(workspace?.currentProcess ?? null);

        await TestBed.configureTestingModule({
            imports: [ProjectBidCommercialWorkspace],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        parent: {
                            snapshot: {
                                paramMap: convertToParamMap({ id: 'project-1' })
                            }
                        },
                        snapshot: {
                            paramMap: convertToParamMap({})
                        }
                    }
                },
                {
                    provide: ProjectWorkspaceStore,
                    useValue: {
                        bidCommercialWorkspace: workspaceSignal,
                        bidCommercialProcessHistory: historySignal,
                        loadingBidCommercial: loadingSignal,
                        loadingBidCommercialHistory: loadingHistorySignal,
                        savingBidCommercial: savingSignal,
                        bidCommercialError: errorSignal,
                        bidCommercialHistoryError: historyErrorSignal,
                        loadBidCommercialWorkspace,
                        loadBidCommercialProcessHistory,
                        createBidCommercialProcess
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectBidCommercialWorkspace);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads and renders the bid commercial workspace from backend projection', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(loadBidCommercialWorkspace).toHaveBeenCalledWith('project-1');
        expect(loadBidCommercialProcessHistory).toHaveBeenCalledWith('project-1');
        expect(text).toContain('招投标 / 商务竞标');
        expect(text).toContain('公开招标');
        expect(text).toContain('TB-2026-001');
        expect(text).toContain('包件-02');
        expect(text).toContain('公开招标已提交，等待客户确认结果。');
        expect(text).toContain('客户招标结果尚未确认。');
        expect(text).toContain('投标文件');
        expect(text).toContain('补齐投标报价附件');
        expect(text).toContain('投标提交');
        expect(text).toContain('竞标版本历史');
        expect(text).toContain('已被替代');
        expect(text).toContain('系统 / 未记录');
        expect(text).toContain('等待客户确认竞标结果，再进入报价与毛利评审。');
    });

    it('shows write entry from allowedActions and submits edit as a new current version', async () => {
        const workspace = createWorkspace({
            allowedActions: ['view-bid-commercial-workspace', 'create-bid-commercial-process']
        });
        await setup(workspace);

        const component = fixture.componentInstance;

        expect(fixture.nativeElement.textContent).toContain('编辑当前过程');

        component.openBidDialog(workspace, 'edit');
        component.bidForm.tenderNo = 'TB-2026-EDIT';
        component.bidForm.processSummary = '更新竞标过程说明。';
        await component.submitBidProcess();

        expect(createBidCommercialProcess).toHaveBeenCalledWith(
            'project-1',
            expect.objectContaining({
                tenderNo: 'TB-2026-EDIT',
                bidPackageNo: '包件-02',
                processSummary: '更新竞标过程说明。',
                materialItems: [
                    expect.objectContaining({
                        materialKey: 'tender-document',
                        label: '投标文件',
                        blocksNextStep: true
                    })
                ],
                timelineItems: [
                    expect.objectContaining({
                        eventKey: 'submitted',
                        label: '投标提交'
                    })
                ]
            })
        );
    });

    it('keeps write entry hidden when allowedActions does not include create action', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('当前只读');
        expect(text).toContain('没有招投标 / 商务竞标写入权限');
        expect(text).not.toContain('编辑当前过程');
    });

    it('renders an empty business gap when current process is missing', async () => {
        await setup(
            createWorkspace({
                currentProcess: null,
                materialItems: [],
                timelineItems: [],
                blockingReasons: ['尚未形成竞标 / 商务路径事实。'],
                nextStep: '先确认是否投标、直接商务或不适用。'
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('竞标过程尚未形成');
        expect(text).toContain('尚未形成竞标 / 商务路径事实。');
        expect(text).toContain('先确认是否投标、直接商务或不适用。');
    });

    it('renders the store error without fallback facts', async () => {
        await setup(null);
        errorSignal.set('你没有权限查看当前工作区。');
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('招投标 / 商务竞标暂不可用');
        expect(text).toContain('你没有权限查看当前工作区。');
        expect(text).not.toContain('竞标过程尚未形成');
    });
});
