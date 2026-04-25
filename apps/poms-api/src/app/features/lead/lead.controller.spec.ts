import { Project } from '../project/project.entity';
import { LeadController } from './lead.controller';
import { Lead } from './lead.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadService } from './lead.service';

describe('LeadController', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let controller: LeadController;
    let leadQueryService: jest.Mocked<LeadQueryService>;
    let leadService: jest.Mocked<LeadService>;

    beforeEach(() => {
        leadQueryService = {
            listLeads: jest.fn(),
            getLead: jest.fn()
        } as unknown as jest.Mocked<LeadQueryService>;

        leadService = {
            createLead: jest.fn(),
            updateLead: jest.fn(),
            qualifyLead: jest.fn(),
            convertToProject: jest.fn(),
            closeLead: jest.fn()
        } as unknown as jest.Mocked<LeadService>;

        controller = new LeadController(leadQueryService, leadService);
    });

    it('passes list filters to query service', async () => {
        leadQueryService.listLeads.mockResolvedValue([]);

        await controller.list({
            status: 'registered',
            ownerOrgId: orgId,
            keyword: '地铁'
        });

        expect(leadQueryService.listLeads).toHaveBeenCalledWith({
            status: 'registered',
            ownerOrgId: orgId,
            keyword: '地铁'
        });
    });

    it('creates lead with operator id and maps summary', async () => {
        leadService.createLead.mockResolvedValue(createLeadEntity());

        const result = await controller.create(
            {
                leadName: '华南地铁线索',
                customerName: '华南地铁集团',
                sourceChannel: '展会',
                ownerOrgId: orgId,
                ownerUserId: userId
            },
            { user: { sub: userId } } as never
        );

        expect(leadService.createLead).toHaveBeenCalledWith(
            {
                leadName: '华南地铁线索',
                customerName: '华南地铁集团',
                sourceChannel: '展会',
                ownerOrgId: orgId,
                ownerUserId: userId
            },
            userId
        );
        expect(result.id).toBe(leadId);
        expect(result.createdAt).toBe('2026-04-25T10:00:00.000Z');
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
            customerName: '华南地铁集团',
            sourceChannel: '展会',
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
            customerId: null,
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
});
