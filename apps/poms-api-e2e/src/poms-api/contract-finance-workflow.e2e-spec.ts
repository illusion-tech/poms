import { approveRecord, findOpenTodoForTarget } from '../support/approval-api';
import { loginAsAdmin } from '../support/api-client';
import { createPayment, createReceipt, listPayments, listReceipts, confirmPayment, confirmReceipt } from '../support/contract-finance-api';
import { expectErrorStatus } from '../support/http';
import { activateContract, createContract, getContract, submitContractReview } from '../support/contract-api';
import { createProjectForProfile } from '../support/project-api';
import { buildContractInput, makeUniqueSuffix } from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api contract-finance workflow e2e', () => {
    it('records and confirms receipt/payment facts for an active contract/project', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('finance');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同资金事实 ${unique}`,
            currentStage: 'execution'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '188000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 合同资金前置送审',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        await approveRecord(client, todo.sourceId, {
            comment: 'e2e 合同资金前置审批通过',
            expectedVersion: 1
        });

        const pendingReviewContract = await getContract(client, contract.id);
        await activateContract(client, contract.id, {
            comment: 'e2e 合同资金前置生效',
            expectedVersion: pendingReviewContract.rowVersion
        });

        const activeContract = await getContract(client, contract.id);
        expect(activeContract.status).toBe('active');

        const receipt = await createReceipt(client, activeContract.id, {
            receiptAmount: '100000.00',
            receiptDate: new Date().toISOString(),
            sourceType: 'manual'
        });
        expect(receipt.status).toBe('pending-confirmation');

        const confirmedReceipt = await confirmReceipt(client, activeContract.id, receipt.id, {
            expectedVersion: receipt.rowVersion
        });
        expect(confirmedReceipt.status).toBe('confirmed');

        const payment = await createPayment(client, project.id, {
            contractId: activeContract.id,
            paymentAmount: '70000.00',
            paymentDate: new Date().toISOString(),
            costCategory: 'implementation',
            sourceType: 'manual'
        });
        expect(payment.status).toBe('recorded');

        const confirmedPayment = await confirmPayment(client, project.id, payment.id, {
            expectedVersion: payment.rowVersion
        });
        expect(confirmedPayment.status).toBe('confirmed');

        const receipts = await listReceipts(client, activeContract.id);
        expect(receipts.some((item) => item.id === receipt.id && item.status === 'confirmed')).toBe(true);

        const payments = await listPayments(client, project.id);
        expect(payments.some((item) => item.id === payment.id && item.status === 'confirmed')).toBe(true);
    });

    it('rejects receipt creation for a contract that is not active yet', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('finance-draft');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同资金草稿约束 ${unique}`,
            currentStage: 'execution'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '98000.00'
            })
        );

        const response = await client.post(
            `/contract-finance/contracts/${contract.id}/receipts`,
            {
                receiptAmount: '1000.00',
                receiptDate: new Date().toISOString(),
                sourceType: 'manual'
            }
        );

        expectErrorStatus(response, 422, '只有已生效合同可以登记回款');
    });

    it('rejects receipt confirmation when the expected version is stale', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('finance-version');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 合同资金版本冲突 ${unique}`,
            currentStage: 'execution'
        });

        const contract = await createContract(
            client,
            buildContractInput(project.id, profile.id, {
                contractNo: `E2E-HT-${unique}`,
                signedAmount: '128000.00'
            })
        );

        await submitContractReview(client, contract.id, {
            comment: 'e2e 合同资金版本冲突送审',
            expectedVersion: contract.rowVersion
        });

        const todo = await findOpenTodoForTarget(client, 'Contract', contract.id);
        await approveRecord(client, todo.sourceId, {
            comment: 'e2e 合同资金版本冲突审批通过',
            expectedVersion: 1
        });

        const pendingReviewContract = await getContract(client, contract.id);
        await activateContract(client, contract.id, {
            comment: 'e2e 合同资金版本冲突生效',
            expectedVersion: pendingReviewContract.rowVersion
        });

        const activeContract = await getContract(client, contract.id);
        const receipt = await createReceipt(client, activeContract.id, {
            receiptAmount: '50000.00',
            receiptDate: new Date().toISOString(),
            sourceType: 'manual'
        });

        const response = await client.post(
            `/contract-finance/contracts/${activeContract.id}/receipts/${receipt.id}/confirm`,
            {
                expectedVersion: receipt.rowVersion + 1
            }
        );

        expectErrorStatus(response, 409, 'ReceiptRecord version');
    });
});
