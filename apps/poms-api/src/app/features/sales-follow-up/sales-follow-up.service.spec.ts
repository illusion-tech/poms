import { BadRequestException, ConflictException, NotFoundException } from '@nestjs/common';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { Customer } from '../customer/customer.entity';
import { CustomerService } from '../customer/customer.service';
import { DictionaryService } from '../dictionary/dictionary.service';
import { Lead } from '../lead/lead.entity';
import { OrgUnit } from '../platform/org-unit.entity';
import { PlatformUser } from '../platform/platform-user.entity';
import { Project } from '../project/project.entity';
import { SalesFollowUpRecord } from './sales-follow-up-record.entity';
import { SalesFollowUpRepository } from './sales-follow-up.repository';
import { SalesFollowUpService } from './sales-follow-up.service';

describe('SalesFollowUpService', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const userId = '00000000-0000-4000-8000-000000000003';
    const orgId = '10000000-0000-4000-8000-000000000002';
    const baseDate = new Date('2026-04-30T09:00:00.000Z');

    let service: SalesFollowUpService;
    let repository: jest.Mocked<SalesFollowUpRepository>;
    let customerService: jest.Mocked<Pick<CustomerService, 'requireActiveCustomer'>>;
    let runtimeAuditService: jest.Mocked<Pick<RuntimeAuditService, 'recordAuditLog'>>;
    let dictionaryService: jest.Mocked<Pick<DictionaryService, 'requireActiveItem'>>;

    beforeEach(() => {
        repository = {
            findMany: jest.fn(),
            create: jest.fn((input) => Object.assign(new SalesFollowUpRecord(), createRecord(input as Partial<SalesFollowUpRecord>))),
            findById: jest.fn(),
            save: jest.fn(),
            saveWithReminderSync: jest.fn(),
            saveReplacement: jest.fn(),
            saveReplacementWithReminderSync: jest.fn(),
            saveVoidWithReminderSync: jest.fn(),
            findCustomerById: jest.fn(),
            findCustomersByIds: jest.fn(),
            findLeadById: jest.fn(),
            findLeadsByIds: jest.fn(),
            findProjectById: jest.fn(),
            findProjectsByIds: jest.fn(),
            findPlatformUserById: jest.fn(),
            findPlatformUsersByIds: jest.fn(),
            findOrgUnitById: jest.fn(),
            findOrgUnitsByIds: jest.fn()
        } as unknown as jest.Mocked<SalesFollowUpRepository>;
        customerService = {
            requireActiveCustomer: jest.fn(async () => createCustomer())
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        dictionaryService = {
            requireActiveItem: jest.fn().mockResolvedValue(undefined)
        };

        repository.findPlatformUserById.mockResolvedValue(createUser() as never);
        repository.findOrgUnitById.mockResolvedValue(createOrgUnit() as never);
        repository.findCustomerById.mockResolvedValue(createCustomer() as never);
        repository.findLeadById.mockResolvedValue(createLead() as never);
        repository.findProjectById.mockResolvedValue(createProject() as never);
        service = new SalesFollowUpService(repository, customerService as never, runtimeAuditService as never, dictionaryService as never);
    });

    it('creates a project-context follow-up record with default owner from project', async () => {
        const result = await service.createSalesFollowUpRecord(
            {
                customerId,
                projectId,
                followUpType: 'meeting',
                occurredAt: '2026-04-30T09:00:00.000Z',
                summary: '  与客户确认项目推进节奏  ',
                detail: '  客户要求下周提交范围确认材料。  ',
                outcome: 'progress',
                nextFollowUpAt: '2026-05-06T02:00:00.000Z'
            },
            userId
        );

        expect(customerService.requireActiveCustomer).toHaveBeenCalledWith(customerId);
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                id: expect.any(String),
                customerId,
                leadId: null,
                projectId,
                followUpType: 'meeting',
                summary: '与客户确认项目推进节奏',
                detail: '客户要求下周提交范围确认材料。',
                outcome: 'progress',
                ownerUserId: userId,
                ownerOrgId: orgId,
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(repository.saveWithReminderSync).toHaveBeenCalledWith(expect.any(SalesFollowUpRecord), {
            customer: expect.objectContaining({ id: customerId }),
            lead: null,
            project: expect.objectContaining({ id: projectId })
        });
        expect(result.projectId).toBe(projectId);
        expect(result.projectName).toBe('华南地铁项目');
        expect(result.ownerName).toBe('张销售');
    });

    it('rejects creating a follow-up when lead does not belong to the customer', async () => {
        repository.findLeadById.mockResolvedValue(createLead({ customerId: '11000000-0000-4000-8000-000000000099' }) as never);

        await expect(
            service.createSalesFollowUpRecord(
                {
                    customerId,
                    leadId,
                    followUpType: 'phone',
                    occurredAt: '2026-04-30T09:00:00.000Z',
                    summary: '客户电话沟通',
                    outcome: 'waiting-customer'
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);
        expect(repository.saveWithReminderSync).not.toHaveBeenCalled();
    });

    it('replaces an active follow-up record as a new active version', async () => {
        const current = createRecord({ leadId, projectId, rowVersion: 3 });
        repository.findById.mockResolvedValue(current as never);

        const result = await service.replaceSalesFollowUpRecord(
            current.id,
            {
                followUpType: 'email',
                occurredAt: '2026-04-30T10:00:00.000Z',
                summary: '  已补充邮件确认结果  ',
                detail: null,
                outcome: 'progress',
                nextFollowUpAt: null,
                replacementReason: '  原记录摘要不完整  ',
                expectedVersion: 3
            },
            userId,
            'req-replace'
        );

        expect(current.status).toBe('superseded');
        expect(repository.create).toHaveBeenCalledWith(
            expect.objectContaining({
                customerId,
                leadId,
                projectId,
                status: 'active',
                followUpType: 'email',
                summary: '已补充邮件确认结果',
                detail: null,
                outcome: 'progress',
                supersedesRecordId: current.id,
                replacementReason: '原记录摘要不完整',
                createdBy: userId,
                updatedBy: userId
            })
        );
        expect(repository.saveReplacementWithReminderSync).toHaveBeenCalledWith({
            supersededRecord: current,
            replacementRecord: expect.any(SalesFollowUpRecord),
            context: {
                customer: expect.objectContaining({ id: customerId }),
                lead: expect.objectContaining({ id: leadId }),
                project: expect.objectContaining({ id: projectId })
            }
        });
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'sales-follow-up.replaced',
                targetType: 'sales-follow-up-record',
                targetId: current.id,
                operatorId: userId,
                requestId: 'req-replace',
                result: 'success'
            })
        );
        expect(result.status).toBe('active');
        expect(result.supersedesId).toBe(current.id);
        expect(result.replacementReason).toBe('原记录摘要不完整');
    });

    it('rejects replacing a non-active follow-up record', async () => {
        repository.findById.mockResolvedValue(createRecord({ status: 'superseded' }) as never);

        await expect(
            service.replaceSalesFollowUpRecord(
                '57000000-0000-4000-8000-000000000001',
                {
                    followUpType: 'meeting',
                    occurredAt: '2026-04-30T10:00:00.000Z',
                    summary: '更正摘要',
                    outcome: 'progress',
                    replacementReason: '原记录摘要不完整',
                    expectedVersion: 1
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);
        expect(repository.saveReplacementWithReminderSync).not.toHaveBeenCalled();
    });

    it('rejects stale replace expectedVersion', async () => {
        repository.findById.mockResolvedValue(createRecord({ rowVersion: 2 }) as never);

        await expect(
            service.replaceSalesFollowUpRecord(
                '57000000-0000-4000-8000-000000000001',
                {
                    followUpType: 'meeting',
                    occurredAt: '2026-04-30T10:00:00.000Z',
                    summary: '更正摘要',
                    outcome: 'progress',
                    replacementReason: '原记录摘要不完整',
                    expectedVersion: 1
                },
                userId
            )
        ).rejects.toThrow(ConflictException);
    });

    it('rejects replace without expectedVersion', async () => {
        repository.findById.mockResolvedValue(createRecord({ rowVersion: 2 }) as never);

        await expect(
            service.replaceSalesFollowUpRecord(
                '57000000-0000-4000-8000-000000000001',
                {
                    followUpType: 'meeting',
                    occurredAt: '2026-04-30T10:00:00.000Z',
                    summary: '更正摘要',
                    outcome: 'progress',
                    replacementReason: '原记录摘要不完整'
                } as never,
                userId
            )
        ).rejects.toThrow(BadRequestException);
    });

    it('voids an active follow-up record with audit metadata', async () => {
        const current = createRecord({ rowVersion: 2 });
        repository.findById.mockResolvedValue(current as never);

        const result = await service.voidSalesFollowUpRecord(
            current.id,
            {
                reason: '登记错误',
                comment: '重复录入',
                expectedVersion: 2
            },
            userId,
            'req-void'
        );

        expect(current.status).toBe('voided');
        expect(current.voidedBy).toBe(userId);
        expect(current.voidReason).toBe('登记错误: 重复录入');
        expect(repository.saveVoidWithReminderSync).toHaveBeenCalledWith(current);
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'sales-follow-up.voided',
                targetType: 'sales-follow-up-record',
                targetId: current.id,
                operatorId: userId,
                requestId: 'req-void',
                result: 'success'
            })
        );
        expect(result.status).toBe('voided');
        expect(result.voidedByName).toBe('张销售');
        expect(result.voidReason).toBe('登记错误: 重复录入');
    });

    it('rejects voiding a non-active follow-up record', async () => {
        repository.findById.mockResolvedValue(createRecord({ status: 'voided' }) as never);

        await expect(
            service.voidSalesFollowUpRecord(
                '57000000-0000-4000-8000-000000000001',
                {
                    reason: '登记错误',
                    expectedVersion: 1
                },
                userId
            )
        ).rejects.toThrow(BadRequestException);
        expect(repository.saveVoidWithReminderSync).not.toHaveBeenCalled();
    });

    it('rejects void without expectedVersion', async () => {
        repository.findById.mockResolvedValue(createRecord({ rowVersion: 2 }) as never);

        await expect(
            service.voidSalesFollowUpRecord(
                '57000000-0000-4000-8000-000000000001',
                {
                    reason: '登记错误'
                } as never,
                userId
            )
        ).rejects.toThrow(BadRequestException);
    });

    it('rejects creating a follow-up when operator user is missing', async () => {
        repository.findPlatformUserById.mockResolvedValueOnce(null);

        await expect(
            service.createSalesFollowUpRecord(
                {
                    customerId,
                    leadId,
                    followUpType: 'phone',
                    occurredAt: '2026-04-30T09:00:00.000Z',
                    summary: '客户电话沟通',
                    outcome: 'waiting-customer'
                },
                userId
            )
        ).rejects.toThrow(NotFoundException);
        expect(customerService.requireActiveCustomer).not.toHaveBeenCalled();
    });

    it('lists records with customer, lead, project and owner names', async () => {
        repository.findMany.mockResolvedValue([createRecord({ leadId, projectId })] as never);
        repository.findCustomersByIds.mockResolvedValue([createCustomer()] as never);
        repository.findLeadsByIds.mockResolvedValue([createLead()] as never);
        repository.findProjectsByIds.mockResolvedValue([createProject()] as never);
        repository.findPlatformUsersByIds.mockResolvedValue([createUser()] as never);
        repository.findOrgUnitsByIds.mockResolvedValue([createOrgUnit()] as never);

        const result = await service.listSalesFollowUpRecords({ leadId, projectId, lifecycleScope: 'all' });

        expect(repository.findMany).toHaveBeenCalledWith({ leadId, projectId, lifecycleScope: 'all' });
        expect(result[0]).toEqual(
            expect.objectContaining({
                customerName: '华南地铁集团',
                leadName: '华南地铁线索',
                projectName: '华南地铁项目',
                ownerName: '张销售',
                ownerOrgName: '华南销售一部'
            })
        );
    });

    function createRecord(overrides: Partial<SalesFollowUpRecord> = {}): SalesFollowUpRecord {
        return Object.assign(new SalesFollowUpRecord(), {
            id: '57000000-0000-4000-8000-000000000001',
            customerId,
            leadId: null,
            projectId: null,
            followUpType: 'meeting',
            status: 'active',
            occurredAt: baseDate,
            summary: '与客户确认项目推进节奏',
            detail: '客户要求下周提交范围确认材料。',
            outcome: 'progress',
            nextFollowUpAt: new Date('2026-05-06T02:00:00.000Z'),
            ownerOrgId: orgId,
            ownerUserId: userId,
            supersedesRecordId: null,
            replacedByRecordId: null,
            replacementReason: null,
            voidedAt: null,
            voidedBy: null,
            voidReason: null,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }

    function createCustomer(overrides: Partial<Customer> = {}): Customer {
        return Object.assign(new Customer(), {
            id: customerId,
            customerNo: 'CUST-2026-001',
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

    function createLead(overrides: Partial<Lead> = {}): Lead {
        return Object.assign(new Lead(), {
            id: leadId,
            leadNo: 'LD-2026-000001',
            leadName: '华南地铁线索',
            customerId,
            customerName: '华南地铁集团',
            sourceId: '51000000-0000-4000-8000-000000000001',
            sourceChannel: '客户拜访',
            demandDescription: '客户需要建设地铁运维平台。',
            budgetStatus: 'budget-confirmed',
            estimatedAmount: '1000000.00',
            urgency: 'high',
            expectedDecisionDate: null,
            status: 'converted',
            ownerOrgId: orgId,
            ownerUserId: userId,
            qualificationSummary: null,
            qualifiedAt: null,
            qualifiedBy: null,
            closedReason: null,
            closedAt: null,
            closedBy: null,
            convertedProjectId: projectId,
            convertedAt: baseDate,
            convertedBy: userId,
            rowVersion: 1,
            createdAt: baseDate,
            createdBy: userId,
            updatedAt: baseDate,
            updatedBy: userId,
            ...overrides
        });
    }

    function createProject(overrides: Partial<Project> = {}): Project {
        return Object.assign(new Project(), {
            id: projectId,
            projectNo: 'PRJ-2026-000001',
            projectName: '华南地铁项目',
            sourceLeadId: leadId,
            customerId,
            customerName: '华南地铁集团',
            customerProjectNo: null,
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

    function createUser(overrides: Partial<PlatformUser> = {}): PlatformUser {
        return Object.assign(new PlatformUser(), {
            id: userId,
            username: 'sales_rep',
            displayName: '张销售',
            email: null,
            phone: null,
            avatarUrl: null,
            isActive: true,
            primaryOrgUnitId: orgId,
            primaryOrgUnitName: '华南销售一部',
            lastLoginAt: null,
            rowVersion: 1,
            createdAt: baseDate,
            updatedAt: baseDate,
            ...overrides
        });
    }

    function createOrgUnit(overrides: Partial<OrgUnit> = {}): OrgUnit {
        return Object.assign(new OrgUnit(), {
            id: orgId,
            name: '华南销售一部',
            code: 'SALES-SOUTH-1',
            description: null,
            isActive: true,
            parentId: null,
            createdAt: baseDate,
            updatedAt: baseDate,
            ...overrides
        });
    }
});
