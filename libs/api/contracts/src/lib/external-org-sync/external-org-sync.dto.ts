import {
    ActivateExternalOrgSourceRequestSchema,
    ArchiveExternalOrgSourceRequestSchema,
    ApplyOrgSyncRunRequestSchema,
    CreateExternalOrgSourceRequestSchema,
    CreateOrgSyncRunRequestSchema,
    ExternalDepartmentMappingListQuerySchema,
    ExternalDepartmentMappingListSchema,
    ExternalDepartmentMappingSummarySchema,
    ExternalOrgSourceDetailSchema,
    ExternalOrgSourceListQuerySchema,
    ExternalOrgSourceListSchema,
    IgnoreExternalDepartmentMappingRequestSchema,
    MapExternalDepartmentMappingRequestSchema,
    OrgSyncDiffItemListQuerySchema,
    OrgSyncDiffItemListSchema,
    OrgSyncRunDetailSchema,
    OrgSyncRunListQuerySchema,
    OrgSyncRunListSchema,
    PauseExternalOrgSourceRequestSchema,
    ReplaceExternalDepartmentMappingsRequestSchema,
    RestoreExternalDepartmentMappingRequestSchema,
    UnmapExternalDepartmentMappingRequestSchema,
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

export class ExternalDepartmentMappingDto extends createZodDto(ExternalDepartmentMappingSummarySchema) {}

export class ExternalDepartmentMappingListQueryDto extends createZodDto(ExternalDepartmentMappingListQuerySchema) {}

export class ReplaceExternalDepartmentMappingsRequestDto extends createZodDto(ReplaceExternalDepartmentMappingsRequestSchema) {}

export class MapExternalDepartmentMappingRequestDto extends createZodDto(MapExternalDepartmentMappingRequestSchema) {}

export class UnmapExternalDepartmentMappingRequestDto extends createZodDto(UnmapExternalDepartmentMappingRequestSchema) {}

export class IgnoreExternalDepartmentMappingRequestDto extends createZodDto(IgnoreExternalDepartmentMappingRequestSchema) {}

export class RestoreExternalDepartmentMappingRequestDto extends createZodDto(RestoreExternalDepartmentMappingRequestSchema) {}

export class CreateOrgSyncRunRequestDto extends createZodDto(CreateOrgSyncRunRequestSchema) {}

export class OrgSyncRunDto extends createZodDto(OrgSyncRunDetailSchema) {}

export class OrgSyncRunListDto extends createZodDto(OrgSyncRunListSchema) {}

export class OrgSyncRunListQueryDto extends createZodDto(OrgSyncRunListQuerySchema) {}

export class OrgSyncDiffItemListDto extends createZodDto(OrgSyncDiffItemListSchema) {}

export class OrgSyncDiffItemListQueryDto extends createZodDto(OrgSyncDiffItemListQuerySchema) {}

export class ApplyOrgSyncRunRequestDto extends createZodDto(ApplyOrgSyncRunRequestSchema) {}
