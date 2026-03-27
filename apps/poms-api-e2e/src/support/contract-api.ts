import type { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    ApprovalRecordSummary,
    CommandResult,
    ContractSummary,
    CreateContractRequest,
    SubmitContractReviewRequest
} from './types';

export async function createContract(
    client: AxiosInstance,
    input: CreateContractRequest
): Promise<ContractSummary> {
    const response = await client.post<ContractSummary>('/contracts', input);
    return expectStatus(response, 201);
}

export async function getContract(
    client: AxiosInstance,
    contractId: string
): Promise<ContractSummary> {
    const response = await client.get<ContractSummary>(`/contracts/${contractId}`);
    return expectStatus(response, 200);
}

export async function submitContractReview(
    client: AxiosInstance,
    contractId: string,
    input: SubmitContractReviewRequest
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(
        `/contracts/${contractId}/submit-review`,
        input
    );
    return expectStatus(response, 200);
}

export async function getCurrentContractApproval(
    client: AxiosInstance,
    contractId: string
): Promise<ApprovalRecordSummary> {
    const response = await client.get<ApprovalRecordSummary>(
        `/contracts/${contractId}/current-approval`
    );
    return expectStatus(response, 200);
}

export async function activateContract(
    client: AxiosInstance,
    contractId: string,
    input: { comment?: string; expectedVersion?: number }
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/contracts/${contractId}/activate`, input);
    return expectStatus(response, 200);
}
