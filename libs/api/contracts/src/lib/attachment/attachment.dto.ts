import {
    AttachmentListQuerySchema,
    AttachmentListSchema,
    AttachmentStorageProviderConfigDetailSchema,
    AttachmentStorageProviderConfigListQuerySchema,
    AttachmentStorageProviderConfigListSchema,
    AttachmentStorageProviderConnectionTestResultSchema,
    AttachmentSummarySchema,
    AttachmentVersionListSchema,
    AttachmentDownloadPackageSummarySchema,
    ClearAttachmentFinalRequestSchema,
    CreateAttachmentStorageProviderConfigRequestSchema,
    CreateProjectHandoverAttachmentDownloadPackageRequestSchema,
    CreateAttachmentVersionRequestSchema,
    CreateAttachmentLinkRequestSchema,
    MarkAttachmentFinalRequestSchema,
    ProjectHandoverAttachmentChecklistViewSchema,
    RefreshProjectHandoverAttachmentChecklistRequestSchema,
    SetDefaultAttachmentStorageProviderRequestSchema,
    TestAttachmentStorageProviderConnectionRequestSchema,
    UpdateAttachmentStorageProviderConfigRequestSchema,
    UpdateAttachmentRequestSchema,
    VoidAttachmentRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class AttachmentDto extends createZodDto(AttachmentSummarySchema) {}

export class AttachmentListDto extends createZodDto(AttachmentListSchema) {}

export class AttachmentListQueryDto extends createZodDto(AttachmentListQuerySchema) {}

export class AttachmentStorageProviderConfigDto extends createZodDto(AttachmentStorageProviderConfigDetailSchema) {}

export class AttachmentStorageProviderConfigListDto extends createZodDto(AttachmentStorageProviderConfigListSchema) {}

export class AttachmentStorageProviderConfigListQueryDto extends createZodDto(AttachmentStorageProviderConfigListQuerySchema) {}

export class CreateAttachmentStorageProviderConfigRequestDto extends createZodDto(CreateAttachmentStorageProviderConfigRequestSchema) {}

export class UpdateAttachmentStorageProviderConfigRequestDto extends createZodDto(UpdateAttachmentStorageProviderConfigRequestSchema) {}

export class TestAttachmentStorageProviderConnectionRequestDto extends createZodDto(TestAttachmentStorageProviderConnectionRequestSchema) {}

export class SetDefaultAttachmentStorageProviderRequestDto extends createZodDto(SetDefaultAttachmentStorageProviderRequestSchema) {}

export class AttachmentStorageProviderConnectionTestResultDto extends createZodDto(AttachmentStorageProviderConnectionTestResultSchema) {}

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
