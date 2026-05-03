import {
    BusinessDiscussionCommentListSchema,
    BusinessDiscussionCommentSummarySchema,
    BusinessDiscussionListQuerySchema,
    CreateBusinessDiscussionCommentRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class BusinessDiscussionCommentDto extends createZodDto(BusinessDiscussionCommentSummarySchema) {}

export class BusinessDiscussionCommentListDto extends createZodDto(BusinessDiscussionCommentListSchema) {}

export class BusinessDiscussionListQueryDto extends createZodDto(BusinessDiscussionListQuerySchema) {}

export class CreateBusinessDiscussionCommentRequestDto extends createZodDto(CreateBusinessDiscussionCommentRequestSchema) {}
