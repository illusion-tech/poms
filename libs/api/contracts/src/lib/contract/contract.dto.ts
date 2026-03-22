import {
    ContractListQuerySchema,
    ContractListSchema,
    ContractSummarySchema,
    CreateContractRequestSchema,
    UpdateContractBasicInfoRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ContractDto extends createZodDto(ContractSummarySchema) {}

export class ContractListDto extends createZodDto(ContractListSchema) {}

export class ContractListQueryDto extends createZodDto(ContractListQuerySchema) {}

export class CreateContractRequestDto extends createZodDto(CreateContractRequestSchema) {}

export class UpdateContractBasicInfoRequestDto extends createZodDto(UpdateContractBasicInfoRequestSchema) {}
