import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import { findOpenTodoForTarget, getApprovalRecord } from './approval-api';
import { createProjectForProfile } from './project-api';
import {
    buildCalculationInput,
    buildCommissionRuleVersionInput,
    buildPayoutInput,
    buildRoleAssignmentInput
} from './test-data';
import type {
    CommissionAdjustmentSummary,
    CommissionCalculationSummary,
    CommissionPayoutSummary,
    CommissionRoleAssignmentSummary,
    CommissionRuleVersionSummary,
    ConfirmCommissionCalculationRequest,
    CreateCommissionAdjustmentRequest,
    CreateCommissionCalculationRequest,
    CreateCommissionPayoutRequest,
    CreateCommissionRoleAssignmentRequest,
    CreateCommissionRuleVersionRequest,
    ProjectSummary,
    RecalculateCommissionRequest,
    RegisterCommissionPayoutRequest,
    SanitizedUserWithOrgUnits,
    SubmitCommissionAdjustmentApprovalRequest,
    SubmitCommissionPayoutApprovalRequest
} from './types';

export interface EffectiveCalculationScenario {
    project: ProjectSummary;
    ruleVersion: CommissionRuleVersionSummary;
    roleAssignment: CommissionRoleAssignmentSummary;
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
        '/commission/rule-versions',
        input
    );
    return expectStatus(response, 201);
}

export async function activateRuleVersion(
    client: AxiosInstance,
    ruleVersionId: string
): Promise<CommissionRuleVersionSummary> {
    const response = await client.post<CommissionRuleVersionSummary>(
        `/commission/rule-versions/${ruleVersionId}/activate`
    );
    return expectStatus(response, 200);
}

export async function createRoleAssignment(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionRoleAssignmentRequest
): Promise<CommissionRoleAssignmentSummary> {
    const response = await client.post<CommissionRoleAssignmentSummary>(
        `/commission/projects/${projectId}/role-assignment`,
        input
    );
    return expectStatus(response, 201);
}

export async function freezeRoleAssignment(
    client: AxiosInstance,
    projectId: string,
    assignmentId: string
): Promise<CommissionRoleAssignmentSummary> {
    const response = await client.post<CommissionRoleAssignmentSummary>(
        `/commission/projects/${projectId}/role-assignment/${assignmentId}/freeze`
    );
    return expectStatus(response, 200);
}

export async function triggerCalculation(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionCalculationRequest
): Promise<CommissionCalculationSummary> {
    const response = await client.post<CommissionCalculationSummary>(
        `/commission/projects/${projectId}/calculations/trigger`,
        input
    );
    return expectStatus(response, 201);
}

export async function confirmCalculation(
    client: AxiosInstance,
    projectId: string,
    calculationId: string,
    input: ConfirmCommissionCalculationRequest
): Promise<CommissionCalculationSummary> {
    const response = await client.post<CommissionCalculationSummary>(
        `/commission/projects/${projectId}/calculations/${calculationId}/effective`,
        input
    );
    return expectStatus(response, 200);
}

export async function listCalculations(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionCalculationSummary[]> {
    const response = await client.get<CommissionCalculationSummary[]>(
        `/commission/projects/${projectId}/calculations`
    );
    return expectStatus(response, 200);
}

export async function createPayout(
    client: AxiosInstance,
    projectId: string,
    input: CreateCommissionPayoutRequest
): Promise<CommissionPayoutSummary> {
    const response = await client.post<CommissionPayoutSummary>(
        `/commission/projects/${projectId}/payouts`,
        input
    );
    return expectStatus(response, 201);
}

export async function submitPayoutApproval(
    client: AxiosInstance,
    projectId: string,
    payoutId: string,
    input: SubmitCommissionPayoutApprovalRequest
): Promise<CommissionPayoutSummary> {
    const response = await client.post<CommissionPayoutSummary>(
        `/commission/projects/${projectId}/payouts/${payoutId}/submit-approval`,
        input
    );
    return expectStatus(response, 200);
}

export async function listPayouts(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionPayoutSummary[]> {
    const response = await client.get<CommissionPayoutSummary[]>(
        `/commission/projects/${projectId}/payouts`
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
    projectId: string,
    payoutId: string,
    input: RegisterCommissionPayoutRequest
): Promise<CommissionPayoutSummary> {
    const response = await client.post<CommissionPayoutSummary>(
        `/commission/projects/${projectId}/payouts/${payoutId}/register-payout`,
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
        `/commission/projects/${projectId}/adjustments`,
        input
    );
    return expectStatus(response, 201);
}

export async function submitAdjustmentApproval(
    client: AxiosInstance,
    projectId: string,
    adjustmentId: string,
    input: SubmitCommissionAdjustmentApprovalRequest
): Promise<CommissionAdjustmentSummary> {
    const response = await client.post<CommissionAdjustmentSummary>(
        `/commission/projects/${projectId}/adjustments/${adjustmentId}/submit-approval`,
        input
    );
    return expectStatus(response, 200);
}

export async function listAdjustments(
    client: AxiosInstance,
    projectId: string
): Promise<CommissionAdjustmentSummary[]> {
    const response = await client.get<CommissionAdjustmentSummary[]>(
        `/commission/projects/${projectId}/adjustments`
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
    projectId: string,
    adjustmentId: string,
    input: { expectedVersion?: number }
): Promise<CommissionAdjustmentSummary> {
    const response = await client.post<CommissionAdjustmentSummary>(
        `/commission/projects/${projectId}/adjustments/${adjustmentId}/execute`,
        input
    );
    return expectStatus(response, 200);
}

export async function recalculateCalculation(
    client: AxiosInstance,
    projectId: string,
    calculationId: string,
    input: RecalculateCommissionRequest
): Promise<CommissionCalculationSummary> {
    const response = await client.post<CommissionCalculationSummary>(
        `/commission/projects/${projectId}/calculations/${calculationId}/recalculate`,
        input
    );
    return expectStatus(response, 200);
}

export async function setupEffectiveCalculationScenario(
    client: AxiosInstance,
    profile: SanitizedUserWithOrgUnits,
    unique: string
): Promise<EffectiveCalculationScenario> {
    const project = await createProjectForProfile(client, profile, {
        projectCode: `E2E-CMS-${unique}`,
        projectName: `E2E 提成治理链 ${unique}`,
        currentStage: 'execution'
    });

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
        project.id,
        roleAssignmentDraft.id
    );

    const calculated = await triggerCalculation(
        client,
        project.id,
        buildCalculationInput()
    );
    const calculation = await confirmCalculation(client, project.id, calculated.id, {
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
    client: AxiosInstance,
    payoutId: string
) {
    const payoutTodo = await findOpenTodoForTarget(client, 'CommissionPayout', payoutId);
    return getApprovalRecord(client, payoutTodo.sourceId);
}

export async function findAdjustmentApprovalRecord(
    client: AxiosInstance,
    adjustmentId: string
) {
    const adjustmentTodo = await findOpenTodoForTarget(
        client,
        'CommissionAdjustment',
        adjustmentId
    );
    return getApprovalRecord(client, adjustmentTodo.sourceId);
}
