import { Injectable } from '@nestjs/common';
import { IdentityProviderValue, type IdentityProvider } from '@poms/shared-contracts';
import { FeishuIdentityProviderAdapter } from './feishu-identity-provider.adapter';
import type { IdentityProviderAdapter } from './identity-provider.adapter';

@Injectable()
export class IdentityProviderAdapterRegistry {
    constructor(private readonly feishuAdapter: FeishuIdentityProviderAdapter) {}

    get(provider: IdentityProvider): IdentityProviderAdapter {
        if (provider === IdentityProviderValue.Feishu) return this.feishuAdapter;
        throw new Error(`Unsupported identity provider adapter: ${provider}`);
    }
}
