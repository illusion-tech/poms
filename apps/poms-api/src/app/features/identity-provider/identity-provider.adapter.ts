import type { IdentityProvider } from '@poms/shared-contracts';
import type { IdentityProviderConfig } from './identity-provider-config.entity';

export interface BuildAdminGrantAuthorizeUrlInput {
    config: IdentityProviderConfig;
    state: string;
    scopes: string[];
}

export interface ExchangeAdminGrantCodeInput {
    config: IdentityProviderConfig;
    clientSecret: string;
    code: string;
}

export interface ProviderOAuthTokenSet {
    accessToken: string;
    refreshToken: string | null;
    expiresInSeconds: number | null;
    refreshExpiresInSeconds: number | null;
    scopes: string[];
}

export interface SearchExternalUsersInput {
    config: IdentityProviderConfig;
    accessToken: string;
    query: string;
    limit: number;
}

export interface ProviderExternalUserCandidate {
    subjectId: string;
    unionId: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
    mobile: string | null;
    departmentNames: string[];
}

export interface ProviderExternalLoginIdentity {
    subjectId: string;
    unionId: string | null;
    displayName: string;
    avatarUrl: string | null;
    email: string | null;
    mobile: string | null;
}

export interface IdentityProviderAdapter {
    readonly provider: IdentityProvider;
    buildAdminGrantAuthorizeUrl(input: BuildAdminGrantAuthorizeUrlInput): string;
    exchangeAdminGrantCode(input: ExchangeAdminGrantCodeInput): Promise<ProviderOAuthTokenSet>;
    buildExternalLoginAuthorizeUrl(input: BuildAdminGrantAuthorizeUrlInput): string;
    exchangeExternalLoginCode(input: ExchangeAdminGrantCodeInput): Promise<ProviderOAuthTokenSet>;
    fetchExternalLoginIdentity(input: { config: IdentityProviderConfig; accessToken: string }): Promise<ProviderExternalLoginIdentity>;
    searchExternalUsers(input: SearchExternalUsersInput): Promise<ProviderExternalUserCandidate[]>;
}

export class IdentityProviderAdapterError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'IdentityProviderAdapterError';
    }
}
