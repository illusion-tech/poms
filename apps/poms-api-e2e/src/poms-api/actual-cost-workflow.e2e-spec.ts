import {
    getProjectActualCostRecordDetail,
    listProjectActualCostRecords,
    publishInternalCostRateVersion,
    registerLaborCostRecord,
    registerPaymentFactCostRecord,
    replaceLaborCostRecord
} from '../support/actual-cost-api';
import { loginAsAdmin } from '../support/api-client';
import { confirmPayment, createPayment } from '../support/contract-finance-api';
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
});
