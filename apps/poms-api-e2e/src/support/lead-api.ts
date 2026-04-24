import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    ConvertLeadToProjectRequest,
    CreateLeadRequest,
    LeadDetailView,
    LeadSummary,
    ProjectSummary,
    QualifyLeadRequest
} from './types';

export function createLead(client: AxiosInstance, input: CreateLeadRequest): Promise<LeadSummary> {
    return client.post<LeadSummary>('/leads', input).then((response) => expectStatus(response, 201));
}

export function qualifyLead(
    client: AxiosInstance,
    leadId: string,
    input: QualifyLeadRequest
): Promise<LeadSummary> {
    return client.post<LeadSummary>(`/leads/${leadId}:qualify`, input).then((response) => expectStatus(response, 200));
}

export function convertLeadToProject(
    client: AxiosInstance,
    leadId: string,
    input: ConvertLeadToProjectRequest
): Promise<ProjectSummary> {
    return client.post<ProjectSummary>(`/leads/${leadId}:convertToProject`, input).then((response) => expectStatus(response, 200));
}

export function getLead(client: AxiosInstance, leadId: string): Promise<LeadDetailView> {
    return client.get<LeadDetailView>(`/leads/${leadId}`).then((response) => expectStatus(response, 200));
}
