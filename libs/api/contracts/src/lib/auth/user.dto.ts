import {
    AssignRolePermissionsRequestSchema,
    AssignUserOrgMembershipsRequestSchema,
    AssignUserRolesRequestSchema,
    CreateOrgUnitRequestSchema,
    CreatePlatformUserRequestSchema,
    CreateRoleRequestSchema,
    LoginRequestSchema,
    LoginResponseSchema,
    NavigationItemSchema,
    PlatformUserListSchema,
    PlatformUserSummarySchema,
    SanitizedUserSchema,
    SanitizedUserWithOrgUnitsSchema,
    UpdateOrgUnitRequestSchema,
    UpdatePlatformUserActivationRequestSchema,
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

export class LoginRequestDto extends createZodDto(LoginRequestSchema) {}

export class LoginResponseDto extends createZodDto(LoginResponseSchema) {}

export class PlatformUserSummaryDto extends createZodDto(PlatformUserSummarySchema) {}

export class PlatformUserListDto extends createZodDto(PlatformUserListSchema) {}

export class CreatePlatformUserRequestDto extends createZodDto(CreatePlatformUserRequestSchema) {}

export class UpdatePlatformUserActivationRequestDto extends createZodDto(UpdatePlatformUserActivationRequestSchema) {}

export class AssignUserRolesRequestDto extends createZodDto(AssignUserRolesRequestSchema) {}

export class AssignUserOrgMembershipsRequestDto extends createZodDto(AssignUserOrgMembershipsRequestSchema) {}

export class CreateRoleRequestDto extends createZodDto(CreateRoleRequestSchema) {}

export class AssignRolePermissionsRequestDto extends createZodDto(AssignRolePermissionsRequestSchema) {}

export class CreateOrgUnitRequestDto extends createZodDto(CreateOrgUnitRequestSchema) {}

export class UpdateOrgUnitRequestDto extends createZodDto(UpdateOrgUnitRequestSchema) {}
