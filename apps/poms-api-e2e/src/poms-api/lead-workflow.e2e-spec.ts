import { loginAsAdmin } from '../support/api-client';
import { createCustomer } from '../support/customer-api';
import { expectErrorStatus, expectStatus } from '../support/http';
import { assignLeadOwner, claimLeadOwner, convertLeadToProject, createLead, getLead, listLeads, qualifyLead } from '../support/lead-api';
import { makeUniqueSuffix } from '../support/test-data';
import type { CreateSalesFollowUpRecordRequest, LeadSourceSummary, ProjectDetailView, SalesFollowUpRecordSummary } from '../support/types';

jest.setTimeout(120_000);

describe('poms-api lead workflow e2e', () => {
    async function getActiveLeadSourceId(client: Awaited<ReturnType<typeof loginAsAdmin>>['client']): Promise<string> {
        const sourceResponse = await client.get<LeadSourceSummary[]>('/lead-sources');
        const leadSources = expectStatus(sourceResponse, 200);
        const leadSource = leadSources.find((source) => source.status === 'active');
        expect(leadSource).toBeDefined();
        return leadSource!.id;
    }

    it('converts a qualified lead into a project and exposes source summaries', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('lead-convert');
        const primaryOrgId = profile.orgUnits.find((orgUnit) => orgUnit.membershipType === 'primary')?.id ?? null;
        const leadSourceId = await getActiveLeadSourceId(client);
        const customer = await createCustomer(client, {
            displayName: `E2E 客户 ${unique}`,
            sourceChannel: 'e2e'
        });
        const lead = await createLead(client, {
            leadName: `E2E 线索转项目 ${unique}`,
            customerId: customer.id,
            sourceId: leadSourceId,
            demandDescription: '客户需要验证预算、范围和转项目链路。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '1200000.00',
            urgency: 'high',
            expectedDecisionDate: '2026-05-01',
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
        expect(project.customerName).toBe(customer.displayName);
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

        const followUpPayload: CreateSalesFollowUpRecordRequest = {
            customerId: customer.id,
            leadId: null,
            projectId: project.id,
            followUpType: 'meeting',
            occurredAt: '2026-05-02T03:00:00.000Z',
            summary: '完成转项目后的第一次销售跟进',
            detail: '客户确认继续推进正式项目范围。',
            outcome: 'progress',
            nextFollowUpAt: '2026-05-03T03:00:00.000Z'
        };
        const followUpResponse = await client.post<SalesFollowUpRecordSummary>('/sales-follow-up-records', followUpPayload);
        const followUp = expectStatus(followUpResponse, 201);
        expect(followUp).toEqual(
            expect.objectContaining({
                customerId: customer.id,
                leadId: null,
                projectId: project.id,
                summary: followUpPayload.summary,
                outcome: 'progress'
            })
        );

        const followUpListResponse = await client.get<SalesFollowUpRecordSummary[]>('/sales-follow-up-records', {
            params: {
                customerId: customer.id,
                leadId: lead.id,
                projectId: project.id
            }
        });
        const followUps = expectStatus(followUpListResponse, 200);
        expect(followUps).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: followUp.id,
                    customerName: customer.displayName,
                    projectId: project.id,
                    projectName: project.projectName
                })
            ])
        );

        const duplicateResponse = await client.post(`/leads/${lead.id}:convertToProject`, {
            customerProjectNo: `E2E-PRJ-DUP-${unique}`
        });
        expectErrorStatus(duplicateResponse, 409);
    });

    it('supports public pool claim and supervisor assignment commands', async () => {
        const { client, profile } = await loginAsAdmin();
        const unique = makeUniqueSuffix('lead-pool');
        const primaryOrgId = profile.orgUnits.find((orgUnit) => orgUnit.membershipType === 'primary')?.id ?? null;
        const leadSourceId = await getActiveLeadSourceId(client);
        const customer = await createCustomer(client, {
            displayName: `E2E 公共池客户 ${unique}`,
            sourceChannel: 'e2e'
        });

        const publicLead = await createLead(client, {
            leadName: `E2E 公共池线索 ${unique}`,
            customerId: customer.id,
            sourceId: leadSourceId,
            demandDescription: '客户先登记为公共池线索，等待销售申领。',
            budgetStatus: 'rough-budget',
            estimatedAmount: '800000.00',
            urgency: 'normal',
            ownerUserId: null,
            ownerOrgId: primaryOrgId
        });
        expect(publicLead.ownerUserId).toBeNull();
        expect(publicLead.ownerOrgId).toBeNull();

        const publicPoolLeads = await listLeads(client, { ownershipScope: 'public-pool', keyword: unique });
        expect(publicPoolLeads).toEqual(
            expect.arrayContaining([
                expect.objectContaining({
                    id: publicLead.id,
                    ownerUserId: null,
                    allowedActions: expect.arrayContaining(['claim-lead-owner', 'assign-lead-owner'])
                })
            ])
        );

        const claimResult = await claimLeadOwner(client, publicLead.id, { expectedVersion: publicLead.rowVersion });
        expect(claimResult).toEqual(
            expect.objectContaining({
                targetId: publicLead.id,
                previousOwnerUserId: null,
                newOwnerUserId: profile.id,
                assignmentType: 'claimed'
            })
        );

        const claimedDetail = await getLead(client, publicLead.id);
        expect(claimedDetail.ownerUserId).toBe(profile.id);
        expect(claimedDetail.ownerOrgId).toBe(primaryOrgId);

        const duplicateClaimResponse = await client.post(`/leads/${publicLead.id}:claim`, {
            expectedVersion: claimedDetail.rowVersion
        });
        expectErrorStatus(duplicateClaimResponse, 409);

        const assignedLead = await createLead(client, {
            leadName: `E2E 主管分配线索 ${unique}`,
            customerId: customer.id,
            sourceId: leadSourceId,
            demandDescription: '客户由主管分配销售主责。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '1000000.00',
            urgency: 'high',
            ownerUserId: null,
            ownerOrgId: null
        });

        const assignmentResult = await assignLeadOwner(client, assignedLead.id, {
            ownerUserId: profile.id,
            ownerOrgId: primaryOrgId,
            reason: 'E2E 主管分配公共池线索',
            expectedVersion: assignedLead.rowVersion
        });
        expect(assignmentResult).toEqual(
            expect.objectContaining({
                targetId: assignedLead.id,
                previousOwnerUserId: null,
                newOwnerUserId: profile.id,
                assignmentType: 'assigned'
            })
        );

        const mineLeads = await listLeads(client, { ownershipScope: 'mine', keyword: unique });
        expect(mineLeads.map((lead) => lead.id)).toEqual(expect.arrayContaining([publicLead.id, assignedLead.id]));
    });
});
