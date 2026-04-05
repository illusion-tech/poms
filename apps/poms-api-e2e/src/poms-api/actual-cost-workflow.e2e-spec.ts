import { loginAsAdmin } from '../support/api-client';
import { createProjectForProfile } from '../support/project-api';
import { publishInternalCostRateVersion, registerLaborCostRecord, replaceLaborCostRecord } from '../support/actual-cost-api';

jest.setTimeout(120_000);

describe('Actual Cost Workflow E2E', () => {
    it('should complete the labor cost registry and replace workflow', async () => {
        // 1. Admin login
        const { client, profile } = await loginAsAdmin();

        // 2. Create a new project
        const unique = Date.now();
        const project = await createProjectForProfile(client, profile, {
            projectCode: `E2E-AC-${unique}`,
            projectName: `E2E Actual Cost Project ${unique}`,
            currentStage: 'execution'
        });
        expect(project).toBeDefined();

        // 3. Publish an internal cost rate version
        const publishRateResult = await publishInternalCostRateVersion(client, {
            rateScopeType: 'ROLE',
            roleCode: `dev-${unique}`,
            rateUnit: 'DAY',
            rateValue: '1000',
            currency: 'CNY',
            effectiveFrom: new Date().toISOString()
        });
        expect(publishRateResult.resultStatus).toBe('success');
        const rateVersionId = publishRateResult.targetId;

        // 4. Register a successful labor cost record
        const registerLaborResult = await registerLaborCostRecord(client, {
            projectId: project.id,
            laborPeriodType: 'MONTH',
            laborPeriodStart: new Date('2023-01-01').toISOString(),
            laborPeriodEnd: new Date('2023-01-31').toISOString(),
            rateVersionId,
            actualHours: '160',
            actualPersonDays: '20'
        });
        expect(registerLaborResult.resultStatus).toBe('success');
        const recordId = registerLaborResult.targetId;

        // 5. Replace the labor cost record
        const replaceLaborResult = await replaceLaborCostRecord(client, {
            replacementOfRecordId: recordId,
            laborPeriodStart: new Date('2023-01-01').toISOString(),
            laborPeriodEnd: new Date('2023-01-31').toISOString(),
            rateVersionId,
            actualHours: '180',
            actualPersonDays: '22.5',
            replaceReason: 'Corrected working hours'
        });
        expect(replaceLaborResult.resultStatus).toBe('success');
        expect(replaceLaborResult.targetId).not.toBe(recordId);
    });
});