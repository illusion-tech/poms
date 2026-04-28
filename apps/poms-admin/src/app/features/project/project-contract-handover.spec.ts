import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { type ContractHandoverSummaryView, type ProjectHandoverDetailView, ProjectWorkspaceStore } from '@poms/admin-data-access';
import { ProjectContractHandover } from './project-contract-handover';

function sensitiveProjection(value: string | null, mode: 'full' | 'masked' = value === null ? 'masked' : 'full') {
    return {
        fieldPackageKey: 'contract-finance',
        mode,
        value,
        displayText: value ?? '经营敏感字段已隐藏',
        reasonCode: value === null ? 'missing-sensitive-read-permission' : 'allowed'
    };
}

function createContractHandoverSummary(): ContractHandoverSummaryView {
    return {
        projectId: 'project-1',
        projectNo: 'PRJ-001',
        projectName: '合同承接项目',
        effectiveContractSetSummary: {
            activeContractCount: 1,
            activeContractIds: ['contract-1'],
            contractNos: ['HT-001'],
            totalSignedAmountProjection: sensitiveProjection('200000.00'),
            currencyCodes: ['CNY'],
            earliestSignedAt: '2026-04-20T08:00:00.000Z',
            latestSignedAt: '2026-04-20T08:00:00.000Z',
            contracts: [
                {
                    id: 'contract-1',
                    contractNo: 'HT-001',
                    status: 'active',
                    signedAmountProjection: sensitiveProjection('200000.00'),
                    currencyCode: 'CNY',
                    currentSnapshotId: 'snapshot-1',
                    signedAt: '2026-04-20T08:00:00.000Z'
                }
            ]
        },
        contractBaselineValidationSummary: {
            status: 'ready',
            readinessPackageId: 'readiness-1',
            sourceBaselineId: 'baseline-1',
            latestDiffResultId: 'diff-1',
            diffLevel: 'no-diff',
            reviewStatus: 'approved',
            packageStatus: 'ready',
            guardDecision: 'pass',
            initializedContractSnapshotId: 'snapshot-1',
            contractSnapshotInitializedAt: '2026-04-20T09:00:00.000Z',
            blockingReasonSummary: null,
            missingPrerequisiteCount: 0
        },
        currentHandoverBaselineSummary: {
            status: 'available',
            baselineSnapshotId: 'handover-baseline-1',
            sourceType: 'contract-readiness',
            sourceId: 'readiness-1',
            summary: '合同承接基线已稳定'
        },
        latestHandoverRebaselineSummary: {
            status: 'none',
            rebaselineRecordId: null,
            effectiveBaselineAfterId: null,
            handledAt: null,
            blockingStatus: 'none',
            impactItemCount: 0,
            impactSummary: null
        },
        receivablePlanInitSummary: {
            status: 'initialized',
            initializedReceivablePlanVersionId: 'receivable-1',
            receivablePlanInitializedAt: '2026-04-20T10:00:00.000Z',
            summary: '回款计划已初始化'
        },
        contractSummarySnapshotId: 'contract-summary-1',
        projectionLevel: 'handover-confirmation',
        exportPolicy: 'handover-controlled',
        allowedActions: ['generate-contract-handover-summary-snapshot'],
        blockingReasons: [],
        generatedAt: '2026-04-20T10:10:00.000Z'
    } as ContractHandoverSummaryView;
}

function createProjectHandoverDetail(summary: ContractHandoverSummaryView): ProjectHandoverDetailView {
    return {
        handoverId: 'handover-1',
        projectId: 'project-1',
        projectNo: 'PRJ-001',
        projectName: '合同承接项目',
        handoverStatus: 'draft',
        confirmedAt: null,
        confirmedBy: null,
        comment: null,
        rowVersion: 1,
        effectiveContractSetSummary: summary.effectiveContractSetSummary,
        contractSummarySnapshotId: 'contract-summary-1',
        currentHandoverBaselineSummary: summary.currentHandoverBaselineSummary,
        participantConfirmationSummary: {
            status: 'pending',
            confirmationRecordId: 'confirmation-1',
            requiredCount: 2,
            confirmedCount: 1,
            pendingCount: 1,
            closedCount: 0,
            submittedAt: '2026-04-20T10:00:00.000Z',
            confirmedAt: null,
            closedAt: null,
            rowVersion: 1,
            participants: []
        },
        receiptJudgmentModeSummary: {
            status: 'frozen',
            receiptJudgmentMode: 'confirmed-receipt',
            sourceType: 'project-handover',
            sourceId: 'handover-1',
            summary: '按移交确认冻结回款判断口径'
        },
        summaryPackageKey: 'contract-handover-summary',
        summarySnapshotId: 'handover-summary-1',
        projectionLevel: 'handover-confirmation',
        exportPolicy: 'handover-controlled',
        allowedActions: [],
        blockingReasons: ['仍有一名参与人待确认'],
        generatedAt: '2026-04-20T10:10:00.000Z'
    } as ProjectHandoverDetailView;
}

describe('ProjectContractHandover', () => {
    let fixture: ComponentFixture<ProjectContractHandover>;
    let contractHandoverSummarySignal: ReturnType<typeof signal<ContractHandoverSummaryView | null>>;
    let projectHandoverDetailSignal: ReturnType<typeof signal<ProjectHandoverDetailView | null>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let workspaceStoreMock: {
        contractHandoverSummary: ReturnType<typeof signal<ContractHandoverSummaryView | null>>;
        projectHandoverDetail: ReturnType<typeof signal<ProjectHandoverDetailView | null>>;
        loadingContractHandover: ReturnType<typeof signal<boolean>>;
        contractHandoverError: ReturnType<typeof signal<string | null>>;
        loadContractHandover: jest.Mock;
    };

    async function setup(summary: ContractHandoverSummaryView | null = createContractHandoverSummary(), error: string | null = null) {
        contractHandoverSummarySignal = signal<ContractHandoverSummaryView | null>(summary);
        projectHandoverDetailSignal = signal<ProjectHandoverDetailView | null>(summary ? createProjectHandoverDetail(summary) : null);
        loadingSignal = signal(false);
        errorSignal = signal(error);
        workspaceStoreMock = {
            contractHandoverSummary: contractHandoverSummarySignal,
            projectHandoverDetail: projectHandoverDetailSignal,
            loadingContractHandover: loadingSignal,
            contractHandoverError: errorSignal,
            loadContractHandover: jest.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [ProjectContractHandover],
            providers: [
                provideRouter([]),
                {
                    provide: ActivatedRoute,
                    useValue: {
                        snapshot: {
                            paramMap: convertToParamMap({})
                        },
                        parent: {
                            snapshot: {
                                paramMap: convertToParamMap({ id: 'project-1' })
                            }
                        }
                    }
                },
                {
                    provide: ProjectWorkspaceStore,
                    useValue: workspaceStoreMock
                }
            ]
        }).compileComponents();

        fixture = TestBed.createComponent(ProjectContractHandover);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads and renders contract handover facts from existing views', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(workspaceStoreMock.loadContractHandover).toHaveBeenCalledWith('project-1');
        expect(text).toContain('承接判断');
        expect(text).toContain('HT-001');
        expect(text).toContain('合同承接基线已稳定');
        expect(text).toContain('回款计划已初始化');
        expect(text).toContain('仍有一名参与人待确认');
    });

    it('renders contract set amount from backend projection', async () => {
        const summary = createContractHandoverSummary();
        summary.effectiveContractSetSummary.totalSignedAmountProjection = sensitiveProjection(null);
        summary.effectiveContractSetSummary.contracts[0].signedAmountProjection = sensitiveProjection(null);

        await setup(summary);

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('经营敏感字段已隐藏');
        expect(text).not.toContain('200,000.00 CNY');
    });

    it('shows user-readable error feedback when the handover view is unavailable', async () => {
        await setup(null, '当前项目还没有形成合同承接视图');

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('合同承接暂不可用');
        expect(text).toContain('当前项目还没有形成合同承接视图');
        expect(text).toContain('返回工作区总览');
    });
});
