import {
    confirmExpenseRecord,
    createExpenseRecord,
    getExpenseRecordDetail,
    getProjectActualCostRecordDetail,
    listExpenseRecords,
    listProjectActualCostRecords,
    publishInternalCostRateVersion,
    updateExpenseRecord,
    voidExpenseRecord,
    registerInvoiceCostRecord,
    registerLaborCostRecord,
    registerPaymentFactCostRecord,
    replaceLaborCostRecord
} from '../support/actual-cost-api';
import { loginAsAdmin } from '../support/api-client';
import { confirmPayment, createInvoice, createPayment, updateInvoice } from '../support/contract-finance-api';
import { createProjectForProfile } from '../support/project-api';

jest.setTimeout(120_000);

describe('Actual Cost Workflow E2E', () => {
    it('should complete the labor cost registry and replace workflow', async () => {
        const { client, profile } = await loginAsAdmin();

        const unique = Date.now();
        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-AC-${unique}`,
            projectName: `E2E Actual Cost Project ${unique}`,
            currentStage: 'execution'
        });
        expect(project).toBeDefined();

        const publishRateResult = await publishInternalCostRateVersion(client, {
            rateScopeType: 'ROLE',
            roleCode: `dev-${unique}`,
            rateUnit: 'DAY',
            rateValue: '1000',
            currency: 'CNY',
            effectiveFrom: '2023-01-01'
        });
        expect(publishRateResult.resultStatus).toBe('success');
        const rateVersionId = publishRateResult.targetId;

        const registerLaborResult = await registerLaborCostRecord(client, {
            projectId: project.id,
            laborPeriodType: 'MONTH',
            laborPeriodStart: '2023-01-01',
            laborPeriodEnd: '2023-01-31',
            laborRole: `dev-${unique}`,
            rateVersionId,
            actualPersonDays: '20'
        });
        expect(registerLaborResult.resultStatus).toBe('success');
        const recordId = registerLaborResult.targetId;

        const replaceLaborResult = await replaceLaborCostRecord(client, {
            supersedesRecordId: recordId,
            laborPeriodStart: '2023-01-01',
            laborPeriodEnd: '2023-01-31',
            rateVersionId,
            actualPersonDays: '22.5',
            replaceReason: 'Corrected working hours'
        });
        expect(replaceLaborResult.resultStatus).toBe('success');
        expect(replaceLaborResult.targetId).not.toBe(recordId);
    });

    it('should map confirmed payment into PAYMENT_FACT and expose list/detail query views', async () => {
        const { client, profile } = await loginAsAdmin();

        const unique = Date.now();
        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-PAY-${unique}`,
            projectName: `E2E Payment Fact Project ${unique}`,
            currentStage: 'execution'
        });

        const payment = await createPayment(client, project.id, {
            paymentAmount: '5432.10',
            paymentDate: '2023-03-18T08:00:00.000Z',
            costCategory: 'vendor-payment',
            sourceType: 'manual'
        });
        expect(payment.status).toBe('recorded');

        const confirmedPayment = await confirmPayment(client, project.id, payment.id, {
            expectedVersion: payment.rowVersion
        });
        expect(confirmedPayment.status).toBe('confirmed');

        const registerPaymentFactResult = await registerPaymentFactCostRecord(client, {
            paymentRecordId: payment.id,
            projectId: project.id,
            costDescription: 'mapped from payment confirmation',
            evidenceSummary: 'bank slip attached',
            expectedVersion: confirmedPayment.rowVersion
        });
        expect(registerPaymentFactResult.resultStatus).toBe('success');

        const listView = await listProjectActualCostRecords(client, project.id, { sourceType: 'PAYMENT_RECORD' });
        expect(listView).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: registerPaymentFactResult.targetId,
                    costType: 'PAYMENT_FACT',
                    sourceType: 'PAYMENT_RECORD',
                    sourceId: payment.id,
                    sourceRefNo: payment.id
                })
            ])
        );

        const detailView = await getProjectActualCostRecordDetail(client, registerPaymentFactResult.targetId);
        expect(detailView.costType).toBe('PAYMENT_FACT');
        expect(detailView.recordStatus).toBe('CONFIRMED');
        expect(detailView.sourceStatusSummary).toContain('PaymentRecord:confirmed');
        expect(detailView.measurementBasisSummary).toContain('5432.1000');
        expect(detailView.allowedActions).toEqual([]);
    });

    it('should map verified input invoice into INVOICE and expose list/detail query views', async () => {
        const { client, profile } = await loginAsAdmin();

        const unique = Date.now();
        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-INV-${unique}`,
            projectName: `E2E Invoice Fact Project ${unique}`,
            currentStage: 'execution'
        });

        const invoice = await createInvoice(client, project.id, {
            invoiceType: 'input',
            contractId: null,
            invoiceNumber: `E2E-INVOICE-${unique}`,
            invoiceAmount: '3210.50',
            invoiceDate: '2023-04-02'
        });
        expect(invoice.status).toBe('draft');

        const verifiedInvoice = await updateInvoice(client, invoice.id, {
            status: 'verified',
            expectedVersion: invoice.rowVersion
        });
        expect(verifiedInvoice.status).toBe('verified');

        const registerInvoiceResult = await registerInvoiceCostRecord(client, {
            invoiceRecordId: invoice.id,
            projectId: project.id,
            costDescription: 'mapped from verified invoice',
            evidenceSummary: 'invoice pdf archived',
            taxImpactSummary: 'vat pending deduction',
            expectedVersion: verifiedInvoice.rowVersion
        });
        expect(registerInvoiceResult.resultStatus).toBe('success');

        const listView = await listProjectActualCostRecords(client, project.id, { sourceType: 'INVOICE_RECORD' });
        expect(listView).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: registerInvoiceResult.targetId,
                    costType: 'INVOICE',
                    sourceType: 'INVOICE_RECORD',
                    sourceId: invoice.id,
                    sourceRefNo: `E2E-INVOICE-${unique}`
                })
            ])
        );

        const detailView = await getProjectActualCostRecordDetail(client, registerInvoiceResult.targetId);
        expect(detailView.costType).toBe('INVOICE');
        expect(detailView.recordStatus).toBe('CONFIRMED');
        expect(detailView.sourceStatusSummary).toContain('InvoiceRecord:verified/none');
        expect(detailView.measurementBasisSummary).toContain('3210.5000');
        expect(detailView.allowedActions).toEqual([]);
    });

    it('should manage ExpenseRecord lifecycle through create update confirm list detail and void', async () => {
        const { client, profile } = await loginAsAdmin();

        const unique = Date.now();
        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-EXP-${unique}`,
            projectName: `E2E Expense Record Project ${unique}`,
            currentStage: 'execution'
        });

        const createdExpense = await createExpenseRecord(client, project.id, {
            expenseCategory: 'travel',
            expenseDescription: `Taxi reimbursement ${unique}`,
            expenseDate: '2023-05-10',
            amountIncludingTax: '1234.56',
            taxAmount: '123.45',
            amountExcludingTax: '1111.11',
            sourceType: 'manual',
            evidenceSummary: 'receipt attached',
            attachmentCount: 2
        });
        expect(createdExpense.status).toBe('recorded');

        const updatedExpense = await updateExpenseRecord(client, createdExpense.id, {
            expenseDescription: `Taxi reimbursement updated ${unique}`,
            attachmentCount: 3,
            expectedVersion: createdExpense.rowVersion
        });
        expect(updatedExpense.expenseDescription).toContain('updated');
        expect(updatedExpense.attachmentCount).toBe(3);

        const confirmedExpense = await confirmExpenseRecord(client, createdExpense.id, {
            expectedVersion: updatedExpense.rowVersion
        });
        expect(confirmedExpense.status).toBe('confirmed');

        const listView = await listExpenseRecords(client, project.id);
        expect(listView).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: createdExpense.id,
                    expenseCategory: 'travel',
                    status: 'confirmed',
                    amountIncludingTax: '1234.5600'
                })
            ])
        );

        const confirmedDetail = await getExpenseRecordDetail(client, createdExpense.id);
        expect(confirmedDetail.status).toBe('confirmed');
        expect(confirmedDetail.allowedActions).toEqual(['void']);

        const voidedExpense = await voidExpenseRecord(client, createdExpense.id, {
            reason: 'duplicate',
            comment: 're-entered from approved claim',
            expectedVersion: confirmedExpense.rowVersion
        });
        expect(voidedExpense.status).toBe('voided');

        const voidedDetail = await getExpenseRecordDetail(client, createdExpense.id);
        expect(voidedDetail.status).toBe('voided');
        expect(voidedDetail.voidReason).toBe('duplicate: re-entered from approved claim');
        expect(voidedDetail.allowedActions).toEqual([]);
    });
});
