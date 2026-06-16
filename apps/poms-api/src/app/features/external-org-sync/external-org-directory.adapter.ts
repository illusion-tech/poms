import type { ExternalOrgProvider } from '@poms/shared-contracts';
import type { IdentityProviderConfig } from '../identity-provider/identity-provider-config.entity';
import type { ExternalOrgSource } from './external-org-source.entity';

export interface ExternalDepartmentSnapshot {
    externalDepartmentId: string;
    externalParentDepartmentId: string | null;
    externalDepartmentName: string;
    isActive: boolean;
    displayOrder: number | null;
    raw: Record<string, unknown>;
}

export interface FetchExternalDepartmentTreeInput {
    source: ExternalOrgSource;
    providerConfig: IdentityProviderConfig;
    clientSecret: string;
}

export interface TestExternalDepartmentReadAccessInput {
    providerConfig: IdentityProviderConfig;
    clientSecret: string;
    rootDepartmentId: string | null;
}

export interface ExternalDepartmentReadAccessResult {
    rootDepartmentId: string;
    childDepartmentCount: number;
}

export interface ExternalOrgDirectoryAdapter {
    readonly provider: ExternalOrgProvider;
    fetchDepartmentTree(input: FetchExternalDepartmentTreeInput): Promise<ExternalDepartmentSnapshot[]>;
    testDepartmentReadAccess(input: TestExternalDepartmentReadAccessInput): Promise<ExternalDepartmentReadAccessResult>;
}

export interface ExternalOrgDirectoryAdapterErrorOptions {
    providerCode?: string | null;
    httpStatus?: number | null;
    providerMessage?: string | null;
    nextActions?: string[];
}

export class ExternalOrgDirectoryAdapterError extends Error {
    readonly providerCode: string | null;
    readonly httpStatus: number | null;
    readonly providerMessage: string | null;
    readonly nextActions: string[];

    constructor(message: string, options: ExternalOrgDirectoryAdapterErrorOptions = {}) {
        super(message);
        this.name = 'ExternalOrgDirectoryAdapterError';
        this.providerCode = options.providerCode ?? null;
        this.httpStatus = options.httpStatus ?? null;
        this.providerMessage = options.providerMessage ?? null;
        this.nextActions = options.nextActions ?? [];
    }
}
