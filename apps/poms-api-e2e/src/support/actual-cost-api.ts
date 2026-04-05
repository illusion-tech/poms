import { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import { CommandResult } from '@poms/shared-contracts';
import { PublishInternalCostRateVersionRequestDto, RegisterLaborCostRecordRequestDto, ReplaceLaborCostRecordRequestDto } from '@poms/api-contracts';

export async function publishInternalCostRateVersion(client: AxiosInstance, input: PublishInternalCostRateVersionRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/publish-internal-cost-rate-version', input);
    return expectStatus(response, 201);
}

export async function registerLaborCostRecord(client: AxiosInstance, input: RegisterLaborCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/register-labor-cost-record', input);
    return expectStatus(response, 201);
}

export async function replaceLaborCostRecord(client: AxiosInstance, input: ReplaceLaborCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/replace-labor-cost-record', input);
    return expectStatus(response, 201);
}