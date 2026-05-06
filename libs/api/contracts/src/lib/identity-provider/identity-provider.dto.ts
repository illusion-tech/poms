import {
    BindUserExternalIdentityRequestSchema,
    CreateExternalLoginSessionRequestSchema,
    CreateIdentityProviderConfigRequestSchema,
    EnabledLoginProviderListSchema,
    ExternalLoginAuthorizeResultSchema,
    ExternalLoginCallbackQuerySchema,
    ExternalLoginCallbackResultSchema,
    ExternalIdentityBindingListSchema,
    ExternalIdentityBindingSummarySchema,
    ExternalUserSearchQuerySchema,
    ExternalUserSearchResultSchema,
    IdentityProviderOAuthAuthorizeResultSchema,
    IdentityProviderOAuthCallbackQuerySchema,
    IdentityProviderOAuthGrantSummarySchema,
    IdentityProviderConfigDetailSchema,
    IdentityProviderConfigListQuerySchema,
    IdentityProviderConfigListSchema,
    IdentityProviderConnectionTestResultSchema,
    TestIdentityProviderConnectionRequestSchema,
    UnbindExternalIdentityRequestSchema,
    UpdateIdentityProviderConfigRequestSchema
} from '@poms/shared-contracts';
import { createZodDto } from 'nestjs-zod';

export class IdentityProviderConfigDto extends createZodDto(IdentityProviderConfigDetailSchema) {}

export class IdentityProviderConfigListDto extends createZodDto(IdentityProviderConfigListSchema) {}

export class IdentityProviderConfigListQueryDto extends createZodDto(IdentityProviderConfigListQuerySchema) {}

export class CreateIdentityProviderConfigRequestDto extends createZodDto(CreateIdentityProviderConfigRequestSchema) {}

export class UpdateIdentityProviderConfigRequestDto extends createZodDto(UpdateIdentityProviderConfigRequestSchema) {}

export class TestIdentityProviderConnectionRequestDto extends createZodDto(TestIdentityProviderConnectionRequestSchema) {}

export class IdentityProviderConnectionTestResultDto extends createZodDto(IdentityProviderConnectionTestResultSchema) {}

export class EnabledLoginProviderListDto extends createZodDto(EnabledLoginProviderListSchema) {}

export class ExternalLoginAuthorizeResultDto extends createZodDto(ExternalLoginAuthorizeResultSchema) {}

export class ExternalLoginCallbackQueryDto extends createZodDto(ExternalLoginCallbackQuerySchema) {}

export class ExternalLoginCallbackResultDto extends createZodDto(ExternalLoginCallbackResultSchema) {}

export class CreateExternalLoginSessionRequestDto extends createZodDto(CreateExternalLoginSessionRequestSchema) {}

export class IdentityProviderOAuthGrantDto extends createZodDto(IdentityProviderOAuthGrantSummarySchema) {}

export class IdentityProviderOAuthAuthorizeResultDto extends createZodDto(IdentityProviderOAuthAuthorizeResultSchema) {}

export class IdentityProviderOAuthCallbackQueryDto extends createZodDto(IdentityProviderOAuthCallbackQuerySchema) {}

export class ExternalUserSearchQueryDto extends createZodDto(ExternalUserSearchQuerySchema) {}

export class ExternalUserSearchResultDto extends createZodDto(ExternalUserSearchResultSchema) {}

export class ExternalIdentityBindingDto extends createZodDto(ExternalIdentityBindingSummarySchema) {}

export class ExternalIdentityBindingListDto extends createZodDto(ExternalIdentityBindingListSchema) {}

export class BindUserExternalIdentityRequestDto extends createZodDto(BindUserExternalIdentityRequestSchema) {}

export class UnbindExternalIdentityRequestDto extends createZodDto(UnbindExternalIdentityRequestSchema) {}
