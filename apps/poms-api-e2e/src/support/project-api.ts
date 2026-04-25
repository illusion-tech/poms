import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import { buildProjectInput } from './test-data';
import type { CreateProjectRequest, ProjectSummary, SanitizedUserWithOrgUnits } from './types';

export function createProject(client: AxiosInstance, input: CreateProjectRequest): Promise<ProjectSummary> {
    return client.post<ProjectSummary>('/projects', input).then((response) => expectStatus(response, 201));
}

export function getProject(client: AxiosInstance, projectId: string): Promise<ProjectSummary> {
    return client.get<ProjectSummary>(`/projects/${projectId}`).then((response) => expectStatus(response, 200));
}

export function createProjectForProfile(
    client: AxiosInstance,
    profile: SanitizedUserWithOrgUnits,
    overrides: Partial<CreateProjectRequest> & { projectName: string; customerProjectNo?: string | null }
): Promise<ProjectSummary> {
    return createProject(client, buildProjectInput(profile, overrides));
}
