import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { ProjectStage, ProjectStatus, ProjectWorkspaceStore, type ProjectPricingMarginReviewSummary, type ProjectPricingMarginWorkspaceView } from '@poms/admin-data-access';
import { ProjectPricingMarginWorkspace } from './project-pricing-margin-workspace';

function createWorkspace(overrides: Partial<ProjectPricingMarginWorkspaceView> = {}): ProjectPricingMarginWorkspaceView {
    return {
        projectId: 'project-1',
        currentStage: ProjectStage.CommercialClosure,
        status: ProjectStatus.Active,
        currentReview: {
            id: 'pricing-review-1',
            projectId: 'project-1',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            technicalCostPackageId: 'technical-package-1',
            bidCommercialProcessId: 'bid-process-1',
            commercialReleaseBaselineId: 'commercial-baseline-1',
            pricingPath: 'bid',
            quoteVersion: 'Q-2026-001',
            currencyCode: 'CNY',
            quoteAmountTaxInclusive: '250000.00',
            quoteAmountTaxExclusive: '235849.06',
            taxRate: '0.0600',
            taxConditionSummary: '按 6% 增值税测算。',
            paymentTermsSummary: '首付款 30%，验收后 70%。',
            grossMarginRate: '0.3200',
            grossMarginBand: 'target',
            grossMarginSummary: '毛利达到目标区间。',
            decision: 'conditional-release',
            decisionSummary: '报价与毛利有条件放行，需补齐付款条件说明。',
            approvalScenarioKey: 'pricing-margin-review',
            summaryPackageKey: 'pricing-margin-summary',
            summarySnapshotId: 'pricing-summary-1',
            projectionLevel: 'pricing-margin',
            exportPolicy: 'internal',
            readyForContracting: false,
            ownerRole: '商务负责人',
            blockerCount: 1,
            effectiveAt: '2026-04-24T08:20:00.000Z',
            createdAt: '2026-04-24T08:20:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:20:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        technicalCostPackage: {
            id: 'technical-package-1',
            projectId: 'project-1',
            version: 2,
            isCurrent: true,
            supersedesId: 'technical-package-0',
            status: 'effective',
            technicalFeasibilityDecision: 'conditional',
            technicalConclusionSummary: '范围可实施，但接口风险需要跟踪。',
            allowNextStage: true,
            currencyCode: 'CNY',
            totalEstimatedAmountExcludingTax: '150000.00',
            totalTaxCostAmount: '9000.00',
            totalEstimatedAmountIncludingTax: '159000.00',
            taxAssumptionSummary: '按 6% 增值税估算。',
            taxReviewStatus: 'reviewed',
            highestRiskLevel: 'R2',
            blockerCount: 0,
            effectiveAt: '2026-04-24T08:00:00.000Z',
            createdAt: '2026-04-24T08:00:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:00:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        bidCommercialProcess: {
            id: 'bid-process-1',
            projectId: 'project-1',
            version: 1,
            isCurrent: true,
            supersedesId: null,
            status: 'effective',
            bidMode: 'public-tender',
            currentStage: 'result-confirmed',
            decision: 'participate',
            resultStatus: 'won',
            processSummary: '公开招标已确认中标。',
            decisionSummary: '参与公开招标。',
            resultSummary: '客户已确认中标。',
            ownerRole: '销售负责人',
            blockerCount: 0,
            effectiveAt: '2026-04-24T08:10:00.000Z',
            createdAt: '2026-04-24T08:10:00.000Z',
            createdBy: 'user-1',
            updatedAt: '2026-04-24T08:10:00.000Z',
            updatedBy: 'user-1',
            rowVersion: 1
        },
        conditionItems: [
            {
                id: 'condition-1',
                reviewId: 'pricing-review-1',
                conditionKey: 'payment-term-confirmation',
                conditionType: 'payment',
                label: '付款条件确认',
                conditionSummary: '客户需确认首付款比例。',
                conditionStatus: 'open',
                requiredForContracting: true,
                responsibleRole: '商务负责人',
                dueAt: '2026-04-26T10:00:00.000Z',
                resolutionSummary: null,
                sortOrder: 1
            }
        ],
        blockingReasons: ['付款条件确认仍未关闭。'],
        nextStep: '先关闭付款条件确认，再进入签约就绪承接。',
        readyForContracting: false,
        ownerLabel: '商务负责人',
        allowedActions: ['view-pricing-margin-workspace'],
        generatedAt: '2026-04-24T08:25:00.000Z',
        ...overrides
    };
}

function createHistory(workspace: ProjectPricingMarginWorkspaceView): ProjectPricingMarginReviewSummary[] {
    const current = workspace.currentReview;
    if (!current) {
        return [];
    }

    return [
        current,
        {
            ...current,
            id: 'pricing-review-0',
            version: current.version - 1,
            isCurrent: false,
            supersedesId: null,
            status: 'superseded',
            quoteVersion: 'Q-2026-000',
            decisionSummary: '旧版报价评审已被替代。',
            createdBy: null,
            updatedBy: null,
            rowVersion: 1
        }
    ];
}

describe('ProjectPricingMarginWorkspace', () => {
    let fixture: ComponentFixture<ProjectPricingMarginWorkspace>;
    let workspaceSignal: ReturnType<typeof signal<ProjectPricingMarginWorkspaceView | null>>;
    let historySignal: ReturnType<typeof signal<ProjectPricingMarginReviewSummary[]>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let loadingHistorySignal: ReturnType<typeof signal<boolean>>;
    let savingSignal: ReturnType<typeof signal<boolean>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let historyErrorSignal: ReturnType<typeof signal<string | null>>;
    let loadPricingMarginWorkspace: jest.Mock;
    let loadPricingMarginReviewHistory: jest.Mock;
    let createPricingMarginReview: jest.Mock;

    async function setup(workspace: ProjectPricingMarginWorkspaceView | null = createWorkspace()) {
        const history = workspace ? createHistory(workspace) : [];
        workspaceSignal = signal<ProjectPricingMarginWorkspaceView | null>(workspace);
        historySignal = signal<ProjectPricingMarginReviewSummary[]>(history);
        loadingSignal = signal(false);
        loadingHistorySignal = signal(false);
        savingSignal = signal(false);
        errorSignal = signal<string | null>(null);
        historyErrorSignal = signal<string | null>(null);
        loadPricingMarginWorkspace = jest.fn().mockResolvedValue(workspace);
        loadPricingMarginReviewHistory = jest.fn().mockResolvedValue(history);
        createPricingMarginReview = jest.fn().mockResolvedValue(workspace?.currentReview ?? null);

        await TestBed.configureTestingModule({
            imports: [ProjectPricingMarginWorkspace],
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
                        pricingMarginWorkspace: workspaceSignal,
                        pricingMarginReviewHistory: historySignal,
                        loadingPricingMargin: loadingSignal,
                        loadingPricingMarginHistory: loadingHistorySignal,
                        savingPricingMargin: savingSignal,
                        pricingMarginError: errorSignal,
                        pricingMarginHistoryError: historyErrorSignal,
                        loadPricingMarginWorkspace,
                        loadPricingMarginReviewHistory,
                        createPricingMarginReview
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectPricingMarginWorkspace);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads and renders the pricing margin workspace from backend projection', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(loadPricingMarginWorkspace).toHaveBeenCalledWith('project-1');
        expect(loadPricingMarginReviewHistory).toHaveBeenCalledWith('project-1');
        expect(text).toContain('报价与毛利评审');
        expect(text).toContain('Q-2026-001');
        expect(text).toContain('Q-2026-000');
        expect(text).toContain('有条件放行');
        expect(text).toContain('毛利达到目标区间。');
        expect(text).toContain('250,000.00 CNY');
        expect(text).toContain('首付款 30%，验收后 70%。');
        expect(text).toContain('成本版本');
        expect(text).toContain('客户已确认中标。');
        expect(text).toContain('付款条件确认');
        expect(text).toContain('报价评审版本历史');
        expect(text).toContain('已被替代');
        expect(text).toContain('系统 / 未记录');
        expect(text).toContain('先关闭付款条件确认，再进入签约就绪承接。');
    });

    it('shows write entry from allowedActions and submits edit as a new current version', async () => {
        const workspace = createWorkspace({
            allowedActions: ['view-pricing-margin-workspace', 'create-pricing-margin-review']
        });
        await setup(workspace);

        const component = fixture.componentInstance;

        expect(fixture.nativeElement.textContent).toContain('编辑当前评审');

        component.openPricingDialog(workspace, 'edit');
        component.pricingForm.quoteVersion = 'Q-2026-EDIT';
        component.pricingForm.decisionSummary = '更新报价与毛利评审说明。';
        await component.submitPricingReview();

        expect(createPricingMarginReview).toHaveBeenCalledWith(
            'project-1',
            expect.objectContaining({
                technicalCostPackageId: 'technical-package-1',
                bidCommercialProcessId: 'bid-process-1',
                quoteVersion: 'Q-2026-EDIT',
                decisionSummary: '更新报价与毛利评审说明。',
                conditionItems: [
                    expect.objectContaining({
                        conditionKey: 'payment-term-confirmation',
                        label: '付款条件确认',
                        requiredForContracting: true
                    })
                ]
            })
        );
    });

    it('keeps write entry hidden when allowedActions does not include create action', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('当前只读');
        expect(text).toContain('没有报价 / 毛利评审写入权限');
        expect(text).not.toContain('编辑当前评审');
    });

    it('renders an empty business gap when current review is missing', async () => {
        await setup(
            createWorkspace({
                currentReview: null,
                conditionItems: [],
                blockingReasons: ['尚未形成报价与毛利评审。'],
                nextStep: '先形成报价、成本版本引用和毛利判断。'
            })
        );

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('报价与毛利评审尚未形成');
        expect(text).toContain('尚未形成报价与毛利评审。');
        expect(text).toContain('先形成报价、成本版本引用和毛利判断。');
    });

    it('renders the store error without fallback facts', async () => {
        await setup(null);
        errorSignal.set('你没有权限查看当前工作区。');
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('报价与毛利评审暂不可用');
        expect(text).toContain('你没有权限查看当前工作区。');
        expect(text).not.toContain('报价与毛利评审尚未形成');
    });
});
