import { approveRecord, findOpenTodoForTarget } from '../support/approval-api';
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
});
