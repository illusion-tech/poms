import { inject, Injectable, signal } from '@angular/core';
import {
    ExternalIdentityApi,
    IdentityProviderApi,
    IdentityProviderOAuthGrantApi,
    type BindUserExternalIdentityRequest,
    type CreateIdentityProviderConfigRequest,
    type ExternalIdentityBindingSummary,
    type ExternalUserCandidate,
    type IdentityProvider,
    type IdentityProviderConfigStatus,
    type IdentityProviderConfigSummary,
    type IdentityProviderConnectionTestResult,
    type IdentityProviderOAuthAuthorizeResult,
    type IdentityProviderOAuthGrantSummary,
    type TestIdentityProviderConnectionRequest,
    type UnbindExternalIdentityRequest,
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
    readonly #externalIdentityApi = inject(ExternalIdentityApi);
    readonly #identityProviderOAuthGrantApi = inject(IdentityProviderOAuthGrantApi);

    readonly #configs = signal<IdentityProviderConfigSummary[]>([]);
    readonly #loading = signal(false);
    readonly #saving = signal(false);
    readonly #testingConfigId = signal<string | null>(null);
    readonly #loaded = signal(false);
    readonly #bindingsByUserId = signal<Record<string, ExternalIdentityBindingSummary[]>>({});
    readonly #loadingBindingsUserId = signal<string | null>(null);
    readonly #savingBindingUserId = signal<string | null>(null);
    readonly #unbindingIdentityId = signal<string | null>(null);
    readonly #grantsByConfigId = signal<Record<string, IdentityProviderOAuthGrantSummary>>({});
    readonly #loadingGrantConfigId = signal<string | null>(null);
    readonly #authorizingGrantConfigId = signal<string | null>(null);
    readonly #searchResults = signal<ExternalUserCandidate[]>([]);
    readonly #searchingConfigId = signal<string | null>(null);

    readonly configs = this.#configs.asReadonly();
    readonly loading = this.#loading.asReadonly();
    readonly saving = this.#saving.asReadonly();
    readonly testingConfigId = this.#testingConfigId.asReadonly();
    readonly loaded = this.#loaded.asReadonly();
    readonly bindingsByUserId = this.#bindingsByUserId.asReadonly();
    readonly loadingBindingsUserId = this.#loadingBindingsUserId.asReadonly();
    readonly savingBindingUserId = this.#savingBindingUserId.asReadonly();
    readonly unbindingIdentityId = this.#unbindingIdentityId.asReadonly();
    readonly grantsByConfigId = this.#grantsByConfigId.asReadonly();
    readonly loadingGrantConfigId = this.#loadingGrantConfigId.asReadonly();
    readonly authorizingGrantConfigId = this.#authorizingGrantConfigId.asReadonly();
    readonly searchResults = this.#searchResults.asReadonly();
    readonly searchingConfigId = this.#searchingConfigId.asReadonly();

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

    async loadUserExternalIdentities(userId: string): Promise<ExternalIdentityBindingSummary[]> {
        this.#loadingBindingsUserId.set(userId);
        try {
            const bindings = await firstValueFrom(this.#externalIdentityApi.externalIdentityControllerListUserExternalIdentities({ id: userId }));
            const nextBindings = bindings ?? [];
            this.#bindingsByUserId.update((current) => ({ ...current, [userId]: nextBindings }));
            return nextBindings;
        } finally {
            this.#loadingBindingsUserId.set(null);
        }
    }

    async bindUserExternalIdentity(userId: string, request: BindUserExternalIdentityRequest): Promise<ExternalIdentityBindingSummary> {
        this.#savingBindingUserId.set(userId);
        try {
            const binding = await firstValueFrom(
                this.#externalIdentityApi.externalIdentityControllerBindUserExternalIdentity({
                    id: userId,
                    bindUserExternalIdentityRequest: request
                })
            );
            await this.loadUserExternalIdentities(userId);
            return binding;
        } finally {
            this.#savingBindingUserId.set(null);
        }
    }

    async unbindExternalIdentity(binding: ExternalIdentityBindingSummary, request: UnbindExternalIdentityRequest = {}): Promise<ExternalIdentityBindingSummary> {
        this.#unbindingIdentityId.set(binding.id);
        try {
            const unbound = await firstValueFrom(
                this.#externalIdentityApi.externalIdentityControllerUnbindExternalIdentity({
                    id: binding.id,
                    unbindExternalIdentityRequest: request
                })
            );
            await this.loadUserExternalIdentities(binding.pomsUserId);
            return unbound;
        } finally {
            this.#unbindingIdentityId.set(null);
        }
    }

    async loadCurrentAdminGrant(identityProviderConfigId: string): Promise<IdentityProviderOAuthGrantSummary> {
        this.#loadingGrantConfigId.set(identityProviderConfigId);
        try {
            const grant = await firstValueFrom(
                this.#identityProviderOAuthGrantApi.identityProviderOAuthGrantControllerGetCurrentAdminProviderGrant({
                    identityProviderId: identityProviderConfigId
                })
            );
            this.#grantsByConfigId.update((current) => ({ ...current, [identityProviderConfigId]: grant }));
            return grant;
        } finally {
            this.#loadingGrantConfigId.set(null);
        }
    }

    async authorizeCurrentAdminGrant(identityProviderConfigId: string): Promise<IdentityProviderOAuthAuthorizeResult> {
        this.#authorizingGrantConfigId.set(identityProviderConfigId);
        try {
            return await firstValueFrom(
                this.#identityProviderOAuthGrantApi.identityProviderOAuthGrantControllerAuthorizeCurrentAdminProviderGrant({
                    identityProviderId: identityProviderConfigId
                })
            );
        } finally {
            this.#authorizingGrantConfigId.set(null);
        }
    }

    async searchExternalUsers(identityProviderConfigId: string, q: string, limit = 20): Promise<ExternalUserCandidate[]> {
        this.#searchingConfigId.set(identityProviderConfigId);
        try {
            const result = await firstValueFrom(this.#identityProviderApi.identityProviderControllerSearchExternalUsers({ id: identityProviderConfigId, q, limit }));
            const items = result?.items ?? [];
            this.#searchResults.set(items);
            return items;
        } finally {
            this.#searchingConfigId.set(null);
        }
    }

    clearSearchResults(): void {
        this.#searchResults.set([]);
    }

    clearConfigs(): void {
        this.#configs.set([]);
        this.#loaded.set(false);
    }
}
