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

export class ExternalOrgDirectoryAdapterError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'ExternalOrgDirectoryAdapterError';
    }
}
