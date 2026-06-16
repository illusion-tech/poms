import {
    ActivateExternalOrgSourceRequestSchema,
    ArchiveExternalOrgSourceRequestSchema,
    ApplyOrgSyncRunRequestSchema,
    CreateExternalOrgSourceRequestSchema,
    CreateOrgSyncRunRequestSchema,
    ExternalDepartmentMappingListQuerySchema,
    ExternalDepartmentMappingListSchema,
    ExternalOrgSourceDetailSchema,
    ExternalOrgSourceListQuerySchema,
    ExternalOrgSourceListSchema,
    OrgSyncDiffItemListQuerySchema,
    OrgSyncDiffItemListSchema,
    OrgSyncRunDetailSchema,
    OrgSyncRunListQuerySchema,
    OrgSyncRunListSchema,
    PauseExternalOrgSourceRequestSchema,
    ReplaceExternalDepartmentMappingsRequestSchema,
    UpdateExternalOrgSourceRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class ExternalOrgSourceDto extends createZodDto(ExternalOrgSourceDetailSchema) {}

export class ExternalOrgSourceListDto extends createZodDto(ExternalOrgSourceListSchema) {}

export class ExternalOrgSourceListQueryDto extends createZodDto(ExternalOrgSourceListQuerySchema) {}

export class CreateExternalOrgSourceRequestDto extends createZodDto(CreateExternalOrgSourceRequestSchema) {}

export class UpdateExternalOrgSourceRequestDto extends createZodDto(UpdateExternalOrgSourceRequestSchema) {}

export class ActivateExternalOrgSourceRequestDto extends createZodDto(ActivateExternalOrgSourceRequestSchema) {}

export class PauseExternalOrgSourceRequestDto extends createZodDto(PauseExternalOrgSourceRequestSchema) {}

export class ArchiveExternalOrgSourceRequestDto extends createZodDto(ArchiveExternalOrgSourceRequestSchema) {}

export class ExternalDepartmentMappingListDto extends createZodDto(ExternalDepartmentMappingListSchema) {}

export class ExternalDepartmentMappingListQueryDto extends createZodDto(ExternalDepartmentMappingListQuerySchema) {}

export class ReplaceExternalDepartmentMappingsRequestDto extends createZodDto(ReplaceExternalDepartmentMappingsRequestSchema) {}

export class CreateOrgSyncRunRequestDto extends createZodDto(CreateOrgSyncRunRequestSchema) {}

export class OrgSyncRunDto extends createZodDto(OrgSyncRunDetailSchema) {}

export class OrgSyncRunListDto extends createZodDto(OrgSyncRunListSchema) {}

export class OrgSyncRunListQueryDto extends createZodDto(OrgSyncRunListQuerySchema) {}

export class OrgSyncDiffItemListDto extends createZodDto(OrgSyncDiffItemListSchema) {}

export class OrgSyncDiffItemListQueryDto extends createZodDto(OrgSyncDiffItemListQuerySchema) {}

export class ApplyOrgSyncRunRequestDto extends createZodDto(ApplyOrgSyncRunRequestSchema) {}
