import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    ConfirmProjectHandoverRequest,
    ConfirmProjectHandoverResult,
    ContractHandoverSummaryView,
    ProjectHandoverDetailView
} from './types';

export async function getContractHandoverSummary(
    client: AxiosInstance,
    projectId: string
): Promise<ContractHandoverSummaryView> {
    const response = await client.get<ContractHandoverSummaryView>(`/projects/${projectId}/contract-handover`);
    return expectStatus(response, 200);
}

export async function getProjectHandoverDetailByProject(
    client: AxiosInstance,
    projectId: string
): Promise<ProjectHandoverDetailView> {
    const response = await client.get<ProjectHandoverDetailView>(`/projects/${projectId}/project-handover`);
    return expectStatus(response, 200);
}

export async function getProjectHandoverDetailByHandover(
    client: AxiosInstance,
    handoverId: string
): Promise<ProjectHandoverDetailView> {
    const response = await client.get<ProjectHandoverDetailView>(`/project-handovers/${handoverId}`);
    return expectStatus(response, 200);
}

export async function confirmProjectHandover(
    client: AxiosInstance,
    handoverId: string,
    input: ConfirmProjectHandoverRequest
): Promise<ConfirmProjectHandoverResult> {
    const response = await client.post<ConfirmProjectHandoverResult>(`/project-handovers/${handoverId}:confirm`, input);
    return expectStatus(response, 200);
}
