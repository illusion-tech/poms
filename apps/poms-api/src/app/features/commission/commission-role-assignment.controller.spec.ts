import { CommissionRoleAssignmentController } from './commission-role-assignment.controller';
import { CommissionService } from './commission.service';

const ASSIGNMENT_ID = '51000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const HANDOVER_ID = '61000000-0000-4000-8000-000000000001';
const SUMMARY_SNAPSHOT_ID = '62000000-0000-4000-8000-000000000001';
const CONTRACT_SUMMARY_SNAPSHOT_ID = '62000000-0000-4000-8000-000000000002';
const BASELINE_SNAPSHOT_ID = '63000000-0000-4000-8000-000000000001';

describe('CommissionRoleAssignmentController', () => {
    let controller: CommissionRoleAssignmentController;
    let service: jest.Mocked<CommissionService>;

    beforeEach(() => {
        service = {
            getRoleAssignmentDetail: jest.fn(),
            freezeCommissionRoleAssignment: jest.fn()
        } as unknown as jest.Mocked<CommissionService>;

        controller = new CommissionRoleAssignmentController(service);
    });

    it('delegates detail query to service', async () => {
        service.getRoleAssignmentDetail.mockResolvedValue({
            roleAssignmentId: ASSIGNMENT_ID,
            projectId: PROJECT_ID,
            freezeVersionSummary: {
                id: ASSIGNMENT_ID,
                projectId: PROJECT_ID,
                version: 1,
                rowVersion: 1,
                isCurrent: true,
                status: 'draft',
                participantsJson: [],
                sourceHandoverId: null,
                sourceHandoverRebaselineRecordId: null,
                contractSummarySnapshotId: null,
                handoverSummarySnapshotId: null,
                effectiveHandoverBaselineSnapshotId: null,
                frozenAt: null,
                createdAt: '2026-03-25T10:00:00.000Z',
                updatedAt: '2026-03-25T10:00:00.000Z'
            },
            sourceHandoverId: null,
            contractSummarySnapshotId: null,
            handoverSummarySnapshotId: null,
            effectiveHandoverBaselineSummary: {
                status: 'missing',
                baselineSnapshotId: null,
                sourceType: 'none',
                sourceId: null,
                summary: 'Effective handover baseline snapshot is not frozen yet'
            },
            receiptJudgmentModeSummary: {
                status: 'not-frozen',
                receiptJudgmentMode: null,
                sourceType: 'none',
                sourceId: null,
                summary: 'Receipt judgment mode is not frozen yet'
            },
            summaryPackageKey: null,
            summarySnapshotId: null,
            projectionLevel: null,
            exportPolicy: null,
            allowedActions: ['freeze-commission-role-assignment'],
            generatedAt: '2026-03-25T10:00:00.000Z'
        });

        const result = await controller.getRoleAssignmentDetail(ASSIGNMENT_ID);

        expect(service.getRoleAssignmentDetail).toHaveBeenCalledWith(ASSIGNMENT_ID);
        expect(result.roleAssignmentId).toBe(ASSIGNMENT_ID);
    });

    it('delegates freeze command to service', async () => {
        service.freezeCommissionRoleAssignment.mockResolvedValue({
            targetId: ASSIGNMENT_ID,
            businessStatusAfter: 'frozen',
            newVersionId: ASSIGNMENT_ID,
            sourceHandoverId: HANDOVER_ID,
            contractSummarySnapshotId: CONTRACT_SUMMARY_SNAPSHOT_ID,
            handoverSummarySnapshotId: SUMMARY_SNAPSHOT_ID,
            effectiveHandoverBaselineSnapshotId: BASELINE_SNAPSHOT_ID,
            summarySnapshotId: SUMMARY_SNAPSHOT_ID,
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled'
        });

        const body = {
            sourceHandoverId: HANDOVER_ID,
            handoverSummarySnapshotId: SUMMARY_SNAPSHOT_ID,
            expectedVersion: 1
        };
        const result = await controller.freezeRoleAssignment(ASSIGNMENT_ID, { user: { sub: 'user-1' } } as never, body as never);

        expect(service.freezeCommissionRoleAssignment).toHaveBeenCalledWith(ASSIGNMENT_ID, 'user-1', body);
        expect(result.businessStatusAfter).toBe('frozen');
    });
});
