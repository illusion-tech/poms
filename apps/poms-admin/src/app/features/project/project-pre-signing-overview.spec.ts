import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { type ContractReadinessDetail, ProjectStage, ProjectStatus, ProjectWorkspaceStore, type ProjectWorkspaceGuidanceView } from '@poms/admin-data-access';
import { ProjectPreSigningOverview } from './project-pre-signing-overview';

function createGuidance(overrides: Partial<ProjectWorkspaceGuidanceView> = {}): ProjectWorkspaceGuidanceView {
    return {
        projectId: 'project-1',
        currentStage: ProjectStage.CommercialClosure,
        status: ProjectStatus.Blocked,
        currentStageLabel: '商务收口',
        statusLabel: '阻塞中',
        headline: '把报价、投标和成交条件统一到一个口径',
        currentFocus: '统一报价、投标和成交条件判断。',
        currentGap: '报价审批结论尚未放行。',
        nextStep: '先完成毛利评审，再进入签约就绪。',
        ownerLabel: '销售负责人 / 商务负责人',
        blockingReasons: ['报价评审未放行', '付款条件需要复核'],
        basisSummary: {
            summarySnapshotId: 'summary-1',
            projectionLevel: 'workspace-guidance',
            exportPolicy: 'internal',
            generatedAt: '2026-04-20T08:00:00.000Z'
        },
        recommendedEntries: [
            {
                key: 'pre-signing-workspace',
                label: '签约前主线',
                description: '查看签约前当前阶段、阻断原因、下一步和责任归口。',
                route: '/projects/project-1/workspace/pre-signing',
                enabled: true,
                disabledReason: null,
                actionKey: 'view-project-workspace'
            }
        ],
        generatedAt: '2026-04-20T08:00:00.000Z',
        ...overrides
    };
}

function createReadiness(overrides: Partial<ContractReadinessDetail> = {}): ContractReadinessDetail {
    return {
        id: 'readiness-1',
        projectId: 'project-1',
        sourceBaselineId: 'source-baseline-1',
        commercialReleaseBaselineId: 'commercial-baseline-1',
        latestDiffResultId: 'diff-1',
        diffLevel: 'prompt',
        reviewStatus: 'pending-review',
        packageStatus: 'conditional',
        guardDecision: 'review-required',
        currentEffectiveDecisionSummary: '合同前置事实基本齐备，仍需复核付款条件。',
        blockingReasonSummary: '付款条件调整需要复核。',
        missingPrerequisiteCount: 1,
        initializedContractSnapshotId: null,
        initializedReceivablePlanVersionId: null,
        contractSnapshotInitializedAt: null,
        receivablePlanInitializedAt: null,
        isCurrent: true,
        rowVersion: 2,
        createdAt: '2026-04-20T08:00:00.000Z',
        createdBy: 'user-1',
        updatedAt: '2026-04-20T09:00:00.000Z',
        updatedBy: 'user-1',
        allowedActions: ['review-commercial-release-baseline-diff'],
        items: [
            {
                id: 'item-1',
                itemType: 'blocking-reason',
                itemKey: 'payment-term-review',
                label: '付款条件复核',
                summary: '合同付款条件相对商业放行基线发生调整。',
                status: 'blocked',
                responsibleRole: '财务负责人',
                navigationHint: '复核商业放行差异',
                sortOrder: 10
            }
        ],
        ...overrides
    } as ContractReadinessDetail;
}

describe('ProjectPreSigningOverview', () => {
    let fixture: ComponentFixture<ProjectPreSigningOverview>;
    let guidanceSignal: ReturnType<typeof signal<ProjectWorkspaceGuidanceView | null>>;
    let readinessSignal: ReturnType<typeof signal<ContractReadinessDetail | null>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let loadPreSigningOverview: jest.Mock;

    async function setup(readiness: ContractReadinessDetail | null = createReadiness()) {
        guidanceSignal = signal<ProjectWorkspaceGuidanceView | null>(createGuidance());
        readinessSignal = signal<ContractReadinessDetail | null>(readiness);
        loadingSignal = signal(false);
        errorSignal = signal<string | null>(null);
        loadPreSigningOverview = jest.fn().mockResolvedValue(readiness);

        await TestBed.configureTestingModule({
            imports: [ProjectPreSigningOverview],
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
                        guidance: guidanceSignal,
                        contractReadiness: readinessSignal,
                        loadingPreSigning: loadingSignal,
                        preSigningError: errorSignal,
                        loadPreSigningOverview
                    }
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectPreSigningOverview);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    beforeEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads readiness and renders the pre-signing continuous context', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(loadPreSigningOverview).toHaveBeenCalledWith('project-1');
        expect(text).toContain('签约前主线');
        expect(text).toContain('商务收口');
        expect(text).toContain('报价审批结论尚未放行。');
        expect(text).toContain('先完成毛利评审，再进入签约就绪。');
        expect(text).toContain('销售负责人 / 商务负责人');
        expect(text).toContain('报价评审未放行');
        expect(text).toContain('技术与成本');
        expect(text).toContain('报价与毛利评审');
        expect(text).toContain('投标形态、材料责任、竞标结果和商务路径。');
        expect(text).toContain('报价结论、毛利判断、审批摘要和放行条件。');
        expect(text).toContain('有条件就绪');
        expect(text).toContain('付款条件复核');
        expect(text).toContain('财务负责人');
    });

    it('shows a business gap when the current readiness package is missing', async () => {
        await setup(null);

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('尚未形成承接包');
        expect(text).toContain('签约就绪承接包尚未形成');
        expect(text).toContain('先补齐签约前评估、范围、报价和合同前置事实');
    });

    it('renders the store error without inventing fallback data', async () => {
        await setup(null);
        errorSignal.set('你没有权限查看当前工作区。');
        fixture.detectChanges();

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('签约前主线暂不可用');
        expect(text).toContain('你没有权限查看当前工作区。');
        expect(text).not.toContain('签约就绪承接包尚未形成');
    });
});
