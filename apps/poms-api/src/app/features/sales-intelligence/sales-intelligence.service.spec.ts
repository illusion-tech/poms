import { BadRequestException } from '@nestjs/common';
import {
    CompetitorPositionValue,
    CustomerContactGenderValue,
    CustomerContactStatusValue,
    CustomerPreferenceValue,
    OpportunityStakeholderAccessLevelValue,
    OpportunityStakeholderAttitudeValue,
    OpportunityStakeholderInfluenceLevelValue,
    OpportunityStakeholderRoleValue,
    SalesIntelligenceGapItemValue,
    SalesIntelligenceGapSeverityValue,
    WinProbabilityLevelValue
} from '@poms/shared-contracts';
import { RuntimeAuditService } from '../../core/runtime-audit/runtime-audit.service';
import { SalesIntelligenceRepository } from './sales-intelligence.repository';
import { SalesIntelligenceService } from './sales-intelligence.service';

describe('SalesIntelligenceService', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const contactId = '70000000-0000-4000-8000-000000000001';
    let repository: jest.Mocked<Partial<SalesIntelligenceRepository>>;
    let runtimeAuditService: jest.Mocked<Pick<RuntimeAuditService, 'recordAuditLog'>>;
    let entityManager: { transactional: jest.Mock; persist: jest.Mock; flush: jest.Mock };
    let service: SalesIntelligenceService;

    beforeEach(() => {
        entityManager = {
            transactional: jest.fn((work) => work(entityManager)),
            persist: jest.fn(),
            flush: jest.fn().mockResolvedValue(undefined)
        };
        repository = {
            getEntityManager: jest.fn(() => entityManager as never),
            findCustomerById: jest.fn().mockResolvedValue({ id: customerId, displayName: '客户A' }),
            findLeadById: jest.fn().mockResolvedValue({ id: leadId, customerId, leadName: '线索A' }),
            findProjectById: jest.fn().mockResolvedValue({ id: projectId, customerId, projectName: '项目A' }),
            findCustomerContactById: jest.fn().mockResolvedValue({ id: contactId, customerId, name: '张三', gender: CustomerContactGenderValue.Unknown }),
            findCustomersByIds: jest.fn().mockResolvedValue([{ id: customerId, displayName: '客户A' }]),
            findLeadsByIds: jest.fn().mockResolvedValue([{ id: leadId, customerId, leadName: '线索A' }]),
            findProjectsByIds: jest.fn().mockResolvedValue([{ id: projectId, customerId, projectName: '项目A' }]),
            listOpportunityStakeholders: jest.fn(),
            listCompetitorRecords: jest.fn(),
            listDiscoveryRecords: jest.fn(),
            createOpportunityStakeholder: jest.fn((input) => input as never),
            saveOpportunityStakeholder: jest.fn()
        };
        runtimeAuditService = {
            recordAuditLog: jest.fn().mockResolvedValue(undefined)
        };
        service = new SalesIntelligenceService(repository as SalesIntelligenceRepository, runtimeAuditService as RuntimeAuditService);
    });

    it('returns sales intelligence gaps for missing opportunity facts', async () => {
        repository.listOpportunityStakeholders?.mockResolvedValue([
            {
                id: '71000000-0000-4000-8000-000000000001',
                customerId,
                leadId,
                projectId: null,
                contactId,
                role: OpportunityStakeholderRoleValue.Influencer,
                attitude: OpportunityStakeholderAttitudeValue.Neutral,
                influenceLevel: OpportunityStakeholderInfluenceLevelValue.Medium,
                accessLevel: OpportunityStakeholderAccessLevelValue.Indirect,
                focusAreas: [],
                communicationNotes: null,
                isPrimary: false,
                rowVersion: 1,
                createdAt: new Date(),
                createdBy: null,
                updatedAt: new Date(),
                updatedBy: null
            } as never
        ]);
        repository.listCompetitorRecords?.mockResolvedValue([]);
        repository.listDiscoveryRecords?.mockResolvedValue([
            {
                id: '72000000-0000-4000-8000-000000000001',
                customerId,
                leadId,
                projectId: null,
                procurementProcess: null,
                budgetSource: '已确认',
                customerPainPoints: '',
                decisionCycle: null,
                nextContactPlan: null,
                remark: null,
                rowVersion: 1,
                createdAt: new Date(),
                createdBy: null,
                updatedAt: new Date(),
                updatedBy: null
            } as never
        ]);

        const result = await service.getSalesIntelligenceGaps({ leadId });

        expect(result).toEqual(
            expect.arrayContaining([
                expect.objectContaining({ item: SalesIntelligenceGapItemValue.DecisionMaker, severity: SalesIntelligenceGapSeverityValue.SoftBlocker }),
                expect.objectContaining({ item: SalesIntelligenceGapItemValue.TechnicalEvaluator }),
                expect.objectContaining({ item: SalesIntelligenceGapItemValue.ProcurementProcess, severity: SalesIntelligenceGapSeverityValue.SoftBlocker }),
                expect.objectContaining({ item: SalesIntelligenceGapItemValue.Competitor }),
                expect.objectContaining({ item: SalesIntelligenceGapItemValue.PainPoint }),
                expect.objectContaining({ item: SalesIntelligenceGapItemValue.NextContact })
            ])
        );
        expect(result).not.toEqual(expect.arrayContaining([expect.objectContaining({ item: SalesIntelligenceGapItemValue.BudgetSource })]));
    });

    it('rejects stakeholder contact from another customer', async () => {
        repository.findCustomerContactById?.mockResolvedValue({
            id: contactId,
            customerId: '11000000-0000-4000-8000-000000000099',
            name: '李四'
        } as never);

        await expect(
            service.createOpportunityStakeholder(
                {
                    customerId,
                    leadId,
                    contactId,
                    role: OpportunityStakeholderRoleValue.DecisionMaker
                },
                '90000000-0000-4000-8000-000000000001'
            )
        ).rejects.toThrow(BadRequestException);
    });

    it('creates competitor records with safe defaults', async () => {
        repository.createCompetitorRecord = jest.fn((input) => ({
            ...input,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedAt: new Date('2026-05-04T00:00:00.000Z')
        })) as never;
        repository.saveCompetitorRecord = jest.fn();

        const result = await service.createCompetitorIntelligenceRecord(
            {
                customerId,
                leadId,
                competitorName: '  对手A  '
            },
            '90000000-0000-4000-8000-000000000001'
        );

        expect(result).toMatchObject({
            customerId,
            leadId,
            competitorName: '对手A',
            position: CompetitorPositionValue.Unknown,
            customerPreference: CustomerPreferenceValue.Unknown,
            winProbability: WinProbabilityLevelValue.Unknown
        });
        expect(repository.saveCompetitorRecord).toHaveBeenCalledTimes(1);
    });

    it('creates customer contacts with explicit gender and maps it to the summary', async () => {
        repository.createCustomerContact = jest.fn((input) => ({
            ...input,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedAt: new Date('2026-05-04T00:00:00.000Z')
        })) as never;
        repository.saveCustomerContact = jest.fn();

        const result = await service.createCustomerContact(
            {
                customerId,
                name: '  王主任  ',
                gender: CustomerContactGenderValue.Female,
                mobile: '13800000000'
            },
            '90000000-0000-4000-8000-000000000001'
        );

        expect(repository.createCustomerContact).toHaveBeenCalledWith(
            expect.objectContaining({
                name: '王主任',
                gender: CustomerContactGenderValue.Female,
                status: CustomerContactStatusValue.Active
            })
        );
        expect(result).toMatchObject({
            customerId,
            name: '王主任',
            gender: CustomerContactGenderValue.Female,
            mobile: '13800000000'
        });
        expect(repository.saveCustomerContact).toHaveBeenCalledTimes(1);
    });

    it('updates customer contact fields and writes redacted field audit', async () => {
        repository.findCustomerContactById?.mockResolvedValue({
            id: contactId,
            customerId,
            name: '张三',
            gender: CustomerContactGenderValue.Unknown,
            department: '信息科',
            title: '主任',
            workPhone: null,
            mobile: '13800000000',
            wechat: null,
            email: null,
            remark: null,
            status: CustomerContactStatusValue.Active,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedBy: null
        } as never);

        await service.updateCustomerContact(
            contactId,
            {
                gender: CustomerContactGenderValue.Female,
                mobile: '13900000000',
                remark: '  只在工作时间联系  '
            },
            '90000000-0000-4000-8000-000000000001',
            'req-contact-audit'
        );

        expect(entityManager.persist).toHaveBeenCalledWith(expect.objectContaining({ id: contactId, updatedBy: '90000000-0000-4000-8000-000000000001' }));
        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'customer-contact.updated',
                targetType: 'customer-contact',
                targetId: contactId,
                operatorId: '90000000-0000-4000-8000-000000000001',
                requestId: 'req-contact-audit',
                result: 'success',
                beforeSnapshot: expect.objectContaining({
                    gender: CustomerContactGenderValue.Unknown,
                    mobile: expect.objectContaining({ changed: true, present: true, length: 11 }),
                    remark: expect.objectContaining({ changed: true, present: false, length: 0 })
                }),
                afterSnapshot: expect.objectContaining({
                    gender: CustomerContactGenderValue.Female,
                    mobile: expect.objectContaining({ changed: true, present: true, length: 11 }),
                    remark: expect.objectContaining({ changed: true, present: true, length: 8 })
                }),
                metadata: expect.objectContaining({
                    changedFields: expect.arrayContaining(['gender', 'mobile', 'remark']),
                    redactedFields: expect.arrayContaining(['mobile', 'remark']),
                    sourceCommand: 'update-customer-contact',
                    businessContext: expect.objectContaining({ customerId })
                })
            }),
            entityManager
        );
        expect(JSON.stringify(runtimeAuditService.recordAuditLog.mock.calls[0][0])).not.toContain('13900000000');
        expect(JSON.stringify(runtimeAuditService.recordAuditLog.mock.calls[0][0])).not.toContain('只在工作时间联系');
    });

    it('does not write contact audit when submitted values do not change', async () => {
        repository.findCustomerContactById?.mockResolvedValue({
            id: contactId,
            customerId,
            name: '张三',
            gender: CustomerContactGenderValue.Unknown,
            department: null,
            title: null,
            workPhone: null,
            mobile: null,
            wechat: null,
            email: null,
            remark: null,
            status: CustomerContactStatusValue.Active,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedBy: null
        } as never);

        await service.updateCustomerContact(contactId, { name: '  张三  ' }, '90000000-0000-4000-8000-000000000001', 'req-no-change');

        expect(runtimeAuditService.recordAuditLog).not.toHaveBeenCalled();
        expect(entityManager.persist).not.toHaveBeenCalled();
    });

    it('updates opportunity stakeholders and writes summarized relationship audit', async () => {
        const stakeholderId = '71000000-0000-4000-8000-000000000001';
        repository.findOpportunityStakeholderById = jest.fn().mockResolvedValue({
            id: stakeholderId,
            customerId,
            leadId,
            projectId: null,
            contactId,
            role: OpportunityStakeholderRoleValue.Influencer,
            attitude: OpportunityStakeholderAttitudeValue.Neutral,
            influenceLevel: OpportunityStakeholderInfluenceLevelValue.Medium,
            accessLevel: OpportunityStakeholderAccessLevelValue.Indirect,
            focusAreas: ['价格'],
            communicationNotes: null,
            isPrimary: false,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedBy: null
        } as never);

        await service.updateOpportunityStakeholder(
            stakeholderId,
            {
                role: OpportunityStakeholderRoleValue.DecisionMaker,
                focusAreas: ['预算', '交付'],
                communicationNotes: '偏好面对面沟通'
            },
            '90000000-0000-4000-8000-000000000001',
            'req-stakeholder-audit'
        );

        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'opportunity-stakeholder.updated',
                targetType: 'opportunity-stakeholder',
                targetId: stakeholderId,
                beforeSnapshot: expect.objectContaining({
                    role: OpportunityStakeholderRoleValue.Influencer,
                    focusAreas: expect.objectContaining({ changed: true, count: 1 })
                }),
                afterSnapshot: expect.objectContaining({
                    role: OpportunityStakeholderRoleValue.DecisionMaker,
                    focusAreas: expect.objectContaining({ changed: true, count: 2 }),
                    communicationNotes: expect.objectContaining({ changed: true, present: true })
                }),
                metadata: expect.objectContaining({
                    changedFields: expect.arrayContaining(['role', 'focusAreas', 'communicationNotes']),
                    redactedFields: expect.arrayContaining(['focusAreas', 'communicationNotes']),
                    sourceCommand: 'update-opportunity-stakeholder'
                })
            }),
            entityManager
        );
        expect(JSON.stringify(runtimeAuditService.recordAuditLog.mock.calls[0][0])).not.toContain('偏好面对面沟通');
    });

    it('updates competitor intelligence and writes summarized competition audit', async () => {
        const competitorRecordId = '72000000-0000-4000-8000-000000000001';
        repository.findCompetitorRecordById = jest.fn().mockResolvedValue({
            id: competitorRecordId,
            customerId,
            leadId,
            projectId: null,
            competitorName: '对手A',
            position: CompetitorPositionValue.ActiveCompetitor,
            customerPreference: CustomerPreferenceValue.Neutral,
            competitorStrengths: '本地服务强',
            competitorWeaknesses: null,
            ourAdvantages: null,
            ourRisks: null,
            winProbability: WinProbabilityLevelValue.Medium,
            evidence: null,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedBy: null
        } as never);

        await service.updateCompetitorIntelligenceRecord(
            competitorRecordId,
            {
                customerPreference: CustomerPreferenceValue.TowardUs,
                competitorStrengths: '价格低',
                evidence: '客户明确提到预算压力'
            },
            '90000000-0000-4000-8000-000000000001',
            'req-competitor-audit'
        );

        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'competitor-intelligence.updated',
                targetType: 'competitor-intelligence',
                targetId: competitorRecordId,
                metadata: expect.objectContaining({
                    changedFields: expect.arrayContaining(['customerPreference', 'competitorStrengths', 'evidence']),
                    redactedFields: expect.arrayContaining(['competitorStrengths', 'evidence'])
                }),
                beforeSnapshot: expect.objectContaining({
                    customerPreference: CustomerPreferenceValue.Neutral,
                    competitorStrengths: expect.objectContaining({ changed: true, present: true })
                }),
                afterSnapshot: expect.objectContaining({
                    customerPreference: CustomerPreferenceValue.TowardUs,
                    evidence: expect.objectContaining({ changed: true, present: true })
                })
            }),
            entityManager
        );
        expect(JSON.stringify(runtimeAuditService.recordAuditLog.mock.calls[0][0])).not.toContain('客户明确提到预算压力');
    });

    it('updates sales discovery records and writes summarized discovery audit', async () => {
        const discoveryRecordId = '73000000-0000-4000-8000-000000000001';
        repository.findDiscoveryRecordById = jest.fn().mockResolvedValue({
            id: discoveryRecordId,
            customerId,
            leadId,
            projectId: null,
            procurementProcess: null,
            budgetSource: '年度预算',
            customerPainPoints: null,
            decisionCycle: null,
            nextContactPlan: null,
            remark: null,
            rowVersion: 1,
            createdAt: new Date('2026-05-04T00:00:00.000Z'),
            createdBy: null,
            updatedAt: new Date('2026-05-04T00:00:00.000Z'),
            updatedBy: null
        } as never);

        await service.updateSalesDiscoveryRecord(
            discoveryRecordId,
            {
                procurementProcess: '科室提出需求后走院办审批',
                nextContactPlan: '下周约信息科主任'
            },
            '90000000-0000-4000-8000-000000000001',
            'req-discovery-audit'
        );

        expect(runtimeAuditService.recordAuditLog).toHaveBeenCalledWith(
            expect.objectContaining({
                eventType: 'sales-discovery-record.updated',
                targetType: 'sales-discovery-record',
                targetId: discoveryRecordId,
                metadata: expect.objectContaining({
                    changedFields: expect.arrayContaining(['procurementProcess', 'nextContactPlan']),
                    redactedFields: expect.arrayContaining(['procurementProcess', 'nextContactPlan']),
                    sourceCommand: 'update-sales-discovery-record'
                }),
                afterSnapshot: expect.objectContaining({
                    procurementProcess: expect.objectContaining({ changed: true, present: true }),
                    nextContactPlan: expect.objectContaining({ changed: true, present: true })
                })
            }),
            entityManager
        );
        expect(JSON.stringify(runtimeAuditService.recordAuditLog.mock.calls[0][0])).not.toContain('科室提出需求后走院办审批');
    });
});
