import {
    CreateSalesFollowUpRecordRequestSchema,
    SalesFollowUpRecordListQuerySchema,
    SalesFollowUpRecordListSchema,
    SalesFollowUpRecordSummarySchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class SalesFollowUpRecordDto extends createZodDto(SalesFollowUpRecordSummarySchema) {}

export class SalesFollowUpRecordListDto extends createZodDto(SalesFollowUpRecordListSchema) {}

export class SalesFollowUpRecordListQueryDto extends createZodDto(SalesFollowUpRecordListQuerySchema) {}

export class CreateSalesFollowUpRecordRequestDto extends createZodDto(CreateSalesFollowUpRecordRequestSchema) {}
