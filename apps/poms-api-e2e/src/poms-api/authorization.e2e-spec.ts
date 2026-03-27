import { loginAsAdmin, loginAsViewer } from '../support/api-client';
import { createActiveContractForProject } from '../support/contract-api';
import { expectErrorStatus } from '../support/http';
import { createProjectForProfile } from '../support/project-api';
import { buildCommissionRuleVersionInput, buildProjectInput, makeUniqueSuffix } from '../support/test-data';

jest.setTimeout(120_000);

describe('poms-api authorization e2e', () => {
    it('prevents the viewer role from creating projects', async () => {
        const { client, profile } = await loginAsViewer();
        const unique = makeUniqueSuffix('viewer-project');

        const response = await client.post('/projects', buildProjectInput(profile, {
            projectCode: `E2E-VIEW-${unique}`,
            projectName: `E2E 只读越权项目 ${unique}`,
            currentStage: 'negotiation'
        }));

        expectErrorStatus(response, 403);
    });

    it('prevents the viewer role from managing commission rules', async () => {
        const { client } = await loginAsViewer();
        const unique = makeUniqueSuffix('viewer-rule');

        const response = await client.post(
            '/commission/rule-versions',
            buildCommissionRuleVersionInput(unique)
        );

        expectErrorStatus(response, 403);
    });

    it('prevents the viewer role from managing contract finance facts', async () => {
        const { client: adminClient, profile: adminProfile } = await loginAsAdmin();
        const { client: viewerClient } = await loginAsViewer();
        const unique = makeUniqueSuffix('viewer-finance');

        const project = await createProjectForProfile(adminClient, adminProfile, {
            projectCode: `E2E-VIEW-FIN-${unique}`,
            projectName: `E2E 只读越权合同资金 ${unique}`,
            currentStage: 'execution'
        });

        const contract = await createActiveContractForProject(
            adminClient,
            project.id,
            adminProfile.id,
            {
                contractNo: `E2E-VIEW-FIN-HT-${unique}`
            }
        );

        const response = await viewerClient.post(
            `/contract-finance/contracts/${contract.id}/receipts`,
            {
                receiptAmount: '1000.00',
                receiptDate: new Date().toISOString(),
                sourceType: 'manual'
            }
        );

        expectErrorStatus(response, 403);
    });
});
