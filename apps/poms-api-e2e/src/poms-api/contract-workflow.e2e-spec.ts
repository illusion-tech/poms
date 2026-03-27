import { approveRecord, expectNoOpenTodoForTarget, findOpenTodoForTarget, rejectRecord } from '../support/approval-api';
import { loginAsAdmin } from '../support/api-client';
import { activateContract, createContract, getContract, getCurrentContractApproval, submitContractReview } from '../support/contract-api';
import { expectErrorStatus } from '../support/http';
import { createProjectForProfile } from '../support/project-api';
import { buildContractInput, makeUniqueSuffix } from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api contract workflow e2e', () => {
    it('runs the contract approval workflow end-to-end', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同审批链 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '188000.00'
            })
        );
        expect(contract.status).toBe('draft');

        const submitResult = await submitContractReview(client, contract.id, {
            comment: 'e2e 合同审核提交流程',
            expectedVersion: contract.rowVersion
        });
        expect(submitResult.resultStatus).toBe('submitted');
        expect(submitResult.businessStatusAfter).toBe('pending-review');

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        const approveResult = await approveRecord(client, todo.sourceId, {
            comment: 'e2e 审批通过',
            expectedVersion: 1
        });
        expect(approveResult.resultStatus).toBe('approved');

        const currentApproval = await getCurrentContractApproval(client, contract.id);
        expect(currentApproval.currentStatus).toBe('approved');

        const pendingReviewContract = await getContract(client, contract.id);
        expect(pendingReviewContract.status).toBe('pending-review');

        const activateResult = await activateContract(client, contract.id, {
            comment: 'e2e 合同生效',
            expectedVersion: pendingReviewContract.rowVersion
        });
        expect(activateResult.resultStatus).toBe('activated');
        expect(activateResult.businessStatusAfter).toBe('active');
        expect(activateResult.snapshotId).toBeTruthy();

        const activeContract = await getContract(client, contract.id);
        expect(activeContract.status).toBe('active');
    });

    it('rejects contract activation before review approval completes', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract-guard');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同状态约束 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '92000.00'
            })
        );

        const response = await client.post(`/contracts/${contract.id}/activate`, {
            comment: 'e2e 非法激活',
            expectedVersion: contract.rowVersion
        });

        expectErrorStatus(response, 400, 'cannot be activated in status draft');
    });

    it('returns the contract to draft when review approval is rejected', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract-reject');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同驳回链 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '126000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 合同审核驳回流程',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        const rejectResult = await rejectRecord(client, todo.sourceId, {
            reason: '资料不完整',
            comment: '补齐盖章页后重新提交',
            expectedVersion: 1
        });
        expect(rejectResult.resultStatus).toBe('rejected');
        expect(rejectResult.businessStatusAfter).toBe('draft');

        const currentApproval = await getCurrentContractApproval(client, contract.id);
        expect(currentApproval.currentStatus).toBe('rejected');
        expect(currentApproval.decision).toBe('rejected');

        const rejectedContract = await getContract(client, contract.id);
        expect(rejectedContract.status).toBe('draft');
    });

    it('returns 409 when contract activation uses a stale version', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract-version');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同版本冲突 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '135000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 合同版本校验',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        await approveRecord(client, todo.sourceId, {
            comment: 'e2e 审批通过',
            expectedVersion: 1
        });

        const pendingReviewContract = await getContract(client, contract.id);
        const response = await client.post(`/contracts/${contract.id}/activate`, {
            comment: 'e2e 合同生效版本冲突',
            expectedVersion: pendingReviewContract.rowVersion - 1
        });

        expectErrorStatus(response, 409, 'Contract version');
    });

    it('rejects duplicate contract review submission while approval is pending', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract-duplicate-review');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同重复送审 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '142000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 首次送审',
            expectedVersion: contract.rowVersion
        });

        const pendingReviewContract = await getContract(client, contract.id);
        const response = await client.post(`/contracts/${contract.id}/submit-review`, {
            comment: 'e2e 重复送审',
            expectedVersion: pendingReviewContract.rowVersion
        });

        expectErrorStatus(response, 400, 'cannot submit review in status pending-review');
    });

    it('creates a new approval record on resubmission and removes closed contract todos from /me/todos', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('contract-resubmit');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同重提读侧 ${unique}`,
            currentStage: 'negotiation'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '166000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 首次送审',
            expectedVersion: contract.rowVersion
        });

        const firstTodo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        expect(firstTodo.allowedActions).toEqual(['approve', 'reject']);
        expect(firstTodo.currentNodeName).toBe('合同审核');
        expect(firstTodo.targetTitle).toBe(`E2E-HT-${unique}`);

        const firstApproval = await getCurrentContractApproval(client, contract.id);
        expect(firstApproval.id).toBe(firstTodo.sourceId);

        await rejectRecord(client, firstApproval.id, {
            reason: '资料不完整',
            comment: '补齐附件后重新提审',
            expectedVersion: firstApproval.rowVersion
        });

        await expectNoOpenTodoForTarget(client, 'Contract', contract.id);

        const rejectedContract = await getContract(client, contract.id);
        expect(rejectedContract.status).toBe('draft');

        await submitContractReview(client, contract.id, {
            comment: 'e2e 驳回后重提',
            expectedVersion: rejectedContract.rowVersion
        });

        const secondTodo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        expect(secondTodo.sourceId).not.toBe(firstTodo.sourceId);
        expect(secondTodo.allowedActions).toEqual(['approve', 'reject']);

        const currentApproval = await getCurrentContractApproval(client, contract.id);
        expect(currentApproval.id).toBe(secondTodo.sourceId);
        expect(currentApproval.currentStatus).toBe('pending');
        expect(currentApproval.decision).toBeNull();
        expect(currentApproval.targetStatus).toBe('pending-review');
    });
});
