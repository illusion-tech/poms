import { CommissionController } from './commission.controller';
import { ApprovalService } from '../approval/approval.service';
import { CommissionService } from './commission.service';

const RULE_VERSION_ID = '50000000-0000-4000-8000-000000000001';
const ASSIGNMENT_ID = '51000000-0000-4000-8000-000000000001';
const CALCULATION_ID = '52000000-0000-4000-8000-000000000001';
const PAYOUT_ID = '53000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';

const stubRuleVersion = {
    id: RULE_VERSION_ID,
    ruleCode: 'STANDARD',
    version: 1,
    status: 'draft' as const,
    tierDefinitionJson: { tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }] },
    effectiveFrom: null,
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z'
};

const stubAssignment = {
    id: ASSIGNMENT_ID,
    projectId: PROJECT_ID,
    version: 1,
    isCurrent: true,
    status: 'draft' as const,
    participantsJson: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }],
    frozenAt: null,
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z'
};

const stubCalculation = {
    id: CALCULATION_ID,
    projectId: PROJECT_ID,
    ruleVersionId: RULE_VERSION_ID,
    version: 1,
    isCurrent: true,
    status: 'calculated' as const,
    recognizedRevenueTaxExclusive: '100000.00',
    recognizedCostTaxExclusive: '70000.00',
    contributionMargin: '30000.00',
    contributionMarginRate: '0.3000',
    commissionPool: '2400.00',
    recalculatedFromId: null,
    approvedAt: null,
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z'
};

const stubPayout = {
    id: PAYOUT_ID,
    projectId: PROJECT_ID,
    calculationId: CALCULATION_ID,
    stageType: 'first' as const,
    selectedTier: 'basic' as const,
    theoreticalCapAmount: '480.00',
    approvedAmount: null,
    paidRecordAmount: null,
    status: 'draft' as const,
    approvedAt: null,
    handledAt: null,
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z'
};

describe('CommissionController', () => {
    let controller: CommissionController;
    let service: jest.Mocked<CommissionService>;
    let approvalService: jest.Mocked<ApprovalService>;

    beforeEach(() => {
        service = {
            listRuleVersions: jest.fn(),
            createRuleVersion: jest.fn(),
            activateRuleVersion: jest.fn(),
            stopRuleVersion: jest.fn(),
            getCurrentRoleAssignment: jest.fn(),
            createRoleAssignment: jest.fn(),
            freezeRoleAssignment: jest.fn(),
            listCalculations: jest.fn(),
            triggerCalculation: jest.fn(),
            confirmCalculation: jest.fn(),
            listPayouts: jest.fn(),
            createPayout: jest.fn(),
            approvePayout: jest.fn(),
            registerPayout: jest.fn()
        } as unknown as jest.Mocked<CommissionService>;

        approvalService = {
            submitCommissionPayoutApproval: jest.fn()
        } as unknown as jest.Mocked<ApprovalService>;

        controller = new CommissionController(service, approvalService);
    });

    it('returns rule version list from service', async () => {
        service.listRuleVersions.mockResolvedValue([stubRuleVersion]);
        const result = await controller.listRuleVersions();
        expect(service.listRuleVersions).toHaveBeenCalled();
        expect(result).toHaveLength(1);
    });

    it('delegates createRuleVersion to service', async () => {
        service.createRuleVersion.mockResolvedValue(stubRuleVersion);
        const body = { ruleCode: 'STANDARD', version: 1, tierDefinitionJson: { tiers: [] } };
        const result = await controller.createRuleVersion(body as never);
        expect(service.createRuleVersion).toHaveBeenCalledWith(body);
        expect(result).toBe(stubRuleVersion);
    });

    it('delegates activateRuleVersion to service', async () => {
        service.activateRuleVersion.mockResolvedValue({ ...stubRuleVersion, status: 'active' });
        const result = await controller.activateRuleVersion(RULE_VERSION_ID);
        expect(service.activateRuleVersion).toHaveBeenCalledWith(RULE_VERSION_ID);
        expect(result.status).toBe('active');
    });

    it('delegates stopRuleVersion to service', async () => {
        service.stopRuleVersion.mockResolvedValue({ ...stubRuleVersion, status: 'stopped' });
        const result = await controller.stopRuleVersion(RULE_VERSION_ID);
        expect(service.stopRuleVersion).toHaveBeenCalledWith(RULE_VERSION_ID);
        expect(result.status).toBe('stopped');
    });

    it('returns current role assignment from service', async () => {
        service.getCurrentRoleAssignment.mockResolvedValue(stubAssignment);
        const result = await controller.getCurrentRoleAssignment(PROJECT_ID);
        expect(service.getCurrentRoleAssignment).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toBe(stubAssignment);
    });

    it('delegates createRoleAssignment to service', async () => {
        service.createRoleAssignment.mockResolvedValue(stubAssignment);
        const body = { participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }] };
        const result = await controller.createRoleAssignment(PROJECT_ID, body as never);
        expect(service.createRoleAssignment).toHaveBeenCalledWith(PROJECT_ID, body);
        expect(result).toBe(stubAssignment);
    });

    it('delegates freezeRoleAssignment to service', async () => {
        service.freezeRoleAssignment.mockResolvedValue({ ...stubAssignment, status: 'frozen', frozenAt: '2026-03-25T10:00:00.000Z' });
        const result = await controller.freezeRoleAssignment(PROJECT_ID, ASSIGNMENT_ID);
        expect(service.freezeRoleAssignment).toHaveBeenCalledWith(PROJECT_ID, ASSIGNMENT_ID);
        expect(result.status).toBe('frozen');
    });

    it('returns calculation list from service', async () => {
        service.listCalculations.mockResolvedValue([stubCalculation]);
        const result = await controller.listCalculations(PROJECT_ID);
        expect(service.listCalculations).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toHaveLength(1);
    });

    it('delegates triggerCalculation to service', async () => {
        service.triggerCalculation.mockResolvedValue(stubCalculation);
        const body = { recognizedRevenueTaxExclusive: '100000.00', recognizedCostTaxExclusive: '70000.00' };
        const result = await controller.triggerCalculation(PROJECT_ID, body as never);
        expect(service.triggerCalculation).toHaveBeenCalledWith(PROJECT_ID, body);
        expect(result).toBe(stubCalculation);
    });

    it('delegates confirmCalculation to service', async () => {
        service.confirmCalculation.mockResolvedValue({ ...stubCalculation, status: 'effective', approvedAt: '2026-03-25T10:10:00.000Z' });
        const result = await controller.confirmCalculation(PROJECT_ID, CALCULATION_ID, {} as never);
        expect(service.confirmCalculation).toHaveBeenCalledWith(PROJECT_ID, CALCULATION_ID, {});
        expect(result.status).toBe('effective');
    });

    it('returns payout list from service', async () => {
        service.listPayouts.mockResolvedValue([stubPayout]);
        const result = await controller.listPayouts(PROJECT_ID);
        expect(service.listPayouts).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toHaveLength(1);
    });

    it('delegates createPayout to service', async () => {
        service.createPayout.mockResolvedValue(stubPayout);
        const body = { calculationId: CALCULATION_ID, stageType: 'first', selectedTier: 'basic' };
        const result = await controller.createPayout(PROJECT_ID, body as never);
        expect(service.createPayout).toHaveBeenCalledWith(PROJECT_ID, body);
        expect(result).toBe(stubPayout);
    });

    it('delegates submitPayoutApproval to approval service and reloads payout snapshot', async () => {
        approvalService.submitCommissionPayoutApproval.mockResolvedValue({
            targetId: PAYOUT_ID,
            targetType: 'CommissionPayout',
            resultStatus: 'submitted',
            businessStatusAfter: 'pending-approval',
            approvalRecordId: '40000000-0000-4000-8000-000000000001',
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-4000-8000-000000000001'],
            snapshotId: null
        });
        service.listPayouts.mockResolvedValue([{ ...stubPayout, status: 'pending-approval' }]);

        const result = await controller.submitPayoutApproval(PROJECT_ID, PAYOUT_ID, { user: { sub: 'user-1' } } as never, {} as never);

        expect(approvalService.submitCommissionPayoutApproval).toHaveBeenCalledWith(PAYOUT_ID, 'user-1', {});
        expect(service.listPayouts).toHaveBeenCalledWith(PROJECT_ID);
        expect(result.status).toBe('pending-approval');
    });

    it('delegates approvePayout to service', async () => {
        service.approvePayout.mockResolvedValue({ ...stubPayout, status: 'approved', approvedAmount: '480.00' });
        const result = await controller.approvePayout(PROJECT_ID, PAYOUT_ID, {} as never);
        expect(service.approvePayout).toHaveBeenCalledWith(PROJECT_ID, PAYOUT_ID, {});
        expect(result.status).toBe('approved');
    });

    it('delegates registerPayout to service', async () => {
        service.registerPayout.mockResolvedValue({ ...stubPayout, status: 'paid', approvedAmount: '480.00', paidRecordAmount: '400.00' });
        const result = await controller.registerPayout(PROJECT_ID, PAYOUT_ID, { paidRecordAmount: '400.00' } as never);
        expect(service.registerPayout).toHaveBeenCalledWith(PROJECT_ID, PAYOUT_ID, { paidRecordAmount: '400.00' });
        expect(result.status).toBe('paid');
    });
});
