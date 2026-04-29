import {
    AttachmentListQuerySchema,
    AttachmentListSchema,
    AttachmentSummarySchema,
    CreateAttachmentLinkRequestSchema,
    UpdateAttachmentRequestSchema,
    VoidAttachmentRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class AttachmentDto extends createZodDto(AttachmentSummarySchema) {}

export class AttachmentListDto extends createZodDto(AttachmentListSchema) {}

export class AttachmentListQueryDto extends createZodDto(AttachmentListQuerySchema) {}

export class UpdateAttachmentRequestDto extends createZodDto(UpdateAttachmentRequestSchema) {}

export class CreateAttachmentLinkRequestDto extends createZodDto(CreateAttachmentLinkRequestSchema) {}

export class VoidAttachmentRequestDto extends createZodDto(VoidAttachmentRequestSchema) {}
