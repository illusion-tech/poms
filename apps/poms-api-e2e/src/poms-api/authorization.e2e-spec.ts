import { loginAsViewer } from '../support/api-client';
import { expectErrorStatus } from '../support/http';
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
});
