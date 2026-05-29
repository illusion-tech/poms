import { NotFoundException } from '@nestjs/common';
import type { DictionaryItemSummary } from '@poms/shared-contracts';
import { DictionaryService } from '../dictionary/dictionary.service';
import { Project } from '../project/project.entity';
import { Lead } from './lead.entity';
import { LeadQueryService } from './lead-query.service';
import { LeadRepository } from './lead.repository';
import { LeadScoreService } from './lead-score.service';

describe('LeadQueryService', () => {
    const leadId = '50000000-0000-4000-8000-000000000001';
    const customerId = '11000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const sourceCode = 'customer-visit';
    const baseDate = new Date('2026-04-25T10:00:00.000Z');

    let service: LeadQueryService;
    let leadRepository: jest.Mocked<LeadRepository>;
    let dictionaryService: jest.Mocked<Pick<DictionaryService, 'listItems'>>;
    let leadScoreService: jest.Mocked<LeadScoreService>;
    const currentUser = { sub: userId, username: 'sales_rep', permissions: ['lead:read', 'lead:write', 'lead:assign'] } as never;

    beforeEach(() => {
        leadRepository = {
            findMany: jest.fn(),
            findById: jest.fn(),
            findPlatformUserById: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findProjectsByIds: jest.fn().mockResolvedValue([]),
            findOrgUnitById: jest.fn(),
            findOrgUnitsByIds: jest.fn()
        } as unknown as jest.Mocked<LeadRepository>;

        leadScoreService = {
            findActiveOverridesByLeadIds: jest.fn().mockResolvedValue(new Map()),
            findActiveOverrideByLeadId: jest.fn().mockResolvedValue(null)
        } as unknown as jest.Mocked<LeadScoreService>;

        dictionaryService = {
            listItems: jest.fn().mockResolvedValue([createSourceDictionaryItem()])
        };

        service = new LeadQueryService(leadRepository, dictionaryService as never, leadScoreService);
    });

    it('maps list leads with owner names and passes filters', async () => {
        const lead = createLeadEntity({
            sourceCode: 'event',
            status: 'qualified',
            qualifiedAt: new Date('2026-04-25T11:00:00.000Z')
        });
        leadRepository.findMany.mockResolvedValue([lead]);
        dictionaryService.listItems.mockResolvedValue([createSourceDictionaryItem({ code: 'event', name: '展会' })]);
        leadRepository.findPlatformUsersByIds.mockResolvedValue([{ id: userId, displayName: '销售人员' }] as never);
        leadRepository.findOrgUnitsByIds.mockResolvedValue([{ id: orgId, name: '华南销售一部' }] as never);

        const result = await service.listLeads(
            {
                scope: 'qualified',
                ownerOrgId: orgId,
                rating: 'A',
                keyword: '地铁'
            },
            currentUser
        );

        expect(leadRepository.findMany).toHaveBeenCalledWith({
            ownerOrgId: orgId,
            rating: 'A',
            keyword: '地铁'
        });
        expect(leadScoreService.findActiveOverridesByLeadIds).toHaveBeenCalledWith([leadId]);
        expect(result.scope).toBe('qualified');
        expect(result.totalItems).toBe(1);
        expect(result.summary).toEqual(
            expect.objectContaining({
                active: 1,
                qualified: 1,
                'ready-to-convert': 1,
                all: 1
            })
        );
        expect(result.items).toEqual([
            expect.objectContaining({
                id: leadId,
                leadNo: 'LEAD-2026-001',
                sourceCode: 'event',
                sourceName: '展会',
                demandDescription: '客户需要建设地铁运维平台。',
                budgetStatus: 'budget-confirmed',
                estimatedAmount: '1000000.00',
                urgency: 'high',
                ownerOrgId: orgId,
                ownerUserId: userId,
                ownerName: '销售人员',
                ownerOrgName: '华南销售一部',
                qualifiedAt: '2026-04-25T11:00:00.000Z',
                convertedAt: null,
                convertedProjectSummary: null,
                effectiveScore: 95,
                effectiveRating: 'A',
                effectiveScoreSource: 'system',
                activeScoreOverrideId: null,
                rowVersion: 1,
                allowedActions: ['assign-lead-owner']
            })
        ]);
    });

    it('uses current user for mine scope and exposes claim action for public pool leads', async () => {
        const lead = createLeadEntity({
            ownerUserId: null,
            ownerOrgId: null
        });
        leadRepository.findMany.mockResolvedValue([lead]);
        leadRepository.findPlatformUsersByIds.mockResolvedValue([]);
        leadRepository.findOrgUnitsByIds.mockResolvedValue([]);

        const result = await service.listLeads({ ownershipScope: 'public-pool' }, currentUser);

        expect(leadRepository.findMany).toHaveBeenCalledWith({
            ownerUserId: undefined,
            unassignedOnly: true
        });
        expect(result.items[0]).toEqual(
            expect.objectContaining({
                ownerUserId: null,
                ownerOrgId: null,
                ownerName: null,
                allowedActions: ['claim-lead-owner', 'assign-lead-owner']
            })
        );

        await service.listLeads({ ownershipScope: 'mine' }, currentUser);
        expect(leadRepository.findMany).toHaveBeenLastCalledWith({
            ownerUserId: userId,
            unassignedOnly: false
        });
    });

    it('defaults to active scope and keeps converted and closed leads out of the working list', async () => {
        const activeLead = createLeadEntity();
        const convertedLead = createLeadEntity({
            id: '50000000-0000-4000-8000-000000000002',
            status: 'converted',
            convertedProjectId: '20000000-0000-4000-8000-000000000001',
            convertedAt: new Date('2026-04-25T12:00:00.000Z'),
            convertedBy: userId
        });
        const closedLead = createLeadEntity({
            id: '50000000-0000-4000-8000-000000000003',
            status: 'closed',
            closedAt: new Date('2026-04-25T13:00:00.000Z')
        });
        leadRepository.findMany.mockResolvedValue([activeLead, convertedLead, closedLead]);
        leadRepository.findPlatformUsersByIds.mockResolvedValue([{ id: userId, displayName: '销售人员' }] as never);
        leadRepository.findOrgUnitsByIds.mockResolvedValue([{ id: orgId, name: '华南销售一部' }] as never);

        const result = await service.listLeads({}, currentUser);

        expect(result.scope).toBe('active');
        expect(result.items.map((lead) => lead.id)).toEqual([leadId]);
        expect(result.summary).toEqual(
            expect.objectContaining({
                active: 1,
                registered: 1,
                converted: 1,
                closed: 1,
                all: 3
            })
        );
    });

    it('returns converted scope with converted project summary', async () => {
        const convertedLead = createLeadEntity({
            status: 'converted',
            convertedProjectId: '20000000-0000-4000-8000-000000000001',
            convertedAt: new Date('2026-04-25T12:00:00.000Z'),
            convertedBy: userId
        });
        leadRepository.findMany.mockResolvedValue([convertedLead]);
        leadRepository.findPlatformUsersByIds.mockResolvedValue([{ id: userId, displayName: '销售人员' }] as never);
        leadRepository.findOrgUnitsByIds.mockResolvedValue([{ id: orgId, name: '华南销售一部' }] as never);
        leadRepository.findProjectsByIds.mockResolvedValue([
            createProjectEntity({
                id: '20000000-0000-4000-8000-000000000001',
                projectNo: 'PRJ-2026-101',
                projectName: '华南地铁项目'
            })
        ]);

        const result = await service.listLeads({ scope: 'converted' }, currentUser);

        expect(leadRepository.findProjectsByIds).toHaveBeenCalledWith(['20000000-0000-4000-8000-000000000001']);
        expect(result.items[0]).toEqual(
            expect.objectContaining({
                status: 'converted',
                convertedAt: '2026-04-25T12:00:00.000Z',
                convertedProjectSummary: {
                    id: '20000000-0000-4000-8000-000000000001',
                    projectNo: 'PRJ-2026-101',
                    projectName: '华南地铁项目',
                    customerId,
                    status: 'active',
                    currentStage: 'assessment'
                }
            })
        );
    });

    it('returns detail view with source summary', async () => {
        const lead = createLeadEntity({ sourceCode: 'customer-referral' });
        leadRepository.findById.mockResolvedValue(lead);
        dictionaryService.listItems.mockResolvedValue([createSourceDictionaryItem({ code: 'customer-referral', name: '转介绍' })]);
        leadRepository.findPlatformUserById.mockResolvedValue({ id: userId, displayName: '销售人员' } as never);
        leadRepository.findOrgUnitById.mockResolvedValue({ id: orgId, name: '华南销售一部' } as never);

        const result = await service.getLead(leadId, currentUser);

        expect(leadScoreService.findActiveOverrideByLeadId).toHaveBeenCalledWith(leadId);
        expect(result.ownerName).toBe('销售人员');
        expect(result.ownerOrgName).toBe('华南销售一部');
        expect(result.sourceSummary).toBe('来源：转介绍');
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
                projectNo: 'PRJ-2026-101',
                projectName: '华南地铁项目'
            })
        ]);

        const result = await service.getLead(leadId, currentUser);

        expect(leadRepository.findProjectsByIds).toHaveBeenCalledWith(['20000000-0000-4000-8000-000000000001']);
        expect(result.convertedProjectSummary).toEqual({
            id: '20000000-0000-4000-8000-000000000001',
            projectNo: 'PRJ-2026-101',
            projectName: '华南地铁项目',
            customerId,
            status: 'active',
            currentStage: 'assessment'
        });
    });

    it('throws when detail lead is missing', async () => {
        leadRepository.findById.mockResolvedValue(null);

        await expect(service.getLead(leadId, currentUser)).rejects.toThrow(NotFoundException);
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

    function createSourceDictionaryItem(overrides: Partial<DictionaryItemSummary> = {}): DictionaryItemSummary {
        return {
            id: '51000000-0000-4000-8000-000000000001',
            domain: 'lead-source',
            code: 'customer-visit',
            name: '客户拜访',
            description: '客户拜访来源',
            status: 'active',
            sortOrder: 10,
            isSystem: true,
            usageCount: 1,
            rowVersion: 1,
            createdAt: baseDate.toISOString(),
            createdBy: userId,
            updatedAt: baseDate.toISOString(),
            updatedBy: userId,
            ...overrides
        };
    }

    function createProjectEntity(overrides: Partial<Project> = {}): Project {
        return Object.assign(new Project(), {
            id: '20000000-0000-4000-8000-000000000001',
            projectNo: 'PRJ-2026-101',
            projectName: '华南地铁项目',
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
