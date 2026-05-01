import { approveRecord, expectNoOpenTodoForTarget, getApprovalRecord, rejectRecord } from '../support/approval-api';
import { loginAsAdmin, loginAsFinanceManager } from '../support/api-client';
import {
    activateRuleVersion,
    approveCalculation,
    arbitrateFreezeDispute,
    createAdjustment,
    createCalculation,
    createDepartureExceptionDecision,
    createPayout,
    createRoleAssignment,
    createRuleVersion,
    executeAdjustment,
    findAdjustmentApprovalRecord,
    getCommissionFinalSettlement,
    getCommissionRuleExplanation,
    getCurrentRoleAssignment,
    getFreezeChangeRequest,
    getFreezeDispute,
    findPayoutApprovalRecord,
    freezeRoleAssignment,
    getAdjustment,
    getPayout,
    getRoleAssignmentDetail,
    listAdjustments,
    listCalculations,
    listPayouts,
    recalculateCalculation,
    registerPayout,
    setupDraftPayoutScenario,
    setupEffectiveCalculationScenario,
    submitFreezeDispute,
    submitAdjustmentApproval,
    submitPayoutApproval
} from '../support/commission-api';
import { COMMISSION_E2E_FIXTURES } from '../support/commission-seed-fixtures';
import { confirmReceipt, createReceipt } from '../support/contract-finance-api';
import { expectErrorStatus } from '../support/http';
import { reviewCommissionGateBinding, reviewOperatingSignalEvaluation } from '../support/operating-signal-api';
import { PROJECT_HANDOVER_E2E_FIXTURES } from '../support/project-handover-seed-fixtures';
import {
    buildAdjustmentInput,
    buildCalculationInput,
    buildCommissionRuleVersionInput,
    buildPayoutInput,
    buildRoleAssignmentInput,
    makeUniqueSuffix
} from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api commission workflow e2e', () => {
    it('runs the commission workflow end-to-end, including adjustment and recalculation', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('commission');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        expect(scenario.calculation.status).toBe('effective');
        expect(scenario.calculation.commissionPoolProjection.value).toBe('2400.00');

        const payout = await createPayout(
            client,
            scenario.project.id,
            buildPayoutInput(scenario.calculation.id)
        );
        expect(payout.status).toBe('draft');
        expect(payout.theoreticalCapAmountProjection.value).toBe('480.00');

        const submittedPayout = await submitPayoutApproval(client, payout.id, {
            payoutStage: payout.stageType,
            expectedVersion: payout.rowVersion
        });
        expect(submittedPayout.status).toBe('pending-approval');

        const payoutApproval = await findPayoutApprovalRecord(client, payout.id);
        const approvePayoutResult = await approveRecord(financeManager.client, payoutApproval.id, {
            comment: 'e2e 发放审批通过',
            expectedVersion: payoutApproval.rowVersion
        });
        expect(approvePayoutResult.businessStatusAfter).toBe('approved');

        const approvedPayout = await getPayout(client, scenario.project.id, payout.id);
        expect(approvedPayout.status).toBe('approved');
        expect(approvedPayout.approvedAmountProjection.value).toBe('480.00');

        const paidPayout = await registerPayout(client, payout.id, {
            payoutStage: approvedPayout.stageType,
            paidRecordAmount: '400.00',
            expectedVersion: approvedPayout.rowVersion
        });
        expect(paidPayout.status).toBe('paid');
        expect(paidPayout.paidRecordAmountProjection.value).toBe('400.00');

        const adjustment = await createAdjustment(
            client,
            scenario.project.id,
            buildAdjustmentInput(scenario.calculation.id, payout.id, {
                reason: 'e2e 退款核查，先暂停后续处理'
            })
        );
        expect(adjustment.status).toBe('draft');

        const submittedAdjustment = await submitAdjustmentApproval(client, adjustment.id, {
            expectedVersion: adjustment.rowVersion
        });
        expect(submittedAdjustment.status).toBe('pending-approval');

        const adjustmentApproval = await findAdjustmentApprovalRecord(client, adjustment.id);
        const approveAdjustmentResult = await approveRecord(financeManager.client, adjustmentApproval.id, {
            comment: 'e2e 调整审批通过',
            expectedVersion: adjustmentApproval.rowVersion
        });
        expect(approveAdjustmentResult.businessStatusAfter).toBe('approved');

        const approvedAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        expect(approvedAdjustment.status).toBe('approved');

        const executedAdjustment = await executeAdjustment(client, adjustment.id, {
            expectedVersion: approvedAdjustment.rowVersion
        });
        expect(executedAdjustment.status).toBe('executed');

        const suspendedPayout = await getPayout(client, scenario.project.id, payout.id);
        expect(suspendedPayout.status).toBe('suspended');

        const recalculated = await recalculateCalculation(client, scenario.calculation.id, {
            reason: 'e2e 异常重算',
            recognizedRevenueTaxExclusive: '90000.00',
            recognizedCostTaxExclusive: '70000.00',
            expectedVersion: scenario.calculation.rowVersion
        });
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

    it('runs seeded final and retention settlement through the current evidence chain', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const fixture = COMMISSION_E2E_FIXTURES.main;
        const unique = makeUniqueSuffix('commission-final-retention');

        const signalReview = await reviewOperatingSignalEvaluation(client, fixture.signalEvaluationId, {
            reviewDecision: 'APPROVE',
            resolvedDataMaturityLevel: 'MATURE',
            costActionRecommendation: 'PROMPT',
            referencedBaselineVersion: fixture.baselinePackageId,
            referencedSnapshotVersion: fixture.operatingSnapshotId,
            reviewComment: 'EX-14C final settlement evidence review',
            expectedVersion: 1
        });
        expect(signalReview.resultStatus).toBe('success');

        const gateReview = await reviewCommissionGateBinding(client, fixture.gateBindingId, {
            bindingAction: 'PROMPT',
            gateReviewDecision: 'ALLOW_RETENTION',
            baselineSelectionSource: 'original',
            summaryPackageKey: fixture.summaryPackageKey,
            summarySnapshotId: fixture.summarySnapshotId,
            referencedBaselineVersion: fixture.baselinePackageId,
            referencedSnapshotVersion: fixture.operatingSnapshotId,
            expectedVersion: 1
        });
        expect(gateReview.gateReviewRecordId).toBeDefined();
        expect(gateReview.businessStatusAfter).toBe('PROMPT');

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const roleAssignmentDraft = await createRoleAssignment(client, fixture.projectId, buildRoleAssignmentInput(profile));
        const frozenRoleAssignment = await freezeRoleAssignment(client, roleAssignmentDraft.id, {
            sourceHandoverId: fixture.handoverId,
            handoverSummarySnapshotId: fixture.handoverSummarySnapshotId,
            expectedVersion: roleAssignmentDraft.rowVersion
        });

        const calculated = await createCalculation(client, fixture.projectId, buildCalculationInput(ruleVersion.id));
        const effectiveCalculation = await approveCalculation(client, calculated.id, {
            expectedVersion: calculated.rowVersion
        });

        const finalPayout = await createPayout(
            client,
            fixture.projectId,
            buildPayoutInput(effectiveCalculation.id, { stageType: 'final' })
        );
        expect(finalPayout.theoreticalCapAmountProjection.value).toBe('2400.00');

        const submittedFinalPayout = await submitPayoutApproval(client, finalPayout.id, {
            payoutStage: finalPayout.stageType,
            expectedVersion: finalPayout.rowVersion
        });
        expect(submittedFinalPayout.status).toBe('pending-approval');

        const finalApproval = await findPayoutApprovalRecord(client, finalPayout.id);
        await approveRecord(financeManager.client, finalApproval.id, {
            comment: 'EX-14C final payout approval',
            expectedVersion: finalApproval.rowVersion
        });

        const approvedFinalPayout = await getPayout(client, fixture.projectId, finalPayout.id);
        expect(approvedFinalPayout.status).toBe('approved');
        expect(approvedFinalPayout.approvedAmountProjection.value).toBe('2400.00');

        const pendingFinalSettlement = await getCommissionFinalSettlement(client, fixture.projectId);
        expect(pendingFinalSettlement.finalSettlementStatus).toBe('pending-final-settlement');
        expect(pendingFinalSettlement.nonRetentionSettlementStatus).toBe('pending-non-retention');
        expect(pendingFinalSettlement.retentionSettlementStatus).toBe('waiting-retention');
        expect(pendingFinalSettlement.summarySnapshotId).toBe(fixture.summarySnapshotId);

        const pendingFinalExplanation = await getCommissionRuleExplanation(client, fixture.projectId);
        expect(pendingFinalExplanation.currentStageStatus).toBe('pending-final-settlement');
        expect(pendingFinalExplanation.gateDecisionCode).toBe('ALLOW_FINAL_SETTLEMENT');
        expect(pendingFinalExplanation.summarySnapshotId).toBe(fixture.summarySnapshotId);

        const paidFinalPayout = await registerPayout(client, finalPayout.id, {
            payoutStage: approvedFinalPayout.stageType,
            paidRecordAmount: '2040.00',
            expectedVersion: approvedFinalPayout.rowVersion
        });
        expect(paidFinalPayout.status).toBe('paid');
        expect(paidFinalPayout.paidRecordAmountProjection.value).toBe('2040.00');

        const pendingRetentionSettlement = await getCommissionFinalSettlement(client, fixture.projectId);
        expect(pendingRetentionSettlement.finalSettlementStatus).toBe('pending-retention-settlement');
        expect(pendingRetentionSettlement.nonRetentionSettlementStatus).toBe('settled-non-retention');
        expect(pendingRetentionSettlement.retentionSettlementStatus).toBe('waiting-retention');

        const pendingRetentionExplanation = await getCommissionRuleExplanation(client, fixture.projectId);
        expect(pendingRetentionExplanation.currentStageStatus).toBe('blocked-retention');
        expect(pendingRetentionExplanation.gateDecisionCode).toBe('BLOCK_RETENTION');
        expect(pendingRetentionExplanation.blockingReasonCode).toBe('DEPARTURE_EXCEPTION_PENDING');

        const retentionPayout = await createPayout(
            client,
            fixture.projectId,
            buildPayoutInput(effectiveCalculation.id, { stageType: 'retention' })
        );
        expect(retentionPayout.theoreticalCapAmountProjection.value).toBe('360.00');

        const retentionReceipt = await createReceipt(client, fixture.contractId, {
            receiptAmount: '360.00',
            receiptDate: new Date().toISOString(),
            sourceType: 'manual'
        });
        const confirmedRetentionReceipt = await confirmReceipt(client, retentionReceipt.id, {
            expectedVersion: retentionReceipt.rowVersion
        });
        expect(confirmedRetentionReceipt.status).toBe('confirmed');

        const departureDecision = await createDepartureExceptionDecision(client, fixture.projectId, {
            freezeVersionId: frozenRoleAssignment.targetId,
            departureScenarioCode: 'employee-left-company',
            decisionCode: 'ALLOW_RETENTION_WITH_SUCCESSOR',
            decisionSummary: '允许进入质保金结算',
            confirmationRequirementSummary: null,
            summarySnapshotId: fixture.handoverSummarySnapshotId
        });
        expect(departureDecision.isCurrent).toBe(true);
        expect(departureDecision.summarySnapshotId).toBe(fixture.handoverSummarySnapshotId);

        const submittedRetentionPayout = await submitPayoutApproval(client, retentionPayout.id, {
            payoutStage: 'retention',
            gateReviewRecordId: gateReview.gateReviewRecordId,
            freezeVersionId: frozenRoleAssignment.targetId,
            summarySnapshotId: fixture.summarySnapshotId,
            retentionReceiptRecordId: confirmedRetentionReceipt.id,
            departureExceptionDecisionId: departureDecision.id,
            expectedVersion: retentionPayout.rowVersion
        });
        expect(submittedRetentionPayout.status).toBe('pending-approval');

        const readyRetentionSettlement = await getCommissionFinalSettlement(client, fixture.projectId);
        expect(readyRetentionSettlement.finalSettlementStatus).toBe('pending-retention-settlement');
        expect(readyRetentionSettlement.retentionSettlementStatus).toBe('ready-retention');
        expect(readyRetentionSettlement.retentionReceiptSummary).toContain('360.00');
        expect(readyRetentionSettlement.departureExceptionSummary).toBe('允许进入质保金结算');

        const readyRetentionExplanation = await getCommissionRuleExplanation(client, fixture.projectId);
        expect(readyRetentionExplanation.currentStageStatus).toBe('ready-retention');
        expect(readyRetentionExplanation.gateDecisionCode).toBe('ALLOW_RETENTION');

        const retentionApproval = await findPayoutApprovalRecord(client, retentionPayout.id);
        await approveRecord(financeManager.client, retentionApproval.id, {
            comment: 'EX-14C retention payout approval',
            expectedVersion: retentionApproval.rowVersion
        });

        const approvedRetentionPayout = await getPayout(client, fixture.projectId, retentionPayout.id);
        expect(approvedRetentionPayout.status).toBe('approved');
        expect(approvedRetentionPayout.approvedAmountProjection.value).toBe('360.00');

        const paidRetentionPayout = await registerPayout(client, retentionPayout.id, {
            payoutStage: 'retention',
            paidRecordAmount: '360.00',
            summarySnapshotId: fixture.summarySnapshotId,
            expectedVersion: approvedRetentionPayout.rowVersion
        });
        expect(paidRetentionPayout.status).toBe('paid');
        expect(paidRetentionPayout.paidRecordAmountProjection.value).toBe('360.00');

        const settledFinalSettlement = await getCommissionFinalSettlement(client, fixture.projectId);
        expect(settledFinalSettlement.finalSettlementStatus).toBe('settled-all');
        expect(settledFinalSettlement.nonRetentionSettlementStatus).toBe('settled-non-retention');
        expect(settledFinalSettlement.retentionSettlementStatus).toBe('settled-retention');

        const settledRuleExplanation = await getCommissionRuleExplanation(client, fixture.projectId);
        expect(settledRuleExplanation.currentStageStatus).toBe('settled-retention');
        expect(settledRuleExplanation.gateDecisionCode).toBe('SETTLED_RETENTION');
    });

    it('rejects payout registration before payout approval', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-register-guard');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        const response = await client.post(
            `/commission-payouts/${scenario.payout.id}:registerPayout`,
            {
                payoutStage: scenario.payout.stageType,
                paidRecordAmount: '100.00',
                expectedVersion: scenario.payout.rowVersion
            }
        );

        expectErrorStatus(response, 422, '只有已批准状态的提成发放可以登记发放');
    });

    it('creates a compensating payout record when supplement adjustment is executed', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('commission-supplement');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        const payout = await createPayout(client, scenario.project.id, buildPayoutInput(scenario.calculation.id));
        await submitPayoutApproval(client, payout.id, { payoutStage: payout.stageType, expectedVersion: payout.rowVersion });

        const payoutApproval = await findPayoutApprovalRecord(client, payout.id);
        await approveRecord(financeManager.client, payoutApproval.id, {
            comment: '补发前先完成原发放审批',
            expectedVersion: payoutApproval.rowVersion
        });

        const approvedPayout = await getPayout(client, scenario.project.id, payout.id);
        const paidPayout = await registerPayout(client, payout.id, {
            payoutStage: approvedPayout.stageType,
            paidRecordAmount: '400.00',
            expectedVersion: approvedPayout.rowVersion
        });
        expect(paidPayout.status).toBe('paid');

        const adjustment = await createAdjustment(
            client,
            scenario.project.id,
            buildAdjustmentInput(scenario.calculation.id, payout.id, {
                adjustmentType: 'supplement',
                amount: '80.00',
                reason: 'e2e 补发差额'
            })
        );
        await submitAdjustmentApproval(client, adjustment.id, {
            expectedVersion: adjustment.rowVersion
        });

        const adjustmentApproval = await findAdjustmentApprovalRecord(client, adjustment.id);
        await approveRecord(financeManager.client, adjustmentApproval.id, {
            comment: '补发审批通过',
            expectedVersion: adjustmentApproval.rowVersion
        });

        const approvedAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        const executedAdjustment = await executeAdjustment(client, adjustment.id, {
            expectedVersion: approvedAdjustment.rowVersion
        });
        expect(executedAdjustment.status).toBe('executed');

        const payouts = await listPayouts(client, scenario.project.id);
        expect(
            payouts.some(
                (item) =>
                    item.payoutKind === 'supplement' &&
                    item.sourcePayoutId === payout.id &&
                    item.status === 'paid' &&
                    item.approvedAmountProjection.value === '80.00' &&
                    item.paidRecordAmountProjection.value === '80.00'
            )
        ).toBe(true);
    });

    it('marks source payout as reversed when clawback fully offsets the paid amount', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('commission-clawback');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        const payout = await createPayout(client, scenario.project.id, buildPayoutInput(scenario.calculation.id));
        await submitPayoutApproval(client, payout.id, { payoutStage: payout.stageType, expectedVersion: payout.rowVersion });

        const payoutApproval = await findPayoutApprovalRecord(client, payout.id);
        await approveRecord(financeManager.client, payoutApproval.id, {
            comment: '扣回前先完成原发放审批',
            expectedVersion: payoutApproval.rowVersion
        });

        const approvedPayout = await getPayout(client, scenario.project.id, payout.id);
        const paidPayout = await registerPayout(client, payout.id, {
            payoutStage: approvedPayout.stageType,
            paidRecordAmount: '400.00',
            expectedVersion: approvedPayout.rowVersion
        });
        expect(paidPayout.status).toBe('paid');

        const adjustment = await createAdjustment(
            client,
            scenario.project.id,
            buildAdjustmentInput(scenario.calculation.id, payout.id, {
                adjustmentType: 'clawback',
                amount: '400.00',
                reason: 'e2e 全额扣回'
            })
        );
        await submitAdjustmentApproval(client, adjustment.id, {
            expectedVersion: adjustment.rowVersion
        });

        const adjustmentApproval = await findAdjustmentApprovalRecord(client, adjustment.id);
        await approveRecord(financeManager.client, adjustmentApproval.id, {
            comment: '扣回审批通过',
            expectedVersion: adjustmentApproval.rowVersion
        });

        const approvedAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        const executedAdjustment = await executeAdjustment(client, adjustment.id, {
            expectedVersion: approvedAdjustment.rowVersion
        });
        expect(executedAdjustment.status).toBe('executed');

        const reversedPayout = await getPayout(client, scenario.project.id, payout.id);
        expect(reversedPayout.status).toBe('reversed');
    });

    it('submits a freeze dispute, arbitrates it, and switches the current freeze version', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-freeze-dispute');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        const freezeDetail = await getRoleAssignmentDetail(client, scenario.roleAssignment.targetId);
        expect(freezeDetail.allowedActions).toContain('submit-commission-freeze-dispute');

        const submitResult = await submitFreezeDispute(client, {
            freezeVersionId: scenario.roleAssignment.targetId,
            disputeReason: 'e2e 冻结角色需要重裁',
            affectedAssignmentIds: [profile.id],
            recalculationImpactMode: 'recalculate-and-adjust',
            expectedVersion: freezeDetail.freezeVersionSummary.rowVersion
        });
        expect(submitResult.businessStatusAfter).toBe('dispute-submitted');

        const disputeDetail = await getFreezeDispute(client, submitResult.disputeRecordId);
        expect(disputeDetail.freezeVersionId).toBe(scenario.roleAssignment.targetId);
        expect(disputeDetail.allowedActions).toEqual(['arbitrate-commission-freeze-dispute']);
        expect(disputeDetail.affectedAssignmentSummary).toContain(profile.displayName);

        const arbitrationResult = await arbitrateFreezeDispute(client, disputeDetail.disputeRecordId, {
            arbitrationDecision: 'replace-freeze-version',
            replacementAssignmentPayload: {
                participants: [
                    {
                        userId: profile.id,
                        displayName: profile.displayName,
                        roleType: 'sales-owner',
                        weight: 0.6
                    },
                    {
                        userId: '00000000-0000-4000-8000-000000000099',
                        displayName: 'e2e 协作人',
                        roleType: 'delivery-owner',
                        weight: 0.4
                    }
                ]
            },
            recalculationImpactMode: 'recalculate-and-adjust',
            expectedVersion: disputeDetail.rowVersion
        });
        expect(arbitrationResult.resultStatus).toBe('replacement-created');
        expect(arbitrationResult.supersededFreezeVersionId).toBe(scenario.roleAssignment.targetId);
        expect(arbitrationResult.replacementFreezeVersionId).not.toBeNull();

        const changeRequest = await getFreezeChangeRequest(client, arbitrationResult.changeRequestId);
        expect(changeRequest.disputeRecordId).toBe(disputeDetail.disputeRecordId);
        expect(changeRequest.replacementFreezeVersionId).toBe(arbitrationResult.replacementFreezeVersionId);
        expect(changeRequest.status).toBe('effective');
        expect(changeRequest.riskFlagSummary).toContain('effective-calculation-present');

        const supersededFreezeDetail = await getRoleAssignmentDetail(client, scenario.roleAssignment.targetId);
        expect(supersededFreezeDetail.freezeVersionSummary.status).toBe('superseded');
        expect(supersededFreezeDetail.freezeVersionSummary.isCurrent).toBe(false);
        expect(supersededFreezeDetail.allowedActions).toEqual([]);

        const currentFreezeVersion = await getCurrentRoleAssignment(client, scenario.project.id);
        expect(currentFreezeVersion).not.toBeNull();
        expect(currentFreezeVersion?.id).toBe(arbitrationResult.replacementFreezeVersionId);
        expect(currentFreezeVersion?.status).toBe('frozen');
        expect(currentFreezeVersion?.version).toBe(
            supersededFreezeDetail.freezeVersionSummary.version + 1
        );
    });

    it('rejects duplicate payout creation for the same calculation stage', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission-duplicate-payout');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        await createPayout(client, scenario.project.id, buildPayoutInput(scenario.calculation.id));

        const response = await client.post(
            `/projects/${scenario.project.id}/commission-payouts`,
            buildPayoutInput(scenario.calculation.id)
        );

        expectErrorStatus(response, 409, '已存在发放记录');
    });

    it('returns payout to draft when payout approval is rejected', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('commission-reject-payout');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        const submittedPayout = await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: scenario.payout.stageType,
            expectedVersion: scenario.payout.rowVersion
        });
        expect(submittedPayout.status).toBe('pending-approval');

        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        const rejectResult = await rejectRecord(financeManager.client, payoutApproval.id, {
            reason: '发放金额依据不足',
            comment: '请补充签报后重提',
            expectedVersion: payoutApproval.rowVersion
        });
        expect(rejectResult.resultStatus).toBe('rejected');
        expect(rejectResult.businessStatusAfter).toBe('draft');

        const rejectedPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        expect(rejectedPayout.status).toBe('draft');
        expect(rejectedPayout.approvedAmountProjection.value).toBeNull();
        expect(rejectedPayout.approvedAt).toBeNull();
    });

    it('marks adjustment as rejected when adjustment approval is rejected', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('commission-reject-adjustment');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: scenario.payout.stageType,
            expectedVersion: scenario.payout.rowVersion
        });
        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        await approveRecord(financeManager.client, payoutApproval.id, {
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

        const submittedAdjustment = await submitAdjustmentApproval(client, adjustment.id, {
            expectedVersion: adjustment.rowVersion
        });
        expect(submittedAdjustment.status).toBe('pending-approval');

        const adjustmentApproval = await findAdjustmentApprovalRecord(client, adjustment.id);
        const rejectResult = await rejectRecord(financeManager.client, adjustmentApproval.id, {
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
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('commission-approval-version');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: scenario.payout.stageType,
            expectedVersion: scenario.payout.rowVersion
        });

        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        const response = await financeManager.client.post(`/approval-records/${payoutApproval.id}:approve`, {
            comment: 'e2e 审批记录版本冲突',
            expectedVersion: payoutApproval.rowVersion + 1
        });

        expectErrorStatus(response, 409, 'ApprovalRecord version');
    });

    it('rejects duplicate payout approval submission while approval is pending', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-dup-pay');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: scenario.payout.stageType,
            expectedVersion: scenario.payout.rowVersion
        });

        const pendingPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        const response = await client.post(
            `/commission-payouts/${scenario.payout.id}:submitApproval`,
            {
                payoutStage: pendingPayout.stageType,
                expectedVersion: pendingPayout.rowVersion
            }
        );

        expectErrorStatus(response, 400, 'cannot submit approval in status pending-approval');
    });

    it('rejects duplicate adjustment approval submission while approval is pending', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('cms-dup-adj');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: scenario.payout.stageType,
            expectedVersion: scenario.payout.rowVersion
        });
        const payoutApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        await approveRecord(financeManager.client, payoutApproval.id, {
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

        await submitAdjustmentApproval(client, adjustment.id, {
            expectedVersion: adjustment.rowVersion
        });

        const pendingAdjustment = await getAdjustment(client, scenario.project.id, adjustment.id);
        const response = await client.post(
            `/commission-adjustments/${adjustment.id}:submitApproval`,
            {
                expectedVersion: pendingAdjustment.rowVersion
            }
        );

        expectErrorStatus(response, 400, 'cannot submit approval in status pending-approval');
    });

    it('creates a new payout approval record on resubmission and removes closed payout todos from /me/todos', async () => {
        const { client, profile } = await loginAsAdmin();
        const financeManager = await loginAsFinanceManager();
        const unique = makeUniqueSuffix('cms-resubmit-pay');

        const scenario = await setupDraftPayoutScenario(client, profile, unique);
        await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: scenario.payout.stageType,
            expectedVersion: scenario.payout.rowVersion
        });

        const firstApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        expect(firstApproval.currentStatus).toBe('pending');
        expect(firstApproval.targetStatus).toBe('pending-approval');
        expect(firstApproval.currentNodeName).toBe('提成发放审批');

        await rejectRecord(financeManager.client, firstApproval.id, {
            reason: '发放依据不足',
            comment: '请补充依据后重新送审',
            expectedVersion: firstApproval.rowVersion
        });

        await expectNoOpenTodoForTarget(financeManager.client, 'CommissionPayout', scenario.payout.id);

        const rejectedPayout = await getPayout(client, scenario.project.id, scenario.payout.id);
        expect(rejectedPayout.status).toBe('draft');

        const resubmittedPayout = await submitPayoutApproval(client, scenario.payout.id, {
            payoutStage: rejectedPayout.stageType,
            expectedVersion: rejectedPayout.rowVersion
        });
        expect(resubmittedPayout.status).toBe('pending-approval');

        const secondApproval = await findPayoutApprovalRecord(client, scenario.payout.id);
        expect(secondApproval.id).not.toBe(firstApproval.id);
        expect(secondApproval.currentStatus).toBe('pending');
        expect(secondApproval.targetStatus).toBe('pending-approval');
        expect(secondApproval.decision).toBeNull();

        const secondApprovalDetail = await getApprovalRecord(financeManager.client, secondApproval.id);
        expect(secondApprovalDetail.id).toBe(secondApproval.id);
        expect(secondApprovalDetail.currentApproverUserId).toBe(financeManager.profile.id);
    });

    it('rejects role-assignment freeze before project handover is complete', async () => {
        const { client, profile } = await loginAsAdmin();
        const fixture = PROJECT_HANDOVER_E2E_FIXTURES.staleVersion;
        const assignment = await createRoleAssignment(client, fixture.projectId, buildRoleAssignmentInput(profile));
        const response = await client.post(`/commission-role-assignments/${assignment.id}:freeze`, {
            sourceHandoverId: fixture.handoverId,
            handoverSummarySnapshotId: fixture.handoverSummarySnapshotId
        });

        expectErrorStatus(response, 400, 'is not confirmed');
    });

    it('rejects freezing a stale non-current draft role assignment', async () => {
        const { client, profile } = await loginAsAdmin();
        const fixture = COMMISSION_E2E_FIXTURES.main;

        const firstAssignment = await createRoleAssignment(client, fixture.projectId, buildRoleAssignmentInput(profile));
        const secondAssignment = await createRoleAssignment(client, fixture.projectId, {
            participants: [
                {
                    userId: profile.id,
                    displayName: profile.displayName,
                    roleType: 'sales-owner',
                    weight: 0.7
                },
                {
                    userId: '00000000-0000-4000-8000-000000000088',
                    displayName: 'e2e stale draft collaborator',
                    roleType: 'delivery-owner',
                    weight: 0.3
                }
            ]
        });

        expect(secondAssignment.id).not.toBe(firstAssignment.id);

        const response = await client.post(
            `/commission-role-assignments/${firstAssignment.id}:freeze`,
            {
                sourceHandoverId: fixture.handoverId,
                handoverSummarySnapshotId: fixture.handoverSummarySnapshotId
            }
        );

        expectErrorStatus(response, 422, '只有当前有效的角色分配草稿可以冻结');
    });

    it('rejects calculation trigger when the project has no active contract facts', async () => {
        const { client, profile } = await loginAsAdmin();
        const fixture = COMMISSION_E2E_FIXTURES.noActiveContract;
        const unique = makeUniqueSuffix('cms-contract-guard');

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const assignment = await createRoleAssignment(client, fixture.projectId, buildRoleAssignmentInput(profile));
        const frozenAssignment = await freezeRoleAssignment(client, assignment.id, {
            sourceHandoverId: fixture.handoverId,
            handoverSummarySnapshotId: fixture.handoverSummarySnapshotId,
            expectedVersion: assignment.rowVersion
        });
        expect(frozenAssignment.businessStatusAfter).toBe('frozen');

        const response = await client.post(
            `/projects/${fixture.projectId}/commission-calculations`,
            {
                ruleVersionId: ruleVersion.id,
                recognizedRevenueTaxExclusive: '100000.00',
                recognizedCostTaxExclusive: '70000.00'
            }
        );

        expectErrorStatus(response, 422, '当前项目不存在已生效合同台账');
    });

    it('rejects calculation trigger when confirmed receipts are below requested revenue', async () => {
        const { client, profile } = await loginAsAdmin();
        const fixture = COMMISSION_E2E_FIXTURES.main;
        const unique = makeUniqueSuffix('cms-receipt-guard');

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const assignment = await createRoleAssignment(client, fixture.projectId, buildRoleAssignmentInput(profile));
        await freezeRoleAssignment(client, assignment.id, {
            sourceHandoverId: fixture.handoverId,
            handoverSummarySnapshotId: fixture.handoverSummarySnapshotId,
            expectedVersion: assignment.rowVersion
        });

        const response = await client.post(
            `/projects/${fixture.projectId}/commission-calculations`,
            {
                ruleVersionId: ruleVersion.id,
                recognizedRevenueTaxExclusive: '120000.00',
                recognizedCostTaxExclusive: '70000.00'
            }
        );

        expectErrorStatus(response, 422, '已确认回款不足');
    });

    it('rejects calculation trigger when confirmed payments are below requested cost', async () => {
        const { client, profile } = await loginAsAdmin();
        const fixture = COMMISSION_E2E_FIXTURES.main;
        const unique = makeUniqueSuffix('cms-payment-guard');

        const ruleVersion = await createRuleVersion(client, buildCommissionRuleVersionInput(unique));
        await activateRuleVersion(client, ruleVersion.id);

        const assignment = await createRoleAssignment(client, fixture.projectId, buildRoleAssignmentInput(profile));
        await freezeRoleAssignment(client, assignment.id, {
            sourceHandoverId: fixture.handoverId,
            handoverSummarySnapshotId: fixture.handoverSummarySnapshotId,
            expectedVersion: assignment.rowVersion
        });

        const response = await client.post(
            `/projects/${fixture.projectId}/commission-calculations`,
            {
                ruleVersionId: ruleVersion.id,
                recognizedRevenueTaxExclusive: '100000.00',
                recognizedCostTaxExclusive: '80000.00'
            }
        );

        expectErrorStatus(response, 422, '已确认成本不足');
    });

    it('rejects recalculation when confirmed receipts are below requested revenue', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('cms-recalc-receipt-guard');

        const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
        const response = await client.post(
            `/commission-calculations/${scenario.calculation.id}:recalculate`,
            {
                reason: 'e2e 回款冲减后重算',
                recognizedRevenueTaxExclusive: '120000.00',
                recognizedCostTaxExclusive: '70000.00',
                expectedVersion: scenario.calculation.rowVersion
            }
        );

        expectErrorStatus(response, 422, '已确认回款不足');
    });
});
