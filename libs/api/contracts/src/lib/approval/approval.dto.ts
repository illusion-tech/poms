import {
    ApprovalRecordSummarySchema,
    ApproveRecordRequestSchema,
    CommandResultSchema,
    RejectApprovalRecordRequestSchema,
    SubmitContractReviewRequestSchema,
    TodoItemListSchema,
    TodoItemSummarySchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ApprovalRecordDto extends createZodDto(ApprovalRecordSummarySchema) {}

export class TodoItemDto extends createZodDto(TodoItemSummarySchema) {}

export class TodoItemListDto extends createZodDto(TodoItemListSchema) {}

export class CommandResultDto extends createZodDto(CommandResultSchema) {}

export class SubmitContractReviewRequestDto extends createZodDto(SubmitContractReviewRequestSchema) {}

export class ApproveRecordRequestDto extends createZodDto(ApproveRecordRequestSchema) {}

export class RejectApprovalRecordRequestDto extends createZodDto(RejectApprovalRecordRequestSchema) {}
