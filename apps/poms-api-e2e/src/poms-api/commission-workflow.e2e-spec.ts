import { approveRecord } from '../support/approval-api';
import { loginAsAdmin } from '../support/api-client';
import {
    createAdjustment,
    createPayout,
    executeAdjustment,
    findAdjustmentApprovalRecord,
    findPayoutApprovalRecord,
    getAdjustment,
    getPayout,
    listAdjustments,
    listCalculations,
    recalculateCalculation,
    registerPayout,
    setupDraftPayoutScenario,
    setupEffectiveCalculationScenario,
    submitAdjustmentApproval,
    submitPayoutApproval
} from '../support/commission-api';
import { expectErrorStatus } from '../support/http';
import { buildAdjustmentInput, buildPayoutInput, makeUniqueSuffix } from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api commission workflow e2e', () => {
    it('runs the commission workflow end-to-end, including adjustment and recalculation', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        expect(scenario.calculation.status).toBe('effective');
        expect(scenario.calculation.commissionPool).toBe('2400.00');

        const payout = await createPayout(
            client,
            scenario.project.id,
            buildPayoutInput(scenario.calculation.id)
        );
        expect(payout.status).toBe('draft');
        expect(payout.theoreticalCapAmount).toBe('480.00');

        const submittedPayout = await submitPayoutApproval(client, scenario.project.id, payout.id, {
            expectedVersion: payout.rowVersion
        });
        expect(submittedPayout.status).toBe('pending-approval');

        const payoutApproval = await findPayoutApprovalRecord(client, payout.id);
        const approvePayoutResult = await approveRecord(client, payoutApproval.id, {
            comment: 'e2e 发放审批通过',
            expectedVersion: payoutApproval.rowVersion
        });
        expect(approvePayoutResult.businessStatusAfter).toBe('approved');

        const approvedPayout = await getPayout(client, scenario.project.id, payout.id);
        expect(approvedPayout.status).toBe('approved');
        expect(approvedPayout.approvedAmount).toBe('480.00');

        const paidPayout = await registerPayout(client, scenario.project.id, payout.id, {
            paidRecordAmount: '400.00',
            expectedVersion: approvedPayout.rowVersion
        });
        expect(paidPayout.status).toBe('paid');
        expect(paidPayout.paidRecordAmount).toBe('400.00');

        const adjustment = await createAdjustment(
            client,
            scenario.project.id,
            buildAdjustmentInput(scenario.calculation.id, payout.id, {
                reason: 'e2e 退款核查，先暂停后续处理'
            })
        );
        expect(adjustment.status).toBe('draft');

        const submittedAdjustment = await submitAdjustmentApproval(
            client,
            scenario.project.id,
            adjustment.id,
            {
                expectedVersion: adjustment.rowVersion
            }
        );
        expect(submittedAdjustment.status).toBe('pending-approval');

        const adjustmentApproval = await findAdjustmentApprovalRecord(client, adjustment.id);
        const approveAdjustmentResult = await approveRecord(client, adjustmentApproval.id, {
            comment: 'e2e 调整审批通过',
            expectedVersion: adjustmentApproval.rowVersion
        });
        expect(approveAdjustmentResult.businessStatusAfter).toBe('approved');

        const approvedAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        expect(approvedAdjustment.status).toBe('approved');

        const executedAdjustment = await executeAdjustment(client, scenario.project.id, adjustment.id, {
            expectedVersion: approvedAdjustment.rowVersion
        });
        expect(executedAdjustment.status).toBe('executed');

        const suspendedPayout = await getPayout(client, scenario.project.id, payout.id);
        expect(suspendedPayout.status).toBe('suspended');

        const recalculated = await recalculateCalculation(
            client,
            scenario.project.id,
            scenario.calculation.id,
            {
                reason: 'e2e 异常重算',
                recognizedRevenueTaxExclusive: '90000.00',
                recognizedCostTaxExclusive: '70000.00',
                expectedVersion: scenario.calculation.rowVersion
            }
        );
        expect(recalculated.version).toBe(scenario.calculation.version + 1);
        expect(recalculated.recalculatedFromId).toBe(scenario.calculation.id);
        expect(recalculated.status).toBe('calculated');

        const calculations = await listCalculations(client, scenario.project.id);
        expect(
            calculations.find((item) => item.id === scenario.calculation.id)?.status
        ).toBe('superseded');
        expect(
            calculations.find((item) => item.id === recalculated.id)?.isCurrent
        ).toBe(true);

        const adjustments = await listAdjustments(client, scenario.project.id);
        expect(
            adjustments.some(
                (item) =>
                    item.adjustmentType === 'recalculate' &&
                    item.relatedCalculationId === scenario.calculation.id &&
                    item.status === 'executed'
            )
        ).toBe(true);
    });

    it('rejects payout registration before payout approval', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-register-guard');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        const response = await client.post(
            `/commission/projects/${scenario.project.id}/payouts/${scenario.payout.id}/register-payout`,
            {
                paidRecordAmount: '100.00',
                expectedVersion: scenario.payout.rowVersion
            }
        );

        expectErrorStatus(response, 422, '只有已批准状态的提成发放可以登记发放');
    });

    it('rejects duplicate payout creation for the same calculation stage', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-duplicate-payout');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        await createPayout(client, scenario.project.id, buildPayoutInput(scenario.calculation.id));

        const response = await client.post(
            `/commission/projects/${scenario.project.id}/payouts`,
            buildPayoutInput(scenario.calculation.id)
        );

        expectErrorStatus(response, 409, '已存在发放记录');
    });
});
