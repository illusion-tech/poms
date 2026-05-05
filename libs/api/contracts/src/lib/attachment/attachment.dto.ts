import {
    AttachmentListQuerySchema,
    AttachmentListSchema,
    AttachmentSummarySchema,
    AttachmentVersionListSchema,
    AttachmentDownloadPackageSummarySchema,
    ClearAttachmentFinalRequestSchema,
    CreateProjectHandoverAttachmentDownloadPackageRequestSchema,
    CreateAttachmentVersionRequestSchema,
    CreateAttachmentLinkRequestSchema,
    MarkAttachmentFinalRequestSchema,
    ProjectHandoverAttachmentChecklistViewSchema,
    RefreshProjectHandoverAttachmentChecklistRequestSchema,
    UpdateAttachmentRequestSchema,
    VoidAttachmentRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class AttachmentDto extends createZodDto(AttachmentSummarySchema) {}

export class AttachmentListDto extends createZodDto(AttachmentListSchema) {}

export class AttachmentListQueryDto extends createZodDto(AttachmentListQuerySchema) {}

export class UpdateAttachmentRequestDto extends createZodDto(UpdateAttachmentRequestSchema) {}

export class AttachmentVersionListDto extends createZodDto(AttachmentVersionListSchema) {}

export class CreateAttachmentVersionRequestDto extends createZodDto(CreateAttachmentVersionRequestSchema) {}

export class MarkAttachmentFinalRequestDto extends createZodDto(MarkAttachmentFinalRequestSchema) {}

export class ClearAttachmentFinalRequestDto extends createZodDto(ClearAttachmentFinalRequestSchema) {}

export class CreateAttachmentLinkRequestDto extends createZodDto(CreateAttachmentLinkRequestSchema) {}

export class VoidAttachmentRequestDto extends createZodDto(VoidAttachmentRequestSchema) {}

export class ProjectHandoverAttachmentChecklistViewDto extends createZodDto(ProjectHandoverAttachmentChecklistViewSchema) {}

export class RefreshProjectHandoverAttachmentChecklistRequestDto extends createZodDto(RefreshProjectHandoverAttachmentChecklistRequestSchema) {}

export class CreateProjectHandoverAttachmentDownloadPackageRequestDto extends createZodDto(CreateProjectHandoverAttachmentDownloadPackageRequestSchema) {}

export class AttachmentDownloadPackageSummaryDto extends createZodDto(AttachmentDownloadPackageSummarySchema) {}
