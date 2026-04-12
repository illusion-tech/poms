import { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    CommandResult,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordListView
} from '@poms/shared-contracts';
import {
    PublishInternalCostRateVersionRequestDto,
    RegisterLaborCostRecordRequestDto,
    RegisterPaymentFactCostRecordRequestDto,
    ReplaceLaborCostRecordRequestDto
} from '@poms/api-contracts';

export async function publishInternalCostRateVersion(client: AxiosInstance, input: PublishInternalCostRateVersionRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/publish-internal-cost-rate-version', input);
    return expectStatus(response, 201);
}

export async function registerPaymentFactCostRecord(client: AxiosInstance, input: RegisterPaymentFactCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-actual-cost-records/register-payment-fact', input);
    return expectStatus(response, 201);
}

export async function listProjectActualCostRecords(
    client: AxiosInstance,
    projectId: string,
    params?: {
        costType?: string;
        recordStatus?: string;
        sourceType?: string;
    }
): Promise<ProjectActualCostRecordListView> {
    const response = await client.get<ProjectActualCostRecordListView>(`/projects/${projectId}/actual-cost-records`, { params });
    return expectStatus(response, 200);
}

export async function getProjectActualCostRecordDetail(client: AxiosInstance, id: string): Promise<ProjectActualCostRecordDetailView> {
    const response = await client.get<ProjectActualCostRecordDetailView>(`/project-actual-cost-records/${id}`);
    return expectStatus(response, 200);
}

export async function registerLaborCostRecord(client: AxiosInstance, input: RegisterLaborCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/register-labor-cost-record', input);
    return expectStatus(response, 201);
}

export async function replaceLaborCostRecord(client: AxiosInstance, input: ReplaceLaborCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/replace-labor-cost-record', input);
    return expectStatus(response, 201);
}
