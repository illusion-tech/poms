import { CommissionController } from './commission.controller';
import { ApprovalService } from '../approval/approval.service';
import { CommissionService } from './commission.service';

const RULE_VERSION_ID = '50000000-0000-4000-8000-000000000001';
const ASSIGNMENT_ID = '51000000-0000-4000-8000-000000000001';
const CALCULATION_ID = '52000000-0000-4000-8000-000000000001';
const PAYOUT_ID = '53000000-0000-4000-8000-000000000001';
const ADJUSTMENT_ID = '54000000-0000-4000-8000-000000000001';
const PROJECT_ID = '00000000-0000-4000-8000-000000000001';
const SUMMARY_SNAPSHOT_ID = '62000000-0000-4000-8000-000000000001';

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
    rowVersion: 1,
    isCurrent: true,
    status: 'draft' as const,
    participantsJson: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }],
    sourceHandoverId: null,
    sourceHandoverRebaselineRecordId: null,
    contractSummarySnapshotId: null,
    handoverSummarySnapshotId: null,
    effectiveHandoverBaselineSnapshotId: null,
    frozenAt: null,
    createdAt: '2026-03-25T10:00:00.000Z',
    updatedAt: '2026-03-25T10:00:00.000Z'
};

const stubFreezeVersionSummary = {
    ...stubAssignment,
    status: 'frozen' as const
};

const stubFinalSettlementView = {
    projectId: PROJECT_ID,
    finalSettlementStatus: 'pending-final-settlement',
    nonRetentionSettlementStatus: 'settled',
    retentionSettlementStatus: 'waiting-retention',
    retentionRequirementSummary: '等待质保金到账',
    retentionReceiptSummary: null,
    departureExceptionSummary: null,
    freezeVersionSummary: stubFreezeVersionSummary,
    baselineSelectionSource: 'original' as const,
    taxImpactSummary: '税务影响待闭合',
    taxImpactPendingAmount: '1200.00',
    dataMaturityLevel: 'stable',
    costActionRecommendation: 'REVIEW' as const,
    currentActionLevel: 'BLOCK' as const,
    referencedBaselineVersion: 'baseline-v3',
    referencedSnapshotVersion: 'snapshot-v5',
    summaryPackageKey: 'commission-final-settlement',
    summarySnapshotId: SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'final-settlement',
    exportPolicy: 'controlled',
    allowedActions: []
};

const stubRuleExplanationView = {
    projectId: PROJECT_ID,
    currentStageStatus: 'blocked-retention',
    gateDecisionCode: 'BLOCK_RETENTION',
    blockingReasonCategory: 'retention',
    blockingReasonCode: 'RETENTION_RECEIPT_PENDING',
    blockingReasonSummary: '质保金尚未到账',
    gateDecisionSummary: '当前暂不能进入质保金结算',
    nextActionSummary: '请财务确认质保金到账后再复核',
    freezeVersionSummary: stubFreezeVersionSummary,
    baselineSelectionSource: 'original' as const,
    taxImpactSummary: '税务影响待闭合',
    taxImpactPendingAmount: '1200.00',
    dataMaturityLevel: 'stable',
    costActionRecommendation: 'REVIEW' as const,
    currentActionLevel: 'BLOCK' as const,
    referencedBaselineVersion: 'baseline-v3',
    referencedSnapshotVersion: 'snapshot-v5',
    summaryPackageKey: 'commission-final-settlement',
    summarySnapshotId: SUMMARY_SNAPSHOT_ID,
    projectionLevel: 'final-settlement',
    exportPolicy: 'controlled',
    allowedActions: []
};

const stubCalculation = {
    id: CALCULATION_ID,
    projectId: PROJECT_ID,
    ruleVersionId: RULE_VERSION_ID,
    version: 1,
    rowVersion: 1,
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
    rowVersion: 1,
    stageType: 'first' as const,
    payoutKind: 'primary' as const,
    sourcePayoutId: null,
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

const stubAdjustment = {
    id: ADJUSTMENT_ID,
    projectId: PROJECT_ID,
    rowVersion: 1,
    adjustmentType: 'suspend-payout' as const,
    relatedPayoutId: PAYOUT_ID,
    relatedCalculationId: CALCULATION_ID,
    amount: null,
    reason: '客户退款待核实',
    status: 'draft' as const,
    executedAt: null,
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
            getCommissionFinalSettlement: jest.fn(),
            getCommissionRuleExplanation: jest.fn(),
            getRoleAssignmentDetail: jest.fn(),
            createRoleAssignment: jest.fn(),
            freezeCommissionRoleAssignment: jest.fn(),
            listCalculations: jest.fn(),
            createCalculation: jest.fn(),
            approveCalculation: jest.fn(),
            recalculateCalculation: jest.fn(),
            listPayouts: jest.fn(),
            getPayoutById: jest.fn(),
            createPayout: jest.fn(),
            submitPayoutApproval: jest.fn(),
            approvePayout: jest.fn(),
            registerPayout: jest.fn(),
            listAdjustments: jest.fn(),
            getAdjustmentById: jest.fn(),
            createAdjustment: jest.fn(),
            executeAdjustment: jest.fn()
        } as unknown as jest.Mocked<CommissionService>;

        approvalService = {
            submitCommissionPayoutApproval: jest.fn(),
            submitCommissionAdjustmentApproval: jest.fn()
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

    it('returns final settlement view from service', async () => {
        service.getCommissionFinalSettlement.mockResolvedValue(stubFinalSettlementView);
        const result = await controller.getCommissionFinalSettlement(PROJECT_ID);
        expect(service.getCommissionFinalSettlement).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toBe(stubFinalSettlementView);
    });

    it('returns rule explanation view from service', async () => {
        service.getCommissionRuleExplanation.mockResolvedValue(stubRuleExplanationView);
        const result = await controller.getCommissionRuleExplanation(PROJECT_ID);
        expect(service.getCommissionRuleExplanation).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toBe(stubRuleExplanationView);
    });

    it('delegates createRoleAssignment to service', async () => {
        service.createRoleAssignment.mockResolvedValue(stubAssignment);
        const body = { participants: [{ userId: '00000000-0000-4000-8000-000000000010', displayName: '张三', roleType: 'PM', weight: 1.0 }] };
        const result = await controller.createRoleAssignment(PROJECT_ID, body as never);
        expect(service.createRoleAssignment).toHaveBeenCalledWith(PROJECT_ID, body);
        expect(result).toBe(stubAssignment);
    });

    it('returns calculation list from service', async () => {
        service.listCalculations.mockResolvedValue([stubCalculation]);
        const result = await controller.listCalculations(PROJECT_ID);
        expect(service.listCalculations).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toHaveLength(1);
    });

    it('delegates createCalculation to service', async () => {
        service.createCalculation.mockResolvedValue(stubCalculation);
        const body = {
            ruleVersionId: RULE_VERSION_ID,
            recognizedRevenueTaxExclusive: '100000.00',
            recognizedCostTaxExclusive: '70000.00'
        };
        const result = await controller.createCalculation(PROJECT_ID, body as never);
        expect(service.createCalculation).toHaveBeenCalledWith(PROJECT_ID, body);
        expect(result).toBe(stubCalculation);
    });

    it('delegates approveCalculation to service', async () => {
        service.approveCalculation.mockResolvedValue({ ...stubCalculation, status: 'effective', approvedAt: '2026-03-25T10:10:00.000Z' });
        const result = await controller.approveCalculation(CALCULATION_ID, {} as never);
        expect(service.approveCalculation).toHaveBeenCalledWith(CALCULATION_ID, {});
        expect(result.status).toBe('effective');
    });

    it('delegates recalculateCalculation to service', async () => {
        service.recalculateCalculation.mockResolvedValue({ ...stubCalculation, id: '52000000-0000-4000-8000-000000000002', version: 2, status: 'calculated' });
        const body = { reason: '回款冲减', expectedVersion: 1 };
        const result = await controller.recalculateCalculation(CALCULATION_ID, body as never);
        expect(service.recalculateCalculation).toHaveBeenCalledWith(CALCULATION_ID, body);
        expect(result.version).toBe(2);
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
        service.getPayoutById.mockResolvedValue({ ...stubPayout, status: 'pending-approval' });

        const result = await controller.submitPayoutApproval(PAYOUT_ID, { user: { sub: 'user-1' } } as never, {} as never);

        expect(approvalService.submitCommissionPayoutApproval).toHaveBeenCalledWith(PAYOUT_ID, 'user-1', {});
        expect(service.getPayoutById).toHaveBeenCalledWith(PAYOUT_ID);
        expect(result.status).toBe('pending-approval');
    });

    it('delegates approvePayout to service', async () => {
        service.approvePayout.mockResolvedValue({ ...stubPayout, status: 'approved', approvedAmount: '480.00' });
        const result = await controller.approvePayout(PAYOUT_ID, {} as never);
        expect(service.approvePayout).toHaveBeenCalledWith(PAYOUT_ID, {});
        expect(result.status).toBe('approved');
    });

    it('delegates registerPayout to service', async () => {
        service.registerPayout.mockResolvedValue({ ...stubPayout, status: 'paid', approvedAmount: '480.00', paidRecordAmount: '400.00' });
        const result = await controller.registerPayout(PAYOUT_ID, { user: { sub: 'user-1' } } as never, { paidRecordAmount: '400.00' } as never);
        expect(service.registerPayout).toHaveBeenCalledWith(PAYOUT_ID, { paidRecordAmount: '400.00' }, 'user-1');
        expect(result.status).toBe('paid');
    });

    it('returns adjustment list from service', async () => {
        service.listAdjustments.mockResolvedValue([stubAdjustment]);
        const result = await controller.listAdjustments(PROJECT_ID);
        expect(service.listAdjustments).toHaveBeenCalledWith(PROJECT_ID);
        expect(result).toHaveLength(1);
    });

    it('delegates createAdjustment to service', async () => {
        const body = { adjustmentType: 'suspend-payout', relatedPayoutId: PAYOUT_ID, reason: '客户退款待核实' };
        service.createAdjustment.mockResolvedValue(stubAdjustment);
        const result = await controller.createAdjustment(PROJECT_ID, body as never);
        expect(service.createAdjustment).toHaveBeenCalledWith(PROJECT_ID, body);
        expect(result).toBe(stubAdjustment);
    });

    it('delegates submitAdjustmentApproval to approval service and reloads adjustment snapshot', async () => {
        approvalService.submitCommissionAdjustmentApproval.mockResolvedValue({
            targetId: ADJUSTMENT_ID,
            targetType: 'CommissionAdjustment',
            resultStatus: 'submitted',
            businessStatusAfter: 'pending-approval',
            approvalRecordId: '40000000-0000-4000-8000-000000000011',
            confirmationRecordId: null,
            todoItemIds: ['50000000-0000-4000-8000-000000000011'],
            snapshotId: null
        });
        service.getAdjustmentById.mockResolvedValue([{ ...stubAdjustment, status: 'pending-approval' }][0]);

        const result = await controller.submitAdjustmentApproval(ADJUSTMENT_ID, { user: { sub: 'user-1' } } as never, {} as never);

        expect(approvalService.submitCommissionAdjustmentApproval).toHaveBeenCalledWith(ADJUSTMENT_ID, 'user-1', {});
        expect(service.getAdjustmentById).toHaveBeenCalledWith(ADJUSTMENT_ID);
        expect(result.status).toBe('pending-approval');
    });

    it('delegates executeAdjustment to service', async () => {
        service.executeAdjustment.mockResolvedValue({ ...stubAdjustment, status: 'executed', executedAt: '2026-03-25T10:20:00.000Z' });
        const result = await controller.executeAdjustment(ADJUSTMENT_ID, { expectedVersion: 1 } as never);
        expect(service.executeAdjustment).toHaveBeenCalledWith(ADJUSTMENT_ID, { expectedVersion: 1 });
        expect(result.status).toBe('executed');
    });
});
