import {
    CompetitorIntelligenceRecordListSchema,
    CompetitorIntelligenceRecordSummarySchema,
    CreateCompetitorIntelligenceRecordRequestSchema,
    CreateCustomerContactRequestSchema,
    CreateOpportunityStakeholderRequestSchema,
    CreateSalesDiscoveryRecordRequestSchema,
    CustomerContactListQuerySchema,
    CustomerContactListSchema,
    CustomerContactSummarySchema,
    OpportunityContextQuerySchema,
    OpportunityStakeholderListSchema,
    OpportunityStakeholderSummarySchema,
    SalesDiscoveryRecordListSchema,
    SalesDiscoveryRecordSummarySchema,
    SalesIntelligenceGapListSchema,
    UpdateCompetitorIntelligenceRecordRequestSchema,
    UpdateCustomerContactRequestSchema,
    UpdateOpportunityStakeholderRequestSchema,
    UpdateSalesDiscoveryRecordRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomerContactDto extends createZodDto(CustomerContactSummarySchema) {}

export class CustomerContactListDto extends createZodDto(CustomerContactListSchema) {}

export class CustomerContactListQueryDto extends createZodDto(CustomerContactListQuerySchema) {}

export class CreateCustomerContactRequestDto extends createZodDto(CreateCustomerContactRequestSchema) {}

export class UpdateCustomerContactRequestDto extends createZodDto(UpdateCustomerContactRequestSchema) {}

export class OpportunityContextQueryDto extends createZodDto(OpportunityContextQuerySchema) {}

export class OpportunityStakeholderDto extends createZodDto(OpportunityStakeholderSummarySchema) {}

export class OpportunityStakeholderListDto extends createZodDto(OpportunityStakeholderListSchema) {}

export class CreateOpportunityStakeholderRequestDto extends createZodDto(CreateOpportunityStakeholderRequestSchema) {}

export class UpdateOpportunityStakeholderRequestDto extends createZodDto(UpdateOpportunityStakeholderRequestSchema) {}

export class CompetitorIntelligenceRecordDto extends createZodDto(CompetitorIntelligenceRecordSummarySchema) {}

export class CompetitorIntelligenceRecordListDto extends createZodDto(CompetitorIntelligenceRecordListSchema) {}

export class CreateCompetitorIntelligenceRecordRequestDto extends createZodDto(CreateCompetitorIntelligenceRecordRequestSchema) {}

export class UpdateCompetitorIntelligenceRecordRequestDto extends createZodDto(UpdateCompetitorIntelligenceRecordRequestSchema) {}

export class SalesDiscoveryRecordDto extends createZodDto(SalesDiscoveryRecordSummarySchema) {}

export class SalesDiscoveryRecordListDto extends createZodDto(SalesDiscoveryRecordListSchema) {}

export class CreateSalesDiscoveryRecordRequestDto extends createZodDto(CreateSalesDiscoveryRecordRequestSchema) {}

export class UpdateSalesDiscoveryRecordRequestDto extends createZodDto(UpdateSalesDiscoveryRecordRequestSchema) {}

export class SalesIntelligenceGapListDto extends createZodDto(SalesIntelligenceGapListSchema) {}
