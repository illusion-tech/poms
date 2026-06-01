import {
    CreateCustomerAliasRequestSchema,
    CreateCustomerRequestSchema,
    CustomerAliasListSchema,
    CustomerAliasSummarySchema,
    CustomerDetailViewSchema,
    CustomerListQuerySchema,
    CustomerListSchema,
    CustomerSummarySchema,
    CustomerWorkspaceOverviewViewSchema,
    UpdateCustomerRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class CustomerDto extends createZodDto(CustomerSummarySchema) {}

export class CustomerListDto extends createZodDto(CustomerListSchema) {}

export class CustomerDetailViewDto extends createZodDto(CustomerDetailViewSchema) {}

export class CustomerWorkspaceOverviewViewDto extends createZodDto(CustomerWorkspaceOverviewViewSchema) {}

export class CustomerListQueryDto extends createZodDto(CustomerListQuerySchema) {}

export class CreateCustomerRequestDto extends createZodDto(CreateCustomerRequestSchema) {}

export class UpdateCustomerRequestDto extends createZodDto(UpdateCustomerRequestSchema) {}

export class CustomerAliasDto extends createZodDto(CustomerAliasSummarySchema) {}

export class CustomerAliasListDto extends createZodDto(CustomerAliasListSchema) {}

export class CreateCustomerAliasRequestDto extends createZodDto(CreateCustomerAliasRequestSchema) {}
