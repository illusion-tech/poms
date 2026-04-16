import { CommissionFreezeDisputeController } from './commission-freeze-dispute.controller';
import { CommissionService } from './commission.service';

const DISPUTE_ID = '55000000-0000-4000-8000-000000000001';
const CHANGE_REQUEST_ID = '56000000-0000-4000-8000-000000000001';
const FREEZE_VERSION_ID = '51000000-0000-4000-8000-000000000001';

describe('CommissionFreezeDisputeController', () => {
    let controller: CommissionFreezeDisputeController;
    let service: jest.Mocked<CommissionService>;

    beforeEach(() => {
        service = {
            submitCommissionFreezeDispute: jest.fn(),
            getCommissionFreezeDispute: jest.fn(),
            arbitrateCommissionFreezeDispute: jest.fn()
        } as unknown as jest.Mocked<CommissionService>;

        controller = new CommissionFreezeDisputeController(service);
    });

    it('delegates dispute submit to service', async () => {
        service.submitCommissionFreezeDispute.mockResolvedValue({
            targetId: DISPUTE_ID,
            disputeRecordId: DISPUTE_ID,
            freezeVersionId: FREEZE_VERSION_ID,
            summarySnapshotId: '62000000-0000-4000-8000-000000000001',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            businessStatusAfter: 'dispute-submitted'
        });

        const body = {
            freezeVersionId: FREEZE_VERSION_ID,
            disputeReason: '角色权重需要调整',
            affectedAssignmentIds: ['00000000-0000-4000-8000-000000000010'],
            recalculationImpactMode: 'recalculate-and-adjust',
            expectedVersion: 1
        };

        const result = await controller.submitCommissionFreezeDispute(
            { user: { sub: 'user-1' } } as never,
            body as never
        );

        expect(service.submitCommissionFreezeDispute).toHaveBeenCalledWith('user-1', body);
        expect(result.disputeRecordId).toBe(DISPUTE_ID);
    });

    it('delegates dispute detail query to service', async () => {
        service.getCommissionFreezeDispute.mockResolvedValue({
            disputeRecordId: DISPUTE_ID,
            projectId: '00000000-0000-4000-8000-000000000001',
            freezeVersionId: FREEZE_VERSION_ID,
            rowVersion: 1,
            disputeReason: '角色权重需要调整',
            affectedAssignmentSummary: '张三(sales-owner, weight=1)',
            arbitrationStatus: 'pending',
            recalculationImpactMode: 'recalculate-and-adjust',
            impactAssessmentSummary: null,
            summaryPackageKey: 'project-handover-confirmation',
            summarySnapshotId: '62000000-0000-4000-8000-000000000001',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            status: 'submitted',
            handledAt: '2026-03-25T10:10:00.000Z',
            allowedActions: ['arbitrate-commission-freeze-dispute'],
            generatedAt: '2026-03-25T10:10:00.000Z'
        });

        const result = await controller.getCommissionFreezeDispute(DISPUTE_ID);

        expect(service.getCommissionFreezeDispute).toHaveBeenCalledWith(DISPUTE_ID);
        expect(result.disputeRecordId).toBe(DISPUTE_ID);
    });

    it('delegates dispute arbitration to service', async () => {
        service.arbitrateCommissionFreezeDispute.mockResolvedValue({
            targetId: DISPUTE_ID,
            disputeRecordId: DISPUTE_ID,
            changeRequestId: CHANGE_REQUEST_ID,
            supersededFreezeVersionId: FREEZE_VERSION_ID,
            replacementFreezeVersionId: '51000000-0000-4000-8000-000000000099',
            affectedCalculationSummary: 'calc impacted',
            affectedPayoutSummary: 'payout impacted',
            riskFlagSummary: 'effective-calculation-present',
            resultStatus: 'replacement-created'
        });

        const body = {
            arbitrationDecision: 'replace-freeze-version',
            replacementAssignmentPayload: {
                participants: [
                    {
                        userId: '00000000-0000-4000-8000-000000000010',
                        displayName: '张三',
                        roleType: 'sales-owner',
                        weight: 1
                    }
                ]
            },
            recalculationImpactMode: 'recalculate-and-adjust',
            expectedVersion: 1
        };

        const result = await controller.arbitrateCommissionFreezeDispute(
            DISPUTE_ID,
            { user: { sub: 'user-1' } } as never,
            body as never
        );

        expect(service.arbitrateCommissionFreezeDispute).toHaveBeenCalledWith(DISPUTE_ID, 'user-1', body);
        expect(result.changeRequestId).toBe(CHANGE_REQUEST_ID);
    });
});
