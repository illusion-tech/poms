import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    BusinessAccountingFeedbackView,
    CommissionGateBindingHistoryView,
    OperatingSignalEvaluationView,
    ProjectBusinessOutcomeOverviewView,
    ProjectUnifiedAccountingView,
    ProjectVarianceRiskExplanationView,
    ReviewCommissionGateBindingRequest,
    ReviewCommissionGateBindingResult,
    ReviewOperatingSignalEvaluationRequest,
    ReviewOperatingSignalEvaluationResult
} from '@poms/shared-contracts';

export async function reviewOperatingSignalEvaluation(
    client: AxiosInstance,
    id: string,
    input: ReviewOperatingSignalEvaluationRequest
): Promise<ReviewOperatingSignalEvaluationResult> {
    const response = await client.post<ReviewOperatingSignalEvaluationResult>(`/operating-signal-evaluations/${id}:review`, input);
    return expectStatus(response, 200);
}

export async function getOperatingSignalEvaluation(client: AxiosInstance, id: string): Promise<OperatingSignalEvaluationView> {
    const response = await client.get<OperatingSignalEvaluationView>(`/operating-signal-evaluations/${id}`);
    return expectStatus(response, 200);
}

export async function reviewCommissionGateBinding(
    client: AxiosInstance,
    id: string,
    input: ReviewCommissionGateBindingRequest
): Promise<ReviewCommissionGateBindingResult> {
    const response = await client.post<ReviewCommissionGateBindingResult>(`/commission-gate-bindings/${id}:review`, input);
    return expectStatus(response, 200);
}

export async function getCommissionGateBinding(client: AxiosInstance, id: string): Promise<CommissionGateBindingHistoryView> {
    const response = await client.get<CommissionGateBindingHistoryView>(`/commission-gate-bindings/${id}`);
    return expectStatus(response, 200);
}

export async function getProjectBusinessOutcomeOverview(
    client: AxiosInstance,
    projectId: string
): Promise<ProjectBusinessOutcomeOverviewView> {
    const response = await client.get<ProjectBusinessOutcomeOverviewView>(`/projects/${projectId}/business-outcome-overview`);
    return expectStatus(response, 200);
}

export async function getProjectUnifiedAccounting(client: AxiosInstance, projectId: string): Promise<ProjectUnifiedAccountingView> {
    const response = await client.get<ProjectUnifiedAccountingView>(`/projects/${projectId}/unified-accounting`);
    return expectStatus(response, 200);
}

export async function getProjectVarianceRiskExplanation(
    client: AxiosInstance,
    projectId: string
): Promise<ProjectVarianceRiskExplanationView> {
    const response = await client.get<ProjectVarianceRiskExplanationView>(`/projects/${projectId}/variance-risk-explanation`);
    return expectStatus(response, 200);
}

export async function getBusinessAccountingFeedback(client: AxiosInstance, projectId: string): Promise<BusinessAccountingFeedbackView> {
    const response = await client.get<BusinessAccountingFeedbackView>(`/projects/${projectId}/business-accounting-feedback`);
    return expectStatus(response, 200);
}
