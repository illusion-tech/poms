import {
    CreateSalesFollowUpRecordRequestSchema,
    ReplaceSalesFollowUpRecordRequestSchema,
    SalesFollowUpRecordListQuerySchema,
    SalesFollowUpRecordListSchema,
    SalesFollowUpRecordSummarySchema,
    VoidSalesFollowUpRecordRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class SalesFollowUpRecordDto extends createZodDto(SalesFollowUpRecordSummarySchema) {}

export class SalesFollowUpRecordListDto extends createZodDto(SalesFollowUpRecordListSchema) {}

export class SalesFollowUpRecordListQueryDto extends createZodDto(SalesFollowUpRecordListQuerySchema) {}

export class CreateSalesFollowUpRecordRequestDto extends createZodDto(CreateSalesFollowUpRecordRequestSchema) {}

export class ReplaceSalesFollowUpRecordRequestDto extends createZodDto(ReplaceSalesFollowUpRecordRequestSchema) {}

export class VoidSalesFollowUpRecordRequestDto extends createZodDto(VoidSalesFollowUpRecordRequestSchema) {}
