import { ActiveInactiveStatusValue, DictionaryDomainValue, type DictionaryItemSummary, type LeadScoreOverrideSummary } from '@poms/shared-contracts';
import { DictionaryService } from '../dictionary/dictionary.service';
import { Project } from '../project/project.entity';
import { LeadController, LeadScoreOverrideController } from './lead.controller';
import { Lead } from './lead.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadScoreService } from './lead-score.service';
import { LeadService } from './lead.service';

describe('LeadController', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const customerId = '11000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const sourceCode = 'customer-visit';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let controller: LeadController;
    let overrideController: LeadScoreOverrideController;
    let leadQueryService: jest.Mocked<LeadQueryService>;
    let leadScoreService: jest.Mocked<LeadScoreService>;
    let leadService: jest.Mocked<LeadService>;
    let dictionaryService: jest.Mocked<DictionaryService>;

    beforeEach(() => {
        leadQueryService = {
            listLeads: jest.fn(),
            getLead: jest.fn()
        } as unknown as jest.Mocked<LeadQueryService>;

        leadScoreService = {
            getLeadScoreHistory: jest.fn(),
            submitLeadScoreOverride: jest.fn(),
            approveLeadScoreOverride: jest.fn(),
            rejectLeadScoreOverride: jest.fn(),
            revokeLeadScoreOverride: jest.fn()
        } as unknown as jest.Mocked<LeadScoreService>;

        leadService = {
            createLead: jest.fn(),
            updateLead: jest.fn(),
            claimLeadOwner: jest.fn(),
            assignLeadOwner: jest.fn(),
            qualifyLead: jest.fn(),
            convertToProject: jest.fn(),
            closeLead: jest.fn()
        } as unknown as jest.Mocked<LeadService>;

        dictionaryService = {
            listItems: jest.fn().mockResolvedValue([createSourceItem()])
        } as unknown as jest.Mocked<DictionaryService>;

        controller = new LeadController(leadQueryService, leadScoreService, leadService, dictionaryService);
        overrideController = new LeadScoreOverrideController(leadScoreService);
    });

    it('passes list filters to query service', async () => {
        leadQueryService.listLeads.mockResolvedValue(createLeadListResponse() as never);

        const req = { user: { sub: userId, username: 'sales_rep', permissions: ['lead:read', 'lead:write'] } } as never;

        await controller.list(
            {
                scope: 'registered',
                sourceCode,
                budgetStatus: 'budget-confirmed',
                urgency: 'high',
                rating: 'A',
                ownerOrgId: orgId,
                ownershipScope: 'mine',
                keyword: '地铁',
                page: 2,
                pageSize: 50
            },
            req
        );

        expect(leadQueryService.listLeads).toHaveBeenCalledWith(
            {
                scope: 'registered',
                sourceCode,
                budgetStatus: 'budget-confirmed',
                urgency: 'high',
                rating: 'A',
                ownerOrgId: orgId,
                ownerUserId: undefined,
                ownershipScope: 'mine',
                keyword: '地铁',
                page: 2,
                pageSize: 50
            },
            expect.objectContaining({ sub: userId })
        );
    });

    it('creates lead with operator id and maps summary', async () => {
        leadService.createLead.mockResolvedValue(createLeadEntity());

        const result = await controller.create(
            {
                leadName: '华南地铁线索',
                customerId,
                sourceCode,
                demandDescription: '客户需要建设地铁运维平台。',
                budgetStatus: 'budget-confirmed',
                estimatedAmount: '1000000.00',
                urgency: 'high',
                expectedDecisionDate: '2026-05-01',
                ownerOrgId: orgId,
                ownerUserId: userId
            },
            { user: { sub: userId } } as never
        );

        expect(leadService.createLead).toHaveBeenCalledWith(
            {
                leadName: '华南地铁线索',
                customerId,
                sourceCode,
                demandDescription: '客户需要建设地铁运维平台。',
                budgetStatus: 'budget-confirmed',
                estimatedAmount: '1000000.00',
                urgency: 'high',
                expectedDecisionDate: '2026-05-01',
                ownerOrgId: orgId,
                ownerUserId: userId
            },
            userId
        );
        expect(result.id).toBe(leadId);
        expect(result.sourceCode).toBe(sourceCode);
        expect(result.sourceName).toBe('客户拜访');
        expect(result.createdAt).toBe('2026-04-25T10:00:00.000Z');
    });

    it('claims public pool lead through service', async () => {
        leadService.claimLeadOwner.mockResolvedValue({
            targetId: leadId,
            leadOwnerAssignmentRecordId: '53000000-0000-4000-8000-000000000001',
            previousOwnerUserId: null,
            previousOwnerOrgId: null,
            newOwnerUserId: userId,
            newOwnerOrgId: orgId,
            assignmentType: 'claimed',
            businessStatusAfter: 'registered'
        });

        const result = await controller.claimOwner(
            leadId,
            { expectedVersion: 1 },
            { user: { sub: userId } } as never
        );

        expect(leadService.claimLeadOwner).toHaveBeenCalledWith(leadId, { expectedVersion: 1 }, userId);
        expect(result.assignmentType).toBe('claimed');
    });

    it('submits lead score override through score service', async () => {
        leadScoreService.submitLeadScoreOverride.mockResolvedValue(createScoreOverrideSummary());

        const result = await controller.submitScoreOverride(
            leadId,
            { score: 88, reason: '客户战略价值高', expectedLeadRowVersion: 1 },
            { user: { sub: userId }, headers: { 'x-request-id': 'req-1' } } as never
        );

        expect(leadScoreService.submitLeadScoreOverride).toHaveBeenCalledWith(
            leadId,
            { score: 88, reason: '客户战略价值高', expectedLeadRowVersion: 1 },
            userId,
            'req-1'
        );
        expect(result.requestedScore).toBe(88);
    });

    it('approves lead score override through score service', async () => {
        leadScoreService.approveLeadScoreOverride.mockResolvedValue(createScoreOverrideSummary({ status: 'approved' }));

        const result = await overrideController.approve(
            '54000000-0000-4000-8000-000000000001',
            { expectedOverrideRowVersion: 1, note: '同意覆盖' },
            { user: { sub: userId }, headers: { 'x-request-id': 'req-2' } } as never
        );

        expect(leadScoreService.approveLeadScoreOverride).toHaveBeenCalledWith(
            '54000000-0000-4000-8000-000000000001',
            { expectedOverrideRowVersion: 1, note: '同意覆盖' },
            userId,
            'req-2'
        );
        expect(result.status).toBe('approved');
    });

    it('assigns lead owner through service', async () => {
        leadService.assignLeadOwner.mockResolvedValue({
            targetId: leadId,
            leadOwnerAssignmentRecordId: '53000000-0000-4000-8000-000000000002',
            previousOwnerUserId: null,
            previousOwnerOrgId: null,
            newOwnerUserId: userId,
            newOwnerOrgId: orgId,
            assignmentType: 'assigned',
            businessStatusAfter: 'registered'
        });

        const result = await controller.assignOwner(
            leadId,
            { ownerUserId: userId, ownerOrgId: orgId, reason: '公共池分配', expectedVersion: 1 },
            { user: { sub: userId } } as never
        );

        expect(leadService.assignLeadOwner).toHaveBeenCalledWith(leadId, { ownerUserId: userId, ownerOrgId: orgId, reason: '公共池分配', expectedVersion: 1 }, userId);
        expect(result.assignmentType).toBe('assigned');
    });

    it('qualifies lead through service', async () => {
        leadService.qualifyLead.mockResolvedValue(
            createLeadEntity({
                status: 'qualified',
                qualificationSummary: '需求和预算明确',
                qualifiedAt: new Date('2026-04-25T11:00:00.000Z'),
                qualifiedBy: userId
            })
        );

        const result = await controller.qualify(
            leadId,
            { qualificationSummary: '需求和预算明确' },
            { user: { sub: userId } } as never
        );

        expect(leadService.qualifyLead).toHaveBeenCalledWith(
            leadId,
            { qualificationSummary: '需求和预算明确' },
            userId
        );
        expect(result.status).toBe('qualified');
        expect(result.qualifiedAt).toBe('2026-04-25T11:00:00.000Z');
    });

    it('closes lead through service', async () => {
        leadService.closeLead.mockResolvedValue(
            createLeadEntity({
                status: 'closed',
                closedReason: '客户预算取消',
                closedAt: new Date('2026-04-25T12:00:00.000Z'),
                closedBy: userId
            })
        );

        const result = await controller.close(
            leadId,
            { closedReason: '客户预算取消' },
            { user: { sub: userId } } as never
        );

        expect(leadService.closeLead).toHaveBeenCalledWith(
            leadId,
            { closedReason: '客户预算取消' },
            userId
        );
        expect(result.status).toBe('closed');
        expect(result.closedAt).toBe('2026-04-25T12:00:00.000Z');
    });

    it('converts lead to project through service and maps project summary', async () => {
        leadService.convertToProject.mockResolvedValue(createProjectEntity());

        const result = await controller.convertToProject(
            leadId,
            {
                projectName: '华南地铁项目',
                customerProjectNo: 'CUS-PRJ-001',
                plannedSignAt: '2026-05-01T00:00:00.000Z'
            },
            { user: { sub: userId } } as never
        );

        expect(leadService.convertToProject).toHaveBeenCalledWith(
            leadId,
            {
                projectName: '华南地铁项目',
                customerProjectNo: 'CUS-PRJ-001',
                plannedSignAt: new Date('2026-05-01T00:00:00.000Z')
            },
            userId
        );
        expect(result).toEqual(
            expect.objectContaining({
                id: projectId,
                projectNo: 'PRJ-2026-101',
                sourceLeadId: leadId,
                currentStage: 'assessment'
            })
        );
    });

    function createLeadEntity(overrides: Partial<Lead> = {}): Lead {
        return Object.assign(new Lead(), {
            id: leadId,
            leadNo: 'LEAD-2026-001',
            leadName: '华南地铁线索',
            customerId,
            customerName: '华南地铁集团',
            sourceCode,
            demandDescription: '客户需要建设地铁运维平台。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '1000000.00',
            urgency: 'high',
            expectedDecisionDate: '2026-05-01',
            score: 95,
            rating: 'A',
            scoreReason: '来源+10；需求+15；预算+20；金额+15；紧迫+15；决策日期+10；主责+10',
            scoreUpdatedAt: baseDate,
            status: 'registered',
            ownerOrgId: orgId,
            ownerUserId: userId,
            qualificationSummary: null,
            qualifiedAt: null,
            qualifiedBy: null,
            closedReason: null,
            closedAt: null,
            closedBy: null,
            convertedProjectId: null,
            convertedAt: null,
            convertedBy: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }

    function createProjectEntity(overrides: Partial<Project> = {}): Project {
        return Object.assign(new Project(), {
            id: projectId,
            projectNo: 'PRJ-2026-101',
            projectName: '华南地铁项目',
            sourceLeadId: leadId,
            customerId,
            customerName: '华南地铁集团',
            status: 'active',
            currentStage: 'assessment',
            ownerOrgId: orgId,
            ownerUserId: userId,
            plannedSignAt: new Date('2026-05-01T00:00:00.000Z'),
            closedAt: null,
            closedReason: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }

    function createSourceItem(overrides: Partial<DictionaryItemSummary> = {}): DictionaryItemSummary {
        return {
            id: '71000000-0000-4000-8000-000000000001',
            domain: DictionaryDomainValue.LeadSource,
            code: sourceCode,
            name: '客户拜访',
            description: '客户现场拜访',
            status: ActiveInactiveStatusValue.Active,
            sortOrder: 10,
            isSystem: true,
            usageCount: 1,
            rowVersion: 1,
            createdAt: '2026-04-25T08:00:00.000Z',
            createdBy: userId,
            updatedAt: '2026-04-25T08:00:00.000Z',
            updatedBy: userId,
            ...overrides
        };
    }

    function createLeadListResponse() {
        return {
            scope: 'active',
            items: [],
            summary: {
                active: 0,
                registered: 0,
                qualified: 0,
                'ready-to-convert': 0,
                'blocked-conversion': 0,
                converted: 0,
                closed: 0,
                all: 0
            },
            facets: [],
            totalItems: 0,
            page: 1,
            pageSize: 500
        };
    }

    function createScoreOverrideSummary(overrides: Partial<LeadScoreOverrideSummary> = {}): LeadScoreOverrideSummary {
        return {
            id: '54000000-0000-4000-8000-000000000001',
            leadId,
            requestedScore: overrides.requestedScore ?? 88,
            requestedRating: 'A',
            reason: '客户战略价值高',
            status: overrides.status ?? 'pending',
            systemScoreAtRequest: 70,
            systemRatingAtRequest: 'B',
            requestedBy: userId,
            requestedAt: '2026-04-25T10:00:00.000Z',
            approvedBy: null,
            approvedAt: null,
            approvalNote: null,
            rejectedBy: null,
            rejectedAt: null,
            rejectReason: null,
            revokedBy: null,
            revokedAt: null,
            revokeReason: null,
            supersededById: null,
            rowVersion: 1
        };
    }
});
