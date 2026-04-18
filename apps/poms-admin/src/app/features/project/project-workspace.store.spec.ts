import { HttpErrorResponse } from '@angular/common/http';
import { TestBed } from '@angular/core/testing';
import {
    ProjectCostApi,
    ProjectWorkspaceStore,
    type BusinessAccountingFeedbackView,
    type ProjectBusinessOutcomeOverviewView,
    type ProjectUnifiedAccountingView,
    type ProjectVarianceRiskExplanationView
} from '@poms/admin-data-access';
import { of, throwError } from 'rxjs';

describe('ProjectWorkspaceStore', () => {
    let store: ProjectWorkspaceStore;
    let projectCostApiMock: {
        projectCostControllerGetProjectBusinessOutcomeOverview: jest.Mock;
        projectCostControllerGetProjectUnifiedAccounting: jest.Mock;
        projectCostControllerGetProjectVarianceRiskExplanation: jest.Mock;
        projectCostControllerGetBusinessAccountingFeedback: jest.Mock;
    };

    beforeEach(() => {
        projectCostApiMock = {
            projectCostControllerGetProjectBusinessOutcomeOverview: jest.fn(),
            projectCostControllerGetProjectUnifiedAccounting: jest.fn(),
            projectCostControllerGetProjectVarianceRiskExplanation: jest.fn(),
            projectCostControllerGetBusinessAccountingFeedback: jest.fn()
        };

        TestBed.configureTestingModule({
            providers: [
                ProjectWorkspaceStore,
                {
                    provide: ProjectCostApi,
                    useValue: projectCostApiMock
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

        projectCostApiMock.projectCostControllerGetProjectBusinessOutcomeOverview.mockReturnValue(of(overview));
        projectCostApiMock.projectCostControllerGetProjectUnifiedAccounting.mockReturnValue(of(accounting));
        projectCostApiMock.projectCostControllerGetProjectVarianceRiskExplanation.mockReturnValue(of(varianceRisk));
        projectCostApiMock.projectCostControllerGetBusinessAccountingFeedback.mockReturnValue(of(gateOverview));

        await store.loadOperatingOverview('project-1');
        await store.loadVarianceRisk('project-1');
        await store.loadCommissionGateOverview('project-1');

        store.clear();

        expect(store.businessOutcomeOverview()).toBeNull();
        expect(store.unifiedAccounting()).toBeNull();
        expect(store.varianceRiskExplanation()).toBeNull();
        expect(store.commissionGateOverview()).toBeNull();
        expect(store.operatingOverviewError()).toBeNull();
        expect(store.varianceRiskError()).toBeNull();
        expect(store.commissionGateError()).toBeNull();
    });
});
