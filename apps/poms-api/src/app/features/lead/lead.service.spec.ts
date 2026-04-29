import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { BusinessNumberService } from '../business-number/business-number.service';
import { CustomerService } from '../customer/customer.service';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

describe('LeadService', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const customerId = '11000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let service: LeadService;
    let leadRepository: jest.Mocked<LeadRepository>;
    let businessNumberService: jest.Mocked<Pick<BusinessNumberService, 'next'>>;
    let customerService: jest.Mocked<Pick<CustomerService, 'requireActiveCustomer'>>;
    let entityManager: {
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
        findOne: jest.Mock;
    };

    beforeEach(() => {
        entityManager = {
            create: jest.fn((entity, input) => entity === Lead ? createLeadEntity(input as Partial<Lead>) : createProjectEntity(input as Partial<Project>)),
            persist: jest.fn(),
            flush: jest.fn(),
            findOne: jest.fn()
        };
        leadRepository = {
            findById: jest.fn(),
            findPlatformUserById: jest.fn(),
            findOrgUnitById: jest.fn(),
            getEntityManager: jest.fn(() => ({
                transactional: jest.fn((work) => work(entityManager))
            })),
            save: jest.fn()
        } as unknown as jest.Mocked<LeadRepository>;
        businessNumberService = {
            next: jest.fn(async (scope: string) => scope === 'lead' ? 'LD-2026-000001' : 'PRJ-2026-000001')
        } as jest.Mocked<Pick<BusinessNumberService, 'next'>>;
        customerService = {
            requireActiveCustomer: jest.fn(async () => ({ id: customerId, displayName: '华南地铁集团' }) as never)
        };

        leadRepository.findPlatformUserById.mockResolvedValue({
            id: userId,
            primaryOrgUnitId: orgId
        } as never);
        leadRepository.findOrgUnitById.mockResolvedValue({ id: orgId, name: '华南销售一部' } as never);

        service = new LeadService(leadRepository, businessNumberService as never, customerService as never);
    });

    it('creates a registered lead with default owner from operator', async () => {
        const lead = await service.createLead(
            {
                leadName: '华南地铁线索',
                customerId,
                sourceChannel: '展会'
            },
            userId
        );

        expect(customerService.requireActiveCustomer).toHaveBeenCalledWith(customerId);
        expect(businessNumberService.next).toHaveBeenCalledWith('lead', expect.any(Date), entityManager);
        expect(entityManager.create).toHaveBeenCalledWith(
            Lead,
            expect.objectContaining({
                leadNo: 'LD-2026-000001',
                status: 'registered',
                customerId,
                customerName: '华南地铁集团',
                ownerUserId: userId,
                ownerOrgId: orgId,
                convertedProjectId: null
            })
        );
        expect(entityManager.persist).toHaveBeenCalledWith(lead);
        expect(entityManager.flush).toHaveBeenCalled();
        expect(lead.status).toBe('registered');
    });

    it('rejects creating a lead when operator user does not exist', async () => {
        leadRepository.findPlatformUserById.mockResolvedValue(null);

        await expect(
            service.createLead(
                {
                    leadName: '重复线索',
                    customerId
                },
                userId
            )
        ).rejects.toThrow(NotFoundException);
        expect(customerService.requireActiveCustomer).not.toHaveBeenCalled();
        expect(businessNumberService.next).not.toHaveBeenCalled();
    });

    it('qualifies only registered leads', async () => {
        const lead = createLeadEntity({ status: 'registered' });
        leadRepository.findById.mockResolvedValue(lead);

        const result = await service.qualifyLead(leadId, { qualificationSummary: '客户预算和需求明确' }, userId);

        expect(result.status).toBe('qualified');
        expect(result.qualificationSummary).toBe('客户预算和需求明确');
        expect(result.qualifiedAt).toBeInstanceOf(Date);
        expect(result.qualifiedBy).toBe(userId);
        expect(leadRepository.save).toHaveBeenCalledWith(lead);
    });

    it('rejects qualifying a closed lead', async () => {
        leadRepository.findById.mockResolvedValue(createLeadEntity({ status: 'closed' }));

        await expect(
            service.qualifyLead(leadId, { qualificationSummary: '不能有效化' }, userId)
        ).rejects.toThrow(BadRequestException);
    });

    it('closes a qualified lead with close fact', async () => {
        const lead = createLeadEntity({ status: 'qualified' });
        leadRepository.findById.mockResolvedValue(lead);

        const result = await service.closeLead(leadId, { closedReason: '客户预算取消' }, userId);

        expect(result.status).toBe('closed');
        expect(result.closedReason).toBe('客户预算取消');
        expect(result.closedAt).toBeInstanceOf(Date);
        expect(result.closedBy).toBe(userId);
    });

    it('converts a qualified lead into a project and writes the lead conversion fact', async () => {
        const lead = createLeadEntity({
            status: 'qualified',
            qualificationSummary: '需求和预算明确',
            qualifiedAt: new Date('2026-04-25T11:00:00.000Z'),
            qualifiedBy: userId
        });
        entityManager.findOne.mockResolvedValue(lead);

        const result = await service.convertToProject(
            leadId,
            {
                customerProjectNo: 'CUS-PRJ-001',
                plannedSignAt: new Date('2026-05-01T00:00:00.000Z')
            },
            userId
        );

        expect(businessNumberService.next).toHaveBeenCalledWith('project', expect.any(Date), entityManager);
        expect(entityManager.create).toHaveBeenCalledWith(
            Project,
            expect.objectContaining({
                projectNo: 'PRJ-2026-000001',
                projectName: '华南地铁线索',
                sourceLeadId: leadId,
                customerId,
                customerName: '华南地铁集团',
                customerProjectNo: 'CUS-PRJ-001',
                ownerOrgId: orgId,
                ownerUserId: userId,
                currentStage: 'assessment',
                status: 'active'
            })
        );
        expect(result.sourceLeadId).toBe(leadId);
        expect(lead.status).toBe('converted');
        expect(lead.convertedProjectId).toBe(result.id);
        expect(lead.convertedAt).toBeInstanceOf(Date);
        expect(lead.convertedBy).toBe(userId);
        expect(entityManager.persist).toHaveBeenCalledWith([lead, result]);
        expect(entityManager.flush).toHaveBeenCalled();
    });

    it('rejects converting a non-qualified lead', async () => {
        entityManager.findOne.mockResolvedValue(createLeadEntity({ status: 'registered' }));

        await expect(
            service.convertToProject(leadId, {}, userId)
        ).rejects.toThrow(BadRequestException);
    });

    it('throws not found when converting a missing lead', async () => {
        entityManager.findOne.mockResolvedValue(null);

        await expect(
            service.convertToProject(leadId, {}, userId)
        ).rejects.toThrow(NotFoundException);
    });

    it('rejects converting the same lead twice', async () => {
        entityManager.findOne.mockResolvedValue(
            createLeadEntity({
                status: 'converted',
                convertedProjectId: projectId
            })
        );

        await expect(
            service.convertToProject(leadId, {}, userId)
        ).rejects.toThrow(ConflictException);
    });

    it('rejects editing converted leads', async () => {
        leadRepository.findById.mockResolvedValue(createLeadEntity({ status: 'converted' }));

        await expect(
            service.updateLead(leadId, { leadName: '不可编辑' }, userId)
        ).rejects.toThrow(BadRequestException);
    });

    it('throws not found when lead does not exist', async () => {
        leadRepository.findById.mockResolvedValue(null);

        await expect(service.closeLead(leadId, { closedReason: '关闭' }, userId)).rejects.toThrow(NotFoundException);
    });

    function createLeadEntity(overrides: Partial<Lead> = {}): Lead {
        return Object.assign(new Lead(), {
            id: leadId,
            leadNo: 'LEAD-2026-001',
            leadName: '华南地铁线索',
            customerId,
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
            id: projectId,
            projectNo: 'PRJ-2026-101',
            projectName: '华南地铁线索',
            sourceLeadId: leadId,
            customerId,
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
