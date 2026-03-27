import axios, { type AxiosInstance } from 'axios';
import { randomUUID } from 'node:crypto';

jest.setTimeout(120_000);

interface LoginResponse {
    accessToken: string;
}

interface OrgUnitSummary {
    id: string;
    name: string;
    code: string;
}

interface UserProfile {
    id: string;
    username: string;
    displayName: string;
    permissions: string[];
    orgUnits: OrgUnitSummary[];
}

interface ProjectSummary {
    id: string;
    projectCode: string;
    projectName: string;
    status: string;
    currentStage: string;
    rowVersion: number;
}

interface ContractSummary {
    id: string;
    projectId: string;
    contractNo: string;
    status: 'draft' | 'pending-review' | 'active' | 'terminated' | 'completed';
    signedAmount: string;
    rowVersion: number;
}

interface CommandResult {
    targetId: string;
    targetType: string;
    resultStatus: string;
    businessStatusAfter: string;
    approvalRecordId: string | null;
    confirmationRecordId: string | null;
    todoItemIds: string[];
    snapshotId: string | null;
}

interface TodoItemSummary {
    id: string;
    sourceType: string;
    sourceId: string;
    targetObjectType: string;
    targetObjectId: string;
    status: string;
    rowVersion: number;
}

interface ApprovalRecordSummary {
    id: string;
    currentStatus: string;
    rowVersion: number;
    targetObjectType: string;
    targetObjectId: string;
}

interface CommissionRuleVersionSummary {
    id: string;
    ruleCode: string;
    version: number;
    status: 'draft' | 'active' | 'stopped';
}

interface CommissionRoleAssignmentSummary {
    id: string;
    projectId: string;
    status: 'draft' | 'frozen' | 'superseded';
}

interface CommissionCalculationSummary {
    id: string;
    projectId: string;
    version: number;
    rowVersion: number;
    isCurrent: boolean;
    status: 'pending' | 'calculated' | 'effective' | 'superseded';
    commissionPool: string;
    recalculatedFromId: string | null;
}

interface CommissionPayoutSummary {
    id: string;
    projectId: string;
    calculationId: string;
    rowVersion: number;
    stageType: 'first' | 'second' | 'final';
    selectedTier: 'basic' | 'mid' | 'premium';
    theoreticalCapAmount: string;
    approvedAmount: string | null;
    paidRecordAmount: string | null;
    status: 'draft' | 'pending-approval' | 'approved' | 'paid' | 'suspended' | 'reversed';
}

interface CommissionAdjustmentSummary {
    id: string;
    projectId: string;
    rowVersion: number;
    adjustmentType: 'suspend-payout' | 'reverse-payout' | 'clawback' | 'supplement' | 'recalculate';
    relatedPayoutId: string | null;
    relatedCalculationId: string | null;
    amount: string | null;
    reason: string;
    status: 'draft' | 'pending-approval' | 'approved' | 'executed' | 'rejected' | 'closed';
}

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin123';

describe('poms-api e2e', () => {
    it('exposes root API and authenticated shell endpoints', async () => {
        const rootResponse = await axios.get<{ message: string }>('/');
        expect(rootResponse.status).toBe(200);
        expect(rootResponse.data).toEqual({ message: 'Hello API' });

        const { client, profile } = await loginAsAdmin();

        expect(profile.username).toBe(ADMIN_USERNAME);
        expect(profile.permissions).toEqual(expect.arrayContaining(['project:read', 'project:write', 'commission:payouts:manage']));

        const todosResponse = await client.get<TodoItemSummary[]>('/me/todos');
        expect(todosResponse.status).toBe(200);
        expect(Array.isArray(todosResponse.data)).toBe(true);
    });

    it('runs the contract approval workflow end-to-end', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract');

        const project = await createProject(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同审批链 ${unique}`,
            currentStage: 'negotiation'
        });

        const contractResponse = await client.post<ContractSummary>('/contracts', {
            projectId: project.id,
            contractNo: `E2E-HT-${unique}`,
            signedAmount: '188000.00',
            createdBy: profile.id,
            updatedBy: profile.id
        });
        expect(contractResponse.status).toBe(201);
        expect(contractResponse.data.status).toBe('draft');
        const contract = contractResponse.data;

        const submitResponse = await client.post<CommandResult>(`/contracts/${contract.id}/submit-review`, {
            comment: 'e2e 合同审核提交流程',
            expectedVersion: contract.rowVersion
        });
        expect(submitResponse.status).toBe(200);
        expect(submitResponse.data.resultStatus).toBe('submitted');
        expect(submitResponse.data.businessStatusAfter).toBe('pending-review');

        const todo = await findTodoForTarget(client, 'Contract', contract.id);
        const approval = await getApprovalRecord(client, todo.sourceId);

        const approveResponse = await client.post<CommandResult>(`/approval-records/${approval.id}/approve`, {
            comment: 'e2e 审批通过',
            expectedVersion: approval.rowVersion
        });
        expect(approveResponse.status).toBe(200);
        expect(approveResponse.data.resultStatus).toBe('approved');

        const currentApprovalResponse = await client.get<ApprovalRecordSummary>(`/contracts/${contract.id}/current-approval`);
        expect(currentApprovalResponse.status).toBe(200);
        expect(currentApprovalResponse.data.currentStatus).toBe('approved');

        const pendingReviewContract = await getContract(client, contract.id);
        expect(pendingReviewContract.status).toBe('pending-review');

        const activateResponse = await client.post<CommandResult>(`/contracts/${contract.id}/activate`, {
            comment: 'e2e 合同生效',
            expectedVersion: pendingReviewContract.rowVersion
        });
        expect(activateResponse.status).toBe(200);
        expect(activateResponse.data.resultStatus).toBe('activated');
        expect(activateResponse.data.businessStatusAfter).toBe('active');
        expect(activateResponse.data.snapshotId).toBeTruthy();

        const activeContract = await getContract(client, contract.id);
        expect(activeContract.status).toBe('active');
    });

    it('runs the commission workflow end-to-end, including adjustment and recalculation', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('commission');

        const project = await createProject(client, profile, {
            projectCode: `E2E-CMS-${unique}`,
            projectName: `E2E 提成治理链 ${unique}`,
            currentStage: 'execution'
        });

        const ruleVersionResponse = await client.post<CommissionRuleVersionSummary>('/commission/rule-versions', {
            ruleCode: `000-E2E-RULE-${unique}`,
            version: 1,
            tierDefinitionJson: {
                tiers: [{ minMarginRate: 0.2, maxMarginRate: null, commissionRate: 0.08 }]
            }
        });
        expect(ruleVersionResponse.status).toBe(201);
        expect(ruleVersionResponse.data.status).toBe('draft');

        const activateRuleResponse = await client.post<CommissionRuleVersionSummary>(`/commission/rule-versions/${ruleVersionResponse.data.id}/activate`);
        expect(activateRuleResponse.status).toBe(200);
        expect(activateRuleResponse.data.status).toBe('active');

        const assignmentResponse = await client.post<CommissionRoleAssignmentSummary>(`/commission/projects/${project.id}/role-assignment`, {
            participants: [{ userId: profile.id, displayName: profile.displayName, roleType: 'sales-owner', weight: 1 }]
        });
        expect(assignmentResponse.status).toBe(201);
        expect(assignmentResponse.data.status).toBe('draft');

        const freezeAssignmentResponse = await client.post<CommissionRoleAssignmentSummary>(`/commission/projects/${project.id}/role-assignment/${assignmentResponse.data.id}/freeze`);
        expect(freezeAssignmentResponse.status).toBe(200);
        expect(freezeAssignmentResponse.data.status).toBe('frozen');

        const calculationResponse = await client.post<CommissionCalculationSummary>(`/commission/projects/${project.id}/calculations/trigger`, {
            recognizedRevenueTaxExclusive: '100000.00',
            recognizedCostTaxExclusive: '70000.00'
        });
        expect(calculationResponse.status).toBe(201);
        expect(calculationResponse.data.status).toBe('calculated');
        expect(calculationResponse.data.commissionPool).toBe('2400.00');

        const confirmResponse = await client.post<CommissionCalculationSummary>(`/commission/projects/${project.id}/calculations/${calculationResponse.data.id}/effective`, {
            expectedVersion: calculationResponse.data.rowVersion
        });
        expect(confirmResponse.status).toBe(200);
        expect(confirmResponse.data.status).toBe('effective');

        const payoutResponse = await client.post<CommissionPayoutSummary>(`/commission/projects/${project.id}/payouts`, {
            calculationId: confirmResponse.data.id,
            stageType: 'first',
            selectedTier: 'basic'
        });
        expect(payoutResponse.status).toBe(201);
        expect(payoutResponse.data.status).toBe('draft');
        expect(payoutResponse.data.theoreticalCapAmount).toBe('480.00');

        const submitPayoutResponse = await client.post<CommissionPayoutSummary>(`/commission/projects/${project.id}/payouts/${payoutResponse.data.id}/submit-approval`, {
            expectedVersion: payoutResponse.data.rowVersion
        });
        expect(submitPayoutResponse.status).toBe(200);
        expect(submitPayoutResponse.data.status).toBe('pending-approval');

        const payoutTodo = await findTodoForTarget(client, 'CommissionPayout', payoutResponse.data.id);
        const payoutApproval = await getApprovalRecord(client, payoutTodo.sourceId);
        const approvePayoutResponse = await client.post<CommandResult>(`/approval-records/${payoutApproval.id}/approve`, {
            comment: 'e2e 发放审批通过',
            expectedVersion: payoutApproval.rowVersion
        });
        expect(approvePayoutResponse.status).toBe(200);
        expect(approvePayoutResponse.data.businessStatusAfter).toBe('approved');

        const approvedPayout = await getPayout(client, project.id, payoutResponse.data.id);
        expect(approvedPayout.status).toBe('approved');
        expect(approvedPayout.approvedAmount).toBe('480.00');

        const registerPayoutResponse = await client.post<CommissionPayoutSummary>(`/commission/projects/${project.id}/payouts/${payoutResponse.data.id}/register-payout`, {
            paidRecordAmount: '400.00',
            expectedVersion: approvedPayout.rowVersion
        });
        expect(registerPayoutResponse.status).toBe(200);
        expect(registerPayoutResponse.data.status).toBe('paid');
        expect(registerPayoutResponse.data.paidRecordAmount).toBe('400.00');

        const adjustmentResponse = await client.post<CommissionAdjustmentSummary>(`/commission/projects/${project.id}/adjustments`, {
            adjustmentType: 'suspend-payout',
            relatedPayoutId: payoutResponse.data.id,
            relatedCalculationId: confirmResponse.data.id,
            reason: 'e2e 退款核查，先暂停后续处理'
        });
        expect(adjustmentResponse.status).toBe(201);
        expect(adjustmentResponse.data.status).toBe('draft');

        const submitAdjustmentResponse = await client.post<CommissionAdjustmentSummary>(`/commission/projects/${project.id}/adjustments/${adjustmentResponse.data.id}/submit-approval`, {
            expectedVersion: adjustmentResponse.data.rowVersion
        });
        expect(submitAdjustmentResponse.status).toBe(200);
        expect(submitAdjustmentResponse.data.status).toBe('pending-approval');

        const adjustmentTodo = await findTodoForTarget(client, 'CommissionAdjustment', adjustmentResponse.data.id);
        const adjustmentApproval = await getApprovalRecord(client, adjustmentTodo.sourceId);
        const approveAdjustmentResponse = await client.post<CommandResult>(`/approval-records/${adjustmentApproval.id}/approve`, {
            comment: 'e2e 调整审批通过',
            expectedVersion: adjustmentApproval.rowVersion
        });
        expect(approveAdjustmentResponse.status).toBe(200);
        expect(approveAdjustmentResponse.data.businessStatusAfter).toBe('approved');

        const approvedAdjustment = await getAdjustment(client, project.id, adjustmentResponse.data.id);
        expect(approvedAdjustment.status).toBe('approved');

        const executeAdjustmentResponse = await client.post<CommissionAdjustmentSummary>(`/commission/projects/${project.id}/adjustments/${adjustmentResponse.data.id}/execute`, {
            expectedVersion: approvedAdjustment.rowVersion
        });
        expect(executeAdjustmentResponse.status).toBe(200);
        expect(executeAdjustmentResponse.data.status).toBe('executed');

        const suspendedPayout = await getPayout(client, project.id, payoutResponse.data.id);
        expect(suspendedPayout.status).toBe('suspended');

        const recalculateResponse = await client.post<CommissionCalculationSummary>(`/commission/projects/${project.id}/calculations/${confirmResponse.data.id}/recalculate`, {
            reason: 'e2e 异常重算',
            recognizedRevenueTaxExclusive: '90000.00',
            recognizedCostTaxExclusive: '70000.00',
            expectedVersion: confirmResponse.data.rowVersion
        });
        expect(recalculateResponse.status).toBe(200);
        expect(recalculateResponse.data.version).toBe(confirmResponse.data.version + 1);
        expect(recalculateResponse.data.recalculatedFromId).toBe(confirmResponse.data.id);
        expect(recalculateResponse.data.status).toBe('calculated');

        const calculationsResponse = await client.get<CommissionCalculationSummary[]>(`/commission/projects/${project.id}/calculations`);
        expect(calculationsResponse.status).toBe(200);
        expect(calculationsResponse.data.find((item) => item.id === confirmResponse.data.id)?.status).toBe('superseded');
        expect(calculationsResponse.data.find((item) => item.id === recalculateResponse.data.id)?.isCurrent).toBe(true);

        const adjustmentsResponse = await client.get<CommissionAdjustmentSummary[]>(`/commission/projects/${project.id}/adjustments`);
        expect(adjustmentsResponse.status).toBe(200);
        expect(adjustmentsResponse.data.some((item) => item.adjustmentType === 'recalculate' && item.relatedCalculationId === confirmResponse.data.id && item.status === 'executed')).toBe(true);
    });
});

async function loginAsAdmin(): Promise<{ client: AxiosInstance; profile: UserProfile }> {
    const loginResponse = await axios.post<LoginResponse>('/auth/login', {
        username: ADMIN_USERNAME,
        password: ADMIN_PASSWORD
    });

    expect(loginResponse.status).toBe(200);
    expect(loginResponse.data.accessToken).toBeTruthy();

    const client = axios.create({
        baseURL: axios.defaults.baseURL,
        validateStatus: () => true,
        proxy: false,
        headers: {
            Authorization: `Bearer ${loginResponse.data.accessToken}`
        }
    });

    const profileResponse = await client.get<UserProfile>('/auth/profile');
    expect(profileResponse.status).toBe(200);

    return { client, profile: profileResponse.data };
}

async function createProject(client: AxiosInstance, profile: UserProfile, input: { projectCode: string; projectName: string; currentStage: string }): Promise<ProjectSummary> {
    const response = await client.post<ProjectSummary>('/projects', {
        projectCode: input.projectCode,
        projectName: input.projectName,
        currentStage: input.currentStage,
        status: 'active',
        ownerOrgId: profile.orgUnits[0]?.id ?? null,
        ownerUserId: profile.id,
        createdBy: profile.id,
        updatedBy: profile.id
    });

    expect(response.status).toBe(201);
    return response.data;
}

async function findTodoForTarget(client: AxiosInstance, targetObjectType: string, targetObjectId: string): Promise<TodoItemSummary> {
    const response = await client.get<TodoItemSummary[]>('/me/todos');
    expect(response.status).toBe(200);

    const todo = response.data.find((item) => item.targetObjectType === targetObjectType && item.targetObjectId === targetObjectId && item.status === 'open');
    expect(todo).toBeDefined();
    return todo!;
}

async function getApprovalRecord(client: AxiosInstance, approvalRecordId: string): Promise<ApprovalRecordSummary> {
    const response = await client.get<ApprovalRecordSummary>(`/approval-records/${approvalRecordId}`);
    expect(response.status).toBe(200);
    return response.data;
}

async function getContract(client: AxiosInstance, contractId: string): Promise<ContractSummary> {
    const response = await client.get<ContractSummary>(`/contracts/${contractId}`);
    expect(response.status).toBe(200);
    return response.data;
}

async function getPayout(client: AxiosInstance, projectId: string, payoutId: string): Promise<CommissionPayoutSummary> {
    const response = await client.get<CommissionPayoutSummary[]>(`/commission/projects/${projectId}/payouts`);
    expect(response.status).toBe(200);
    const payout = response.data.find((item) => item.id === payoutId);
    expect(payout).toBeDefined();
    return payout!;
}

async function getAdjustment(client: AxiosInstance, projectId: string, adjustmentId: string): Promise<CommissionAdjustmentSummary> {
    const response = await client.get<CommissionAdjustmentSummary[]>(`/commission/projects/${projectId}/adjustments`);
    expect(response.status).toBe(200);
    const adjustment = response.data.find((item) => item.id === adjustmentId);
    expect(adjustment).toBeDefined();
    return adjustment!;
}

function makeUniqueSuffix(prefix: string): string {
    return `${prefix}-${Date.now()}-${randomUUID().slice(0, 8)}`.toUpperCase();
}
