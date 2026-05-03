import { loginAsAdmin } from '../support/api-client';
import { expectErrorStatus } from '../support/http';
import {
    getBusinessAccountingFeedback,
    getCommissionGateBinding,
    getOperatingSignalEvaluation,
    getProjectBusinessOutcomeOverview,
    getProjectUnifiedAccounting,
    getProjectVarianceRiskExplanation,
    reviewCommissionGateBinding,
    reviewOperatingSignalEvaluation
} from '../support/operating-signal-api';
import { OPERATING_SIGNAL_E2E_FIXTURES } from '../support/operating-signal-seed-fixtures';

jest.setTimeout(120_000);

describe('poms-api operating signal workflow e2e', () => {
    it('runs the EX-13B operating signal and commission gate review flow through public routes', async () => {
        const { client, profile } = await loginAsAdmin();
        const fixture = OPERATING_SIGNAL_E2E_FIXTURES.main;

        const beforeReview = await getOperatingSignalEvaluation(client, fixture.signalEvaluationId);
        expect(beforeReview.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(beforeReview.projectId).toBe(fixture.projectId);
        expect(beforeReview.dataMaturityLevel).toBe('insufficient');
        expect(beforeReview.costActionRecommendation).toBe('review');
        expect(beforeReview.currentActionLevel).toBe('review');
        expect(beforeReview.reviewSummary).toBeNull();

        const signalReviewResult = await reviewOperatingSignalEvaluation(client, fixture.signalEvaluationId, {
            reviewDecision: 'approve',
            resolvedDataMaturityLevel: 'mature',
            costActionRecommendation: 'prompt',
            referencedBaselineVersion: fixture.baselinePackageId,
            referencedSnapshotVersion: fixture.operatingSnapshotId,
            reviewComment: 'Finance review completed with mature signal context',
            expectedVersion: 1
        });
        expect(signalReviewResult.resultStatus).toBe('success');
        expect(signalReviewResult.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(signalReviewResult.dataMaturityLevel).toBe('mature');
        expect(signalReviewResult.costActionRecommendation).toBe('prompt');
        expect(signalReviewResult.currentActionLevel).toBe('review');

        const reviewedSignal = await getOperatingSignalEvaluation(client, fixture.signalEvaluationId);
        expect(reviewedSignal.dataMaturityLevel).toBe('mature');
        expect(reviewedSignal.costActionRecommendation).toBe('prompt');
        expect(reviewedSignal.currentActionLevel).toBe('review');
        expect(reviewedSignal.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(reviewedSignal.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(reviewedSignal.reviewSummary).toContain('approve');
        expect(reviewedSignal.reviewSummary).toContain('mature');
        expect(reviewedSignal.reviewSummary).toContain('prompt');

        const businessOutcome = await getProjectBusinessOutcomeOverview(client, fixture.projectId);
        expect(businessOutcome.projectId).toBe(fixture.projectId);
        expect(businessOutcome.dataMaturityLevel).toBe('mature');
        expect(businessOutcome.currentActionLevel).toBe('review');
        expect(businessOutcome.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(businessOutcome.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(businessOutcome.allowedActions).toEqual(['reviewOperatingSignalEvaluation']);

        const unifiedAccounting = await getProjectUnifiedAccounting(client, fixture.projectId);
        expect(unifiedAccounting.projectId).toBe(fixture.projectId);
        expect(unifiedAccounting.snapshotId).toBe(fixture.operatingSnapshotId);
        expect(unifiedAccounting.dataMaturityLevel).toBe('mature');
        expect(unifiedAccounting.costActionRecommendation).toBe('prompt');
        expect(unifiedAccounting.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(unifiedAccounting.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(unifiedAccounting.allowedActions).toEqual(['reviewOperatingSignalEvaluation']);

        const varianceRisk = await getProjectVarianceRiskExplanation(client, fixture.projectId);
        expect(varianceRisk.projectId).toBe(fixture.projectId);
        expect(varianceRisk.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(varianceRisk.dataMaturityLevel).toBe('mature');
        expect(varianceRisk.costActionRecommendation).toBe('prompt');
        expect(varianceRisk.currentActionLevel).toBe('review');
        expect(varianceRisk.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(varianceRisk.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(varianceRisk.allowedActions).toEqual(['reviewOperatingSignalEvaluation']);

        const feedbackBeforeGateReview = await getBusinessAccountingFeedback(client, fixture.projectId);
        expect(feedbackBeforeGateReview.projectId).toBe(fixture.projectId);
        expect(feedbackBeforeGateReview.dataMaturityLevel).toBe('mature');
        expect(feedbackBeforeGateReview.costActionRecommendation).toBe('prompt');
        expect(feedbackBeforeGateReview.currentActionLevel).toBe('review');
        expect(feedbackBeforeGateReview.nextActionSummaryProjection.value).toBe('Review commission settlement package');
        expect(feedbackBeforeGateReview.downstreamConsumerSummaryProjection.value).toBe('Commission payout workflow');
        expect(feedbackBeforeGateReview.allowedActions).toEqual(['reviewCommissionGateBinding']);

        const gateReviewResult = await reviewCommissionGateBinding(client, fixture.gateBindingId, {
            bindingAction: 'block',
            gateReviewDecision: 'block',
            blockingReasonCode: 'tax_gap',
            baselineSelectionSource: 'original',
            summaryPackageKey: fixture.summaryPackageKey,
            summarySnapshotId: fixture.summarySnapshotId,
            referencedBaselineVersion: fixture.baselinePackageId,
            referencedSnapshotVersion: fixture.operatingSnapshotId,
            expectedVersion: 1
        });
        expect(gateReviewResult.bindingResultId).toBe(fixture.gateBindingId);
        expect(gateReviewResult.summaryPackageKey).toBe(fixture.summaryPackageKey);
        expect(gateReviewResult.summarySnapshotId).toBe(fixture.summarySnapshotId);
        expect(gateReviewResult.businessStatusAfter).toBe('block');

        const gateBinding = await getCommissionGateBinding(client, fixture.gateBindingId);
        expect(gateBinding.bindingId).toBe(fixture.gateBindingId);
        expect(gateBinding.projectId).toBe(fixture.projectId);
        expect(gateBinding.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(gateBinding.dataMaturityLevel).toBe('mature');
        expect(gateBinding.costActionRecommendation).toBe('prompt');
        expect(gateBinding.currentActionLevel).toBe('review');
        expect(gateBinding.bindingAction).toBe('block');
        expect(gateBinding.gateReviewDecision).toBe('block');
        expect(gateBinding.blockingReasonSummary).toBe('tax_gap');
        expect(gateBinding.summaryPackageKey).toBe(fixture.summaryPackageKey);
        expect(gateBinding.summarySnapshotId).toBe(fixture.summarySnapshotId);
        expect(gateBinding.projectionLevel).toBe('L4');
        expect(gateBinding.exportPolicy).toBe('internal-only');
        expect(gateBinding.nextActionSummary).toBe('block: tax_gap');
        expect(gateBinding.handledBy).toBe(profile.id);
        expect(gateBinding.allowedActions).toEqual(['reviewCommissionGateBinding']);

        const feedbackAfterGateReview = await getBusinessAccountingFeedback(client, fixture.projectId);
        expect(feedbackAfterGateReview.currentActionLevel).toBe('review');
        expect(feedbackAfterGateReview.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(feedbackAfterGateReview.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(feedbackAfterGateReview.nextActionSummaryProjection.value).toBe('block: tax_gap');
        expect(feedbackAfterGateReview.downstreamConsumerSummaryProjection.value).toBe('Commission payout workflow');
        expect(feedbackAfterGateReview.allowedActions).toEqual(['reviewCommissionGateBinding']);
    });

    it('rejects BLOCK gate reviews when blockingReasonCode is omitted', async () => {
        const { client } = await loginAsAdmin();
        const fixture = OPERATING_SIGNAL_E2E_FIXTURES.blockMissingReason;

        const response = await client.post(`/commission-gate-bindings/${fixture.gateBindingId}:review`, {
            bindingAction: 'block',
            gateReviewDecision: 'block',
            baselineSelectionSource: 'original',
            summaryPackageKey: fixture.summaryPackageKey,
            summarySnapshotId: fixture.summarySnapshotId,
            referencedBaselineVersion: fixture.baselinePackageId,
            referencedSnapshotVersion: fixture.operatingSnapshotId,
            expectedVersion: 1
        });

        expectErrorStatus(response, 422, 'blockingReasonCode');
    });
});
