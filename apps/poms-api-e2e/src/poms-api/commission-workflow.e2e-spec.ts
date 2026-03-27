import { approveRecord, expectNoOpenTodoForTarget, findOpenTodoForTarget, getApprovalRecord, rejectRecord } from '../support/approval-api';
import { loginAsAdmin } from '../support/api-client';
import {
    activateRuleVersion,
    createAdjustment,
    createPayout,
    createRoleAssignment,
    createRuleVersion,
    executeAdjustment,
    findAdjustmentApprovalRecord,
    findPayoutApprovalRecord,
    freezeRoleAssignment,
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
import { createActiveContractForProject, createContract, getContract, submitContractReview } from '../support/contract-api';
import { expectErrorStatus } from '../support/http';
import { createProjectForProfile } from '../support/project-api';
import {
    buildAdjustmentInput,
    buildCommissionRuleVersionInput,
    buildContractInput,
    buildPayoutInput,
    buildRoleAssignmentInput,
    makeUniqueSuffix
} from '../support/test-data';

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

    it('returns payout to draft when payout approval is rejected', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-reject-payout');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        const submittedPayout = await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: scenario.payout.rowVersion
        });
        expect(submittedPayout.status).toBe('pending-approval');

        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        const rejectResult = await rejectRecord(client, payoutApproval.id, {
            reason: '发放金额依据不足',
            comment: '请补充签报后重提',
            expectedVersion: payoutApproval.rowVersion
        });
        expect(rejectResult.resultStatus).toBe('rejected');
        expect(rejectResult.businessStatusAfter).toBe('draft');

        const rejectedPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        expect(rejectedPayout.status).toBe('draft');
        expect(rejectedPayout.approvedAmount).toBeNull();
        expect(rejectedPayout.approvedAt).toBeNull();
    });

    it('marks adjustment as rejected when adjustment approval is rejected', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-reject-adjustment');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: scenario.payout.rowVersion
        });
        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        await approveRecord(client, payoutApproval.id, {
            comment: 'e2e 调整前先批准发放',
            expectedVersion: payoutApproval.rowVersion
        });

        const approvedPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        expect(approvedPayout.status).toBe('approved');

        const adjustment = await createAdjustment(
            client,
            scenario.project.id,
            buildAdjustmentInput(scenario.calculation.id, approvedPayout.id, {
                reason: 'e2e 调整驳回链路'
            })
        );

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
        const rejectResult = await rejectRecord(client, adjustmentApproval.id, {
            reason: '调整依据不足',
            comment: '先补充退款证明',
            expectedVersion: adjustmentApproval.rowVersion
        });
        expect(rejectResult.resultStatus).toBe('rejected');
        expect(rejectResult.businessStatusAfter).toBe('rejected');

        const rejectedAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        expect(rejectedAdjustment.status).toBe('rejected');
    });

    it('returns 409 when approval processing uses a stale approval-record version', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-approval-version');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: scenario.payout.rowVersion
        });

        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        const response = await client.post(`/approval-records/${payoutApproval.id}/approve`, {
            comment: 'e2e 审批记录版本冲突',
            expectedVersion: payoutApproval.rowVersion + 1
        });

        expectErrorStatus(response, 409, 'ApprovalRecord version');
    });

    it('rejects duplicate payout approval submission while approval is pending', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-dup-pay');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: scenario.payout.rowVersion
        });

        const pendingPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        const response = await client.post(
            `/commission/projects/${scenario.project.id}/payouts/${scenario.payout.id}/submit-approval`,
            {
                expectedVersion: pendingPayout.rowVersion
            }
        );

        expectErrorStatus(response, 400, 'cannot submit approval in status pending-approval');
    });

    it('rejects duplicate adjustment approval submission while approval is pending', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-dup-adj');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: scenario.payout.rowVersion
        });
        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        await approveRecord(client, payoutApproval.id, {
            comment: 'e2e 调整前先批准发放',
            expectedVersion: payoutApproval.rowVersion
        });

        const approvedPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        const adjustment = await createAdjustment(
            client,
            scenario.project.id,
            buildAdjustmentInput(scenario.calculation.id, approvedPayout.id, {
                reason: 'e2e 调整重复送审'
            })
        );

        await submitAdjustmentApproval(client, scenario.project.id, adjustment.id, {
            expectedVersion: adjustment.rowVersion
        });

        const pendingAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        const response = await client.post(
            `/commission/projects/${scenario.project.id}/adjustments/${adjustment.id}/submit-approval`,
            {
                expectedVersion: pendingAdjustment.rowVersion
            }
        );

        expectErrorStatus(response, 400, 'cannot submit approval in status pending-approval');
    });

    it('creates a new payout approval record on resubmission and removes closed payout todos from /me/todos', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-resubmit-pay');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: scenario.payout.rowVersion
        });

        const firstApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        expect(firstApproval.currentStatus).toBe('pending');
        expect(firstApproval.targetStatus).toBe('pending-approval');
        expect(firstApproval.currentNodeName).toBe('提成发放审批');

        await rejectRecord(client, firstApproval.id, {
            reason: '发放依据不足',
            comment: '请补充依据后重新送审',
            expectedVersion: firstApproval.rowVersion
        });

        await expectNoOpenTodoForTarget(client, 'CommissionPayout', scenario.payout.id);

        const rejectedPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        expect(rejectedPayout.status).toBe('draft');

        const resubmittedPayout = await submitPayoutApproval(client, scenario.project.id, scenario.payout.id, {
            expectedVersion: rejectedPayout.rowVersion
        });
        expect(resubmittedPayout.status).toBe('pending-approval');

        const secondApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        expect(secondApproval.id).not.toBe(firstApproval.id);
        expect(secondApproval.currentStatus).toBe('pending');
        expect(secondApproval.targetStatus).toBe('pending-approval');
        expect(secondApproval.decision).toBeNull();

        const secondApprovalDetail = await getApprovalRecord(client, secondApproval.id);
        expect(secondApprovalDetail.id).toBe(secondApproval.id);
        expect(secondApprovalDetail.currentApproverUserId).toBe(profile.id);
    });

    it('rejects role-assignment freeze before project handover is complete', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-freeze-guard');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-CMS-${unique}`,
            projectName: `E2E 提成冻结前置 ${unique}`,
            currentStage: 'negotiation'
        });

        const assignment = await createRoleAssignment(client, project.id, buildRoleAssignmentInput(profile));
        const response = await client.post(
            `/commission/projects/${project.id}/role-assignment/${assignment.id}/freeze`
        );

        expectErrorStatus(response, 422, '尚未完成移交');
    });

    it('rejects calculation trigger when the project has no active contract facts', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-contract-guard');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-CMS-${unique}`,
            projectName: `E2E 提成合同前置 ${unique}`,
            currentStage: 'execution'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-CMS-HT-${unique}`,
                signedAmount: '166000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 未生效合同送审',
            expectedVersion: contract.rowVersion
        });

        const contractTodo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        await approveRecord(client, contractTodo.sourceId, {
            comment: 'e2e 合同审批通过但未生效',
            expectedVersion: 1
        });

        const pendingReviewContract = await getContract(client, contract.id);
        expect(pendingReviewContract.status).toBe('pending-review');

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const assignment = await createRoleAssignment(client, project.id, buildRoleAssignmentInput(profile));
        const frozenAssignment = await freezeRoleAssignment(client, project.id, assignment.id);
        expect(frozenAssignment.status).toBe('frozen');

        const response = await client.post(
            `/commission/projects/${project.id}/calculations/trigger`,
            {
                recognizedRevenueTaxExclusive: '100000.00',
                recognizedCostTaxExclusive: '70000.00'
            }
        );

        expectErrorStatus(response, 422, '当前项目不存在已生效合同台账');
    });

    it('rejects calculation trigger when confirmed receipts are below requested revenue', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-receipt-guard');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-CMS-${unique}`,
            projectName: `E2E 提成回款口径 ${unique}`,
            currentStage: 'execution'
        });

        await createActiveContractForProject(client, project.id, profile.id, {
            contractNo: `E2E-CMS-HT-${unique}`,
            signedAmount: '188000.00',
            receiptAmount: '50000.00',
            paymentAmount: '70000.00'
        });

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const assignment = await createRoleAssignment(client, project.id, buildRoleAssignmentInput(profile));
        await freezeRoleAssignment(client, project.id, assignment.id);

        const response = await client.post(
            `/commission/projects/${project.id}/calculations/trigger`,
            {
                recognizedRevenueTaxExclusive: '100000.00',
                recognizedCostTaxExclusive: '70000.00'
            }
        );

        expectErrorStatus(response, 422, '已确认回款不足');
    });

    it('rejects calculation trigger when confirmed payments are below requested cost', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-payment-guard');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-CMS-${unique}`,
            projectName: `E2E 提成成本口径 ${unique}`,
            currentStage: 'execution'
        });

        await createActiveContractForProject(client, project.id, profile.id, {
            contractNo: `E2E-CMS-HT-${unique}`,
            signedAmount: '188000.00',
            receiptAmount: '100000.00',
            paymentAmount: '30000.00'
        });

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const assignment = await createRoleAssignment(client, project.id, buildRoleAssignmentInput(profile));
        await freezeRoleAssignment(client, project.id, assignment.id);

        const response = await client.post(
            `/commission/projects/${project.id}/calculations/trigger`,
            {
                recognizedRevenueTaxExclusive: '100000.00',
                recognizedCostTaxExclusive: '70000.00'
            }
        );

        expectErrorStatus(response, 422, '已确认成本不足');
    });
});
