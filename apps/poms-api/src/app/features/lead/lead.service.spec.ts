import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { Lead } from './lead.entity';
import { LeadRepository } from './lead.repository';
import { LeadService } from './lead.service';

describe('LeadService', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let service: LeadService;
    let leadRepository: jest.Mocked<LeadRepository>;

    beforeEach(() => {
        leadRepository = {
            findByCode: jest.fn(),
            findById: jest.fn(),
            findPlatformUserById: jest.fn(),
            findOrgUnitById: jest.fn(),
            create: jest.fn((input) => createLeadEntity(input as Partial<Lead>)),
            save: jest.fn()
        } as unknown as jest.Mocked<LeadRepository>;

        leadRepository.findPlatformUserById.mockResolvedValue({
            id: userId,
            primaryOrgUnitId: orgId
        } as never);
        leadRepository.findOrgUnitById.mockResolvedValue({ id: orgId, name: '华南销售一部' } as never);

        service = new LeadService(leadRepository);
    });

    it('creates a registered lead with default owner from operator', async () => {
        leadRepository.findByCode.mockResolvedValue(null);

        const lead = await service.createLead(
            {
                leadCode: 'LEAD-2026-001',
                leadName: '华南地铁线索',
                customerName: '华南地铁集团',
                sourceChannel: '展会'
            },
            userId
        );

        expect(leadRepository.findByCode).toHaveBeenCalledWith('LEAD-2026-001');
        expect(leadRepository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                leadCode: 'LEAD-2026-001',
                status: 'registered',
                ownerUserId: userId,
                ownerOrgId: orgId,
                convertedProjectId: null
            })
        );
        expect(leadRepository.save).toHaveBeenCalledWith(lead);
        expect(lead.status).toBe('registered');
    });

    it('rejects duplicate lead code', async () => {
        leadRepository.findByCode.mockResolvedValue(createLeadEntity());

        await expect(
            service.createLead(
                {
                    leadCode: 'LEAD-2026-001',
                    leadName: '重复线索',
                    customerName: '客户'
                },
                userId
            )
        ).rejects.toThrow(ConflictException);
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
});
