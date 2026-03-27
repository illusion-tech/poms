import type { AxiosInstance } from 'axios';
import { approveRecord, findOpenTodoForTarget } from './approval-api';
import { confirmPayment, confirmReceipt, createPayment, createReceipt } from './contract-finance-api';
import { expectStatus } from './http';
import { buildContractInput } from './test-data';
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

export async function createActiveContractForProject(
    client: AxiosInstance,
    projectId: string,
    actorUserId: string,
    input: { contractNo: string; signedAmount?: string; receiptAmount?: string; paymentAmount?: string }
): Promise<ContractSummary> {
    const contract = await createContract(
        client,
        buildContractInput(projectId, actorUserId, {
            contractNo: input.contractNo,
            signedAmount: input.signedAmount ?? '188000.00'
        })
    );

    await submitContractReview(client, contract.id, {
        comment: 'e2e 提成前置合同送审',
        expectedVersion: contract.rowVersion
    });

    const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
    await approveRecord(client, todo.sourceId, {
        comment: 'e2e 提成前置合同审批通过',
        expectedVersion: 1
    });

    const pendingReviewContract = await getContract(client, contract.id);
    await activateContract(client, contract.id, {
        comment: 'e2e 提成前置合同生效',
        expectedVersion: pendingReviewContract.rowVersion
    });

    const activeContract = await getContract(client, contract.id);

    const receipt = await createReceipt(client, activeContract.id, {
        receiptAmount: input.receiptAmount ?? input.signedAmount ?? '188000.00',
        receiptDate: new Date().toISOString(),
        sourceType: 'manual'
    });
    await confirmReceipt(client, activeContract.id, receipt.id, {
        expectedVersion: receipt.rowVersion
    });

    const payment = await createPayment(client, projectId, {
        contractId: activeContract.id,
        paymentAmount: input.paymentAmount ?? '70000.00',
        paymentDate: new Date().toISOString(),
        costCategory: 'implementation',
        sourceType: 'manual'
    });
    await confirmPayment(client, projectId, payment.id, {
        expectedVersion: payment.rowVersion
    });

    return activeContract;
}
