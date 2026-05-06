import { inject, Injectable, signal } from '@angular/core';
import {
    IdentityProviderApi,
    type CreateIdentityProviderConfigRequest,
    type IdentityProvider,
    type IdentityProviderConfigStatus,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult,
    type TestIdentityProviderConnectionRequest,
    type UpdateIdentityProviderConfigRequest
} from '@poms/shared-api-client';
import { firstValueFrom } from 'rxjs';

export interface IdentityProviderConfigFilters {
    provider?: IdentityProvider;
    status?: IdentityProviderConfigStatus;
}

@Injectable()
export class IdentityProviderStore {
    readonly #identityProviderApi = inject(IdentityProviderApi);

    readonly #configs = signal<IdentityProviderConfigSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #testingConfigId = signal<string | null>(null);
    readonly #loaded = signal(false);

    readonly configs = this.#configs.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly testingConfigId = this.#testingConfigId.asReadonly();
    readonly loaded = this.#loaded.asReadonly();

    async loadConfigs(filters: IdentityProviderConfigFilters = {}): Promise<IdentityProviderConfigSummary[]> {
        this.#loading.set(true);
        try {
            const configs = await firstValueFrom(
                this.#identityProviderApi.identityProviderControllerListIdentityProviderConfigs({
                    provider: filters.provider,
                    status: filters.status
                })
            );
            this.#configs.set(configs ?? []);
            this.#loaded.set(true);
            return configs ?? [];
        } finally {
            this.#loading.set(false);
        }
    }

    async createConfig(request: CreateIdentityProviderConfigRequest): Promise<IdentityProviderConfigSummary> {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#identityProviderApi.identityProviderControllerCreateIdentityProviderConfig({ createIdentityProviderConfigRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async updateConfig(id: string, request: UpdateIdentityProviderConfigRequest): Promise<IdentityProviderConfigSummary> {
        this.#saving.set(true);
        try {
            return await firstValueFrom(this.#identityProviderApi.identityProviderControllerUpdateIdentityProviderConfig({ id, updateIdentityProviderConfigRequest: request }));
        } finally {
            this.#saving.set(false);
        }
    }

    async testConnection(id: string, request: TestIdentityProviderConnectionRequest = {}): Promise<IdentityProviderConnectionTestResult> {
        this.#testingConfigId.set(id);
        try {
            return await firstValueFrom(this.#identityProviderApi.identityProviderControllerTestIdentityProviderConnection({ id, testIdentityProviderConnectionRequest: request }));
        } finally {
            this.#testingConfigId.set(null);
        }
    }

    clearConfigs(): void {
        this.#configs.set([]);
        this.#loaded.set(false);
    }
}
