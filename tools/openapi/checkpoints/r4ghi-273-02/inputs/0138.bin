import { Inject, Injectable } from '@nestjs/common';
import { ExternalOrgProviderValue, type ExternalOrgProvider } from '@poms/shared-contracts';
import type { ExternalOrgDirectoryAdapter } from './external-org-directory.adapter';
import { ExternalOrgDirectoryAdapterError } from './external-org-directory.adapter';
import { FeishuExternalOrgDirectoryAdapter } from './feishu-external-org-directory.adapter';

@Injectable()
export class ExternalOrgDirectoryAdapterRegistry {
    constructor(@Inject(FeishuExternalOrgDirectoryAdapter) private readonly feishuAdapter: FeishuExternalOrgDirectoryAdapter) {}

    get(provider: ExternalOrgProvider): ExternalOrgDirectoryAdapter {
        if (provider === ExternalOrgProviderValue.Feishu) return this.feishuAdapter;
        throw new ExternalOrgDirectoryAdapterError(`External org directory adapter is not supported for provider ${provider}.`);
    }
}
