import { NotFoundException } from '@nestjs/common';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadRepository } from './lead.repository';

describe('LeadQueryService', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let service: LeadQueryService;
    let leadRepository: jest.Mocked<LeadRepository>;

    beforeEach(() => {
        leadRepository = {
            findMany: jest.fn(),
            findById: jest.fn(),
            findPlatformUserById: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findProjectsByIds: jest.fn(),
            findOrgUnitById: jest.fn(),
            findOrgUnitsByIds: jest.fn()
        } as unknown as jest.Mocked<LeadRepository>;

        service = new LeadQueryService(leadRepository);
    });

    it('maps list leads with owner names and passes filters', async () => {
        const lead = createLeadEntity({
            sourceChannel: '展会',
            qualifiedAt: new Date('2026-04-25T11:00:00.000Z')
        });
        leadRepository.findMany.mockResolvedValue([lead]);
        leadRepository.findPlatformUsersByIds.mockResolvedValue([{ id: userId, displayName: '销售人员' }] as never);
        leadRepository.findOrgUnitsByIds.mockResolvedValue([{ id: orgId, name: '华南销售一部' }] as never);

        const result = await service.listLeads({
            status: 'qualified',
            ownerOrgId: orgId,
            keyword: '地铁'
        });

        expect(leadRepository.findMany).toHaveBeenCalledWith({
            status: 'qualified',
            ownerOrgId: orgId,
            keyword: '地铁'
        });
        expect(result).toEqual([
            expect.objectContaining({
                id: leadId,
                leadCode: 'LEAD-2026-001',
                sourceChannel: '展会',
                ownerName: '销售人员',
                ownerOrgName: '华南销售一部',
                qualifiedAt: '2026-04-25T11:00:00.000Z'
            })
        ]);
    });

    it('returns detail view with source summary', async () => {
        const lead = createLeadEntity({ sourceChannel: '转介绍' });
        leadRepository.findById.mockResolvedValue(lead);
        leadRepository.findPlatformUserById.mockResolvedValue({ id: userId, displayName: '销售人员' } as never);
        leadRepository.findOrgUnitById.mockResolvedValue({ id: orgId, name: '华南销售一部' } as never);

        const result = await service.getLead(leadId);

        expect(result.ownerName).toBe('销售人员');
        expect(result.ownerOrgName).toBe('华南销售一部');
        expect(result.sourceSummary).toBe('来源渠道：转介绍');
        expect(result.convertedProjectSummary).toBeNull();
    });

    it('returns converted project summary when lead has converted project fact', async () => {
        const lead = createLeadEntity({
            status: 'converted',
            convertedProjectId: '20000000-0000-4000-8000-000000000001',
            convertedAt: new Date('2026-04-25T12:00:00.000Z'),
            convertedBy: userId
        });
        leadRepository.findById.mockResolvedValue(lead);
        leadRepository.findPlatformUserById.mockResolvedValue({ id: userId, displayName: '销售人员' } as never);
        leadRepository.findOrgUnitById.mockResolvedValue({ id: orgId, name: '华南销售一部' } as never);
        leadRepository.findProjectsByIds.mockResolvedValue([
            createProjectEntity({
                id: '20000000-0000-4000-8000-000000000001',
                projectCode: 'PRJ-2026-101',
                projectName: '华南地铁项目'
            })
        ]);

        const result = await service.getLead(leadId);

        expect(leadRepository.findProjectsByIds).toHaveBeenCalledWith(['20000000-0000-4000-8000-000000000001']);
        expect(result.convertedProjectSummary).toEqual({
            id: '20000000-0000-4000-8000-000000000001',
            projectCode: 'PRJ-2026-101',
            projectName: '华南地铁项目',
            status: 'active',
            currentStage: 'assessment'
        });
    });

    it('throws when detail lead is missing', async () => {
        leadRepository.findById.mockResolvedValue(null);

        await expect(service.getLead(leadId)).rejects.toThrow(NotFoundException);
    });

    function createLeadEntity(overrides: Partial<Lead> = {}): Lead {
        return Object.assign(new Lead(), {
            id: leadId,
            leadCode: 'LEAD-2026-001',
            leadName: '华南地铁线索',
            customerName: '华南地铁集团',
            sourceChannel: null,
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
            id: '20000000-0000-4000-8000-000000000001',
            projectCode: 'PRJ-2026-101',
            projectName: '华南地铁项目',
            sourceLeadId: leadId,
            customerId: null,
            customerName: '华南地铁集团',
            status: 'active',
            currentStage: 'assessment',
            ownerOrgId: orgId,
            ownerUserId: userId,
            plannedSignAt: null,
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
