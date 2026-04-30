import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    AssignLeadOwnerRequest,
    ClaimLeadOwnerRequest,
    ConvertLeadToProjectRequest,
    CreateLeadRequest,
    LeadDetailView,
    LeadListView,
    LeadOwnerAssignmentResult,
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

export function listLeads(client: AxiosInstance, params: Record<string, string>): Promise<LeadListView[]> {
    return client.get<LeadListView[]>('/leads', { params }).then((response) => expectStatus(response, 200));
}

export function claimLeadOwner(
    client: AxiosInstance,
    leadId: string,
    input: ClaimLeadOwnerRequest
): Promise<LeadOwnerAssignmentResult> {
    return client.post<LeadOwnerAssignmentResult>(`/leads/${leadId}:claim`, input).then((response) => expectStatus(response, 200));
}

export function assignLeadOwner(
    client: AxiosInstance,
    leadId: string,
    input: AssignLeadOwnerRequest
): Promise<LeadOwnerAssignmentResult> {
    return client.post<LeadOwnerAssignmentResult>(`/leads/${leadId}:assignOwner`, input).then((response) => expectStatus(response, 200));
}
