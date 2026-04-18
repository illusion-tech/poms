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
        expect(beforeReview.dataMaturityLevel).toBe('数据不足');
        expect(beforeReview.costActionRecommendation).toBe('REVIEW');
        expect(beforeReview.currentActionLevel).toBe('REVIEW');
        expect(beforeReview.reviewSummary).toBeNull();

        const signalReviewResult = await reviewOperatingSignalEvaluation(client, fixture.signalEvaluationId, {
            reviewDecision: 'APPROVE',
            resolvedDataMaturityLevel: '成熟',
            costActionRecommendation: 'PROMPT',
            referencedBaselineVersion: fixture.baselinePackageId,
            referencedSnapshotVersion: fixture.operatingSnapshotId,
            reviewComment: 'Finance review completed with mature signal context',
            expectedVersion: 1
        });
        expect(signalReviewResult.resultStatus).toBe('success');
        expect(signalReviewResult.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(signalReviewResult.dataMaturityLevel).toBe('成熟');
        expect(signalReviewResult.costActionRecommendation).toBe('PROMPT');
        expect(signalReviewResult.currentActionLevel).toBe('REVIEW');

        const reviewedSignal = await getOperatingSignalEvaluation(client, fixture.signalEvaluationId);
        expect(reviewedSignal.dataMaturityLevel).toBe('成熟');
        expect(reviewedSignal.costActionRecommendation).toBe('PROMPT');
        expect(reviewedSignal.currentActionLevel).toBe('REVIEW');
        expect(reviewedSignal.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(reviewedSignal.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(reviewedSignal.reviewSummary).toContain('APPROVE');
        expect(reviewedSignal.reviewSummary).toContain('成熟');
        expect(reviewedSignal.reviewSummary).toContain('PROMPT');

        const businessOutcome = await getProjectBusinessOutcomeOverview(client, fixture.projectId);
        expect(businessOutcome.projectId).toBe(fixture.projectId);
        expect(businessOutcome.dataMaturityLevel).toBe('成熟');
        expect(businessOutcome.currentActionLevel).toBe('REVIEW');
        expect(businessOutcome.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(businessOutcome.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(businessOutcome.allowedActions).toEqual(['reviewOperatingSignalEvaluation']);

        const unifiedAccounting = await getProjectUnifiedAccounting(client, fixture.projectId);
        expect(unifiedAccounting.projectId).toBe(fixture.projectId);
        expect(unifiedAccounting.snapshotId).toBe(fixture.operatingSnapshotId);
        expect(unifiedAccounting.dataMaturityLevel).toBe('成熟');
        expect(unifiedAccounting.costActionRecommendation).toBe('PROMPT');
        expect(unifiedAccounting.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(unifiedAccounting.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(unifiedAccounting.allowedActions).toEqual(['reviewOperatingSignalEvaluation']);

        const varianceRisk = await getProjectVarianceRiskExplanation(client, fixture.projectId);
        expect(varianceRisk.projectId).toBe(fixture.projectId);
        expect(varianceRisk.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(varianceRisk.dataMaturityLevel).toBe('成熟');
        expect(varianceRisk.costActionRecommendation).toBe('PROMPT');
        expect(varianceRisk.currentActionLevel).toBe('REVIEW');
        expect(varianceRisk.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(varianceRisk.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(varianceRisk.allowedActions).toEqual(['reviewOperatingSignalEvaluation']);

        const feedbackBeforeGateReview = await getBusinessAccountingFeedback(client, fixture.projectId);
        expect(feedbackBeforeGateReview.projectId).toBe(fixture.projectId);
        expect(feedbackBeforeGateReview.dataMaturityLevel).toBe('成熟');
        expect(feedbackBeforeGateReview.costActionRecommendation).toBe('PROMPT');
        expect(feedbackBeforeGateReview.currentActionLevel).toBe('REVIEW');
        expect(feedbackBeforeGateReview.nextActionSummary).toBe('Review commission settlement package');
        expect(feedbackBeforeGateReview.downstreamConsumerSummary).toBe('Commission payout workflow');
        expect(feedbackBeforeGateReview.allowedActions).toEqual(['reviewCommissionGateBinding']);

        const gateReviewResult = await reviewCommissionGateBinding(client, fixture.gateBindingId, {
            bindingAction: 'BLOCK',
            gateReviewDecision: 'BLOCK',
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
        expect(gateReviewResult.businessStatusAfter).toBe('BLOCK');

        const gateBinding = await getCommissionGateBinding(client, fixture.gateBindingId);
        expect(gateBinding.bindingId).toBe(fixture.gateBindingId);
        expect(gateBinding.projectId).toBe(fixture.projectId);
        expect(gateBinding.signalEvaluationId).toBe(fixture.signalEvaluationId);
        expect(gateBinding.dataMaturityLevel).toBe('成熟');
        expect(gateBinding.costActionRecommendation).toBe('PROMPT');
        expect(gateBinding.currentActionLevel).toBe('REVIEW');
        expect(gateBinding.bindingAction).toBe('BLOCK');
        expect(gateBinding.gateReviewDecision).toBe('BLOCK');
        expect(gateBinding.blockingReasonSummary).toBe('tax_gap');
        expect(gateBinding.summaryPackageKey).toBe(fixture.summaryPackageKey);
        expect(gateBinding.summarySnapshotId).toBe(fixture.summarySnapshotId);
        expect(gateBinding.projectionLevel).toBe('L4');
        expect(gateBinding.exportPolicy).toBe('internal-only');
        expect(gateBinding.nextActionSummary).toBe('BLOCK: tax_gap');
        expect(gateBinding.handledBy).toBe(profile.id);
        expect(gateBinding.allowedActions).toEqual(['reviewCommissionGateBinding']);

        const feedbackAfterGateReview = await getBusinessAccountingFeedback(client, fixture.projectId);
        expect(feedbackAfterGateReview.currentActionLevel).toBe('REVIEW');
        expect(feedbackAfterGateReview.referencedBaselineVersion).toBe(fixture.baselinePackageId);
        expect(feedbackAfterGateReview.referencedSnapshotVersion).toBe(fixture.operatingSnapshotId);
        expect(feedbackAfterGateReview.nextActionSummary).toBe('BLOCK: tax_gap');
        expect(feedbackAfterGateReview.downstreamConsumerSummary).toBe('Commission payout workflow');
        expect(feedbackAfterGateReview.allowedActions).toEqual(['reviewCommissionGateBinding']);
    });

    it('rejects BLOCK gate reviews when blockingReasonCode is omitted', async () => {
        const { client } = await loginAsAdmin();
        const fixture = OPERATING_SIGNAL_E2E_FIXTURES.blockMissingReason;

        const response = await client.post(`/commission-gate-bindings/${fixture.gateBindingId}:review`, {
            bindingAction: 'BLOCK',
            gateReviewDecision: 'BLOCK',
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
