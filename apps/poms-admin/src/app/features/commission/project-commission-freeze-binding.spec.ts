import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import {
    CommissionRoleAssignmentStatus,
    type CommissionRoleAssignmentDetailView,
    type CommissionRoleAssignmentSummary,
    ContractHandoverCurrentBaselineSourceType,
    ContractHandoverCurrentBaselineStatus,
    ProjectHandoverStatus,
    type ProjectHandoverDetailView,
    ProjectHandoverParticipantConfirmationStatus,
    ProjectHandoverReceiptJudgmentSourceType,
    ProjectHandoverReceiptJudgmentFreezeStatus,
    ProjectWorkspaceStore
} from '@poms/admin-data-access';
import { ProjectCommissionFreezeBinding } from './project-commission-freeze-binding';

function createRoleAssignmentSummary(status: CommissionRoleAssignmentSummary['status'] = CommissionRoleAssignmentStatus.Frozen): CommissionRoleAssignmentSummary {
    return {
        id: 'freeze-1',
        projectId: 'project-1',
        version: 3,
        rowVersion: 1,
        isCurrent: true,
        status,
        participantsJson: [
            {
                userId: 'user-1',
                displayName: 'Alice',
                roleType: 'sales-owner',
                weight: 0.6
            },
            {
                userId: 'user-2',
                displayName: 'Bob',
                roleType: 'delivery-owner',
                weight: 0.4
            }
        ],
        sourceHandoverId: 'handover-1',
        sourceHandoverRebaselineRecordId: null,
        contractSummarySnapshotId: 'contract-summary-1',
        handoverSummarySnapshotId: 'handover-summary-1',
        effectiveHandoverBaselineSnapshotId: 'handover-baseline-1',
        frozenAt: status === CommissionRoleAssignmentStatus.Frozen ? '2026-04-20T10:00:00.000Z' : null,
        createdAt: '2026-04-20T09:30:00.000Z',
        updatedAt: '2026-04-20T10:00:00.000Z'
    };
}

function createFreezeBindingDetail(summary: CommissionRoleAssignmentSummary = createRoleAssignmentSummary()): CommissionRoleAssignmentDetailView {
    return {
        roleAssignmentId: summary.id,
        projectId: summary.projectId,
        freezeVersionSummary: summary,
        sourceHandoverId: 'handover-1',
        contractSummarySnapshotId: 'contract-summary-1',
        handoverSummarySnapshotId: 'handover-summary-1',
        effectiveHandoverBaselineSummary: {
            status: ContractHandoverCurrentBaselineStatus.Available,
            baselineSnapshotId: 'handover-baseline-1',
            sourceType: ContractHandoverCurrentBaselineSourceType.ContractReadiness,
            sourceId: 'readiness-1',
            summary: '合同承接基线已稳定'
        },
        receiptJudgmentModeSummary: {
            status: ProjectHandoverReceiptJudgmentFreezeStatus.Frozen,
            receiptJudgmentMode: 'confirmed-receipt',
            sourceType: ProjectHandoverReceiptJudgmentSourceType.ProjectHandover,
            sourceId: 'handover-1',
            summary: '按移交确认冻结回款判断口径'
        },
        summaryPackageKey: 'commission-freeze-binding',
        summarySnapshotId: 'freeze-summary-1',
        projectionLevel: 'commission-freeze',
        exportPolicy: 'internal',
        allowedActions: ['freeze-commission-role-assignment'],
        generatedAt: '2026-04-20T10:05:00.000Z'
    };
}

function createProjectHandoverDetail(): ProjectHandoverDetailView {
    return {
        handoverId: 'handover-1',
        projectId: 'project-1',
        projectNo: 'PRJ-001',
        projectName: '冻结责任边界项目',
        handoverStatus: ProjectHandoverStatus.Confirmed,
        confirmedAt: '2026-04-20T10:00:00.000Z',
        confirmedBy: 'user-1',
        comment: null,
        rowVersion: 1,
        effectiveContractSetSummary: {
            activeContractCount: 1,
            activeContractIds: ['contract-1'],
            contractNos: ['HT-001'],
            totalSignedAmount: '200000.00',
            currencyCodes: ['CNY'],
            earliestSignedAt: '2026-04-20T08:00:00.000Z',
            latestSignedAt: '2026-04-20T08:00:00.000Z',
            contracts: []
        },
        contractSummarySnapshotId: 'contract-summary-1',
        currentHandoverBaselineSummary: {
            status: ContractHandoverCurrentBaselineStatus.Available,
            baselineSnapshotId: 'handover-baseline-1',
            sourceType: ContractHandoverCurrentBaselineSourceType.ContractReadiness,
            sourceId: 'readiness-1',
            summary: '合同承接基线已稳定'
        },
        participantConfirmationSummary: {
            status: ProjectHandoverParticipantConfirmationStatus.Confirmed,
            confirmationRecordId: 'confirmation-1',
            requiredCount: 2,
            confirmedCount: 2,
            pendingCount: 0,
            closedCount: 0,
            submittedAt: '2026-04-20T09:50:00.000Z',
            confirmedAt: '2026-04-20T10:00:00.000Z',
            closedAt: null,
            rowVersion: 1,
            participants: []
        },
        receiptJudgmentModeSummary: {
            status: ProjectHandoverReceiptJudgmentFreezeStatus.Frozen,
            receiptJudgmentMode: 'confirmed-receipt',
            sourceType: ProjectHandoverReceiptJudgmentSourceType.ProjectHandover,
            sourceId: 'handover-1',
            summary: '按移交确认冻结回款判断口径'
        },
        summaryPackageKey: 'project-handover-summary',
        summarySnapshotId: 'handover-summary-1',
        projectionLevel: 'handover-confirmation',
        exportPolicy: 'handover-controlled',
        allowedActions: [],
        blockingReasons: [],
        generatedAt: '2026-04-20T10:03:00.000Z'
    };
}

describe('ProjectCommissionFreezeBinding', () => {
    let fixture: ComponentFixture<ProjectCommissionFreezeBinding>;
    let summarySignal: ReturnType<typeof signal<CommissionRoleAssignmentSummary | null>>;
    let detailSignal: ReturnType<typeof signal<CommissionRoleAssignmentDetailView | null>>;
    let handoverSignal: ReturnType<typeof signal<ProjectHandoverDetailView | null>>;
    let loadingSignal: ReturnType<typeof signal<boolean>>;
    let errorSignal: ReturnType<typeof signal<string | null>>;
    let workspaceStoreMock: {
        commissionFreezeBindingSummary: ReturnType<typeof signal<CommissionRoleAssignmentSummary | null>>;
        commissionFreezeBindingDetail: ReturnType<typeof signal<CommissionRoleAssignmentDetailView | null>>;
        projectHandoverDetail: ReturnType<typeof signal<ProjectHandoverDetailView | null>>;
        loadingCommissionFreezeBinding: ReturnType<typeof signal<boolean>>;
        commissionFreezeBindingError: ReturnType<typeof signal<string | null>>;
        loadCommissionFreezeBinding: jest.Mock;
    };

    async function setup({
        summary = createRoleAssignmentSummary(),
        detail = createFreezeBindingDetail(summary),
        handover = createProjectHandoverDetail(),
        error = null
    }: {
        summary?: CommissionRoleAssignmentSummary | null;
        detail?: CommissionRoleAssignmentDetailView | null;
        handover?: ProjectHandoverDetailView | null;
        error?: string | null;
    } = {}) {
        summarySignal = signal(summary);
        detailSignal = signal(detail);
        handoverSignal = signal(handover);
        loadingSignal = signal(false);
        errorSignal = signal(error);
        workspaceStoreMock = {
            commissionFreezeBindingSummary: summarySignal,
            commissionFreezeBindingDetail: detailSignal,
            projectHandoverDetail: handoverSignal,
            loadingCommissionFreezeBinding: loadingSignal,
            commissionFreezeBindingError: errorSignal,
            loadCommissionFreezeBinding: jest.fn().mockResolvedValue(undefined)
        };

        await TestBed.configureTestingModule({
            imports: [ProjectCommissionFreezeBinding],
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

        fixture = TestBed.createComponent(ProjectCommissionFreezeBinding);
        fixture.detectChanges();
        await fixture.whenStable();
        fixture.detectChanges();
    }

    afterEach(() => {
        TestBed.resetTestingModule();
    });

    it('loads and renders freeze binding facts from existing views', async () => {
        await setup();

        const text = fixture.nativeElement.textContent;

        expect(workspaceStoreMock.loadCommissionFreezeBinding).toHaveBeenCalledWith('project-1');
        expect(text).toContain('冻结与责任边界判断');
        expect(text).toContain('当前冻结结果已形成正式责任边界');
        expect(text).toContain('Alice');
        expect(text).toContain('Bob');
        expect(text).toContain('按确认回款');
        expect(text).toContain('合同承接基线已稳定');
    });

    it('shows a readable gap state when current freeze version is still missing', async () => {
        await setup({
            summary: null,
            detail: null,
            handover: {
                ...createProjectHandoverDetail(),
                handoverStatus: ProjectHandoverStatus.Draft,
                confirmedAt: null,
                confirmedBy: null,
                participantConfirmationSummary: {
                    ...createProjectHandoverDetail().participantConfirmationSummary,
                    status: ProjectHandoverParticipantConfirmationStatus.Pending,
                    confirmedCount: 1,
                    pendingCount: 1,
                    confirmedAt: null
                },
                blockingReasons: ['仍有一名参与人待确认']
            }
        });

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('尚未形成当前冻结版本');
        expect(text).toContain('移交链已经可读，但当前项目还没有当前角色冻结版本');
        expect(text).toContain('仍有一名参与人待确认');
    });

    it('shows user-readable error feedback when the freeze binding view is unavailable', async () => {
        await setup({
            summary: null,
            detail: null,
            handover: null,
            error: '你没有权限查看当前工作区。'
        });

        const text = fixture.nativeElement.textContent;

        expect(text).toContain('冻结与责任边界暂不可用');
        expect(text).toContain('你没有权限查看当前工作区。');
        expect(text).toContain('返回提成阶段解释');
    });
});
