import {
    RegisterCommissionPayoutRequestSchema,
    SubmitCommissionPayoutApprovalRequestSchema
} from '@poms/shared-contracts';

const SUMMARY_SNAPSHOT_ID = '11111111-1111-4111-8111-111111111111';
const GATE_REVIEW_RECORD_ID = '22222222-2222-4222-8222-222222222222';
const RETENTION_RECEIPT_RECORD_ID = '33333333-3333-4333-8333-333333333333';
const DEPARTURE_EXCEPTION_DECISION_ID = '44444444-4444-4444-8444-444444444444';

describe('commission payout request contracts', () => {
    it('requires retention evidence anchors when submitting a retention payout approval', () => {
        const result = SubmitCommissionPayoutApprovalRequestSchema.safeParse({
            payoutStage: 'retention'
        });

        expect(result.success).toBe(false);
    });

    it('accepts retention payout approval submission when all retention anchors are present', () => {
        const result = SubmitCommissionPayoutApprovalRequestSchema.safeParse({
            payoutStage: 'retention',
            summarySnapshotId: SUMMARY_SNAPSHOT_ID,
            gateReviewRecordId: GATE_REVIEW_RECORD_ID,
            retentionReceiptRecordId: RETENTION_RECEIPT_RECORD_ID,
            departureExceptionDecisionId: DEPARTURE_EXCEPTION_DECISION_ID
        });

        expect(result.success).toBe(true);
    });

    it('keeps non-retention payout approval submission compatible without retention anchors', () => {
        expect(SubmitCommissionPayoutApprovalRequestSchema.safeParse({ payoutStage: 'final' }).success).toBe(true);
    });

    it('requires payoutStage when submitting a non-retention payout approval', () => {
        const result = SubmitCommissionPayoutApprovalRequestSchema.safeParse({
            expectedVersion: 1
        });

        expect(result.success).toBe(false);
    });

    it('requires summarySnapshotId when registering a retention payout', () => {
        const result = RegisterCommissionPayoutRequestSchema.safeParse({
            payoutStage: 'retention',
            paidRecordAmount: '360.00'
        });

        expect(result.success).toBe(false);
    });

    it('accepts retention payout registration when summarySnapshotId is present', () => {
        const result = RegisterCommissionPayoutRequestSchema.safeParse({
            payoutStage: 'retention',
            paidRecordAmount: '360.00',
            summarySnapshotId: SUMMARY_SNAPSHOT_ID
        });

        expect(result.success).toBe(true);
    });

    it('keeps non-retention payout registration compatible without summarySnapshotId', () => {
        const result = RegisterCommissionPayoutRequestSchema.safeParse({
            payoutStage: 'first',
            paidRecordAmount: '360.00'
        });

        expect(result.success).toBe(true);
    });

    it('requires payoutStage when registering a non-retention payout', () => {
        const result = RegisterCommissionPayoutRequestSchema.safeParse({
            paidRecordAmount: '360.00'
        });

        expect(result.success).toBe(false);
    });
});
