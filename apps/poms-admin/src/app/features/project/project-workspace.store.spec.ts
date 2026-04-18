import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    CommissionApi,
    ProjectCostApi,
    ProjectWorkspaceStore,
    type BusinessAccountingFeedbackView,
    type CommissionFinalSettlementView,
    type CommissionRuleExplanationView,
    type ProjectBusinessOutcomeOverviewView,
    type ProjectUnifiedAccountingView,
    type ProjectVarianceRiskExplanationView
} from '@poms/admin-data-access';
import { of, throwError } from 'rxjs';

describe('ProjectWorkspaceStore', () => {
    let store: ProjectWorkspaceStore;
    const freezeVersionSummary = {
        id: 'freeze-1',
        projectId: 'project-1',
        version: 3,
        rowVersion: 1,
        isCurrent: true,
        status: 'frozen' as const,
        participantsJson: [
            {
                userId: 'user-1',
                displayName: 'Alice',
                roleType: 'project-owner',
                weight: 100
            }
        ],
        sourceHandoverId: null,
        sourceHandoverRebaselineRecordId: null,
        contractSummarySnapshotId: null,
        handoverSummarySnapshotId: null,
        effectiveHandoverBaselineSnapshotId: null,
        frozenAt: '2026-04-18T10:00:00.000Z',
        createdAt: '2026-04-18T10:00:00.000Z',
        updatedAt: '2026-04-18T10:00:00.000Z'
    };
    let projectCostApiMock: {
        projectCostControllerGetProjectBusinessOutcomeOverview: jest.Mock;
        projectCostControllerGetProjectUnifiedAccounting: jest.Mock;
        projectCostControllerGetProjectVarianceRiskExplanation: jest.Mock;
        projectCostControllerGetBusinessAccountingFeedback: jest.Mock;
    };
    let commissionApiMock: {
        commissionControllerGetCommissionFinalSettlement: jest.Mock;
        commissionControllerGetCommissionRuleExplanation: jest.Mock;
    };

    beforeEach(() => {
        projectCostApiMock = {
            projectCostControllerGetProjectBusinessOutcomeOverview: jest.fn(),
            projectCostControllerGetProjectUnifiedAccounting: jest.fn(),
            projectCostControllerGetProjectVarianceRiskExplanation: jest.fn(),
            projectCostControllerGetBusinessAccountingFeedback: jest.fn()
        };
        commissionApiMock = {
            commissionControllerGetCommissionFinalSettlement: jest.fn(),
            commissionControllerGetCommissionRuleExplanation: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectWorkspaceStore,
                {
                    provide: ProjectCostApi,
                    useValue: projectCostApiMock
                },
                {
                    provide: CommissionApi,
                    useValue: commissionApiMock
                }
            ]
        });

        store = TestBed.inject(ProjectWorkspaceStore);
    });

    it('loads operating overview and unified accounting into shared state', async () => {
        const overview: ProjectBusinessOutcomeOverviewView = {
            projectId: 'project-1',
            effectiveContractSetSummary: '200000.00',
            receivableConfirmedAmountSummary: '80000.00',
            includedCostTotalSummary: '120000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            grossMarginSummary: '毛利正常',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: 'Allocation basis shifted after restatement',
            unmappedCostSummary: 'Unmapped delivery cost detected',
            dataMaturityLevel: '数据不足',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };
        const accounting: ProjectUnifiedAccountingView = {
            projectId: 'project-1',
            snapshotId: 'snapshot-1',
            originalBaselineCostSummary: '100000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            includedCostTotalSummary: '120000.00',
            receivableConfirmedAmountSummary: '80000.00',
            taxImpactSummary: 'Tax package is pending closeout',
            taxImpactPendingAmount: '1200.00',
            allocationStabilitySummary: 'Allocation basis shifted after restatement',
            unmappedCostSummary: 'Unmapped delivery cost detected',
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };

        projectCostApiMock.projectCostControllerGetProjectBusinessOutcomeOverview.mockReturnValue(of(overview));
        projectCostApiMock.projectCostControllerGetProjectUnifiedAccounting.mockReturnValue(of(accounting));

        await expect(store.loadOperatingOverview('project-1')).resolves.toEqual({ overview, accounting });

        expect(store.businessOutcomeOverview()).toEqual(overview);
        expect(store.unifiedAccounting()).toEqual(accounting);
        expect(store.hasOperatingOverview()).toBe(true);
        expect(store.operatingOverviewError()).toBeNull();
    });

    it('maps 404 variance responses to a governance-friendly blocker message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        projectCostApiMock.projectCostControllerGetProjectVarianceRiskExplanation.mockReturnValue(
            throwError(() => notFound)
        );

        await expect(store.loadVarianceRisk('project-404')).rejects.toBe(notFound);

        expect(store.varianceRiskExplanation()).toBeNull();
        expect(store.hasVarianceRisk()).toBe(false);
        expect(store.varianceRiskError()).toBe('当前项目还没有形成可解释的偏差与风险结果，先完成经营信号评价闭环。');
    });

    it('maps 403 commission gate responses to a permission message', async () => {
        const forbidden = new HttpErrorResponse({
            status: 403,
            statusText: 'Forbidden'
        });

        projectCostApiMock.projectCostControllerGetBusinessAccountingFeedback.mockReturnValue(
            throwError(() => forbidden)
        );

        await expect(store.loadCommissionGateOverview('project-1')).rejects.toBe(forbidden);

        expect(store.commissionGateOverview()).toBeNull();
        expect(store.hasCommissionGateOverview()).toBe(false);
        expect(store.commissionGateError()).toBe('你没有权限查看当前工作区。');
    });

    it('loads commission final settlement into shared state', async () => {
        const finalSettlement: CommissionFinalSettlementView = {
            projectId: 'project-1',
            finalSettlementStatus: 'pending-final-settlement',
            nonRetentionSettlementStatus: 'settled',
            retentionSettlementStatus: 'waiting-retention',
            retentionRequirementSummary: '等待质保金到账',
            retentionReceiptSummary: null,
            departureExceptionSummary: null,
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummary: '税务影响待闭合',
            taxImpactPendingAmount: '1200.00',
            dataMaturityLevel: 'stable',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'BLOCK',
            referencedBaselineVersion: 'baseline-v3',
            referencedSnapshotVersion: 'snapshot-v5',
            summaryPackageKey: 'commission-final-settlement',
            summarySnapshotId: 'snapshot-package-1',
            projectionLevel: 'final-settlement',
            exportPolicy: 'controlled',
            allowedActions: []
        };

        commissionApiMock.commissionControllerGetCommissionFinalSettlement.mockReturnValue(of(finalSettlement));

        await expect(store.loadCommissionFinalSettlement('project-1')).resolves.toEqual(finalSettlement);

        expect(store.commissionFinalSettlement()).toEqual(finalSettlement);
        expect(store.hasCommissionFinalSettlement()).toBe(true);
        expect(store.commissionFinalSettlementError()).toBeNull();
    });

    it('maps 404 rule explanation responses to a governance-friendly blocker message', async () => {
        const notFound = new HttpErrorResponse({
            status: 404,
            statusText: 'Not Found',
            error: {
                message: 'not found'
            }
        });

        commissionApiMock.commissionControllerGetCommissionRuleExplanation.mockReturnValue(
            throwError(() => notFound)
        );

        await expect(store.loadCommissionRuleExplanation('project-404')).rejects.toBe(notFound);

        expect(store.commissionRuleExplanation()).toBeNull();
        expect(store.hasCommissionRuleExplanation()).toBe(false);
        expect(store.commissionRuleExplanationError()).toBe(
            '当前项目还没有形成可读取的规则解释快照，先完成最终结算收口链和规则解释快照生成。'
        );
    });

    it('clears all workspace state when clear is called', async () => {
        const overview: ProjectBusinessOutcomeOverviewView = {
            projectId: 'project-1',
            effectiveContractSetSummary: '200000.00',
            receivableConfirmedAmountSummary: '80000.00',
            includedCostTotalSummary: '120000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            grossMarginSummary: '毛利正常',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: []
        };
        const accounting: ProjectUnifiedAccountingView = {
            projectId: 'project-1',
            snapshotId: 'snapshot-1',
            originalBaselineCostSummary: '100000.00',
            currentEffectiveBaselineCostSummary: '105000.00',
            includedCostTotalSummary: '120000.00',
            receivableConfirmedAmountSummary: '80000.00',
            taxImpactSummary: 'Tax package is pending closeout',
            taxImpactPendingAmount: '1200.00',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            allowedActions: []
        };
        const varianceRisk: ProjectVarianceRiskExplanationView = {
            projectId: 'project-1',
            signalEvaluationId: 'signal-1',
            varianceSourceSummary: 'Gross margin deviates from baseline expectation',
            riskLevel: 'ATTENTION',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            recommendedActionSummary: 'Review accounting and payout input before release',
            allowedActions: ['reviewOperatingSignalEvaluation']
        };
        const gateOverview: BusinessAccountingFeedbackView = {
            projectId: 'project-1',
            signalLevel: 'ATTENTION',
            currentActionLevel: 'REVIEW',
            taxImpactSummary: 'Tax package is pending closeout',
            allocationStabilitySummary: null,
            unmappedCostSummary: null,
            dataMaturityLevel: '数据不足',
            costActionRecommendation: 'REVIEW',
            referencedBaselineVersion: 'baseline-v1',
            referencedSnapshotVersion: 'snapshot-v1',
            nextActionSummary: 'Review commission settlement package',
            downstreamConsumerSummary: 'Commission payout workflow',
            allowedActions: ['reviewCommissionGateBinding']
        };
        const finalSettlement: CommissionFinalSettlementView = {
            projectId: 'project-1',
            finalSettlementStatus: 'pending-final-settlement',
            nonRetentionSettlementStatus: 'settled',
            retentionSettlementStatus: 'waiting-retention',
            retentionRequirementSummary: '等待质保金到账',
            retentionReceiptSummary: null,
            departureExceptionSummary: null,
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummary: '税务影响待闭合',
            taxImpactPendingAmount: '1200.00',
            dataMaturityLevel: 'stable',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'BLOCK',
            referencedBaselineVersion: 'baseline-v3',
            referencedSnapshotVersion: 'snapshot-v5',
            summaryPackageKey: 'commission-final-settlement',
            summarySnapshotId: 'snapshot-package-1',
            projectionLevel: 'final-settlement',
            exportPolicy: 'controlled',
            allowedActions: []
        };
        const ruleExplanation: CommissionRuleExplanationView = {
            projectId: 'project-1',
            currentStageStatus: 'blocked-retention',
            gateDecisionCode: 'BLOCK_RETENTION',
            blockingReasonCategory: 'retention',
            blockingReasonCode: 'RETENTION_RECEIPT_PENDING',
            blockingReasonSummary: '质保金尚未到账',
            gateDecisionSummary: '当前暂不能进入质保金结算',
            nextActionSummary: '请财务确认质保金到账后再复核',
            freezeVersionSummary,
            baselineSelectionSource: 'original',
            taxImpactSummary: '税务影响待闭合',
            taxImpactPendingAmount: '1200.00',
            dataMaturityLevel: 'stable',
            costActionRecommendation: 'REVIEW',
            currentActionLevel: 'BLOCK',
            referencedBaselineVersion: 'baseline-v3',
            referencedSnapshotVersion: 'snapshot-v5',
            summaryPackageKey: 'commission-final-settlement',
            summarySnapshotId: 'snapshot-package-1',
            projectionLevel: 'final-settlement',
            exportPolicy: 'controlled',
            allowedActions: []
        };

        projectCostApiMock.projectCostControllerGetProjectBusinessOutcomeOverview.mockReturnValue(of(overview));
        projectCostApiMock.projectCostControllerGetProjectUnifiedAccounting.mockReturnValue(of(accounting));
        projectCostApiMock.projectCostControllerGetProjectVarianceRiskExplanation.mockReturnValue(of(varianceRisk));
        projectCostApiMock.projectCostControllerGetBusinessAccountingFeedback.mockReturnValue(of(gateOverview));
        commissionApiMock.commissionControllerGetCommissionFinalSettlement.mockReturnValue(of(finalSettlement));
        commissionApiMock.commissionControllerGetCommissionRuleExplanation.mockReturnValue(of(ruleExplanation));

        await store.loadOperatingOverview('project-1');
        await store.loadVarianceRisk('project-1');
        await store.loadCommissionGateOverview('project-1');
        await store.loadCommissionFinalSettlement('project-1');
        await store.loadCommissionRuleExplanation('project-1');

        store.clear();

        expect(store.businessOutcomeOverview()).toBeNull();
        expect(store.unifiedAccounting()).toBeNull();
        expect(store.varianceRiskExplanation()).toBeNull();
        expect(store.commissionGateOverview()).toBeNull();
        expect(store.commissionFinalSettlement()).toBeNull();
        expect(store.commissionRuleExplanation()).toBeNull();
        expect(store.operatingOverviewError()).toBeNull();
        expect(store.varianceRiskError()).toBeNull();
        expect(store.commissionGateError()).toBeNull();
        expect(store.commissionFinalSettlementError()).toBeNull();
        expect(store.commissionRuleExplanationError()).toBeNull();
    });
});
