import { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    AccountingTaxTreatmentListView,
    AccountingTaxTreatmentSnapshotSummary,
    CommandResult,
    CostStageAttributionHistoryView,
    CreateExpenseProjectActualCostRecordRequest,
    CreateInvoiceProjectActualCostRecordRequest,
    CreateLaborProjectActualCostRecordRequest,
    CreatePaymentFactProjectActualCostRecordRequest,
    CreateProcurementProjectActualCostRecordRequest,
    CostStageAttributionSnapshotSummary,
    ExpenseRecordDetailView,
    ExpenseRecordList,
    ExpenseRecordSummary,
    OperatingBaselinePackageSummary,
    OperatingRestatementListView,
    OperatingRestatementSummary,
    PeriodClosingSnapshotSummary,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordListView,
    ProjectOperatingSnapshotSummary,
    ReplaceLaborCostRecordRequest,
    SharedCostAllocationBasisSummary,
    SharedCostAllocationResultListView
} from '@poms/shared-contracts';
import {
    ActivateOperatingBaselinePackageRequestDto,
    ConfirmAccountingTaxTreatmentRequestDto,
    ConfirmCostStageAttributionRequestDto,
    ConfirmExpenseRecordRequestDto,
    ConfirmSharedCostAllocationBasisRequestDto,
    CreateExpenseRecordRequestDto,
    CreateOperatingRestatementRequestDto,
    CreatePeriodClosingSnapshotRequestDto,
    CreateProjectOperatingSnapshotRequestDto,
    UpdateExpenseRecordRequestDto,
    VoidExpenseRecordRequestDto,
    PublishInternalCostRateVersionRequestDto,
    ReclassifyCostStageAttributionRequestDto,
    ReplaceAccountingTaxTreatmentRequestDto,
    ReplaceSharedCostAllocationResultRequestDto
} from '@poms/api-contracts';

export async function publishInternalCostRateVersion(client: AxiosInstance, input: PublishInternalCostRateVersionRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/internal-cost-rate-versions', input);
    return expectStatus(response, 201);
}

export async function registerPaymentFactCostRecord(
    client: AxiosInstance,
    projectId: string,
    input: Omit<CreatePaymentFactProjectActualCostRecordRequest, 'costType'>
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/projects/${projectId}/actual-cost-records`, {
        costType: 'PAYMENT_FACT',
        ...input
    });
    return expectStatus(response, 201);
}

export async function registerInvoiceCostRecord(
    client: AxiosInstance,
    projectId: string,
    input: Omit<CreateInvoiceProjectActualCostRecordRequest, 'costType'>
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/projects/${projectId}/actual-cost-records`, {
        costType: 'INVOICE',
        ...input
    });
    return expectStatus(response, 201);
}

export async function registerExpenseCostRecord(
    client: AxiosInstance,
    projectId: string,
    input: Omit<CreateExpenseProjectActualCostRecordRequest, 'costType'>
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/projects/${projectId}/actual-cost-records`, {
        costType: 'EXPENSE',
        ...input
    });
    return expectStatus(response, 201);
}

export async function registerProcurementCostRecord(
    client: AxiosInstance,
    projectId: string,
    input: Omit<CreateProcurementProjectActualCostRecordRequest, 'costType'>
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/projects/${projectId}/actual-cost-records`, {
        costType: 'PROCUREMENT',
        ...input
    });
    return expectStatus(response, 201);
}

export async function activateOperatingBaselinePackage(
    client: AxiosInstance,
    input: ActivateOperatingBaselinePackageRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/operating-baseline-packages', input);
    return expectStatus(response, 201);
}

export async function getCurrentOperatingBaselinePackage(
    client: AxiosInstance,
    projectId: string
): Promise<OperatingBaselinePackageSummary> {
    const response = await client.get<OperatingBaselinePackageSummary>(`/projects/${projectId}/operating-baseline-package`);
    return expectStatus(response, 200);
}

export async function createProjectOperatingSnapshot(
    client: AxiosInstance,
    input: CreateProjectOperatingSnapshotRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-operating-snapshots', input);
    return expectStatus(response, 201);
}

export async function getProjectOperatingSnapshot(client: AxiosInstance, id: string): Promise<ProjectOperatingSnapshotSummary> {
    const response = await client.get<ProjectOperatingSnapshotSummary>(`/project-operating-snapshots/${id}`);
    return expectStatus(response, 200);
}

export async function createPeriodClosingSnapshot(
    client: AxiosInstance,
    input: CreatePeriodClosingSnapshotRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/period-closing-snapshots', input);
    return expectStatus(response, 201);
}

export async function getPeriodClosingSnapshot(client: AxiosInstance, id: string): Promise<PeriodClosingSnapshotSummary> {
    const response = await client.get<PeriodClosingSnapshotSummary>(`/period-closing-snapshots/${id}`);
    return expectStatus(response, 200);
}

export async function createOperatingRestatement(
    client: AxiosInstance,
    input: CreateOperatingRestatementRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/operating-restatements', input);
    return expectStatus(response, 201);
}

export async function listOperatingRestatements(client: AxiosInstance, projectId: string): Promise<OperatingRestatementListView> {
    const response = await client.get<OperatingRestatementListView>(`/projects/${projectId}/operating-restatements`);
    return expectStatus(response, 200);
}

export async function getOperatingRestatement(client: AxiosInstance, id: string): Promise<OperatingRestatementSummary> {
    const response = await client.get<OperatingRestatementSummary>(`/operating-restatements/${id}`);
    return expectStatus(response, 200);
}

export async function confirmSharedCostAllocationBasis(
    client: AxiosInstance,
    input: ConfirmSharedCostAllocationBasisRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/shared-cost-allocation-bases', input);
    return expectStatus(response, 201);
}

export async function getSharedCostAllocationBasis(
    client: AxiosInstance,
    id: string
): Promise<SharedCostAllocationBasisSummary> {
    const response = await client.get<SharedCostAllocationBasisSummary>(`/shared-cost-allocation-bases/${id}`);
    return expectStatus(response, 200);
}

export async function listSharedCostAllocationResults(
    client: AxiosInstance,
    basisId: string
): Promise<SharedCostAllocationResultListView> {
    const response = await client.get<SharedCostAllocationResultListView>(`/shared-cost-allocation-bases/${basisId}/results`);
    return expectStatus(response, 200);
}

export async function replaceSharedCostAllocationResult(
    client: AxiosInstance,
    supersededAllocationResultId: string,
    input: ReplaceSharedCostAllocationResultRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(
        `/shared-cost-allocation-results/${supersededAllocationResultId}:replace`,
        input
    );
    return expectStatus(response, 201);
}

export async function confirmCostStageAttribution(
    client: AxiosInstance,
    costRecordId: string,
    input: ConfirmCostStageAttributionRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/project-actual-cost-records/${costRecordId}/stage-attributions`, input);
    return expectStatus(response, 201);
}

export async function reclassifyCostStageAttribution(
    client: AxiosInstance,
    supersededAttributionId: string,
    input: ReclassifyCostStageAttributionRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/cost-stage-attributions/${supersededAttributionId}:reclassify`, input);
    return expectStatus(response, 201);
}

export async function listCostStageAttributions(
    client: AxiosInstance,
    costRecordId: string
): Promise<CostStageAttributionHistoryView> {
    const response = await client.get<CostStageAttributionHistoryView>(`/project-actual-cost-records/${costRecordId}/stage-attributions`);
    return expectStatus(response, 200);
}

export async function getCostStageAttribution(client: AxiosInstance, id: string): Promise<CostStageAttributionSnapshotSummary> {
    const response = await client.get<CostStageAttributionSnapshotSummary>(`/cost-stage-attributions/${id}`);
    return expectStatus(response, 200);
}

export async function confirmAccountingTaxTreatment(
    client: AxiosInstance,
    projectId: string,
    input: ConfirmAccountingTaxTreatmentRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/projects/${projectId}/accounting-tax-treatments`, input);
    return expectStatus(response, 201);
}

export async function replaceAccountingTaxTreatment(
    client: AxiosInstance,
    supersededTaxTreatmentSnapshotId: string,
    input: ReplaceAccountingTaxTreatmentRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(
        `/accounting-tax-treatments/${supersededTaxTreatmentSnapshotId}:replace`,
        input
    );
    return expectStatus(response, 201);
}

export async function listAccountingTaxTreatments(client: AxiosInstance, projectId: string): Promise<AccountingTaxTreatmentListView> {
    const response = await client.get<AccountingTaxTreatmentListView>(`/projects/${projectId}/accounting-tax-treatments`);
    return expectStatus(response, 200);
}

export async function getAccountingTaxTreatment(client: AxiosInstance, id: string): Promise<AccountingTaxTreatmentSnapshotSummary> {
    const response = await client.get<AccountingTaxTreatmentSnapshotSummary>(`/accounting-tax-treatments/${id}`);
    return expectStatus(response, 200);
}

export async function listExpenseRecords(client: AxiosInstance, projectId: string): Promise<ExpenseRecordList> {
    const response = await client.get<ExpenseRecordList>(`/projects/${projectId}/expense-records`);
    return expectStatus(response, 200);
}

export async function getExpenseRecordDetail(client: AxiosInstance, id: string): Promise<ExpenseRecordDetailView> {
    const response = await client.get<ExpenseRecordDetailView>(`/expense-records/${id}`);
    return expectStatus(response, 200);
}

export async function createExpenseRecord(
    client: AxiosInstance,
    projectId: string,
    input: CreateExpenseRecordRequestDto
): Promise<ExpenseRecordSummary> {
    const response = await client.post<ExpenseRecordSummary>(`/projects/${projectId}/expense-records`, input);
    return expectStatus(response, 201);
}

export async function updateExpenseRecord(
    client: AxiosInstance,
    id: string,
    input: UpdateExpenseRecordRequestDto
): Promise<ExpenseRecordSummary> {
    const response = await client.patch<ExpenseRecordSummary>(`/expense-records/${id}`, input);
    return expectStatus(response, 200);
}

export async function confirmExpenseRecord(
    client: AxiosInstance,
    id: string,
    input: ConfirmExpenseRecordRequestDto
): Promise<ExpenseRecordSummary> {
    const response = await client.post<ExpenseRecordSummary>(`/expense-records/${id}:confirm`, input);
    return expectStatus(response, 200);
}

export async function voidExpenseRecord(
    client: AxiosInstance,
    id: string,
    input: VoidExpenseRecordRequestDto
): Promise<ExpenseRecordSummary> {
    const response = await client.post<ExpenseRecordSummary>(`/expense-records/${id}:void`, input);
    return expectStatus(response, 200);
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

export async function registerLaborCostRecord(
    client: AxiosInstance,
    projectId: string,
    input: Omit<CreateLaborProjectActualCostRecordRequest, 'costType'>
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/projects/${projectId}/actual-cost-records`, {
        costType: 'LABOR',
        ...input
    });
    return expectStatus(response, 201);
}

export async function replaceLaborCostRecord(
    client: AxiosInstance,
    id: string,
    input: ReplaceLaborCostRecordRequest
): Promise<CommandResult> {
    const response = await client.post<CommandResult>(`/project-actual-cost-records/${id}:replace`, input);
    return expectStatus(response, 201);
}
