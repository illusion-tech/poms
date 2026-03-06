import {
    LoginRequestSchema,
    LoginResponseSchema,
    NavigationItemSchema,
    SanitizedUserSchema,
    SanitizedUserWithOrgUnitsSchema,
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
