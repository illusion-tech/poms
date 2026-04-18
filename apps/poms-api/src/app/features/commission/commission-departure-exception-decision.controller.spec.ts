import { CommissionDepartureExceptionDecisionController } from './commission-departure-exception-decision.controller';
import { CommissionService } from './commission.service';

const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const ASSIGNMENT_ID = '51000000-0000-4000-8000-000000000001';
const DECISION_ID = '57500000-0000-4000-8000-000000000001';
const SUMMARY_SNAPSHOT_ID = '62000000-0000-4000-8000-000000000001';

describe('CommissionDepartureExceptionDecisionController', () => {
    let controller: CommissionDepartureExceptionDecisionController;
    let service: jest.Mocked<CommissionService>;

    beforeEach(() => {
        service = {
            createDepartureExceptionDecision: jest.fn()
        } as unknown as jest.Mocked<CommissionService>;

        controller = new CommissionDepartureExceptionDecisionController(service);
    });

    it('delegates departure exception decision creation to service', async () => {
        const body = {
            freezeVersionId: ASSIGNMENT_ID,
            departureScenarioCode: 'employee-left-company',
            decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
            decisionSummary: '原销售已离职，后续质保金结算前需补承接确认',
            confirmationRequirementSummary: '请销售负责人确认责任承接人与权重',
            summarySnapshotId: SUMMARY_SNAPSHOT_ID
        };

        service.createDepartureExceptionDecision.mockResolvedValue({
            id: DECISION_ID,
            projectId: PROJECT_ID,
            freezeVersionId: ASSIGNMENT_ID,
            version: 1,
            rowVersion: 1,
            isCurrent: true,
            departureScenarioCode: 'employee-left-company',
            decisionCode: 'REQUIRE_HANDOVER_CONFIRMATION',
            decisionSummary: '原销售已离职，后续质保金结算前需补承接确认',
            confirmationRequirementSummary: '请销售负责人确认责任承接人与权重',
            summaryPackageKey: 'project-handover-confirmation',
            summarySnapshotId: SUMMARY_SNAPSHOT_ID,
            projectionLevel: 'handover-confirmation',
            exportPolicy: 'handover-controlled',
            status: 'active',
            handledAt: '2026-03-25T10:25:00.000Z',
            createdAt: '2026-03-25T10:25:00.000Z',
            updatedAt: '2026-03-25T10:25:00.000Z'
        });

        const result = await controller.createDepartureExceptionDecision(
            PROJECT_ID,
            { user: { sub: 'user-1' } } as never,
            body as never
        );

        expect(service.createDepartureExceptionDecision).toHaveBeenCalledWith(PROJECT_ID, 'user-1', body);
        expect(result.id).toBe(DECISION_ID);
        expect(result.summarySnapshotId).toBe(SUMMARY_SNAPSHOT_ID);
    });
});
