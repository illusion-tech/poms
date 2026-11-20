import type { ExternalUserCandidateFieldAvailabilitySummary, IdentityProvider } from '@poms/shared-contracts';
import type { IdentityProviderConfig } from './identity-provider-config.entity';

export interface BuildAdminGrantAuthorizeUrlInput {
    config: IdentityProviderConfig;
    redirectUri: string;
    state: string;
    scopes: string[];
}

export interface ExchangeAdminGrantCodeInput {
    config: IdentityProviderConfig;
    redirectUri: string;
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
    fieldAvailability: ExternalUserCandidateFieldAvailabilitySummary;
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

export type IdentityProviderAdapterErrorDetails = {
    providerCode?: number | null;
    providerMessage?: string | null;
    providerLogId?: string | null;
};

export class IdentityProviderAdapterError extends Error {
    readonly providerCode: number | null;
    readonly providerMessage: string | null;
    readonly providerLogId: string | null;

    constructor(message: string, details: IdentityProviderAdapterErrorDetails = {}) {
        super(message);
        this.name = 'IdentityProviderAdapterError';
        this.providerCode = details.providerCode ?? null;
        this.providerMessage = details.providerMessage ?? null;
        this.providerLogId = details.providerLogId ?? null;
    }
}
