import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import { findOpenTodoForTarget, getApprovalRecord } from './approval-api';
import { loginAsFinanceManager } from './api-client';
import { COMMISSION_E2E_FIXTURES } from './commission-seed-fixtures';
import { getProject } from './project-api';
import {
    buildCalculationInput,
    buildCommissionRuleVersionInput,
    buildPayoutInput,
    buildRoleAssignmentInput
} from './test-data';
import type {
    ArbitrateCommissionFreezeDisputeRequest,
    ArbitrateCommissionFreezeDisputeResult,
    CommissionAdjustmentSummary,
    CommissionCalculationSummary,
    CommissionDepartureExceptionDecisionSummary,
    CommissionFinalSettlementView,
    CommissionFreezeChangeRequestDetailView,
    CommissionFreezeDisputeDetailView,
    CommissionPayoutSummary,
    CommissionRoleAssignmentDetailView,
    CommissionRoleAssignmentSummary,
    CommissionRuleExplanationView,
    CommissionRuleVersionSummary,
    ConfirmCommissionCalculationRequest,
    CreateCommissionAdjustmentRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionDepartureExceptionDecisionRequest,
    CreateCommissionPayoutRequest,
    CreateCommissionRoleAssignmentRequest,
    CreateCommissionRuleVersionRequest,
    FreezeCommissionRoleAssignmentRequest,
    FreezeCommissionRoleAssignmentResult,
    ProjectSummary,
    RecalculateCommissionRequest,
    RegisterCommissionPayoutRequest,
    SanitizedUserWithOrgUnits,
    SubmitCommissionFreezeDisputeRequest,
    SubmitCommissionFreezeDisputeResult,
    SubmitCommissionAdjustmentApprovalRequest,
    SubmitCommissionPayoutApprovalRequest
} from './types';

export interface EffectiveCalculationScenario {
    project: ProjectSummary;
    ruleVersion: CommissionRuleVersionSummary;
    roleAssignment: FreezeCommissionRoleAssignmentResult;
    calculation: CommissionCalculationSummary;
}

export interface DraftPayoutScenario extends EffectiveCalculationScenario {
    payout: CommissionPayoutSummary;
}

export async function createRuleVersion(
    client: AxiosInstance,
    input: CreateCommissionRuleVersionRequest
): Promise<CommissionRuleVersionSummary> {
    const response = await client.post<CommissionRuleVersionSummary>(
        '/commission-rule-versions',
        input
    );
    return expectStatus(response, 201);
}

export async function activateRuleVersion(
    client: AxiosInstance,
    ruleVersionId: string
): Promise<CommissionRuleVersionSummary> {
    const response = await client.post<CommissionRuleVersionSummary>(
        `/commission-rule-versions/${ruleVersionId}:activate`
    );
    return expectStatus(response, 200);
}

export async function createRoleAssignment(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionRoleAssignmentRequest
): Promise<CommissionRoleAssignmentSummary> {
    const response = await client.post<CommissionRoleAssignmentSummary>(
        `/projects/${projectId}/commission-role-assignments`,
        input
    );
    return expectStatus(response, 201);
}

export async function getCurrentRoleAssignment(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionRoleAssignmentSummary | null> {
    const response = await client.get<CommissionRoleAssignmentSummary | null>(
        `/projects/${projectId}/commission-role-assignment`
    );
    return expectStatus(response, 200);
}

export async function getRoleAssignmentDetail(
    client: AxiosInstance,
    assignmentId: string
): Promise<CommissionRoleAssignmentDetailView> {
    const response = await client.get<CommissionRoleAssignmentDetailView>(
        `/commission-role-assignments/${assignmentId}`
    );
    return expectStatus(response, 200);
}

export async function freezeRoleAssignment(
    client: AxiosInstance,
    assignmentId: string,
    input: FreezeCommissionRoleAssignmentRequest
): Promise<FreezeCommissionRoleAssignmentResult> {
    const response = await client.post<FreezeCommissionRoleAssignmentResult>(
        `/commission-role-assignments/${assignmentId}:freeze`,
        input
    );
    return expectStatus(response, 200);
}

export async function submitFreezeDispute(
    client: AxiosInstance,
    input: SubmitCommissionFreezeDisputeRequest
): Promise<SubmitCommissionFreezeDisputeResult> {
    const response = await client.post<SubmitCommissionFreezeDisputeResult>(
        '/commission-freeze-disputes',
        input
    );
    return expectStatus(response, 201);
}

export async function getFreezeDispute(
    client: AxiosInstance,
    disputeId: string
): Promise<CommissionFreezeDisputeDetailView> {
    const response = await client.get<CommissionFreezeDisputeDetailView>(
        `/commission-freeze-disputes/${disputeId}`
    );
    return expectStatus(response, 200);
}

export async function arbitrateFreezeDispute(
    client: AxiosInstance,
    disputeId: string,
    input: ArbitrateCommissionFreezeDisputeRequest
): Promise<ArbitrateCommissionFreezeDisputeResult> {
    const response = await client.post<ArbitrateCommissionFreezeDisputeResult>(
        `/commission-freeze-disputes/${disputeId}:arbitrate`,
        input
    );
    return expectStatus(response, 200);
}

export async function getFreezeChangeRequest(
    client: AxiosInstance,
    changeRequestId: string
): Promise<CommissionFreezeChangeRequestDetailView> {
    const response = await client.get<CommissionFreezeChangeRequestDetailView>(
        `/commission-freeze-change-requests/${changeRequestId}`
    );
    return expectStatus(response, 200);
}

export async function createCalculation(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionCalculationRequest
): Promise<CommissionCalculationSummary> {
    const response = await client.post<CommissionCalculationSummary>(
        `/projects/${projectId}/commission-calculations`,
        input
    );
    return expectStatus(response, 201);
}

export async function approveCalculation(
    client: AxiosInstance,
    calculationId: string,
    input: ConfirmCommissionCalculationRequest
): Promise<CommissionCalculationSummary> {
    const response = await client.post<CommissionCalculationSummary>(
        `/commission-calculations/${calculationId}:approve`,
        input
    );
    return expectStatus(response, 200);
}

export async function listCalculations(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionCalculationSummary[]> {
    const response = await client.get<CommissionCalculationSummary[]>(
        `/projects/${projectId}/commission-calculations`
    );
    return expectStatus(response, 200);
}

export async function createPayout(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionPayoutRequest
): Promise<CommissionPayoutSummary> {
    const response = await client.post<CommissionPayoutSummary>(
        `/projects/${projectId}/commission-payouts`,
        input
    );
    return expectStatus(response, 201);
}

export async function submitPayoutApproval(
    client: AxiosInstance,
    payoutId: string,
    input: SubmitCommissionPayoutApprovalRequest
): Promise<CommissionPayoutSummary> {
    const response = await client.post<CommissionPayoutSummary>(
        `/commission-payouts/${payoutId}:submitApproval`,
        input
    );
    return expectStatus(response, 200);
}

export async function getCommissionFinalSettlement(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionFinalSettlementView> {
    const response = await client.get<CommissionFinalSettlementView>(
        `/projects/${projectId}/commission-final-settlement`
    );
    return expectStatus(response, 200);
}

export async function getCommissionRuleExplanation(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionRuleExplanationView> {
    const response = await client.get<CommissionRuleExplanationView>(
        `/projects/${projectId}/commission-rule-explanation`
    );
    return expectStatus(response, 200);
}

export async function createDepartureExceptionDecision(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionDepartureExceptionDecisionRequest
): Promise<CommissionDepartureExceptionDecisionSummary> {
    const response = await client.post<CommissionDepartureExceptionDecisionSummary>(
        `/projects/${projectId}/commission-departure-exception-decisions`,
        input
    );
    return expectStatus(response, 201);
}

export async function listPayouts(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionPayoutSummary[]> {
    const response = await client.get<CommissionPayoutSummary[]>(
        `/projects/${projectId}/commission-payouts`
    );
    return expectStatus(response, 200);
}

export async function getPayout(
    client: AxiosInstance,
    projectId: string,
    payoutId: string
): Promise<CommissionPayoutSummary> {
    const payouts = await listPayouts(client, projectId);
    const payout = payouts.find((item) => item.id === payoutId);
    expect(payout).toBeDefined();
    return payout!;
}

export async function registerPayout(
    client: AxiosInstance,
    payoutId: string,
    input: RegisterCommissionPayoutRequest
): Promise<CommissionPayoutSummary> {
    const response = await client.post<CommissionPayoutSummary>(
        `/commission-payouts/${payoutId}:registerPayout`,
        input
    );
    return expectStatus(response, 200);
}

export async function createAdjustment(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionAdjustmentRequest
): Promise<CommissionAdjustmentSummary> {
    const response = await client.post<CommissionAdjustmentSummary>(
        `/projects/${projectId}/commission-adjustments`,
        input
    );
    return expectStatus(response, 201);
}

export async function submitAdjustmentApproval(
    client: AxiosInstance,
    adjustmentId: string,
    input: SubmitCommissionAdjustmentApprovalRequest
): Promise<CommissionAdjustmentSummary> {
    const response = await client.post<CommissionAdjustmentSummary>(
        `/commission-adjustments/${adjustmentId}:submitApproval`,
        input
    );
    return expectStatus(response, 200);
}

export async function listAdjustments(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionAdjustmentSummary[]> {
    const response = await client.get<CommissionAdjustmentSummary[]>(
        `/projects/${projectId}/commission-adjustments`
    );
    return expectStatus(response, 200);
}

export async function getAdjustment(
    client: AxiosInstance,
    projectId: string,
    adjustmentId: string
): Promise<CommissionAdjustmentSummary> {
    const adjustments = await listAdjustments(client, projectId);
    const adjustment = adjustments.find((item) => item.id === adjustmentId);
    expect(adjustment).toBeDefined();
    return adjustment!;
}

export async function executeAdjustment(
    client: AxiosInstance,
    adjustmentId: string,
    input: { expectedVersion?: number }
): Promise<CommissionAdjustmentSummary> {
    const response = await client.post<CommissionAdjustmentSummary>(
        `/commission-adjustments/${adjustmentId}:execute`,
        input
    );
    return expectStatus(response, 200);
}

export async function recalculateCalculation(
    client: AxiosInstance,
    calculationId: string,
    input: RecalculateCommissionRequest
): Promise<CommissionCalculationSummary> {
    const response = await client.post<CommissionCalculationSummary>(
        `/commission-calculations/${calculationId}:recalculate`,
        input
    );
    return expectStatus(response, 200);
}

export async function setupEffectiveCalculationScenario(
    client: AxiosInstance,
    profile: SanitizedUserWithOrgUnits,
    unique: string
): Promise<EffectiveCalculationScenario> {
    const fixture = COMMISSION_E2E_FIXTURES.main;
    const project = await getProject(client, fixture.projectId);

    const ruleVersion = await createRuleVersion(
        client,
        buildCommissionRuleVersionInput(unique)
    );
    await activateRuleVersion(client, ruleVersion.id);

    const roleAssignmentDraft = await createRoleAssignment(
        client,
        project.id,
        buildRoleAssignmentInput(profile)
    );
    const roleAssignment = await freezeRoleAssignment(
        client,
        roleAssignmentDraft.id,
        {
            sourceHandoverId: fixture.handoverId,
            handoverSummarySnapshotId: fixture.handoverSummarySnapshotId,
            expectedVersion: roleAssignmentDraft.rowVersion
        }
    );

    const calculated = await createCalculation(
        client,
        project.id,
        buildCalculationInput(ruleVersion.id)
    );
    const calculation = await approveCalculation(client, calculated.id, {
        expectedVersion: calculated.rowVersion
    });

    return {
        project,
        ruleVersion,
        roleAssignment,
        calculation
    };
}

export async function setupDraftPayoutScenario(
    client: AxiosInstance,
    profile: SanitizedUserWithOrgUnits,
    unique: string
): Promise<DraftPayoutScenario> {
    const scenario = await setupEffectiveCalculationScenario(client, profile, unique);
    const payout = await createPayout(
        client,
        scenario.project.id,
        buildPayoutInput(scenario.calculation.id)
    );

    return {
        ...scenario,
        payout
    };
}

export async function findPayoutApprovalRecord(
    _client: AxiosInstance,
    payoutId: string
) {
    const financeManager = await loginAsFinanceManager();
    const payoutTodo = await findOpenTodoForTarget(financeManager.client, 'CommissionPayout', payoutId);
    return getApprovalRecord(financeManager.client, payoutTodo.sourceId);
}

export async function findAdjustmentApprovalRecord(
    _client: AxiosInstance,
    adjustmentId: string
) {
    const financeManager = await loginAsFinanceManager();
    const adjustmentTodo = await findOpenTodoForTarget(
        financeManager.client,
        'CommissionAdjustment',
        adjustmentId
    );
    return getApprovalRecord(financeManager.client, adjustmentTodo.sourceId);
}
