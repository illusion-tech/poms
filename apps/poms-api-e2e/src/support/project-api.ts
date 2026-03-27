import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import { buildProjectInput } from './test-data';
import type { CreateProjectRequest, ProjectSummary, SanitizedUserWithOrgUnits } from './types';

export function createProject(client: AxiosInstance, input: CreateProjectRequest): Promise<ProjectSummary> {
    return client.post<ProjectSummary>('/projects', input).then((response) => expectStatus(response, 201));
}

export function createProjectForProfile(
    client: AxiosInstance,
    profile: SanitizedUserWithOrgUnits,
    overrides: Partial<CreateProjectRequest> & Pick<CreateProjectRequest, 'projectCode' | 'projectName' | 'currentStage'>
): Promise<ProjectSummary> {
    return createProject(client, buildProjectInput(profile, overrides));
}
