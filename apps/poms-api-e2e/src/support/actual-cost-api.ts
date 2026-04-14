import { AxiosInstance } from 'axios';
import { expectStatus } from './http';
import type {
    CommandResult,
    ExpenseRecordDetailView,
    ExpenseRecordList,
    ExpenseRecordSummary,
    OperatingBaselinePackageSummary,
    OperatingRestatementListView,
    OperatingRestatementSummary,
    PeriodClosingSnapshotSummary,
    ProjectActualCostRecordDetailView,
    ProjectActualCostRecordListView,
    ProjectOperatingSnapshotSummary
} from '@poms/shared-contracts';
import {
    ActivateOperatingBaselinePackageRequestDto,
    ConfirmExpenseRecordRequestDto,
    CreateExpenseRecordRequestDto,
    CreateOperatingRestatementRequestDto,
    CreatePeriodClosingSnapshotRequestDto,
    CreateProjectOperatingSnapshotRequestDto,
    UpdateExpenseRecordRequestDto,
    VoidExpenseRecordRequestDto,
    PublishInternalCostRateVersionRequestDto,
    RegisterExpenseCostRecordRequestDto,
    RegisterInvoiceCostRecordRequestDto,
    RegisterLaborCostRecordRequestDto,
    RegisterPaymentFactCostRecordRequestDto,
    RegisterProcurementCostRecordRequestDto,
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

export async function registerInvoiceCostRecord(client: AxiosInstance, input: RegisterInvoiceCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-actual-cost-records/register-invoice', input);
    return expectStatus(response, 201);
}

export async function registerExpenseCostRecord(client: AxiosInstance, input: RegisterExpenseCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-actual-cost-records/register-expense', input);
    return expectStatus(response, 201);
}

export async function registerProcurementCostRecord(
    client: AxiosInstance,
    input: RegisterProcurementCostRecordRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-actual-cost-records/register-procurement', input);
    return expectStatus(response, 201);
}

export async function activateOperatingBaselinePackage(
    client: AxiosInstance,
    input: ActivateOperatingBaselinePackageRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/activate-operating-baseline-package', input);
    return expectStatus(response, 201);
}

export async function getCurrentOperatingBaselinePackage(
    client: AxiosInstance,
    projectId: string
): Promise<OperatingBaselinePackageSummary> {
    const response = await client.get<OperatingBaselinePackageSummary>(`/projects/${projectId}/operating-baseline-package/current`);
    return expectStatus(response, 200);
}

export async function createProjectOperatingSnapshot(
    client: AxiosInstance,
    input: CreateProjectOperatingSnapshotRequestDto
): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/create-project-operating-snapshot', input);
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
    const response = await client.post<CommandResult>('/project-cost/create-period-closing-snapshot', input);
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
    const response = await client.post<CommandResult>('/project-cost/create-operating-restatement', input);
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
    const response = await client.post<ExpenseRecordSummary>(`/expense-records/${id}/confirm`, input);
    return expectStatus(response, 200);
}

export async function voidExpenseRecord(
    client: AxiosInstance,
    id: string,
    input: VoidExpenseRecordRequestDto
): Promise<ExpenseRecordSummary> {
    const response = await client.post<ExpenseRecordSummary>(`/expense-records/${id}/void`, input);
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

export async function registerLaborCostRecord(client: AxiosInstance, input: RegisterLaborCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/register-labor-cost-record', input);
    return expectStatus(response, 201);
}

export async function replaceLaborCostRecord(client: AxiosInstance, input: ReplaceLaborCostRecordRequestDto): Promise<CommandResult> {
    const response = await client.post<CommandResult>('/project-cost/replace-labor-cost-record', input);
    return expectStatus(response, 201);
}
