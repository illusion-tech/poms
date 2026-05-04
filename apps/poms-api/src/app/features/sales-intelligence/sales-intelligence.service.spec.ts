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
import { SalesIntelligenceRepository } from './sales-intelligence.repository';
import { SalesIntelligenceService } from './sales-intelligence.service';

describe('SalesIntelligenceService', () => {
    const customerId = '11000000-0000-4000-8000-000000000001';
    const leadId = '50000000-0000-4000-8000-000000000001';
    const projectId = '20000000-0000-4000-8000-000000000001';
    const contactId = '70000000-0000-4000-8000-000000000001';
    let repository: jest.Mocked<Partial<SalesIntelligenceRepository>>;
    let service: SalesIntelligenceService;

    beforeEach(() => {
        repository = {
            findCustomerById: jest.fn().mockResolvedValue({ id: customerId, displayName: '客户A' }),
            findLeadById: jest.fn().mockResolvedValue({ id: leadId, customerId, leadName: '线索A' }),
            findProjectById: jest.fn().mockResolvedValue({ id: projectId, customerId, projectName: '项目A' }),
            findCustomerContactById: jest.fn().mockResolvedValue({ id: contactId, customerId, name: '张三', gender: CustomerContactGenderValue.Unknown }),
            listOpportunityStakeholders: jest.fn(),
            listCompetitorRecords: jest.fn(),
            listDiscoveryRecords: jest.fn(),
            createOpportunityStakeholder: jest.fn((input) => input as never),
            saveOpportunityStakeholder: jest.fn()
        };
        service = new SalesIntelligenceService(repository as SalesIntelligenceRepository);
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
});
