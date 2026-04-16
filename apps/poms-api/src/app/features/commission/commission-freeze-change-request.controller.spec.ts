import { CommissionFreezeChangeRequestController } from './commission-freeze-change-request.controller';
import { CommissionService } from './commission.service';

const CHANGE_REQUEST_ID = '56000000-0000-4000-8000-000000000001';

describe('CommissionFreezeChangeRequestController', () => {
    let controller: CommissionFreezeChangeRequestController;
    let service: jest.Mocked<CommissionService>;

    beforeEach(() => {
        service = {
            getCommissionFreezeChangeRequest: jest.fn()
        } as unknown as jest.Mocked<CommissionService>;

        controller = new CommissionFreezeChangeRequestController(service);
    });

    it('delegates change request detail query to service', async () => {
        service.getCommissionFreezeChangeRequest.mockResolvedValue({
            changeRequestId: CHANGE_REQUEST_ID,
            disputeRecordId: '55000000-0000-4000-8000-000000000001',
            supersededFreezeVersionId: '51000000-0000-4000-8000-000000000001',
            replacementFreezeVersionId: '51000000-0000-4000-8000-000000000099',
            arbitrationDecision: 'replace-freeze-version',
            recalculationImpactMode: 'recalculate-and-adjust',
            affectedCalculationSummary: 'calc impacted',
            affectedPayoutSummary: 'payout impacted',
            riskFlagSummary: 'effective-calculation-present',
            summaryPackageKey: 'project-handover-confirmation',
            summarySnapshotId: '62000000-0000-4000-8000-000000000001',
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            status: 'effective',
            handledAt: '2026-03-25T10:20:00.000Z',
            generatedAt: '2026-03-25T10:20:00.000Z'
        });

        const result = await controller.getCommissionFreezeChangeRequest(CHANGE_REQUEST_ID);

        expect(service.getCommissionFreezeChangeRequest).toHaveBeenCalledWith(CHANGE_REQUEST_ID);
        expect(result.changeRequestId).toBe(CHANGE_REQUEST_ID);
    });
});
