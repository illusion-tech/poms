import {
    AssignRolePermissionsRequestSchema,
    AssignUserOrgMembershipsRequestSchema,
    AssignUserRolesRequestSchema,
    AuthSessionLogoutResultSchema,
    CreatePasswordAuthSessionRequestSchema,
    CreateOrgUnitRequestSchema,
    CreatePlatformUserRequestSchema,
    CreateRoleRequestSchema,
    CurrentAuthSessionViewSchema,
    LogoutAuthSessionRequestSchema,
    NavigationItemSchema,
    NavigationSyncSummarySchema,
    MoveOrgUnitRequestSchema,
    OwnerReferenceDataSchema,
    OwnerReferenceOrgUnitSchema,
    OwnerReferenceUserSchema,
    OrgUnitTreeNodeSchema,
    PlatformOrgUnitDetailSchema,
    PlatformOrgUnitListSchema,
    PlatformOrgUnitSummarySchema,
    PlatformOrgUnitTreeSchema,
    PlatformPermissionListSchema,
    PlatformPermissionSummarySchema,
    PlatformRoleDetailSchema,
    PlatformRoleListSchema,
    PlatformRoleSummarySchema,
    PlatformUserDetailSchema,
    PlatformUserListSchema,
    PlatformUserSummarySchema,
    SanitizedUserSchema,
    SanitizedUserWithOrgUnitsSchema,
    UpdateOrgUnitActivationRequestSchema,
    UpdateOrgUnitRequestSchema,
    UpdateCurrentUserProfileRequestSchema,
    UpdatePlatformUserActivationRequestSchema,
    UpdatePlatformUserRequestSchema,
    UpdateRoleActivationRequestSchema,
    UpdateRoleRequestSchema,
    UserPayloadSchema,
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';
import { z } from 'zod';

export class SanitizedUserDto extends createZodDto(SanitizedUserSchema) {}

export class SanitizedUserWithOrgUnitsDto extends createZodDto(SanitizedUserWithOrgUnitsSchema) {}

export class UserPayloadDto extends createZodDto(UserPayloadSchema) {}

export class NavigationItemDto extends createZodDto(NavigationItemSchema) {}

export class NavigationListDto extends createZodDto(
    z.array(NavigationItemSchema).meta({ id: 'NavigationList' }),
) {}

export class NavigationSyncSummaryDto extends createZodDto(NavigationSyncSummarySchema) {}

export class CreatePasswordAuthSessionRequestDto extends createZodDto(CreatePasswordAuthSessionRequestSchema) {}

export class CurrentAuthSessionViewDto extends createZodDto(CurrentAuthSessionViewSchema) {}

export class LogoutAuthSessionRequestDto extends createZodDto(LogoutAuthSessionRequestSchema) {}

export class AuthSessionLogoutResultDto extends createZodDto(AuthSessionLogoutResultSchema) {}

export class PlatformUserSummaryDto extends createZodDto(PlatformUserSummarySchema) {}

export class PlatformUserListDto extends createZodDto(PlatformUserListSchema) {}

export class PlatformUserDetailDto extends createZodDto(PlatformUserDetailSchema) {}

export class PlatformPermissionSummaryDto extends createZodDto(PlatformPermissionSummarySchema) {}

export class PlatformPermissionListDto extends createZodDto(PlatformPermissionListSchema) {}

export class PlatformRoleSummaryDto extends createZodDto(PlatformRoleSummarySchema) {}

export class PlatformRoleListDto extends createZodDto(PlatformRoleListSchema) {}

export class PlatformRoleDetailDto extends createZodDto(PlatformRoleDetailSchema) {}

export class PlatformOrgUnitSummaryDto extends createZodDto(PlatformOrgUnitSummarySchema) {}

export class PlatformOrgUnitListDto extends createZodDto(PlatformOrgUnitListSchema) {}

export class OwnerReferenceUserDto extends createZodDto(OwnerReferenceUserSchema) {}

export class OwnerReferenceOrgUnitDto extends createZodDto(OwnerReferenceOrgUnitSchema) {}

export class OwnerReferenceDataDto extends createZodDto(OwnerReferenceDataSchema) {}

export class PlatformOrgUnitDetailDto extends createZodDto(PlatformOrgUnitDetailSchema) {}

export class OrgUnitTreeNodeDto extends createZodDto(OrgUnitTreeNodeSchema) {}

export class PlatformOrgUnitTreeDto extends createZodDto(PlatformOrgUnitTreeSchema) {}

export class CreatePlatformUserRequestDto extends createZodDto(CreatePlatformUserRequestSchema) {}

export class UpdatePlatformUserActivationRequestDto extends createZodDto(UpdatePlatformUserActivationRequestSchema) {}

export class UpdatePlatformUserRequestDto extends createZodDto(UpdatePlatformUserRequestSchema) {}

export class UpdateCurrentUserProfileRequestDto extends createZodDto(UpdateCurrentUserProfileRequestSchema) {}

export class AssignUserRolesRequestDto extends createZodDto(AssignUserRolesRequestSchema) {}

export class AssignUserOrgMembershipsRequestDto extends createZodDto(AssignUserOrgMembershipsRequestSchema) {}

export class CreateRoleRequestDto extends createZodDto(CreateRoleRequestSchema) {}

export class UpdateRoleRequestDto extends createZodDto(UpdateRoleRequestSchema) {}

export class UpdateRoleActivationRequestDto extends createZodDto(UpdateRoleActivationRequestSchema) {}

export class AssignRolePermissionsRequestDto extends createZodDto(AssignRolePermissionsRequestSchema) {}

export class CreateOrgUnitRequestDto extends createZodDto(CreateOrgUnitRequestSchema) {}

export class UpdateOrgUnitRequestDto extends createZodDto(UpdateOrgUnitRequestSchema) {}

export class UpdateOrgUnitActivationRequestDto extends createZodDto(UpdateOrgUnitActivationRequestSchema) {}

export class MoveOrgUnitRequestDto extends createZodDto(MoveOrgUnitRequestSchema) {}
