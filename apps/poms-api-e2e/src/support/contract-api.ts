import type { AxiosInstance } from 'axios';
import { approveRecord, findOpenTodoForTarget } from './approval-api';
import { confirmPayment, confirmReceipt, createPayment, createReceipt } from './contract-finance-api';
import { expectStatus } from './http';
import {
    buildCommercialReleaseBaselineInput,
    buildContractInput,
    buildContractReadinessPackageInput
} from './test-data';
import type {
    ApprovalRecordSummary,
    CommercialDiffReviewResult,
    CommercialReleaseBaselineSummary,
    CommandResult,
    ContractDiffReviewHistoryView,
    ContractReadinessDetail,
    ContractSummary,
    CreateCommercialReleaseBaselineRequest,
    CreateContractRequest,
    CreateContractReadinessPackageRequest,
    InitializeContractSnapshotFromReadinessPackageRequest,
    InitializeReceivablePlanFromReadinessPackageRequest,
    ReadinessInitializationResult,
    ReviewCommercialReleaseBaselineDiffRequest,
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
        `/contracts/${contractId}:submitReview`,
        input
    );
    return expectStatus(response, 200);
}

export async function getCurrentContractApproval(
    client: AxiosInstance,
    contractId: string
): Promise<ApprovalRecordSummary> {
    const response = await client.get<ApprovalRecordSummary>(
        `/contracts/${contractId}/approval-record`
    );
    return expectStatus(response, 200);
}

export async function activateContract(
    client: AxiosInstance,
    contractId: string,
    input: { comment?: string; expectedVersion?: number }
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/contracts/${contractId}:activate`, input);
    return expectStatus(response, 200);
}

export async function createCommercialReleaseBaseline(
    client: AxiosInstance,
    input: CreateCommercialReleaseBaselineRequest
): Promise<CommercialReleaseBaselineSummary> {
    const response = await client.post<CommercialReleaseBaselineSummary>('/commercial-release-baselines', input);
    return expectStatus(response, 201);
}

export async function getCommercialReleaseBaseline(
    client: AxiosInstance,
    baselineId: string
): Promise<CommercialReleaseBaselineSummary> {
    const response = await client.get<CommercialReleaseBaselineSummary>(`/commercial-release-baselines/${baselineId}`);
    return expectStatus(response, 200);
}

export async function getCommercialDiffHistory(
    client: AxiosInstance,
    baselineId: string
): Promise<ContractDiffReviewHistoryView> {
    const response = await client.get<ContractDiffReviewHistoryView>(`/commercial-release-baselines/${baselineId}/diff-history`);
    return expectStatus(response, 200);
}

export async function reviewCommercialReleaseBaselineDiff(
    client: AxiosInstance,
    baselineId: string,
    input: ReviewCommercialReleaseBaselineDiffRequest
): Promise<CommercialDiffReviewResult> {
    const response = await client.post<CommercialDiffReviewResult>(
        `/commercial-release-baselines/${baselineId}:reviewDiff`,
        input
    );
    return expectStatus(response, 200);
}

export async function createContractReadinessPackage(
    client: AxiosInstance,
    input: CreateContractReadinessPackageRequest
): Promise<ContractReadinessDetail> {
    const response = await client.post<ContractReadinessDetail>('/contract-readiness-packages', input);
    return expectStatus(response, 201);
}

export async function getCurrentContractReadiness(
    client: AxiosInstance,
    projectId: string
): Promise<ContractReadinessDetail> {
    const response = await client.get<ContractReadinessDetail>(`/projects/${projectId}/contract-readiness`);
    return expectStatus(response, 200);
}

export async function initializeContractSnapshotFromReadiness(
    client: AxiosInstance,
    readinessPackageId: string,
    input: InitializeContractSnapshotFromReadinessPackageRequest = {}
): Promise<ReadinessInitializationResult> {
    const response = await client.post<ReadinessInitializationResult>(
        `/contract-readiness-packages/${readinessPackageId}:initializeContractSnapshot`,
        input
    );
    return expectStatus(response, 200);
}

export async function initializeReceivablePlanFromReadiness(
    client: AxiosInstance,
    readinessPackageId: string,
    input: InitializeReceivablePlanFromReadinessPackageRequest = {}
): Promise<ReadinessInitializationResult> {
    const response = await client.post<ReadinessInitializationResult>(
        `/contract-readiness-packages/${readinessPackageId}:initializeReceivablePlan`,
        input
    );
    return expectStatus(response, 200);
}

export async function prepareContractReadinessForProject(
    client: AxiosInstance,
    projectId: string,
    actorUserId: string,
    unique: string
): Promise<ContractReadinessDetail> {
    const baseline = await createCommercialReleaseBaseline(
        client,
        buildCommercialReleaseBaselineInput(projectId, actorUserId, unique)
    );

    await reviewCommercialReleaseBaselineDiff(client, baseline.id, {
        diffDecision: 'approved',
        reviewedFieldKeys: ['downPaymentRate'],
        expectedVersion: baseline.rowVersion
    });

    const refreshedBaseline = await getCommercialReleaseBaseline(client, baseline.id);
    const readinessPackage = await createContractReadinessPackage(
        client,
        buildContractReadinessPackageInput(projectId, actorUserId, refreshedBaseline.id, refreshedBaseline.latestDiffResultId)
    );

    await initializeContractSnapshotFromReadiness(client, readinessPackage.id, {
        expectedVersion: readinessPackage.rowVersion
    });

    return getCurrentContractReadiness(client, projectId);
}

export async function createActiveContractForProject(
    client: AxiosInstance,
    projectId: string,
    actorUserId: string,
    input: { contractNo: string; signedAmount?: string; receiptAmount?: string; paymentAmountExcludingTax?: string }
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

    await prepareContractReadinessForProject(client, projectId, actorUserId, input.contractNo);

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
    await confirmReceipt(client, receipt.id, {
        expectedVersion: receipt.rowVersion
    });

    const payment = await createPayment(client, projectId, {
        contractId: activeContract.id,
        amountExcludingTax: input.paymentAmountExcludingTax ?? '70000.00',
        paymentDate: new Date().toISOString(),
        costCategory: 'implementation',
        sourceType: 'manual'
    });
    await confirmPayment(client, payment.id, {
        expectedVersion: payment.rowVersion
    });

    return activeContract;
}
