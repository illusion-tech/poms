import { TestBed } from '@angular/core/testing';
import type { BusinessAccountingFeedbackView, CommissionGateBindingHistoryView, OperatingSignalEvaluationView, SensitiveStringFieldProjection } from '@poms/shared-contracts';
import { ProjectOperatingReview, type OperatingGateReviewSubmission, type OperatingSignalReviewSubmission } from './project-operating-review';

const id = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const hash = 'a'.repeat(64);
const evidence = { kind: 'ExpenseRecord', id: id(30), rowVersion: 2, payloadHash: 'b'.repeat(64) };
function projected(value: string | null, full = true): SensitiveStringFieldProjection {
    return { fieldPackageKey: 'operating-finance', mode: full ? 'full' : 'masked', value: full ? value : null, displayText: full ? (value ?? '未知') : '经营敏感字段已隐藏', reasonCode: full ? 'allowed' : 'missing-sensitive-read-permission' };
}
function evaluation(): OperatingSignalEvaluationView {
    return {
        signalEvaluationId: id(1),
        projectId: id(2),
        rowVersion: 3,
        formulaBoundaryAction: 'prompt',
        signalLevel: 'unknown',
        riskLevel: 'unknown',
        systemSignalLevel: 'unknown',
        systemRiskLevel: 'unknown',
        taxImpactSummary: null,
        allocationStabilitySummary: null,
        unmappedCostSummary: null,
        reviewSummary: null,
        dataMaturityLevel: 'mature',
        costActionRecommendation: 'prompt',
        currentActionLevel: 'review',
        referencedBaselineVersion: '2',
        referencedSnapshotVersion: '5',
        reviewRequired: true,
        reviewState: 'pending',
        metricKnowledge: {
            confirmedReceipts: 'known',
            includedCost: 'known',
            taxPending: 'known',
            grossMargin: 'known',
            grossMarginRate: 'known',
            grossMarginRateReason: 'low-receipt-ratio',
            ratiosStable: false,
            grossMarginRateUse: 'observation-only'
        },
        evaluationContext: {
            schemaVersion: 1,
            projectId: id(2),
            snapshotId: id(3),
            snapshotRowVersion: 1,
            snapshotMode: 'realtime',
            maturityEvaluationId: id(4),
            signalEvaluationId: id(1),
            signalReviewRecordId: null,
            sourceHash: hash,
            evaluationHash: hash,
            policyVersion: 'r4h-operating-v1',
            policyHash: hash,
            producerVersion: 1,
            certification: 'verified',
            evaluationStatus: 'manual-review-required',
            rowVersion: 3
        },
        reasonItems: [
            {
                reasonId: hash,
                code: 'qualitative-materiality-unassessed',
                category: 'manual',
                ruleId: 'H08',
                projectAction: 'review',
                stageActions: { first: 'review', second: 'review', final: 'review', retention: 'review' },
                isPrimaryProjectReason: true,
                primaryStages: ['first', 'second', 'final', 'retention'],
                detailProjection: projected('低回款观察负毛利待质性判断'),
                evidenceProjection: projected(JSON.stringify([evidence]))
            }
        ],
        taxImpactSummaryProjection: projected('0.00'),
        allocationStabilitySummaryProjection: projected('已冻结'),
        unmappedCostSummaryProjection: projected('0'),
        reviewSummaryProjection: projected(null)
    };
}
function feedback(current: OperatingSignalEvaluationView): BusinessAccountingFeedbackView {
    return {
        projectId: current.projectId,
        signalEvaluationId: current.signalEvaluationId,
        signalLevel: current.signalLevel,
        currentActionLevel: current.currentActionLevel,
        dataMaturityLevel: current.dataMaturityLevel,
        costActionRecommendation: current.costActionRecommendation,
        referencedBaselineVersion: current.referencedBaselineVersion,
        referencedSnapshotVersion: current.referencedSnapshotVersion,
        evaluationContext: current.evaluationContext,
        reasonItems: current.reasonItems,
        reviewState: current.reviewState,
        metricKnowledge: current.metricKnowledge,
        allowedActions: ['reviewOperatingSignalEvaluation'],
        allocationStabilitySummary: null,
        unmappedCostSummary: null,
        taxImpactSummaryProjection: projected('0.00'),
        allocationStabilitySummaryProjection: projected('已冻结'),
        unmappedCostSummaryProjection: projected('0'),
        nextActionSummaryProjection: projected('须核实'),
        downstreamConsumerSummaryProjection: projected('四阶段独立'),
        stageBindings: (['first', 'second', 'final', 'retention'] satisfies CommissionGateBindingHistoryView['gateStageType'][]).map((stage, index) => ({
            bindingId: id(10 + index),
            rowVersion: 2,
            gateStageType: stage,
            systemBindingAction: 'review',
            bindingAction: 'review',
            gateReviewDecision: null,
            reviewState: 'pending',
            summaryPackageKey: 'project-operating-commission-gate-v1',
            summarySnapshotId: id(20 + index),
            projectionLevel: 'commission-gate-review',
            exportPolicy: 'internal-only',
            evaluationHash: hash,
            primaryReasonIds: [hash],
            reasonItems: current.reasonItems,
            nextActionSummaryProjection: projected('须核实')
        }))
    };
}
function gate(current: OperatingSignalEvaluationView): CommissionGateBindingHistoryView {
    return {
        bindingId: id(10),
        projectId: current.projectId,
        signalEvaluationId: current.signalEvaluationId,
        gateStageType: 'first',
        signalLevel: current.signalLevel,
        systemSignalLevel: current.systemSignalLevel,
        taxImpactSummary: null,
        taxImpactPendingAmount: null,
        blockingReasonSummary: null,
        nextActionSummary: null,
        dataMaturityLevel: current.dataMaturityLevel,
        costActionRecommendation: current.costActionRecommendation,
        currentActionLevel: current.currentActionLevel,
        baselineSelectionSource: 'original',
        referencedBaselineVersion: current.referencedBaselineVersion,
        referencedSnapshotVersion: current.referencedSnapshotVersion,
        bindingAction: 'review',
        systemBindingAction: 'review',
        gateReviewDecision: null,
        summaryPackageKey: 'project-operating-commission-gate-v1',
        summarySnapshotId: id(20),
        sourceSummarySnapshotId: null,
        projectionLevel: 'commission-gate-review',
        exportPolicy: 'internal-only',
        handledBy: null,
        handledAt: null,
        allowedActions: ['reviewCommissionGateBinding'],
        evaluationContext: current.evaluationContext,
        reasonItems: current.reasonItems,
        reviewState: 'pending',
        metricKnowledge: current.metricKnowledge,
        rowVersion: 2,
        taxImpactSummaryProjection: projected('0.00'),
        taxImpactPendingAmountProjection: projected('0.00'),
        blockingReasonSummaryProjection: projected(null),
        nextActionSummaryProjection: projected('须核实')
    };
}

describe('ProjectOperatingReview', () => {
    beforeEach(async () => {
        await TestBed.configureTestingModule({ imports: [ProjectOperatingReview] }).compileComponents();
    });

    it('keeps a missing evaluation unavailable even when action lists are empty', async () => {
        const fixture = TestBed.createComponent(ProjectOperatingReview);
        await fixture.whenStable();
        expect(fixture.componentInstance.coherent()).toBe(false);
        expect(fixture.componentInstance.canSubmitSignal()).toBe(false);
        expect(fixture.nativeElement.textContent).toContain('尚未就绪');
        expect(fixture.nativeElement.textContent).not.toContain('可发放');
    });

    it('posts only actual frozen evidence and reuses an identical request key for retry', async () => {
        const fixture = TestBed.createComponent(ProjectOperatingReview);
        const current = evaluation();
        fixture.componentRef.setInput('evaluation', current);
        fixture.componentRef.setInput('feedback', feedback(current));
        const component = fixture.componentInstance;
        component.signalModel.set({ evidenceKey: `ExpenseRecord:${evidence.id}:2:${evidence.payloadHash}`, riskDecision: 'attention', rationale: '已核实本次冻结依据' });
        await fixture.whenStable();
        const submissions: OperatingSignalReviewSubmission[] = [];
        component.signalReviewSubmitted.subscribe((submission) => submissions.push(submission));
        component.submitSignal(new Event('submit'));
        component.submitSignal(new Event('submit'));
        expect(submissions).toHaveLength(2);
        expect(submissions[0].request.requestKey).toBe(submissions[1].request.requestKey);
        expect(submissions[0].request.manualMaterialityReview?.evidenceRefs).toEqual([evidence]);
        expect(submissions[0].request.expectedVersion).toBe(3);
        expect(submissions[0].request.resolvedDataMaturityLevel).toBe('mature');
        expect(submissions[0].request.expectedSourceHash).toBe(hash);
    });

    it('refuses mixed evaluation hashes and protected evidence instead of inventing an empty choice', async () => {
        const fixture = TestBed.createComponent(ProjectOperatingReview);
        const current = evaluation();
        const mismatched = feedback(current);
        mismatched.evaluationContext = { ...mismatched.evaluationContext, evaluationHash: 'c'.repeat(64) };
        current.reasonItems[0].evidenceProjection = projected(null, false);
        fixture.componentRef.setInput('evaluation', current);
        fixture.componentRef.setInput('feedback', mismatched);
        await fixture.whenStable();
        expect(fixture.componentInstance.coherent()).toBe(false);
        expect(fixture.componentInstance.evidenceOptions()).toEqual([]);
        expect(fixture.componentInstance.canSubmitSignal()).toBe(false);
    });

    it('requires an explicit server review action even for a coherent evaluation', async () => {
        const fixture = TestBed.createComponent(ProjectOperatingReview);
        const current = evaluation();
        const readonlyFeedback = feedback(current);
        readonlyFeedback.allowedActions = [];
        fixture.componentRef.setInput('evaluation', current);
        fixture.componentRef.setInput('feedback', readonlyFeedback);
        await fixture.whenStable();
        expect(fixture.componentInstance.coherent()).toBe(true);
        expect(fixture.componentInstance.signalReviewAllowed()).toBe(false);
        expect(fixture.componentInstance.canSubmitSignal()).toBe(false);
    });

    it('keeps unknown gate review required and submits the exact returned summary', async () => {
        const fixture = TestBed.createComponent(ProjectOperatingReview);
        const current = evaluation();
        fixture.componentRef.setInput('evaluation', current);
        fixture.componentRef.setInput('feedback', feedback(current));
        fixture.componentRef.setInput('gate', gate(current));
        await fixture.whenStable();
        const component = fixture.componentInstance;
        const submissions: OperatingGateReviewSubmission[] = [];
        component.gateReviewSubmitted.subscribe((submission) => submissions.push(submission));
        component.submitGate(new Event('submit'));
        expect(submissions).toHaveLength(1);
        expect(submissions[0].request.gateReviewDecision).toBe('review-required');
        expect(submissions[0].request.bindingAction).toBe('review');
        expect(submissions[0].request.summarySnapshotId).toBe(id(20));
        expect(submissions[0].request.expectedVersion).toBe(2);
        expect(submissions[0].request.reviewAction).toBe('acknowledge');
    });
});
