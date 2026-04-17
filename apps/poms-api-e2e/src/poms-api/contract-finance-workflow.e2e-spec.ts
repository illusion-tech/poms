import { approveRecord, findOpenTodoForTarget } from '../support/approval-api';
import { loginAsAdmin } from '../support/api-client';
import {
    createPayable,
    closeInvoiceRecord,
    confirmPayment,
    confirmReceipt,
    createInvoice,
    createPayment,
    createReceipt,
    getPayable,
    getInvoice,
    listInvoices,
    listPayables,
    listPayments,
    listReceipts,
    markInvoiceException,
    resolveInvoiceException,
    updatePayable,
    updateInvoice
} from '../support/contract-finance-api';
import { expectErrorStatus } from '../support/http';
import { activateContract, createContract, getContract, prepareContractReadinessForProject, submitContractReview } from '../support/contract-api';
import { createProjectForProfile } from '../support/project-api';
import { buildContractInput, makeUniqueSuffix } from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api contract-finance workflow e2e', () => {
    it('records invoice, receipt and payment facts for an active contract/project', async () => {
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

        await prepareContractReadinessForProject(client, project.id, profile.id, unique);

        const pendingReviewContract = await getContract(client, contract.id);
        await activateContract(client, contract.id, {
            comment: 'e2e 合同资金前置生效',
            expectedVersion: pendingReviewContract.rowVersion
        });

        const activeContract = await getContract(client, contract.id);
        expect(activeContract.status).toBe('active');

        const invoice = await createInvoice(client, project.id, {
            contractId: activeContract.id,
            invoiceType: 'output',
            invoiceNumber: `E2E-INV-${unique}`,
            invoiceAmount: '188000.00',
            invoiceDate: new Date().toISOString().slice(0, 10)
        });
        expect(invoice.status).toBe('draft');

        const issuedInvoice = await updateInvoice(client, invoice.id, {
            status: 'issued',
            expectedVersion: invoice.rowVersion
        });
        expect(issuedInvoice.status).toBe('issued');

        const exceptionInvoice = await markInvoiceException(client, invoice.id, {
            reason: 'e2e amount mismatch',
            comment: 'e2e supplier attachment',
            expectedVersion: issuedInvoice.rowVersion
        });
        expect(exceptionInvoice.exceptionStatus).toBe('open');

        const resolvedInvoice = await resolveInvoiceException(client, invoice.id, {
            resolution: 'e2e verified',
            comment: 'e2e difference accepted',
            expectedVersion: exceptionInvoice.rowVersion
        });
        expect(resolvedInvoice.exceptionStatus).toBe('resolved');

        const closedInvoice = await closeInvoiceRecord(client, invoice.id, {
            reason: 'e2e archived',
            comment: 'e2e ready for source mapping',
            expectedVersion: resolvedInvoice.rowVersion
        });
        expect(closedInvoice.status).toBe('closed');

        const receipt = await createReceipt(client, activeContract.id, {
            receiptAmount: '100000.00',
            receiptDate: new Date().toISOString(),
            sourceType: 'manual'
        });
        expect(receipt.status).toBe('pending-confirmation');

        const confirmedReceipt = await confirmReceipt(client, receipt.id, {
            expectedVersion: receipt.rowVersion
        });
        expect(confirmedReceipt.status).toBe('confirmed');

        const payable = await createPayable(client, project.id, {
            contractId: activeContract.id,
            vendorName: 'E2E 供应商',
            costCategory: 'implementation',
            payableDescription: 'E2E 外部实施采购',
            amountExcludingTax: '90000.00',
            expectedPaymentDate: new Date().toISOString().slice(0, 10)
        });
        expect(payable.status).toBe('recorded');

        const updatedPayable = await updatePayable(client, payable.id, {
            evidenceSummary: 'e2e payable evidence',
            expectedVersion: payable.rowVersion
        });
        expect(updatedPayable.evidenceSummary).toBe('e2e payable evidence');

        const payment = await createPayment(client, project.id, {
            contractId: activeContract.id,
            payableRecordId: payable.id,
            amountExcludingTax: '70000.00',
            paymentDate: new Date().toISOString(),
            costCategory: 'implementation',
            sourceType: 'manual'
        });
        expect(payment.status).toBe('recorded');

        const confirmedPayment = await confirmPayment(client, payment.id, {
            expectedVersion: payment.rowVersion
        });
        expect(confirmedPayment.status).toBe('confirmed');

        const receipts = await listReceipts(client, activeContract.id);
        expect(receipts.some((item) => item.id === receipt.id && item.status === 'confirmed')).toBe(true);

        const invoices = await listInvoices(client, project.id);
        expect(invoices.some((item) => item.id === invoice.id && item.status === 'closed')).toBe(true);

        const invoiceDetail = await getInvoice(client, invoice.id);
        expect(invoiceDetail.allowedActions).toEqual([]);

        const payables = await listPayables(client, project.id);
        expect(payables.some((item) => item.id === payable.id && item.status === 'partially-paid')).toBe(true);

        const payableDetail = await getPayable(client, payable.id);
        expect(payableDetail.allowedActions).toEqual([]);
        expect(payableDetail.settledAmountExcludingTax).toBe('70000.00');

        const payments = await listPayments(client, project.id);
        expect(
            payments.some(
                (item) => item.id === payment.id && item.status === 'confirmed' && item.payableRecordId === payable.id
            )
        ).toBe(true);
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
            `/contracts/${contract.id}/receipt-records`,
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

        await prepareContractReadinessForProject(client, project.id, profile.id, unique);

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
            `/receipt-records/${receipt.id}:confirm`,
            {
                expectedVersion: receipt.rowVersion + 1
            }
        );

        expectErrorStatus(response, 409, 'ReceiptRecord version');
    });

    it('rejects output invoice creation without active contract binding', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('finance-invoice');

        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PRJ-${unique}`,
            projectName: `E2E 发票合同约束 ${unique}`,
            currentStage: 'execution'
        });

        const response = await client.post(
            `/projects/${project.id}/invoice-records`,
            {
                invoiceType: 'output',
                contractId: null,
                invoiceNumber: `E2E-INV-${unique}`,
                invoiceAmount: '1000.00',
                invoiceDate: new Date().toISOString().slice(0, 10)
            }
        );

        expectErrorStatus(response, 422, '销项发票必须关联已生效合同');
    });
});
