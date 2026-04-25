import { loginAsAdmin } from '../support/api-client';
import { expectErrorStatus, expectStatus } from '../support/http';
import { convertLeadToProject, createLead, getLead, qualifyLead } from '../support/lead-api';
import { makeUniqueSuffix } from '../support/test-data';
import type { ProjectDetailView } from '../support/types';

jest.setTimeout(120_000);

describe('poms-api lead workflow e2e', () => {
    it('converts a qualified lead into a project and exposes source summaries', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('lead-convert');
        const primaryOrgId = profile.orgUnits.find((orgUnit) => orgUnit.membershipType === 'primary')?.id ?? null;
        const lead = await createLead(client, {
            leadName: `E2E 线索转项目 ${unique}`,
            customerName: `E2E 客户 ${unique}`,
            sourceChannel: 'e2e',
            ownerOrgId: primaryOrgId,
            ownerUserId: profile.id
        });

        const qualifiedLead = await qualifyLead(client, lead.id, {
            qualificationSummary: '客户预算、需求和责任归口已确认'
        });
        expect(qualifiedLead.status).toBe('qualified');

        const project = await convertLeadToProject(client, lead.id, {
            customerProjectNo: `E2E-PRJ-${unique}`,
            projectName: `E2E 项目 ${unique}`,
            plannedSignAt: '2026-05-01T00:00:00.000Z'
        });

        expect(project.sourceLeadId).toBe(lead.id);
        expect(project.customerName).toBe(`E2E 客户 ${unique}`);
        expect(project.ownerOrgId).toBe(primaryOrgId);
        expect(project.ownerUserId).toBe(profile.id);
        expect(project.currentStage).toBe('assessment');

        const leadDetail = await getLead(client, lead.id);
        expect(leadDetail.status).toBe('converted');
        expect(leadDetail.convertedProjectSummary).toEqual(
            expect.objectContaining({
                id: project.id,
                projectNo: project.projectNo,
                currentStage: 'assessment'
            })
        );

        const projectDetailResponse = await client.get<ProjectDetailView>(`/projects/${project.id}`);
        const projectDetail = expectStatus(projectDetailResponse, 200);
        expect(projectDetail.sourceLeadSummary).toEqual(
            expect.objectContaining({
                id: lead.id,
                leadNo: lead.leadNo,
                status: 'converted'
            })
        );

        const duplicateResponse = await client.post(`/leads/${lead.id}:convertToProject`, {
            customerProjectNo: `E2E-PRJ-DUP-${unique}`
        });
        expectErrorStatus(duplicateResponse, 409);
    });
});
