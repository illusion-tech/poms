import { BadRequestException, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { BusinessNumberService } from '../business-number/business-number.service';
import { Customer, CustomerAlias } from './customer.entity';
import { CustomerRepository } from './customer.repository';
import { CustomerService } from './customer.service';

jest.mock('node:crypto', () => ({
    randomUUID: jest.fn()
}));

describe('CustomerService', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000001';
    const orgId = '10000000-0000-4000-8000-000000000001';
    const baseDate = new Date('2026-04-29T08:00:00.000Z');

    let service: CustomerService;
    let customerRepository: jest.Mocked<
        Pick<
            CustomerRepository,
            | 'findById'
            | 'findMany'
            | 'findAliasesByCustomerId'
            | 'findPlatformUserById'
            | 'findPlatformUsersByIds'
            | 'findOrgUnitById'
            | 'findOrgUnitsByIds'
            | 'countLeadsByCustomerIds'
            | 'countProjectsByCustomerIds'
            | 'countContractsByCustomerIds'
            | 'getWorkspaceSummary'
            | 'findWorkspaceActiveLeads'
            | 'findWorkspaceActiveProjects'
            | 'findWorkspaceRecentContracts'
            | 'findWorkspaceRecentFollowUps'
            | 'findWorkspaceRecentDiscussions'
            | 'createAlias'
            | 'save'
            | 'saveAlias'
            | 'getEntityManager'
        >
    >;
    let businessNumberService: jest.Mocked<Pick<BusinessNumberService, 'next'>>;
    let entityManager: {
        create: jest.Mock;
        persist: jest.Mock;
        flush: jest.Mock;
    };
    let randomUUIDMock: jest.MockedFunction<typeof randomUUID>;

    beforeEach(() => {
        randomUUIDMock = jest.mocked(randomUUID);
        randomUUIDMock.mockReturnValue(customerId as ReturnType<typeof randomUUID>);
        entityManager = {
            create: jest.fn((entity, input) => (entity === Customer ? createCustomer(input as Partial<Customer>) : createAlias(input as Partial<CustomerAlias>))),
            persist: jest.fn(),
            flush: jest.fn()
        };
        customerRepository = {
            findById: jest.fn(),
            findMany: jest.fn(),
            findAliasesByCustomerId: jest.fn(),
            findPlatformUserById: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findOrgUnitById: jest.fn(),
            findOrgUnitsByIds: jest.fn(),
            countLeadsByCustomerIds: jest.fn(),
            countProjectsByCustomerIds: jest.fn(),
            countContractsByCustomerIds: jest.fn(),
            getWorkspaceSummary: jest.fn(),
            findWorkspaceActiveLeads: jest.fn(),
            findWorkspaceActiveProjects: jest.fn(),
            findWorkspaceRecentContracts: jest.fn(),
            findWorkspaceRecentFollowUps: jest.fn(),
            findWorkspaceRecentDiscussions: jest.fn(),
            createAlias: jest.fn((input) => createAlias(input as Partial<CustomerAlias>)),
            save: jest.fn(),
            saveAlias: jest.fn(),
            getEntityManager: jest.fn(() => ({
                transactional: jest.fn((work) => work(entityManager))
            }))
        } as unknown as typeof customerRepository;
        businessNumberService = {
            next: jest.fn(async () => 'CUST-2026-000001')
        } as jest.Mocked<Pick<BusinessNumberService, 'next'>>;

        customerRepository.findPlatformUserById.mockResolvedValue({ id: userId, primaryOrgUnitId: orgId } as never);
        customerRepository.findOrgUnitById.mockResolvedValue({ id: orgId, name: '华南销售一部' } as never);
        customerRepository.findPlatformUsersByIds.mockResolvedValue([{ id: userId, displayName: '张销售' }] as never);
        customerRepository.findOrgUnitsByIds.mockResolvedValue([{ id: orgId, name: '华南销售一部' }] as never);
        customerRepository.countLeadsByCustomerIds.mockResolvedValue(new Map([[customerId, 2]]));
        customerRepository.countProjectsByCustomerIds.mockResolvedValue(new Map([[customerId, 1]]));
        customerRepository.countContractsByCustomerIds.mockResolvedValue(new Map([[customerId, 0]]));
        customerRepository.getWorkspaceSummary.mockResolvedValue({
            leadCount: 3,
            activeLeadCount: 2,
            convertedLeadCount: 1,
            projectCount: 1,
            activeProjectCount: 1,
            contractCount: 1,
            recentFollowUpCount: 1,
            recentDiscussionCount: 1,
            latestFollowUpAt: new Date('2026-04-30T09:00:00.000Z'),
            latestDiscussionAt: new Date('2026-04-30T10:00:00.000Z')
        });
        customerRepository.findWorkspaceActiveLeads.mockResolvedValue([]);
        customerRepository.findWorkspaceActiveProjects.mockResolvedValue([]);
        customerRepository.findWorkspaceRecentContracts.mockResolvedValue([]);
        customerRepository.findWorkspaceRecentFollowUps.mockResolvedValue([]);
        customerRepository.findWorkspaceRecentDiscussions.mockResolvedValue([]);

        service = new CustomerService(customerRepository as never, businessNumberService as never);
    });

    it('creates a customer master record with generated number and primary alias', async () => {
        const result = await service.createCustomer(
            {
                displayName: '华南地铁集团',
                legalName: ' 华南地铁集团有限公司 ',
                shortName: ' 华南地铁 ',
                sourceChannel: ' 线索转入 ',
                remark: ' 重点客户 '
            },
            userId
        );

        expect(customerRepository.findPlatformUserById).toHaveBeenCalledWith(userId);
        expect(customerRepository.findOrgUnitById).toHaveBeenCalledWith(orgId);
        expect(businessNumberService.next).toHaveBeenCalledWith('customer', expect.any(Date), entityManager);
        expect(entityManager.create).toHaveBeenCalledWith(
            Customer,
            expect.objectContaining({
                customerNo: 'CUST-2026-000001',
                displayName: '华南地铁集团',
                legalName: '华南地铁集团有限公司',
                shortName: '华南地铁',
                status: 'active',
                ownerOrgId: orgId,
                ownerUserId: userId,
                sourceChannel: '线索转入',
                remark: '重点客户',
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(entityManager.create).toHaveBeenCalledWith(
            CustomerAlias,
            expect.objectContaining({
                customerId,
                aliasName: '华南地铁集团',
                aliasType: 'alias',
                normalizedName: '华南地铁集团',
                isPrimary: true,
                createdBy: userId
            })
        );
        expect(entityManager.persist).toHaveBeenCalledWith([expect.objectContaining({ id: customerId }), expect.objectContaining({ customerId })]);
        expect(result).toEqual(
            expect.objectContaining({
                id: customerId,
                customerNo: 'CUST-2026-000001',
                displayName: '华南地铁集团',
                status: 'active'
            })
        );
    });

    it('lists customers with owner names and linked business counts', async () => {
        customerRepository.findMany.mockResolvedValue([createCustomer()]);

        const result = await service.listCustomers({ keyword: '地铁' });

        expect(customerRepository.findMany).toHaveBeenCalledWith({ keyword: '地铁' });
        expect(result).toEqual([
            expect.objectContaining({
                id: customerId,
                ownerName: '张销售',
                ownerOrgName: '华南销售一部',
                leadCount: 2,
                projectCount: 1,
                contractCount: 0
            })
        ]);
    });

    it('rejects inactive customers for lead and project binding', async () => {
        customerRepository.findById.mockResolvedValue(createCustomer({ status: 'inactive' }));

        await expect(service.requireActiveCustomer(customerId)).rejects.toThrow(BadRequestException);
    });

    it('returns a customer workspace overview from read projections', async () => {
        customerRepository.findById.mockResolvedValue(createCustomer());
        customerRepository.findWorkspaceActiveLeads.mockResolvedValue([
            {
                id: '21000000-0000-4000-8000-000000000001',
                leadNo: 'LD-2026-000001',
                leadName: '智慧园区线索',
                status: 'qualified',
                rating: 'A',
                urgency: 'high',
                ownerName: '张销售',
                updatedAt: new Date('2026-04-30T09:00:00.000Z')
            }
        ]);
        customerRepository.findWorkspaceActiveProjects.mockResolvedValue([
            {
                id: '22000000-0000-4000-8000-000000000001',
                projectNo: 'PRJ-2026-000001',
                projectName: '智慧园区项目',
                status: 'active',
                currentStage: 'assessment',
                ownerName: '张销售',
                plannedSignAt: null,
                updatedAt: new Date('2026-04-30T09:30:00.000Z')
            }
        ]);
        customerRepository.findWorkspaceRecentContracts.mockResolvedValue([
            {
                id: '23000000-0000-4000-8000-000000000001',
                contractNo: 'CTR-2026-000001',
                customerContractNo: null,
                status: 'active',
                projectId: '22000000-0000-4000-8000-000000000001',
                projectName: '智慧园区项目',
                signedAt: new Date('2026-04-30T10:00:00.000Z'),
                updatedAt: new Date('2026-04-30T10:10:00.000Z')
            }
        ]);
        customerRepository.findWorkspaceRecentFollowUps.mockResolvedValue([
            {
                id: '24000000-0000-4000-8000-000000000001',
                summary: '确认预算窗口',
                outcome: 'progress',
                occurredAt: new Date('2026-04-30T11:00:00.000Z'),
                nextFollowUpAt: null,
                ownerName: '张销售'
            }
        ]);
        customerRepository.findWorkspaceRecentDiscussions.mockResolvedValue([
            {
                id: '25000000-0000-4000-8000-000000000001',
                threadId: '26000000-0000-4000-8000-000000000001',
                targetObjectType: 'customer',
                targetObjectId: customerId,
                targetTitle: '华南地铁集团',
                discussionType: 'decision-chain',
                body: '客户关注年度框架合作',
                isKeyConclusion: true,
                createdAt: new Date('2026-04-30T12:00:00.000Z')
            }
        ]);

        const result = await service.getCustomerWorkspaceOverview(customerId);

        expect(customerRepository.getWorkspaceSummary).toHaveBeenCalledWith(customerId);
        expect(customerRepository.findWorkspaceActiveLeads).toHaveBeenCalledWith(customerId);
        expect(result.customerId).toBe(customerId);
        expect(result.summary).toEqual(
            expect.objectContaining({
                leadCount: 3,
                activeLeadCount: 2,
                convertedLeadCount: 1,
                activeProjectCount: 1,
                latestFollowUpAt: '2026-04-30T09:00:00.000Z'
            })
        );
        expect(result.activeLeads[0]).toEqual(
            expect.objectContaining({
                leadNo: 'LD-2026-000001',
                status: 'qualified',
                updatedAt: '2026-04-30T09:00:00.000Z'
            })
        );
        expect(result.recentContracts[0]).not.toHaveProperty('signedAmount');
        expect(result.recentDiscussions[0]).toEqual(
            expect.objectContaining({
                discussionType: 'decision-chain',
                isKeyConclusion: true
            })
        );
        expect(result.recommendedActions.map((action) => action.key)).toEqual(['review-active-leads', 'advance-active-projects', 'review-recent-contracts', 'record-follow-up', 'capture-discussion']);
        expect(result.recommendedActions[1]).toEqual(
            expect.objectContaining({
                intent: 'open-project-workspace',
                targetObjectId: '22000000-0000-4000-8000-000000000001',
                targetTitle: '智慧园区项目'
            })
        );
        expect(result.timeline.map((item) => item.key)).toEqual([
            'discussion:25000000-0000-4000-8000-000000000001',
            'follow-up:24000000-0000-4000-8000-000000000001',
            'contract:23000000-0000-4000-8000-000000000001',
            'project:22000000-0000-4000-8000-000000000001',
            'lead:21000000-0000-4000-8000-000000000001'
        ]);
        expect(result.timeline[0]).toEqual(
            expect.objectContaining({
                eventType: 'discussion-added',
                sourceType: 'discussion',
                isKey: true
            })
        );
    });

    it('throws not found when creating a customer with a missing operator', async () => {
        customerRepository.findPlatformUserById.mockResolvedValue(null);

        await expect(service.createCustomer({ displayName: '新客户' }, userId)).rejects.toThrow(NotFoundException);
        expect(businessNumberService.next).not.toHaveBeenCalled();
    });

    function createCustomer(overrides: Partial<Customer> = {}): Customer {
        return Object.assign(new Customer(), {
            id: customerId,
            customerNo: 'CUST-2026-000001',
            displayName: '华南地铁集团',
            legalName: null,
            shortName: null,
            status: 'active',
            ownerOrgId: orgId,
            ownerUserId: userId,
            sourceChannel: null,
            remark: null,
            mergedIntoCustomerId: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }

    function createAlias(overrides: Partial<CustomerAlias> = {}): CustomerAlias {
        return Object.assign(new CustomerAlias(), {
            id: '12000000-0000-4000-8000-000000000001',
            customerId,
            aliasName: '华南地铁集团',
            aliasType: 'alias',
            normalizedName: '华南地铁集团',
            isPrimary: true,
            createdAt: baseDate,
            createdBy: userId,
            ...overrides
        });
    }
});
